import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import SubCommand from '../../../structures/Subcommand';
import { config } from '../../../config';
import { messages } from '../../../messages';
import { respond } from '../../../API/Util/Respond';
import { getServerInformation } from '../../../API/Services/Guilds';
import { TebexAPI } from '../../../API/External/TebexAPI';
import { arrayPages, createPager } from '../../../API/Services/Pagination';
const data = new SlashCommandSubcommandBuilder()
  .setName(config.Commands.giftcard.subcommand.recover.name)
  .setDescription(config.Commands.giftcard.subcommand.recover.description);
async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guildId) return;
  const info = await getServerInformation(interaction.guildId);
  if (!info.setup)
    return respond(interaction, {
      content: messages.setup_not_done,
      ephemeral: true,
    });
  const result = await TebexAPI.recoverGiftcard(
    info.token,
    interaction.user.id,
  );
  if ('error_code' in result)
    return respond(interaction, {
      content: result.error_message,
      ephemeral: true,
    });
  return respond(
    interaction,
    await createPager({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      kind: 'giftcards',
      load: arrayPages(
        result.map((card) => ({
          label:
            'Tarjeta regalo ' +
            card.id +
            ' | ' +
            card.balance.remaining +
            ' ' +
            card.balance.currency,
          value: card.id,
        })),
      ),
    }),
  );
}
export const recover = new SubCommand(data, execute);
