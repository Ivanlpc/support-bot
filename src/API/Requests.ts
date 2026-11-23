import Logger from './Util/Logger';
import { registerSecret, sanitize } from './Util/Log';
import { httpTrace, HTTPTrace, payloadSummary } from './Util/HTTPDiagnostics';

export class APIError extends Error {
  public readonly responseBody: unknown;
  constructor(
    public readonly status: number,
    responseBody?: unknown,
  ) {
    super('API request failed with HTTP ' + status);
    this.name = 'APIError';
    this.responseBody = sanitize(responseBody);
  }
}

async function errorBody(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        return '[Response body omitted: exceeds 16384 bytes]';
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return '[Response body unavailable]';
  } finally {
    reader.releaseLock();
  }
}

export async function request<T>(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
  options: { notFoundValue?: T } = {},
): Promise<T> {
  const url = new URL(input);
  if (url.username || url.password)
    throw new Error('API URLs must not contain credentials');
  const started = performance.now();
  const context = {
    provider: url.hostname,
    resource: url.pathname.split('/')[1],
    method: init.method ?? 'GET',
  };
  const headers = new Headers(init.headers);
  for (const name of ['X-Tebex-Secret', 'Authorization']) {
    const value = headers.get(name);
    if (value) registerSecret(value);
  }
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  const trace: HTTPTrace = {};
  let response: Response | undefined;
  try {
    response = await httpTrace.run(trace, () =>
      fetch(input, { ...init, headers, signal, redirect: 'error' }),
    );
    if (response.status === 404 && options.notFoundValue !== undefined) {
      await response.body?.cancel();
      Logger.info('API resource not found', {
        ...context,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
      });
      return options.notFoundValue;
    }
    if (!response.ok)
      throw new APIError(response.status, await errorBody(response));
    let result: unknown;
    if (response.status !== 204) {
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2_000_000) {
            await reader.cancel();
            throw new Error('API response exceeds the size limit');
          }
          chunks.push(value);
        }
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        result = JSON.parse(raw);
      } catch {
        throw new SyntaxError('API returned invalid JSON');
      }
    }
    Logger.info('API request completed', {
      ...context,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
    });
    return result as T;
  } catch (error) {
    Logger.error(
      'API request failed',
      sanitize({
        ...context,
        durationMs: Math.round(performance.now() - started),
        request: {
          url: url.origin + url.pathname,
          query: Object.fromEntries(url.searchParams),
          configuredHeaders: Object.fromEntries(headers),
          payload: payloadSummary(init.body, headers),
          ...trace,
        },
        response: response && {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(
            [
              'server',
              'content-type',
              'content-length',
              'cf-ray',
              'cf-mitigated',
              'retry-after',
            ].flatMap((name) => {
              const value = response!.headers.get(name);
              return value === null ? [] : [[name, value]];
            }),
          ),
        },
        runtime: { node: process.version, undici: process.versions.undici },
      }),
      error,
    );
    throw error;
  }
}
