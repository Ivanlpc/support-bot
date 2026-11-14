import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChatInputCommandInteraction,
  Client,
  InteractionReplyOptions,
  ModalBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import { createSetupCommand } from '../commands/setup';
import { command as search } from '../commands/search';
import { messages } from '../messages';

async function setup(
  options: {
    owner?: boolean;
    permissions?: bigint;
    guildId?: string | null;
    revoked?: boolean;
    cancel?: boolean;
    failSave?: boolean;
  } = {},
) {
  const replies: InteractionReplyOptions[] = [];
  const saved: unknown[][] = [];
  const modals: ModalBuilder[] = [];
  let cleaned = false;
  const identity = {
    guildId: options.guildId === undefined ? 'guild' : options.guildId,
    guild: { ownerId: options.owner ? 'user' : 'owner', name: 'Test server' },
    user: { id: 'user' },
    memberPermissions: new PermissionsBitField(options.permissions ?? 0n),
  };
  const submission = {
    ...identity,
    ...(options.revoked
      ? { memberPermissions: new PermissionsBitField() }
      : {}),
    customId: 'secret:interaction',
    deferred: false,
    fields: { getTextInputValue: () => 'test-tebex-token' },
    deferReply: async () => {
      submission.deferred = true;
    },
    editReply: async (reply: InteractionReplyOptions) => {
      replies.push(reply);
    },
  };
  const decision = {
    user: identity.user,
    customId: options.cancel ? 'no' : 'yes',
    isButton: () => true,
    update: async () => {},
    showModal: async (modal: ModalBuilder) => {
      modals.push(modal);
    },
    awaitModalSubmit: async ({
      filter,
    }: {
      filter: (value: unknown) => boolean;
    }) => {
      assert.equal(filter({ ...submission, customId: 'other' }), false);
      assert.equal(filter({ ...submission, user: { id: 'other' } }), false);
      assert.equal(filter(submission), true);
      return submission;
    },
  };
  const interaction = {
    ...identity,
    id: 'interaction',
    reply: async (reply: InteractionReplyOptions) => {
      replies.push(reply);
    },
    editReply: async () => {
      cleaned = true;
    },
    fetchReply: async () => ({
      awaitMessageComponent: async ({
        filter,
      }: {
        filter: (value: unknown) => boolean;
      }) => {
        assert.equal(filter({ user: { id: 'other' } }), false);
        assert.equal(filter(decision), true);
        return decision;
      },
    }),
  };
  const command = createSetupCommand({
    newGuild: async (...args) => {
      saved.push(['guild', ...args]);
      return true;
    },
    updateToken: async (...args) => {
      saved.push(['token', ...args]);
      return !options.failSave;
    },
  });
  await command.execute(
    {} as Client,
    interaction as unknown as ChatInputCommandInteraction,
  );
  return { replies, saved, modals, cleaned };
}

describe('Tebex setup', () => {
  for (const [name, options] of [
    ['server owner', { owner: true }],
    ['administrator', { permissions: PermissionFlagsBits.Administrator }],
  ] as const) {
    it(
      'lets the ' + name + ' save a Tebex token without selecting a provider',
      async () => {
        const result = await setup(options);
        assert.equal(result.modals.length, 1);
        assert.equal(result.modals[0].toJSON().title, 'Tebex');
        assert.deepEqual(result.saved, [
          ['guild', 'guild', 'Test server'],
          ['token', 'guild', 'test-tebex-token'],
        ]);
        assert.match(
          String(result.replies.at(-1)?.content),
          /token de Tebex se ha guardado/,
        );
        assert.equal(result.replies[0].ephemeral, true);
        assert.equal(result.cleaned, true);
      },
    );
  }
  for (const options of [
    {},
    { permissions: PermissionFlagsBits.ManageGuild },
    { owner: true, guildId: null },
  ]) {
    it(
      'rejects access without server ownership or Administrator: ' +
        JSON.stringify(options, (_, value) =>
          typeof value === 'bigint' ? String(value) : value,
        ),
      async () => {
        const result = await setup(options);
        assert.equal(result.replies[0].content, messages.setup_permission);
        assert.deepEqual(result.saved, []);
        assert.deepEqual(result.modals, []);
      },
    );
  }
  it('rechecks administrator permissions before saving the submitted token', async () => {
    const result = await setup({
      permissions: PermissionFlagsBits.Administrator,
      revoked: true,
    });
    assert.equal(result.modals.length, 1);
    assert.deepEqual(result.saved, []);
    assert.equal(result.replies.at(-1)?.content, messages.setup_permission);
    assert.equal(result.cleaned, true);
  });
  it('does not open the token form or save data when storage is declined', async () => {
    const result = await setup({ owner: true, cancel: true });
    assert.deepEqual(result.modals, []);
    assert.deepEqual(result.saved, []);
    assert.equal(result.cleaned, true);
  });
  it('reports a failed save instead of confirming setup', async () => {
    const result = await setup({ owner: true, failSave: true });
    assert.equal(result.replies.at(-1)?.content, messages.database_error);
  });
  it('searches a Tebex payment by transaction ID alone', () => {
    assert.deepEqual(
      search
        .getData()
        .toJSON()
        .options?.map((option) => option.name),
      ['id'],
    );
  });
});
