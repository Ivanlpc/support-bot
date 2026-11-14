import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Client,
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
} from 'discord.js';
import { createCommand } from '../commands/perm';
import * as permissions from '../API/Services/Permissions';

async function fixture(
  action: string,
  overrides: Partial<typeof permissions> = {},
) {
  const calls: unknown[][] = [];
  const replies: InteractionReplyOptions[] = [];
  const service = {
    ...permissions,
    getCommandChoices: async () => [{ name: 'Search Transactions', value: 1 }],
    hasPermission: async () => true,
    clearPermissions: async (
      ...args: Parameters<typeof permissions.clearPermissions>
    ) => {
      calls.push(['clear', ...args]);
      return 2;
    },
    listPermissions: async (
      ...args: Parameters<typeof permissions.listPermissions>
    ) => {
      calls.push(['list', ...args]);
      return [{ name: 'Search Transactions', value: 1, command: 'search' }];
    },
    searchPermission: async (
      ...args: Parameters<typeof permissions.searchPermission>
    ) => {
      calls.push(['search', ...args]);
      return [
        { id: 'target', name: 'Search Transactions', command: 'search' },
        { id: 'target', name: 'All Permissions', command: 'all' },
      ];
    },
    addPermission: async (
      ...args: Parameters<typeof permissions.addPermission>
    ) => {
      calls.push(['add', ...args]);
      return true;
    },
    removePermission: async (
      ...args: Parameters<typeof permissions.removePermission>
    ) => {
      calls.push(['remove', ...args]);
      return true;
    },
    ...overrides,
  };
  const { command } = await createCommand(service);
  const interaction = {
    id: 'interaction',
    guildId: 'guild',
    member: Object.create(GuildMember.prototype),
    deferred: false,
    replied: false,
    options: {
      getSubcommand: () => action,
      get: () => ({ value: 'target' }),
      getInteger: () => 1,
    },
    reply: async (options: InteractionReplyOptions) => {
      replies.push(options);
    },
  } as unknown as ChatInputCommandInteraction;
  return {
    command,
    interaction,
    calls,
    replies,
    run: () => command.execute({} as Client, interaction),
  };
}

describe('/perm management', () => {
  it('registers the five subcommands with the requested required arguments', async () => {
    const { command } = await fixture('list');
    const options = command.getData().toJSON().options!;
    assert.deepEqual(
      options.map((option) => option.name),
      ['add', 'remove', 'clear', 'list', 'search'],
    );
    for (const name of ['clear', 'list', 'search']) {
      const subcommand = options.find((option) => option.name === name)!;
      assert.ok('options' in subcommand);
      assert.equal(
        subcommand.options?.[0].name,
        name === 'search' ? 'perm' : 'id',
      );
      assert.equal(subcommand.options?.[0].required, true);
    }
  });
  it('clears only the selected target in the current guild', async () => {
    const test = await fixture('clear');
    await test.run();
    assert.deepEqual(test.calls, [['clear', 'guild', 'target']]);
    assert.ok(test.replies[0].content?.includes('Se han eliminado 2'));
    assert.ok(
      test.replies[0].content?.includes('heredando acceso de sus roles'),
    );
  });
  it('handles clearing a target without direct assignments', async () => {
    const test = await fixture('clear', { clearPermissions: async () => 0 });
    await test.run();
    assert.ok(test.replies[0].content?.includes('No hay permisos directos'));
  });
  it('lists direct grants and explains inherited access', async () => {
    const test = await fixture('list');
    await test.run();
    assert.deepEqual(test.calls, [['list', 'guild', 'target']]);
    assert.ok(
      test.replies[0].content?.includes('Search Transactions (search)'),
    );
    assert.ok(
      test.replies[0].content?.includes(
        'Solo se muestran asignaciones directas',
      ),
    );
  });
  it('groups search results when a target has both a direct grant and all', async () => {
    const test = await fixture('search');
    await test.run();
    assert.deepEqual(test.calls, [['search', 'guild', 1]]);
    assert.ok(test.replies[0].content?.includes('target: search, all'));
  });
  it('attaches complete large search results instead of truncating them', async () => {
    const test = await fixture('search', {
      searchPermission: async () =>
        Array.from({ length: 300 }, (_, index) => ({
          id: String(index),
          name: 'Search Transactions',
          command: 'search',
        })),
    });
    await test.run();
    assert.ok(test.replies[0].content?.includes('300 resultados'));
    assert.equal(test.replies[0].files?.length, 1);
    assert.ok((test.replies[0].content?.length ?? 0) <= 2000);
  });
  it('denies all subcommands before reading or modifying permission assignments', async () => {
    for (const action of ['add', 'remove', 'clear', 'list', 'search']) {
      const test = await fixture(action, { hasPermission: async () => false });
      await test.run();
      assert.deepEqual(test.calls, []);
      assert.equal(test.replies[0].ephemeral, true);
    }
  });
  it('preserves add and remove behavior', async () => {
    for (const action of ['add', 'remove']) {
      const test = await fixture(action);
      await test.run();
      assert.deepEqual(test.calls, [[action, 'guild', 'target', 1]]);
    }
  });
  it('reports empty list and search results', async () => {
    const list = await fixture('list', { listPermissions: async () => [] });
    await list.run();
    assert.ok(
      list.replies[0].content?.includes('No hay permisos directos asignados'),
    );
    const search = await fixture('search', {
      searchPermission: async () => [],
    });
    await search.run();
    assert.ok(search.replies[0].content?.includes('Ningún usuario o rol'));
  });
});
