import { AsyncLocalStorage } from 'node:async_hooks';
import { LogFile } from './LogFile';
import path from 'node:path';
import { format, inspect } from 'node:util';

export type LogContext = Record<string, string | number>;
export const logContext = new AsyncLocalStorage<LogContext>();
const secrets = new Set<string>();
const sensitiveKey =
  /token|secret|password|authorization|cookie|encryption|email|giftcardcode|^key$|^sql$|^sqlMessage$/i;

export function registerSecret(value: string): void {
  if (value.length >= 4) secrets.add(value);
}

export function redact(value: string): string {
  let result = value;
  for (const secret of secrets)
    result = result.split(secret).join('[REDACTED]');
  return result
    .replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .slice(0, 16_384);
}

export function sanitize(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === 'string') return redact(value);
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value) || depth > 8) return '[Circular or nested]';
  seen.add(value);
  if (value instanceof Error) {
    const error = value as Error & {
      code?: string;
      status?: number;
      responseBody?: unknown;
    };
    return Object.fromEntries(
      Object.entries({
        name: error.name,
        message: redact(error.message),
        stack: redact(error.stack ?? ''),
        code: error.code,
        status: error.status,
        responseBody: sanitize(error.responseBody, seen, depth + 1),
        cause: sanitize(error.cause, seen, depth + 1),
      }).filter(([, item]) => item !== undefined),
    );
  }
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitize(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : sanitize(item, seen, depth + 1),
      ]),
  );
}

export type Level = 'debug' | 'info' | 'warn' | 'error';
const priorities: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
let fileSink: LogFile | undefined;
let fileDirectory: string | undefined;
let fileWarning = false;

function getFileSink(): LogFile {
  const directory = process.env.LOG_DIR ?? path.resolve('logs');
  if (!fileSink || fileDirectory !== directory) {
    fileSink = new LogFile(directory);
    fileDirectory = directory;
  }
  return fileSink;
}

export function initializeLogging(): () => void {
  getFileSink().reset();
  fileWarning = false;
  const originals = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const levels = {
    log: 'info',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
  } as const;
  for (const method of Object.keys(levels) as (keyof typeof levels)[]) {
    console[method] = (...args: unknown[]) => {
      if (args[0] instanceof Error) {
        writeLog(levels[method], args[0].message, args, true);
        return;
      }
      writeLog(
        levels[method],
        format(...args.map((value) => sanitize(value))),
        [],
        true,
      );
    };
  }
  return () => {
    Object.assign(console, originals);
  };
}

export function readLatestLog(maxBytes: number) {
  return getFileSink().snapshot(maxBytes);
}

function terminalDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'stack' in value) {
    const { stack, ...fields } = value;
    return [inspect(fields, { colors: false, depth: 8, compact: false }), stack]
      .filter(Boolean)
      .join('\n');
  }
  return inspect(value, {
    colors: false,
    depth: 8,
    compact: true,
    breakLength: 120,
  });
}

function terminalLine(record: Record<string, unknown>): string {
  const { time, level, message, details, ...context } = record;
  const labels = Object.entries(context)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  const heading = `${time} [${String(level).toUpperCase()}] ${message}${labels ? ' | ' + labels : ''}`;
  const body = (details as unknown[]).map(terminalDetail).join('\n');
  return heading + (body ? '\n  ' + body.replace(/\n/g, '\n  ') : '') + '\n';
}

export function writeLog(
  level: Level,
  message: string,
  details: unknown[],
  force = false,
): void {
  const configured = process.env.LOG_LEVEL ?? 'info';
  if (!force && priorities[level] < (priorities[configured as Level] ?? 20))
    return;
  const record = sanitize({
    time: new Date().toISOString(),
    level,
    message,
    ...logContext.getStore(),
    details,
  }) as Record<string, unknown>;
  const line = JSON.stringify(record);
  (level === 'error' || level === 'warn'
    ? process.stderr
    : process.stdout
  ).write(terminalLine(record));
  try {
    getFileSink().append(line + '\n');
    fileWarning = false;
  } catch (error) {
    if (!fileWarning) {
      process.stderr.write(
        terminalLine(
          sanitize({
            time: new Date().toISOString(),
            level: 'error',
            message: 'Cannot write application log file',
            details: [error],
          }) as Record<string, unknown>,
        ),
      );
      fileWarning = true;
    }
  }
}
