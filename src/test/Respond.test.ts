import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RepliableInteraction } from 'discord.js';
import { respond } from '../API/Util/Respond';

describe('Discord responses', () => {
  it('preserves an explicitly public follow-up', async () => {
    let reply: unknown;
    await respond(
      {
        deferred: false,
        replied: true,
        followUp: async (options: unknown) => {
          reply = options;
        },
      } as unknown as RepliableInteraction,
      { content: 'Public giftcard', ephemeral: false },
    );
    assert.deepEqual(reply, { content: 'Public giftcard', ephemeral: false });
  });
  for (const state of ['fresh', 'deferred', 'replied']) {
    it('responds correctly when ' + state, async () => {
      const calls: { method: string; options: unknown }[] = [];
      const record = (method: string) => async (options: unknown) => {
        calls.push({ method, options });
      };
      const interaction = {
        deferred: state === 'deferred',
        replied: state === 'replied',
        reply: record('reply'),
        editReply: record('editReply'),
        followUp: record('followUp'),
      } as unknown as RepliableInteraction;
      await respond(interaction, { content: 'response', ephemeral: true });
      assert.deepEqual(calls, [
        {
          method:
            state === 'deferred'
              ? 'editReply'
              : state === 'replied'
                ? 'followUp'
                : 'reply',
          options:
            state === 'deferred'
              ? { content: 'response' }
              : { content: 'response', ephemeral: true },
        },
      ]);
    });
  }
});
