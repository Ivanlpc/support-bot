import { Client, StringSelectMenuInteraction } from 'discord.js';
import SelectMenu from '../../structures/SelectMenu';
import { getSession } from '../../API/Services/Pagination';
import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { messages } from '../../messages';
import { Embeds } from '../../API/Util/Embeds';
async function execute(
  client: Client,
  interaction: StringSelectMenuInteraction,
) {
  if (!interaction.guildId) return;
  const [, id] = interaction.customId.split(';');
  const session = getSession(id, interaction.user.id, interaction.guildId);
  if (session.kind !== 'payments') throw new Error('Invalid payment menu');
  const info = await getServerInformation(interaction.guildId);
  if (!info.setup) throw new Error('Tebex setup is missing');
  const transaction = interaction.values[0];
  const payment = await TebexAPI.getPaymentFromId(info.token, transaction);
  if (Array.isArray(payment))
    return interaction.editReply({
      content: messages.payment_not_found,
      embeds: [],
    });
  return interaction.editReply({
    content: '',
    embeds: [Embeds.transaction_tebex_embed(payment)],
  });
}
export const select_menu = new SelectMenu('payments', execute);
