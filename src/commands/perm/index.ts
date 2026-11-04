import {
  AttachmentBuilder,
  SlashCommandBuilder,
  Client,
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
} from 'discord.js';
import Command from '../../structures/Command';
import { config } from '../../config';
import { messages } from '../../messages';
import { respond } from '../../API/Util/Respond';
import Logger from '../../API/Util/Logger';
import * as permissions from '../../API/Services/Permissions';

function report(
  title: string,
  lines: string[],
  note: string,
): InteractionReplyOptions {
  const content = [title, ...lines, note].filter(Boolean).join('\n');
  if (content.length <= 2000) return { content, ephemeral: true };
  return {
    content:
      title +
      '\n' +
      note +
      '\nFull results attached (' +
      lines.length +
      ' entries).',
    files: [
      new AttachmentBuilder(Buffer.from(content, 'utf8'), {
        name: 'permissions.txt',
      }),
    ],
    ephemeral: true,
  };
}

export async function createCommand(service = permissions) {
  const choices = await service.getCommandChoices();
  const data = new SlashCommandBuilder()
    .setName(config.Commands.perm.command_name)
    .setDescription(config.Commands.perm.command_description);
  for (const action of ['add', 'remove'] as const) {
    data.addSubcommand((subcommand) =>
      subcommand
        .setName(action)
        .setDescription(
          action === 'add'
            ? 'Add permission to a user / role'
            : 'Remove permission from a user / role',
        )
        .addIntegerOption((option) =>
          option
            .setName('perm')
            .setDescription('Permission')
            .addChoices(...choices)
            .setRequired(true),
        )
        .addMentionableOption((option) =>
          option.setName('id').setDescription('User / role').setRequired(true),
        ),
    );
  }
  for (const action of ['clear', 'list'] as const) {
    data.addSubcommand((subcommand) =>
      subcommand
        .setName(action)
        .setDescription(
          action === 'clear'
            ? 'Remove all direct permission assignments from a user / role'
            : 'List direct permission assignments for a user / role',
        )
        .addMentionableOption((option) =>
          option.setName('id').setDescription('User / role').setRequired(true),
        ),
    );
  }
  data.addSubcommand((subcommand) =>
    subcommand
      .setName('search')
      .setDescription(
        'Find users / roles granted a permission, including all permissions',
      )
      .addIntegerOption((option) =>
        option
          .setName('perm')
          .setDescription('Permission to find')
          .addChoices(...choices)
          .setRequired(true),
      ),
  );

  async function execute(
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) {
    if (!interaction.guildId || !(interaction.member instanceof GuildMember))
      return;
    const action = interaction.options.getSubcommand();
    try {
      if (!(await service.hasPermission(interaction.member, 'perm')))
        return respond(interaction, {
          content: messages.EN.no_permission,
          ephemeral: true,
        });
      if (action === 'search') {
        const permission = interaction.options.getInteger('perm', true);
        const selected = choices.find((choice) => choice.value === permission);
        if (!selected)
          return respond(interaction, {
            content: 'Unknown permission. Run the command again.',
            ephemeral: true,
          });
        const holders = await service.searchPermission(
          interaction.guildId,
          permission,
        );
        const grouped = new Map<string, Set<string>>();
        for (const holder of holders) {
          const grants = grouped.get(holder.id) ?? new Set<string>();
          grants.add(holder.command);
          grouped.set(holder.id, grants);
        }
        const lines = Array.from(
          grouped,
          ([id, grants]) => id + ': ' + [...grants].join(', '),
        );
        return respond(
          interaction,
          report(
            'Permission: ' + selected.name,
            lines.length
              ? lines
              : ['No users or roles have this permission assigned.'],
            'IDs refer to users or roles. Includes assignments through all; the server owner also has implicit access.',
          ),
        );
      }
      const id = interaction.options.get('id', true).value;
      if (typeof id !== 'string') throw new Error('Invalid permission target');
      if (action === 'list') {
        const assignments = await service.listPermissions(
          interaction.guildId,
          id,
        );
        return respond(
          interaction,
          report(
            'Direct permissions for ' + id,
            assignments.length
              ? assignments.map(
                  (assignment) =>
                    assignment.name + ' (' + assignment.command + ')',
                )
              : ['No direct permissions assigned.'],
            'This lists direct assignments only. Users may also inherit access from roles; the server owner always has access.',
          ),
        );
      }
      if (action === 'clear') {
        const removed = await service.clearPermissions(interaction.guildId, id);
        return respond(interaction, {
          content:
            (removed
              ? 'Removed ' +
                removed +
                ' direct permission assignment(s) from ' +
                id +
                '.'
              : 'No direct permissions to remove from ' + id + '.') +
            ' Other assignments are unchanged. Users may still inherit access from roles; the server owner always has access.',
          ephemeral: true,
        });
      }
      const permission = interaction.options.getInteger('perm', true);
      if (action === 'add') {
        const added = await service.addPermission(
          interaction.guildId,
          id,
          permission,
        );
        return respond(interaction, {
          content: added
            ? 'Permission added!'
            : 'That user/role already has that permission',
          ephemeral: true,
        });
      }
      if (action === 'remove') {
        const removed = await service.removePermission(
          interaction.guildId,
          id,
          permission,
        );
        return respond(interaction, {
          content: removed
            ? 'Permission removed!'
            : 'That user/role does not have that direct permission',
          ephemeral: true,
        });
      }
      throw new Error('Unknown permission subcommand');
    } catch (error) {
      Logger.error(
        'Permission operation failed',
        { action, guildId: interaction.guildId },
        error,
      );
      return respond(interaction, {
        content:
          messages.EN.database_error + ' (reference: ' + interaction.id + ')',
        ephemeral: true,
      });
    }
  }
  return { command: new Command(data, config.Commands.perm.enabled, execute) };
}
