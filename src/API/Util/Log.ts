import { AsyncLocalStorage } from 'node:async_hooks';
import { LogFile } from './LogFile';

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
    const error = value as Error & { code?: string; status?: number };
    return {
      name: error.name,
      message: redact(error.message),
      stack: redact(error.stack ?? ''),
      code: error.code,
      status: error.status,
      cause: sanitize(error.cause, seen, depth + 1),
    };
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

export function writeLog(
  level: Level,
  message: string,
  details: unknown[],
): void {
  const configured = process.env.LOG_LEVEL ?? 'info';
  if (priorities[level] < (priorities[configured as Level] ?? 20)) return;
  const line = JSON.stringify(
    sanitize({
      time: new Date().toISOString(),
      level,
      message,
      ...logContext.getStore(),
      details,
    }),
  );
  (level === 'error' || level === 'warn'
    ? process.stderr
    : process.stdout
  ).write(line + '\n');
  const directory = process.env.LOG_DIR;
  if (directory) {
    try {
      if (!fileSink || fileDirectory !== directory) {
        fileSink = new LogFile(directory);
        fileDirectory = directory;
      }
      fileSink.append(line + '\n');
      fileWarning = false;
    } catch (error) {
      if (!fileWarning) {
        process.stderr.write(
          JSON.stringify(
            sanitize({
              time: new Date().toISOString(),
              level: 'error',
              message: 'Cannot write application log file',
              error,
            }),
          ) + '\n',
        );
        fileWarning = true;
      }
    }
  }
}
