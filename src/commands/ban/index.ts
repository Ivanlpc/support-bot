import Logger from '../../API/Util/Logger';
import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import {
  Client,
  ChatInputCommandInteraction,
  GuildMember,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

import { hasPermission } from '../../API/Services/Permissions';
import { Embeds } from '../../API/Util/Embeds';
import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';

import { config } from '../../config';
import { messages } from '../../messages';

const modal = new ModalBuilder()
  .setCustomId('reason')
  .setTitle('Bloquear jugador');
const reason = new TextInputBuilder()
  .setCustomId('inputReason')
  .setLabel('Motivo del bloqueo')
  .setRequired(true)
  .setStyle(TextInputStyle.Paragraph);
const username = new TextInputBuilder()
  .setCustomId('inputUsername')
  .setLabel('Nombre del jugador:')
  .setRequired(true)
  .setStyle(TextInputStyle.Short);
const ip = new TextInputBuilder()
  .setCustomId('inputIP')
  .setLabel('Dirección IP')
  .setRequired(false)
  .setStyle(TextInputStyle.Short);
const ActionRow1 =
  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    username,
  );
const ActionRow2 =
  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(ip);
const ActionRow3 =
  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(reason);
modal.addComponents(ActionRow1, ActionRow2, ActionRow3);

const data = new SlashCommandBuilder()
  .setName(config.Commands.ban.command_name)
  .setDescription(config.Commands.ban.command_description);

const enabled: boolean = config.Commands.ban.enabled;

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guildId || !(interaction.member instanceof GuildMember))
    return;
  const modalId = 'reason:' + interaction.id;
  await interaction.showModal(
    ModalBuilder.from(modal.toJSON()).setCustomId(modalId),
  );
  let submission;
  try {
    submission = await interaction.awaitModalSubmit({
      filter: (i) =>
        i.customId === modalId && i.user.id === interaction.user.id,
      time: 60_000,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'InteractionCollectorError') {
      Logger.info('Ban form expired');
      return;
    }
    throw error;
  }
  await submission.deferReply({ ephemeral: true });
  try {
    const info = await getServerInformation(interaction.guildId);
    if (!info.setup)
      return respond(submission, { content: messages.setup_not_done });
    if (!(await hasPermission(interaction.member, 'ban')))
      return respond(submission, { content: messages.no_permission });
    const ip = submission.fields.getTextInputValue('inputIP');
    const result = await TebexAPI.createBan(
      info.token,
      submission.fields.getTextInputValue('inputUsername'),
      submission.fields.getTextInputValue('inputReason'),
      ip,
    );
    if ('data' in result) {
      Logger.info('Store ban created', { banId: result.data.id });
      return respond(submission, {
        embeds: [
          Embeds.ban_embed(
            result.data.user.ign,
            result.data.reason,
            result.data.id,
            ip,
          ),
        ],
      });
    }
    return respond(submission, { content: messages.command_error });
  } catch (error) {
    Logger.error('Store ban failed', error);
    return respond(submission, {
      content: messages.command_error + ' (referencia: ' + interaction.id + ')',
    });
  }
}

const command = new Command(data, enabled, execute);
export { command };
