import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import { Client, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { hasPermission } from '../../API/Services/Permissions';

import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { Embeds } from '../../API/Util/Embeds';
import Logger from '../../API/Util/Logger';

import { config } from '../../config';
import { messages } from '../../messages';

const data = new SlashCommandBuilder()
  .setName(config.Commands.search_transaction.command_name)
  .setDescription(config.Commands.search_transaction.command_description)
  .addStringOption((option) =>
    option
      .setName('id')
      .setDescription(
        config.Commands.search_transaction.command_requirements_id,
      )
      .setRequired(true),
  );

const enabled: boolean = config.Commands.search_transaction.enabled;

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (
    interaction.channel &&
    !interaction.channel.isDMBased() &&
    interaction.guildId &&
    interaction.member instanceof GuildMember
  ) {
    const serverInfo = await getServerInformation(interaction.guildId);
    if (serverInfo.setup === 0)
      return respond(interaction, {
        content: messages.setup_not_done,
        ephemeral: true,
      });
    const allowed: boolean = await hasPermission(interaction.member, 'search');
    if (!allowed) {
      return respond(interaction, {
        content: messages.no_permission,
        ephemeral: true,
      });
    }
    try {
      const request = await TebexAPI.getPaymentFromId(
        serverInfo.token,
        interaction.options.getString('id', true),
      );
      if (!Array.isArray(request)) {
        if (request.error_code) {
          return respond(interaction, {
            content: 'TEBEX: ' + request.error_message,
            ephemeral: true,
          });
        }
        return respond(interaction, {
          embeds: [Embeds.transaction_tebex_embed(request)],
        });
      }
      return respond(interaction, {
        content: messages.payment_not_found,
      });
    } catch (err) {
      Logger.error('Payment search failed', err);
      Logger.error('Error while TebexAPI getPaymentFromId in search command');
      return respond(interaction, {
        content: messages.command_error,
        ephemeral: true,
      });
    }
  }
}

const command = new Command(data, enabled, execute);
export { command };
