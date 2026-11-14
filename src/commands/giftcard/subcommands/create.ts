import Logger from '../../../API/Util/Logger';
import { respond } from '../../../API/Util/Respond';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
  GuildMember,
} from 'discord.js';
import SubCommand from '../../../structures/Subcommand';
import { getServerInformation } from '../../../API/Services/Guilds';
import { TebexAPI } from '../../../API/External/TebexAPI';
import { Embeds } from '../../../API/Util/Embeds';

import { config } from '../../../config';
import { messages } from '../../../messages';

const data = new SlashCommandSubcommandBuilder()
  .setName(config.Commands.giftcard.subcommand.create.name)
  .setDescription(config.Commands.giftcard.subcommand.create.description)
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setMinValue(1)
      .setDescription(
        config.Commands.giftcard.subcommand.create.requirement_amount,
      )
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription(
        config.Commands.giftcard.subcommand.create.non_required_user,
      )
      .setRequired(false),
  );

const execute = async (
  client: Client,
  interaction: ChatInputCommandInteraction,
) => {
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
    try {
      const request = await TebexAPI.createGiftcard(
        serverInfo.token,
        interaction.options.getInteger('amount', true),
        interaction.user.id,
        interaction.user.tag,
        interaction.options.getUser('user', false)?.id,
      );
      if ('error_code' in request) {
        return respond(interaction, {
          content: 'TEBEX: ' + request.error_message,
          ephemeral: true,
        });
      }
      if (request.data.code.length > 0) {
        return respond(interaction, {
          embeds: [
            Embeds.giftcard_embed(
              request.data.code,
              request.data.balance.starting,
              request.data.id.toString(),
              interaction.options.getUser('user', false)?.id,
              request.data.balance.currency,
            ),
          ],
        });
      }
      return respond(interaction, {
        content: messages.error_giftcard,
      });
    } catch (err) {
      Logger.error('Operation failed', err);
      return respond(interaction, {
        content: messages.command_error,
        ephemeral: true,
      });
    }
  }
};

const create = new SubCommand(data, execute);
export { create };
