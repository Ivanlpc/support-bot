import { Client, StringSelectMenuInteraction } from 'discord.js';
import SelectMenu from '../../structures/SelectMenu';
import { getSession } from '../../API/Services/Pagination';
import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { Embeds } from '../../API/Util/Embeds';
import { respond } from '../../API/Util/Respond';
async function execute(
  client: Client,
  interaction: StringSelectMenuInteraction,
) {
  if (!interaction.guildId) return;
  await interaction.deferReply({ ephemeral: true });
  const session = getSession(
    interaction.customId.split(';')[2],
    interaction.user.id,
    interaction.guildId,
  );
  if (session.kind !== 'GC') throw new Error('Invalid giftcard menu');
  const info = await getServerInformation(interaction.guildId);
  if (!info.setup || info.type !== 'tebex')
    throw new Error('Tebex setup is missing');
  const result = await TebexAPI.recoverGiftcard(
    info.token,
    interaction.user.id,
  );
  if ('error_code' in result)
    return respond(interaction, { content: result.error_message });
  const card = result.find((card) => card.id === interaction.values[0]);
  if (!card)
    return respond(interaction, { content: 'Giftcard is no longer available' });
  return respond(interaction, {
    embeds: [
      Embeds.giftcard_embed(
        card.code,
        card.balance.remaining,
        card.id,
        info.lang,
        interaction.user.id,
        card.balance.currency,
      ),
    ],
  });
}
export const select_menu = new SelectMenu('giftcard', execute);
