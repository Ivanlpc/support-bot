import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GatewayIntentBits,
  GuildMember,
  Partials,
  PartialGuildMember,
} from 'discord.js';
import Bot from '../structures/Bot';
import { createMemberRemoveEvent } from '../events/guildMemberRemove';

describe('departed member permission cleanup', () => {
  it('requests member departures, including members not cached by the bot', async () => {
    const bot = new Bot();
    try {
      assert.equal(
        bot.options.intents.has(GatewayIntentBits.GuildMembers),
        true,
      );
      assert.equal(bot.options.partials?.includes(Partials.GuildMember), true);
    } finally {
      await bot.destroy();
    }
  });

  for (const partial of [false, true]) {
    it(
      'clears only the departed user in their guild with partial=' + partial,
      async () => {
        const calls: string[][] = [];
        const event = createMemberRemoveEvent(async (guildId, userId) => {
          calls.push([guildId, userId]);
          return 2;
        });
        const member = {
          id: 'departed-user',
          guild: { id: 'departed-guild' },
          partial,
        } as GuildMember | PartialGuildMember;
        assert.equal(event.getName(), 'guildMemberRemove');
        await event.execute(member);
        assert.deepEqual(calls, [['departed-guild', 'departed-user']]);
      },
    );
  }

  it('handles departures without direct permission assignments', async () => {
    const event = createMemberRemoveEvent(async () => 0);
    await event.execute({
      id: 'user',
      guild: { id: 'guild' },
    } as PartialGuildMember);
  });

  it('propagates database failures to the central event error handler', async () => {
    const failure = new Error('database unavailable');
    const event = createMemberRemoveEvent(async () => {
      throw failure;
    });
    await assert.rejects(async () => {
      await event.execute({
        id: 'user',
        guild: { id: 'guild' },
      } as PartialGuildMember);
    }, failure);
  });
});
