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
      '\nResultados completos adjuntos (' +
      lines.length +
      ' resultados).',
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
            ? 'Añade un permiso a un usuario o rol'
            : 'Retira un permiso a un usuario o rol',
        )
        .addIntegerOption((option) =>
          option
            .setName('perm')
            .setDescription('Permiso')
            .addChoices(...choices)
            .setRequired(true),
        )
        .addMentionableOption((option) =>
          option
            .setName('id')
            .setDescription('Usuario o rol')
            .setRequired(true),
        ),
    );
  }
  for (const action of ['clear', 'list'] as const) {
    data.addSubcommand((subcommand) =>
      subcommand
        .setName(action)
        .setDescription(
          action === 'clear'
            ? 'Elimina todos los permisos directos de un usuario o rol'
            : 'Lista los permisos directos de un usuario o rol',
        )
        .addMentionableOption((option) =>
          option
            .setName('id')
            .setDescription('Usuario o rol')
            .setRequired(true),
        ),
    );
  }
  data.addSubcommand((subcommand) =>
    subcommand
      .setName('search')
      .setDescription(
        'Busca usuarios o roles con un permiso, incluido el permiso total',
      )
      .addIntegerOption((option) =>
        option
          .setName('perm')
          .setDescription('Permiso que quieres buscar')
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
          content: messages.no_permission,
          ephemeral: true,
        });
      if (action === 'search') {
        const permission = interaction.options.getInteger('perm', true);
        const selected = choices.find((choice) => choice.value === permission);
        if (!selected)
          return respond(interaction, {
            content: 'Permiso desconocido. Ejecuta el comando de nuevo.',
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
            'Permiso: ' + selected.name,
            lines.length
              ? lines
              : ['Ningún usuario o rol tiene asignado este permiso.'],
            'Los IDs corresponden a usuarios o roles. Incluye asignaciones mediante all; el propietario del servidor también tiene acceso implícito.',
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
            'Permisos directos de ' + id,
            assignments.length
              ? assignments.map(
                  (assignment) =>
                    assignment.name + ' (' + assignment.command + ')',
                )
              : ['No hay permisos directos asignados.'],
            'Solo se muestran asignaciones directas. Los usuarios también pueden heredar acceso de sus roles; el propietario siempre tiene acceso.',
          ),
        );
      }
      if (action === 'clear') {
        const removed = await service.clearPermissions(interaction.guildId, id);
        return respond(interaction, {
          content:
            (removed
              ? 'Se han eliminado ' +
                removed +
                ' asignaciones directas de permisos de ' +
                id +
                '.'
              : 'No hay permisos directos que eliminar de ' + id + '.') +
            ' Los usuarios pueden seguir heredando acceso de sus roles; el propietario siempre tiene acceso.',
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
            ? 'Permiso añadido.'
            : 'Ese usuario o rol ya tiene ese permiso',
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
            ? 'Permiso retirado.'
            : 'Ese usuario o rol no tiene ese permiso directo',
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
          messages.database_error + ' (referencia: ' + interaction.id + ')',
        ephemeral: true,
      });
    }
  }
  return { command: new Command(data, config.Commands.perm.enabled, execute) };
}
