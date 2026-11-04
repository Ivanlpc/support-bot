import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RepliableInteraction } from 'discord.js';
import { respond } from '../API/Util/Respond';

describe('Discord responses', () => {
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
