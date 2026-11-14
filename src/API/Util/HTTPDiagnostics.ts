import { AsyncLocalStorage } from 'node:async_hooks';
import { channel } from 'node:diagnostics_channel';
import { Socket } from 'node:net';
import { TLSSocket } from 'node:tls';
import { sanitize } from './Log';

export interface HTTPTrace {
  sentHeaders?: unknown;
  connection?: unknown;
}

export const httpTrace = new AsyncLocalStorage<HTTPTrace>();
const requests = new WeakMap<object, HTTPTrace>();

channel('undici:request:create').subscribe((message) => {
  const trace = httpTrace.getStore();
  const { request } = message as { request?: object };
  if (trace && request && typeof request === 'object')
    requests.set(request, trace);
});

channel('undici:client:sendHeaders').subscribe((message) => {
  const { request, headers, socket } = message as {
    request?: object & { contentLength?: number | null };
    headers?: string;
    socket?: Socket;
  };
  const trace = request && requests.get(request);
  if (!trace) return;
  if (typeof headers === 'string') {
    const entries = headers
      .split('\r\n')
      .slice(1)
      .flatMap((line) => {
        const colon = line.indexOf(':');
        return colon > 0
          ? [[line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim()]]
          : [];
      });
    if (typeof request?.contentLength === 'number' && request.contentLength > 0)
      entries.push(['content-length', String(request.contentLength)]);
    trace.sentHeaders = sanitize(Object.fromEntries(entries));
  }
  if (socket instanceof Socket) {
    trace.connection = {
      remoteAddress: socket.remoteAddress,
      remoteFamily: socket.remoteFamily,
      remotePort: socket.remotePort,
      tlsProtocol:
        socket instanceof TLSSocket ? socket.getProtocol() : undefined,
      alpnProtocol:
        socket instanceof TLSSocket ? socket.alpnProtocol : undefined,
    };
  }
});

export function payloadSummary(
  body: BodyInit | null | undefined,
  headers: Headers,
): unknown {
  if (body == null) return undefined;
  if (body instanceof FormData || body instanceof URLSearchParams) {
    const fields = new Map<string, unknown[]>();
    let count = 0;
    for (const [name, value] of body.entries()) {
      if (++count > 100) break;
      const field =
        typeof value === 'string'
          ? value
          : { name: value.name, type: value.type, size: value.size };
      const values = fields.get(name) ?? [];
      values.push(field);
      fields.set(name, values);
    }
    return sanitize(Object.fromEntries(fields));
  }
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 16_384)
      return '[Payload omitted: exceeds 16384 bytes]';
    try {
      return sanitize(JSON.parse(body));
    } catch {
      if (
        headers
          .get('content-type')
          ?.includes('application/x-www-form-urlencoded')
      )
        return payloadSummary(new URLSearchParams(body), headers);
      return sanitize(body);
    }
  }
  return '[Binary or streaming payload omitted]';
}
