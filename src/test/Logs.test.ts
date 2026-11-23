import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  InteractionReplyOptions,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import { command as logs, createLogsCommand } from '../commands/logs';
import { loadCommands } from '../commands';
import { config } from '../config';
import { client } from '..';
import { event } from '../events/interactionCreate';

async function fixture(
  options: {
    permissions?: bigint;
    guildId?: string | null;
    truncated?: boolean;
    empty?: boolean;
    fail?: boolean;
    deferred?: boolean;
    dispatch?: boolean;
  } = {},
) {
  const replies: InteractionReplyOptions[] = [];
  const deferrals: { ephemeral: boolean }[] = [];
  const sizes: number[] = [];
  const command = createLogsCommand({
    snapshot: (maxBytes) => {
      sizes.push(maxBytes);
      if (options.fail) throw new Error('test log unavailable');
      return {
        data: Buffer.from(options.empty ? '' : 'registro de prueba\n'),
        truncated: options.truncated ?? false,
      };
    },
  });
  const interaction = {
    id: 'logs-test',
    commandName: command.getData().name,
    isRepliable: () => true,
    isChatInputCommand: () => true,
    guildId: options.guildId === undefined ? 'guild' : options.guildId,
    memberPermissions:
      options.permissions === undefined
        ? null
        : new PermissionsBitField(options.permissions),
    attachmentSizeLimit: 4096,
    deferred: options.deferred ?? false,
    deferReply: async (reply: { ephemeral: boolean }) => {
      deferrals.push(reply);
      interaction.deferred = true;
    },
    reply: async (reply: InteractionReplyOptions) => {
      replies.push(reply);
    },
    editReply: async (reply: InteractionReplyOptions) => {
      replies.push(reply);
    },
  };
  if (options.dispatch) {
    client.pushCommand(command.getData().name, command);
    await event.execute(interaction as unknown as ChatInputCommandInteraction);
  } else {
    await command.execute(
      {} as Client,
      interaction as unknown as ChatInputCommandInteraction,
    );
  }
  return { command, replies, deferrals, sizes };
}

describe('/logs', () => {
  it('loads from the commands module and respects the enabled filter', async (t) => {
    const previous = config.Commands.perm.enabled;
    config.Commands.perm.enabled = false;
    try {
      assert.ok((await loadCommands()).includes(logs));
      t.mock.method(logs, 'getEnabled', () => false);
      assert.ok(!(await loadCommands()).includes(logs));
    } finally {
      config.Commands.perm.enabled = previous;
    }
  });
  it('dispatches through the command registry with a single private acknowledgement', async () => {
    const result = await fixture({
      permissions: PermissionFlagsBits.Administrator,
      dispatch: true,
    });
    assert.deepEqual(result.deferrals, [{ ephemeral: true }]);
    assert.deepEqual(result.sizes, [3072]);
    assert.equal(result.replies.length, 1);
    assert.equal(result.replies[0].files?.length, 1);
  });
  it('requires Administrator and sends latest.log with a private acknowledgement', async () => {
    const result = await fixture({
      permissions: PermissionFlagsBits.Administrator,
    });
    assert.equal(
      result.command.getData().toJSON().default_member_permissions,
      String(PermissionFlagsBits.Administrator),
    );
    assert.deepEqual(result.deferrals, [{ ephemeral: true }]);
    assert.deepEqual(result.sizes, [3072]);
    const attachment = result.replies[0].files?.[0] as AttachmentBuilder;
    assert.equal(attachment.name, 'latest.log');
    assert.equal(
      (attachment.attachment as Buffer).toString('utf8'),
      'registro de prueba\n',
    );
  });
  for (const options of [
    {},
    { permissions: PermissionFlagsBits.ManageGuild },
    { permissions: PermissionFlagsBits.Administrator, guildId: null },
  ]) {
    it(
      'denies access before reading logs: ' +
        JSON.stringify(options, (_, value) =>
          typeof value === 'bigint' ? String(value) : value,
        ),
      async () => {
        const result = await fixture(options);
        assert.deepEqual(result.sizes, []);
        assert.equal(result.replies[0].ephemeral, true);
        assert.equal(result.replies[0].files, undefined);
      },
    );
  }
  it('uses the dispatcher private deferral without acknowledging twice', async () => {
    const result = await fixture({
      permissions: PermissionFlagsBits.Administrator,
      deferred: true,
    });
    assert.deepEqual(result.deferrals, []);
    assert.equal(result.replies.length, 1);
    assert.equal(result.replies[0].files?.length, 1);
  });
  it('explains when only recent records fit the attachment', async () => {
    const result = await fixture({
      permissions: PermissionFlagsBits.Administrator,
      truncated: true,
    });
    assert.match(String(result.replies[0].content), /parte más reciente/);
  });
  it('handles empty logs and read failures without an attachment', async () => {
    for (const options of [{ empty: true }, { fail: true }]) {
      const result = await fixture({
        permissions: PermissionFlagsBits.Administrator,
        ...options,
      });
      assert.equal(result.replies[0].files, undefined);
      assert.match(
        String(result.replies[0].content),
        options.empty ? /Todavía no hay logs/ : /No se han podido leer/,
      );
    }
  });
});
