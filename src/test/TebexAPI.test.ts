import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, Server, IncomingHttpHeaders } from 'node:http';
import { AddressInfo } from 'node:net';
import { config } from '../config';
import { TebexAPI } from '../API/External/TebexAPI';
import { request, APIError } from '../API/Requests';
import {
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  InteractionReplyOptions,
} from 'discord.js';
import { createSearchCommand } from '../commands/search';
import { messages } from '../messages';
import Logger from '../API/Util/Logger';

let server: Server;
let base: string;
const originalTebex = config.TEBEX_URL;
const calls: string[] = [];
const received: { headers: IncomingHttpHeaders; body: string }[] = [];
const samplePayment = {
  id: 1,
  amount: '4.99',
  status: 'Complete',
  date: '2026-01-01',
  currency: { iso_4217: 'GBP', symbol: '£' },
  player: { name: 'Player', uuid: null },
  packages: [{ id: 13, name: 'Test package' }],
};
const card = (id: number, note: string, voided: boolean) => ({
  id,
  note,
  void: voided,
  code: 'code-' + id,
  balance: { starting: '10.00', remaining: '5.00', currency: 'GBP' },
});
before(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    calls.push(req.url!);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/gift-cards' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      received.push({
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      });
      res.setHeader('cf-ray', 'test-ray-id');
      res.setHeader('cf-mitigated', 'challenge');
      res.setHeader('server', 'cloudflare');
      res.setHeader('set-cookie', 'private-cookie=must-not-be-logged');
      res.writeHead(403);
      res.end(
        JSON.stringify({
          error_code: 403,
          error_message: 'Forbidden - Invalid secret key provided',
          token: 'hidden-response-token',
          detail: 'Credential test-token rejected',
        }),
      );
      return;
    }
    const failureStatus = new Map([
      ['/payments/missing', 404],
      ['/payments/unauthorized', 401],
      ['/payments/forbidden', 403],
      ['/payments/unavailable', 500],
      ['/payments/limited', 429],
      ['/gift-cards/missing', 404],
    ]).get(url.pathname);
    if (failureStatus) {
      assert.equal(req.headers['x-tebex-secret'], 'test-token');
      res.writeHead(failureStatus);
      res.end('<html>Not found</html>');
      return;
    }
    if (url.pathname === '/slow') return;
    if (url.pathname === '/large') {
      res.end(JSON.stringify({ data: 'x'.repeat(2_000_001) }));
      return;
    }
    if (url.pathname === '/empty') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === '/redirect') {
      res.writeHead(302, { Location: '/gift-cards' });
      res.end();
      return;
    }
    if (url.pathname === '/invalid') {
      res.end('<html>bad gateway</html>');
      return;
    }
    if (url.pathname === '/error') {
      res.writeHead(429);
      res.end('{"secret":"must not appear in errors"}');
      return;
    }
    if (url.pathname.startsWith('/error-')) {
      res.writeHead(403);
      res.end(
        url.pathname === '/error-large'
          ? 'x'.repeat(16_385)
          : url.pathname === '/error-empty'
            ? ''
            : 'Forbidden for test-token',
      );
      return;
    }
    if (url.pathname === '/gift-cards') {
      res.end(
        JSON.stringify({
          data: [
            card(1, 'LINKED:42: created', false),
            card(2, 'LINKED:42: created', true),
            card(3, 'LINKED:24: created', false),
          ],
        }),
      );
      return;
    }
    assert.equal(req.headers['x-tebex-secret'], 'test-token');
    res.end(JSON.stringify(samplePayment));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  config.TEBEX_URL = base;
});
after(async () => {
  config.TEBEX_URL = originalTebex;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe('API clients over local HTTP', () => {
  it('sends explicit client headers and logs the actual failed request without exposing credentials', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    const beforeCalls = calls.length;
    await assert.rejects(
      TebexAPI.createGiftcard(
        'test-token',
        25,
        'creator',
        'Test test-token user@example.com',
        'recipient',
      ),
      APIError,
    );
    assert.equal(calls.length, beforeCalls + 1);
    const wire = received.at(-1)!;
    assert.match(String(wire.headers['user-agent']), /^support-bot\/1\.2\.0/);
    assert.equal(wire.headers.accept, 'application/json');
    assert.equal(wire.headers['x-tebex-secret'], 'test-token');
    assert.match(
      String(wire.headers['content-type']),
      /^multipart\/form-data; boundary=/,
    );
    assert.ok(
      wire.body.includes(
        'LINKED:recipient: Created with Discord bot by Test test-token user@example.com (creator)',
      ),
    );
    const diagnostic = errors.mock.calls[0].arguments[1] as any;
    assert.deepEqual(diagnostic.request.sentHeaders, {
      ...wire.headers,
      'x-tebex-secret': '[REDACTED]',
    });
    assert.deepEqual(diagnostic.request.payload, {
      amount: ['25'],
      note: [
        'LINKED:recipient: Created with Discord bot by Test [REDACTED] [EMAIL] (creator)',
      ],
    });
    assert.equal(diagnostic.request.connection.remoteFamily, 'IPv4');
    assert.equal(diagnostic.response.status, 403);
    assert.equal(diagnostic.response.headers['cf-ray'], 'test-ray-id');
    assert.equal(diagnostic.response.headers['cf-mitigated'], 'challenge');
    assert.ok(diagnostic.runtime.node);
    const output = JSON.stringify(diagnostic);
    for (const secret of [
      'test-token',
      'user@example.com',
      'must-not-be-logged',
    ])
      assert.ok(!output.includes(secret));
  });
  it('keeps concurrent request diagnostics separate', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    await Promise.all(
      [11, 22].map((amount) =>
        assert.rejects(
          TebexAPI.createGiftcard('test-token', amount, 'creator', 'TestUser'),
          APIError,
        ),
      ),
    );
    const diagnostics = errors.mock.calls.map(
      (call) => call.arguments[1] as any,
    );
    assert.deepEqual(
      diagnostics.map((item) => item.request.payload.amount[0]).sort(),
      ['11', '22'],
    );
    assert.equal(
      new Set(
        diagnostics.map((item) => item.request.sentHeaders['content-type']),
      ).size,
      2,
    );
  });
  it('redacts sensitive JSON fields, query parameters and authentication headers in failure diagnostics', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    await assert.rejects(
      request(base + '/error-text?token=private-query-token&limit=5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer private-auth-token',
          Cookie: 'private-cookie',
        },
        body: JSON.stringify({
          amount: 12,
          note: 'test note',
          password: 'private-payload-password',
          nested: { secret: 'private-nested-secret' },
        }),
      }),
      APIError,
    );
    const diagnostic = errors.mock.calls[0].arguments[1] as any;
    assert.equal(diagnostic.request.query.token, '[REDACTED]');
    assert.equal(diagnostic.request.query.limit, '5');
    assert.equal(diagnostic.request.payload.amount, 12);
    assert.equal(diagnostic.request.payload.note, 'test note');
    assert.equal(diagnostic.request.payload.password, '[REDACTED]');
    assert.equal(diagnostic.request.sentHeaders.authorization, '[REDACTED]');
    assert.equal(diagnostic.request.sentHeaders.cookie, '[REDACTED]');
    assert.ok(!JSON.stringify(diagnostic).includes('private-'));
  });
  it('keeps duplicate form fields in diagnostics without changing the HTTP failure', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    const body = new FormData();
    body.append('note', 'first');
    body.append('note', 'second');
    body.append('__proto__', 'value');
    await assert.rejects(
      request(base + '/error-text', { method: 'POST', body }),
      APIError,
    );
    const diagnostic = errors.mock.calls[0].arguments[1] as any;
    assert.deepEqual(diagnostic.request.payload.note, ['first', 'second']);
    assert.deepEqual(diagnostic.request.payload.__proto__, ['value']);
  });
  it('does not emit detailed request diagnostics on success', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    const infos = t.mock.method(Logger, 'info');
    await TebexAPI.getPaymentFromId('test-token', 'success');
    assert.equal(errors.mock.callCount(), 0);
    assert.equal(infos.mock.callCount(), 1);
    assert.ok(
      !JSON.stringify(infos.mock.calls[0].arguments).includes('request"'),
    );
  });
  it('preserves the sanitized Tebex error body on a failed giftcard creation', async () => {
    await assert.rejects(
      TebexAPI.createGiftcard('test-token', 25, 'creator', 'TestUser'),
      (error: unknown) => {
        assert.ok(error instanceof APIError);
        assert.equal(error.status, 403);
        assert.deepEqual(error.responseBody, {
          error_code: 403,
          error_message: 'Forbidden - Invalid secret key provided',
          token: '[REDACTED]',
          detail: 'Credential [REDACTED] rejected',
        });
        return true;
      },
    );
  });
  it('returns no payment for HTTP 404 without requiring a valid response body', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    assert.deepEqual(
      await TebexAPI.getPaymentFromId('test-token', 'missing'),
      [],
    );
    assert.equal(errors.mock.callCount(), 0);
  });
  it('answers a missing payment in Discord without reporting a command error', async (t) => {
    const errors = t.mock.method(Logger, 'error');
    const replies: InteractionReplyOptions[] = [];
    const command = createSearchCommand({
      getServerInformation: async () => ({ setup: 1, token: 'test-token' }),
      hasPermission: async () => true,
      getPaymentFromId: TebexAPI.getPaymentFromId,
    });
    await command.execute(
      {} as Client,
      {
        guildId: 'guild',
        member: Object.create(GuildMember.prototype),
        channel: { isDMBased: () => false },
        options: { getString: () => 'missing' },
        reply: async (reply: InteractionReplyOptions) => {
          replies.push(reply);
        },
      } as unknown as ChatInputCommandInteraction,
    );
    assert.equal(calls.at(-1), '/payments/missing');
    assert.equal(replies.length, 1);
    assert.equal(replies[0].content, messages.payment_not_found);
    assert.equal(errors.mock.callCount(), 0);
  });
  it('keeps authentication, rate limit and server errors as failures', async () => {
    for (const [transaction, status] of [
      ['unauthorized', 401],
      ['forbidden', 403],
      ['unavailable', 500],
      ['limited', 429],
    ] as const) {
      await assert.rejects(
        TebexAPI.getPaymentFromId('test-token', transaction),
        (error: unknown) =>
          error instanceof APIError && error.status === status,
      );
    }
  });
  it('does not turn a giftcard deletion HTTP 404 into a successful result', async () => {
    await assert.rejects(
      TebexAPI.deleteGiftcard('test-token', 'missing'),
      (error: unknown) => error instanceof APIError && error.status === 404,
    );
  });
  it('sends Tebex authentication and encodes path segments', async () => {
    const result = await TebexAPI.getPaymentFromId('test-token', 'a/b?x=1');
    assert.ok(!Array.isArray(result));
    assert.equal(result.amount, 4.99);
    assert.equal(result.packages[0].id, '13');
    assert.equal(calls.at(-1), '/payments/a%2Fb%3Fx%3D1');
  });
  it('returns only active giftcards linked to the user', async () => {
    const result = await TebexAPI.recoverGiftcard('test-token', '42');
    assert.ok(Array.isArray(result));
    assert.deepEqual(
      result.map((card) => card.id),
      ['1'],
    );
  });
  it('rejects HTTP errors without including response secrets', async () => {
    await assert.rejects(
      request(base + '/error'),
      (error: unknown) =>
        error instanceof APIError &&
        error.status === 429 &&
        !error.message.includes('secret') &&
        !JSON.stringify(error.responseBody).includes(
          'must not appear in errors',
        ),
    );
  });
  it('handles non-JSON, empty and oversized error bodies without losing HTTP status', async () => {
    for (const [path, body] of [
      ['/error-text', 'Forbidden for [REDACTED]'],
      ['/error-empty', undefined],
      ['/error-large', '[Response body omitted: exceeds 16384 bytes]'],
    ] as const) {
      await assert.rejects(
        request(base + path, { headers: { 'X-Tebex-Secret': 'test-token' } }),
        (error: unknown) => {
          assert.ok(error instanceof APIError);
          assert.equal(error.status, 403);
          assert.equal(error.responseBody, body);
          return true;
        },
      );
    }
  });
  it('bounds request time and rejects malformed JSON', async () => {
    await assert.rejects(request(base + '/slow', {}, 30), {
      name: 'TimeoutError',
    });
    await assert.rejects(request(base + '/invalid'), SyntaxError);
  });
  it('handles no-content responses and refuses redirects', async () => {
    assert.equal(await request(base + '/empty'), undefined);
    await assert.rejects(request(base + '/redirect'));
  });
});

it('rejects oversized API responses and URLs with embedded credentials', async () => {
  await assert.rejects(request(base + '/large'), /size limit/);
  await assert.rejects(
    request('http://private:secret@localhost/'),
    /must not contain credentials/,
  );
});
