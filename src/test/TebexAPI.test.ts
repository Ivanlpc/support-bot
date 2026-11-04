import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { config } from '../config';
import { TebexAPI } from '../API/External/TebexAPI';
import { CraftingstoreAPI } from '../API/External/CraftingstoreAPI';
import { request, APIError } from '../API/Requests';

let server: Server;
let base: string;
const originalTebex = config.TEBEX_URL;
const originalCrafting = config.CRAFTINGSTORE_URL;
const calls: string[] = [];
const samplePayment = {
  id: 1,
  amount: '4.99',
  status: 'Complete',
  date: '2026-01-01',
  currency: { iso_4217: 'GBP', symbol: '£' },
  player: { name: 'Player', uuid: null },
  packages: [{ id: 13, name: 'Test package' }],
};
const sampleCrafting = {
  id: 1,
  transactionId: 'found',
  price: '4.99',
  packageName: 'VIP',
  inGameName: 'Player',
  uuid: null,
  email: null,
  gateway: 'test',
  status: 'PAID',
  timestamp: 1,
};
const card = (id: number, note: string, voided: boolean) => ({
  id,
  note,
  void: voided,
  code: 'code-' + id,
  balance: { starting: '10.00', remaining: '5.00', currency: 'GBP' },
});
before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    calls.push(req.url!);
    res.setHeader('Content-Type', 'application/json');
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
    if (url.pathname === '/payments') {
      assert.equal(req.headers.token, 'cs-test-token');
      const page = Number(url.searchParams.get('page') ?? 1);
      const player = url.searchParams.get('player');
      if (player === 'failed') {
        res.end(JSON.stringify({ success: false }));
        return;
      }
      res.end(
        JSON.stringify({
          success: true,
          data: page === 2 ? [sampleCrafting] : [],
          meta: { currentPage: page, lastPage: player === 'empty' ? 0 : 3 },
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
  config.CRAFTINGSTORE_URL = base;
});
after(async () => {
  config.TEBEX_URL = originalTebex;
  config.CRAFTINGSTORE_URL = originalCrafting;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe('API clients over local HTTP', () => {
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
  it('stops CraftingStore pagination immediately when found', async () => {
    const start = calls.length;
    assert.equal(
      (
        await CraftingstoreAPI.getPaymentByID(
          'a & b',
          'found',
          'cs-test-token',
          1,
        )
      )?.transactionId,
      'found',
    );
    assert.equal(calls.length - start, 2);
    assert.ok(calls.at(-1)?.includes('player=a%20%26%20b'));
  });
  it('settles empty, missing and failed searches', async () => {
    assert.equal(
      await CraftingstoreAPI.getPaymentByID(
        'empty',
        'missing',
        'cs-test-token',
        1,
      ),
      null,
    );
    assert.equal(
      await CraftingstoreAPI.getPaymentByID(
        'user',
        'missing',
        'cs-test-token',
        1,
      ),
      null,
    );
    await assert.rejects(
      CraftingstoreAPI.getPaymentByID('failed', 'missing', 'cs-test-token', 1),
    );
  });
  it('rejects HTTP errors without including response secrets', async () => {
    await assert.rejects(
      request(base + '/error'),
      (error: unknown) =>
        error instanceof APIError &&
        error.status === 429 &&
        !error.message.includes('secret'),
    );
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
