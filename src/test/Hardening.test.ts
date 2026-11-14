import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, registerSecret, logContext } from '../API/Util/Log';
import { loadConfig } from '../config';
import { parseResponse, tebexPayment } from '../API/External/Schemas';
import { healthy } from '../healthcheck';
import {
  arrayPages,
  createPager,
  getSession,
  renderPage,
  forgetSession,
  ExpiredSessionError,
} from '../API/Services/Pagination';
import { Embeds, text } from '../API/Util/Embeds';

describe('console logging', () => {
  it('keeps stacks and causes but removes secrets and emails', () => {
    registerSecret('known-test-credential');
    const error = new Error(
      'known-test-credential failed for user@example.com',
      { cause: new Error('Bearer bearer-secret') },
    );
    const output = JSON.stringify(
      sanitize({
        error,
        token: 'hidden',
        nested: { password: 'hidden' },
        count: 12n,
      }),
    );
    assert.ok(output.includes('stack'));
    for (const value of [
      'known-test-credential',
      'user@example.com',
      'bearer-secret',
      'hidden',
    ])
      assert.ok(!output.includes(value));
    assert.ok(output.includes('12'));
  });
  it('supports circular contexts without failing while reporting an error', () => {
    const data: { self?: unknown } = {};
    data.self = data;
    assert.ok(JSON.stringify(sanitize(data)).includes('Circular'));
  });
  it('isolates asynchronous interaction contexts', async () => {
    const contexts = await Promise.all(
      ['a', 'b'].map((id) =>
        logContext.run({ interactionId: id }, async () => {
          await Promise.resolve();
          return logContext.getStore()?.interactionId;
        }),
      ),
    );
    assert.deepEqual(contexts, ['a', 'b']);
    assert.equal(logContext.getStore(), undefined);
  });
});
describe('configuration and provider contracts', () => {
  it('deep merges partial command and database configuration', () => {
    const config = loadConfig(
      {
        Database: { host: 'db' },
        Commands: { giftcard: { subcommand: { create: { name: 'issue' } } } },
      },
      {},
    );
    assert.equal(config.Database.host, 'db');
    assert.equal(config.Commands.giftcard.subcommand.create.name, 'issue');
    assert.equal(config.Commands.giftcard.subcommand.recover.name, 'recover');
  });
  it('gives environment values priority and hides invalid values in errors', () => {
    assert.equal(
      loadConfig({ TOKEN: 'file' }, { DISCORD_TOKEN: 'env' }).TOKEN,
      'env',
    );
    assert.throws(
      () => loadConfig({ Database: { port: 'private-value' } }, {}),
      (error) =>
        error instanceof Error && !error.message.includes('private-value'),
    );
  });
  it('rejects malformed payments before they reach Discord embeds', () => {
    assert.throws(
      () => parseResponse(tebexPayment, { secret: 'private-value' }, 'payment'),
      (error) =>
        error instanceof Error && !error.message.includes('private-value'),
    );
  });
});
describe('menu pagination', () => {
  it('keeps items beyond the first 25 and checks ownership and server', async () => {
    const options = Array.from({ length: 61 }, (_, index) => ({
      label: 'Item ' + index,
      value: String(index),
    }));
    const initial = await createPager({
      userId: 'owner',
      guildId: 'guild',
      kind: 'payments',
      load: arrayPages(options),
    });
    const serialized = JSON.stringify(initial);
    const id = /payments;([a-f0-9-]+)/.exec(serialized)![1];
    try {
      assert.throws(
        () => getSession(id, 'other', 'guild'),
        ExpiredSessionError,
      );
      assert.throws(
        () => getSession(id, 'owner', 'other-guild'),
        ExpiredSessionError,
      );
      const next = await renderPage(getSession(id, 'owner', 'guild'), 2);
      assert.ok(JSON.stringify(next).includes('Item 60'));
      assert.ok(JSON.stringify(next).includes('Página 3 / 3'));
      await assert.rejects(renderPage(getSession(id, 'owner', 'guild'), 3));
    } finally {
      forgetSession(id);
    }
    assert.throws(() => getSession(id, 'owner', 'guild'), ExpiredSessionError);
  });
});
describe('Discord and container boundaries', () => {
  it('rejects stale, future and false readiness heartbeats', () => {
    assert.ok(healthy({ ready: true, time: 10_000 }, 20_000));
    for (const state of [
      { ready: false, time: 10_000 },
      { ready: true, time: 0 },
      { ready: true, time: 60_000 },
      {},
    ])
      assert.equal(healthy(state, 40_000), false);
  });
  it('caps embed fields and total text while handling empty values', () => {
    const value = 'x'.repeat(10_000);
    const result = Embeds.ban_embed(value, value, value, value).toJSON();
    assert.ok((result.title?.length ?? 0) <= 256);
    assert.ok(
      result.fields?.every(
        (field) => field.name.length <= 256 && field.value.length <= 1024,
      ),
    );
    assert.ok(JSON.stringify(result).length < 6500);
    assert.equal(text(''), 'Sin datos');
  });
});

it('rejects unknown database options instead of silently using defaults', () => {
  assert.throws(
    () => loadConfig({ Database: { unknownOption: true } }, {}),
    /Database/,
  );
});
