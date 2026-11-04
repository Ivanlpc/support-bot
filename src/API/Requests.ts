import Logger from './Util/Logger';
import { registerSecret } from './Util/Log';

export class APIError extends Error {
  constructor(public readonly status: number) {
    super('API request failed with HTTP ' + status);
  }
}

export async function request<T>(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
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
  for (const name of ['token', 'X-Tebex-Secret', 'Authorization']) {
    const value = headers.get(name);
    if (value) registerSecret(value);
  }
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  try {
    const response = await fetch(input, { ...init, signal, redirect: 'error' });
    if (!response.ok) throw new APIError(response.status);
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
      { ...context, durationMs: Math.round(performance.now() - started) },
      error,
    );
    throw error;
  }
}
