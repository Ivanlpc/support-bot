import {
  SlashCommandBuilder,
  Client,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import Command from '../../structures/Command';
import { config } from '../../config';
import { messages } from '../../messages';
import { respond } from '../../API/Util/Respond';
import { hasPermission } from '../../API/Services/Permissions';
import { getServerInformation } from '../../API/Services/Guilds';
import { createPager, arrayPages } from '../../API/Services/Pagination';
import { TebexAPI } from '../../API/External/TebexAPI';

const data = new SlashCommandBuilder()
  .setName(config.Commands.payments.command_name)
  .setDescription(config.Commands.payments.command_description)
  .addStringOption((option) =>
    option
      .setName('user')
      .setDescription(config.Commands.payments.command_requirements_user)
      .setRequired(true)
      .setMaxLength(64),
  );
async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guildId || !(interaction.member instanceof GuildMember))
    return;
  if (!(await hasPermission(interaction.member, 'payments')))
    return respond(interaction, {
      content: messages.no_permission,
      ephemeral: true,
    });
  const info = await getServerInformation(interaction.guildId);
  if (!info.setup)
    return respond(interaction, {
      content: messages.setup_not_done,
      ephemeral: true,
    });
  const player = interaction.options.getString('user', true);
  const guildId = interaction.guildId;
  const result = await TebexAPI.getPaymentsFromUser(info.token, player);
  if ('error_code' in result) throw new Error('Tebex payment lookup failed');
  if (!result.payments.length)
    return respond(interaction, {
      content: messages.no_payments_found,
    });
  return respond(
    interaction,
    await createPager({
      userId: interaction.user.id,
      guildId,
      kind: 'payments',
      load: arrayPages(
        result.payments.map((payment) => ({
          label:
            payment.txn_id +
            ' | ' +
            new Date(payment.time * 1000).toLocaleDateString('es-ES'),
          value: payment.txn_id,
        })),
      ),
    }),
  );
}
export const command = new Command(
  data,
  config.Commands.payments.enabled,
  execute,
);
