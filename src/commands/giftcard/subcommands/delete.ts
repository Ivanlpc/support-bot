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
import Logger from '../../../API/Util/Logger';

import { config } from '../../../config';
import { messages } from '../../../messages';

const data = new SlashCommandSubcommandBuilder()
  .setName(config.Commands.giftcard.subcommand.delete.name)
  .setDescription(config.Commands.giftcard.subcommand.delete.description)
  .addStringOption((option) =>
    option
      .setName('id')
      .setDescription(config.Commands.giftcard.subcommand.delete.requirement_id)
      .setRequired(true),
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
        content: messages[serverInfo.lang].setup_not_done,
        ephemeral: true,
      });
    if (serverInfo.type === 'tebex') {
      try {
        const request = await TebexAPI.deleteGiftcard(
          serverInfo.token,
          interaction.options.getString('id', true),
        );

        if ('error_code' in request) {
          return respond(interaction, {
            content: 'TEBEX: ' + request.error_message,
            ephemeral: true,
          });
        }
        if (request.data.void) {
          return respond(interaction, {
            content: messages[serverInfo.lang].giftcard_deleted,
            ephemeral: false,
          });
        }
      } catch (err) {
        Logger.error('ERROR TebexAPI deleteGiftcard promise: ', err);

        return respond(interaction, {
          content: messages[serverInfo.lang].command_error,
          ephemeral: true,
        });
      }
    } else {
      return respond(interaction, {
        content: 'This command is not available in CraftingStore!',
        ephemeral: true,
      });

      //CraftingStore API is not working here! This command is coded based on their API docs, but it's not working
      // try {
      // 	const request = await CraftingstoreAPI.deleteGiftcard(serverInfo.token, interaction.options.getString('id', true));
      // 	if (!request.success) {
      // 		return respond(interaction, { content: messages[serverInfo.lang].giftcard_not_found })
      // 	} else {
      // 		return respond(interaction, { content: messages[serverInfo.lang].giftcard_deleted, ephemeral: false });
      // 	}
      // } catch (err) {
      // 	Logger.error('Operation failed', err);
      // 	return respond(interaction, { content: messages[serverInfo.lang].command_error, ephemeral: true })
      // }
    }
  }
};

const remove = new SubCommand(data, execute);
export { remove };
