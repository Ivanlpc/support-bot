import { it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatInputCommandInteraction } from 'discord.js';
import { event } from '../events/interactionCreate';
import { client } from '..';
import { config } from '../config';
import Command from '../structures/Command';
import { respond } from '../API/Util/Respond';
import { command as giftcard } from '../commands/giftcard';

it('acknowledges giftcard creation publicly while keeping giftcard lists private, including command failures', async (t) => {
  assert.ok(
    giftcard
      .getData()
      .toJSON()
      .options?.some((option) => option.name === 'list'),
  );
  for (const [action, publicReply, failure] of [
    [config.Commands.giftcard.subcommand.create.name, true, false],
    [config.Commands.giftcard.subcommand.create.name, true, true],
    ['list', false, false],
    [config.Commands.giftcard.subcommand.recover.name, false, false],
  ] as const) {
    const deferrals: { ephemeral: boolean }[] = [];
    const replies: unknown[] = [];
    const interaction = {
      id: 'test-interaction',
      guildId: 'test-guild',
      commandName: config.Commands.giftcard.command_name,
      options: { getSubcommand: () => action },
      isRepliable: () => true,
      isChatInputCommand: () => true,
      deferred: false,
      replied: false,
      deferReply: async (options: { ephemeral: boolean }) => {
        deferrals.push(options);
        interaction.deferred = true;
      },
      editReply: async (options: unknown) => {
        replies.push(options);
      },
    };
    const mock = t.mock.method(
      client,
      'getCommand',
      () =>
        ({
          execute: async (
            _client: unknown,
            current: ChatInputCommandInteraction,
          ) => {
            if (failure) throw new Error('Test failure');
            await respond(current, {
              content: 'Giftcard response',
              ephemeral: !publicReply,
            });
          },
        }) as unknown as Command,
    );
    try {
      await event.execute(
        interaction as unknown as ChatInputCommandInteraction,
      );
      assert.deepEqual(deferrals, [{ ephemeral: !publicReply }]);
      assert.equal(replies.length, 1);
    } finally {
      mock.mock.restore();
    }
  }
});
