import Logger from '../../API/Util/Logger';
import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import {
  Client,
  ChatInputCommandInteraction,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
} from 'discord.js';
import { Embeds } from '../../API/Util/Embeds';
import { newGuild, updateToken } from '../../API/Services/Guilds';

import { config } from '../../config';
import { messages } from '../../messages';

const data = new SlashCommandBuilder()
  .setName(config.Commands.setup.command_name)
  .setDescription(config.Commands.setup.command_description);

const enabled: boolean = config.Commands.setup.enabled;

const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('storeType')
    .setPlaceholder('SELECT YOUR STORE TYPE')
    .addOptions(
      {
        label: 'TEBEX',
        value: 'tebex',
        emoji: '™',
      },
      {
        label: 'CRAFTINGSTORE',
        value: 'craftingstore',
        emoji: '©',
      },
    ),
);

const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId('yes')
    .setLabel('YES')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId('no')
    .setLabel('NO')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Primary),
);

const modal = new ModalBuilder().setCustomId('secret').setTitle('API');
const token_input = new TextInputBuilder()
  .setCustomId('inputSecret')
  .setLabel('Secret token here')
  .setStyle(TextInputStyle.Short);
modal.addComponents(
  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    token_input,
  ),
);

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (
    !interaction.guildId ||
    interaction.guild?.ownerId !== interaction.user.id
  ) {
    return respond(interaction, {
      content: messages.EN.server_owner,
      ephemeral: true,
    });
  }
  await respond(interaction, {
    embeds: [Embeds.accepting_terms_embed()],
    components: [buttons],
    ephemeral: true,
  });
  const message = await interaction.fetchReply();
  const filter = (i: { user: { id: string } }) =>
    i.user.id === interaction.user.id;
  try {
    const decision = await message.awaitMessageComponent({
      filter,
      time: 60_000,
    });
    if (!decision.isButton() || decision.customId !== 'yes') {
      await decision.update({ components: [] });
      return;
    }
    await decision.update({
      embeds: [Embeds.select_store_embed()],
      components: [row],
    });
    const store = await message.awaitMessageComponent({ filter, time: 60_000 });
    if (!store.isStringSelectMenu() || store.customId !== 'storeType') return;
    const modalId = 'secret:' + interaction.id;
    await store.showModal(
      ModalBuilder.from(modal.toJSON()).setCustomId(modalId),
    );
    const submission = await store.awaitModalSubmit({
      filter: (i) =>
        i.customId === modalId && i.user.id === interaction.user.id,
      time: 60_000,
    });
    await submission.deferReply({ ephemeral: true });
    try {
      const token = submission.fields.getTextInputValue('inputSecret');
      await newGuild(interaction.guildId, interaction.guild?.name);
      Logger.info('Saving store setup', { provider: store.values[0] });
      const updated = await updateToken(
        interaction.guildId,
        token,
        store.values[0],
      );
      await respond(submission, {
        content: updated
          ? 'Setup done! The store token has been saved.'
          : messages.EN.database_error,
      });
    } catch (error) {
      Logger.error('Store setup failed', error);
      await respond(submission, { content: messages.EN.database_error });
    }
  } catch (error) {
    if ((error as { code?: string }).code !== 'InteractionCollectorError')
      throw error;
  } finally {
    await interaction.editReply({ components: [] }).catch(() => {});
  }
}

const command = new Command(data, enabled, execute);
export { command };
