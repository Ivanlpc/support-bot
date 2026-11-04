import { Client, StringSelectMenuInteraction } from 'discord.js';
import SelectMenu from '../../structures/SelectMenu';
import { getSession } from '../../API/Services/Pagination';
import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { requestPaymentByPage } from '../../API/External/CraftingstoreAPI';
import { Embeds } from '../../API/Util/Embeds';
async function execute(
  client: Client,
  interaction: StringSelectMenuInteraction,
) {
  if (!interaction.guildId) return;
  const [, kind, id, pageString] = interaction.customId.split(';');
  const session = getSession(id, interaction.user.id, interaction.guildId);
  const info = await getServerInformation(interaction.guildId);
  if (!info.setup) throw new Error('Store setup is missing');
  const transaction = interaction.values[0];
  if (kind === 'TB' && session.kind === 'TB' && info.type === 'tebex') {
    const payment = await TebexAPI.getPaymentFromId(info.token, transaction);
    if (Array.isArray(payment))
      return interaction.editReply({
        content: 'Payment not found',
        embeds: [],
      });
    return interaction.editReply({
      content: '',
      embeds: [Embeds.transaction_tebex_embed(payment, info.lang)],
    });
  }
  if (kind === 'CS' && session.kind === 'CS' && info.type === 'craftingstore') {
    const page = Number(pageString);
    if (!Number.isInteger(page) || page < 0 || page >= session.totalPages)
      throw new Error('Invalid payment page');
    const result = await requestPaymentByPage(
      session.player,
      info.token,
      page + 1,
    );
    if (!result.success) throw new Error('CraftingStore lookup failed');
    const payment = result.data.find(
      (payment) => payment.transactionId === transaction,
    );
    return interaction.editReply({
      content: payment ? '' : 'Payment not found',
      embeds: payment
        ? [Embeds.transaction_craftingstore_embed(payment, info.lang)]
        : [],
    });
  }
  throw new Error('Store configuration changed; run the command again');
}
export const select_menu = new SelectMenu('payments', execute);
