import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import Command from '../../structures/Command';
import Logger from '../../API/Util/Logger';
import { respond } from '../../API/Util/Respond';
import { config } from '../../config';

const data = new SlashCommandBuilder()
  .setName(config.Commands.logs.command_name)
  .setDescription(config.Commands.logs.command_description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export function createLogsCommand(service = { snapshot: Logger.snapshot }) {
  async function execute(
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) {
    if (
      !interaction.guildId ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      return respond(interaction, {
        content:
          'Solo los administradores del servidor pueden consultar los logs.',
        ephemeral: true,
      });
    }
    if (!interaction.deferred && !interaction.replied)
      await interaction.deferReply({ ephemeral: true });
    try {
      const maxBytes =
        Math.min(
          interaction.attachmentSizeLimit ?? 8 * 1024 * 1024,
          8 * 1024 * 1024,
        ) - 1024;
      const snapshot = service.snapshot(maxBytes);
      if (!snapshot.data.length)
        return respond(interaction, {
          content: 'Todavía no hay logs en esta ejecución.',
          ephemeral: true,
        });
      return respond(interaction, {
        content: snapshot.truncated
          ? 'Se adjunta la parte más reciente de latest.log por el límite de tamaño de Discord.'
          : 'Logs del bot desde el último inicio.',
        files: [new AttachmentBuilder(snapshot.data, { name: 'latest.log' })],
        ephemeral: true,
      });
    } catch (error) {
      Logger.error('Cannot send bot logs', error);
      return respond(interaction, {
        content: 'No se han podido leer los logs del bot.',
        ephemeral: true,
      });
    }
  }
  return new Command(data, config.Commands.logs.enabled, execute);
}

export const command = createLogsCommand();
