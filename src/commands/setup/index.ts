import Logger from '../../API/Util/Logger';
import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import {
  Client,
  ChatInputCommandInteraction,
  ButtonStyle,
  PermissionFlagsBits,
  ModalSubmitInteraction,
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

const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId('yes')
    .setLabel('SÍ')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId('no')
    .setLabel('NO')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Primary),
);

const modal = new ModalBuilder().setCustomId('secret').setTitle('Tebex');
const token_input = new TextInputBuilder()
  .setCustomId('inputSecret')
  .setLabel('Token secreto de Tebex')
  .setStyle(TextInputStyle.Short);
modal.addComponents(
  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    token_input,
  ),
);

function canSetup(
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
): boolean {
  return Boolean(
    interaction.guildId &&
    (interaction.guild?.ownerId === interaction.user.id ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)),
  );
}

export function createSetupCommand(service = { newGuild, updateToken }) {
  async function execute(
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) {
    if (!canSetup(interaction)) {
      return respond(interaction, {
        content: messages.setup_permission,
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
      const modalId = 'secret:' + interaction.id;
      await decision.showModal(
        ModalBuilder.from(modal.toJSON()).setCustomId(modalId),
      );
      const submission = await decision.awaitModalSubmit({
        filter: (i) =>
          i.customId === modalId && i.user.id === interaction.user.id,
        time: 60_000,
      });
      await submission.deferReply({ ephemeral: true });
      if (!canSetup(submission)) {
        return respond(submission, { content: messages.setup_permission });
      }
      try {
        const token = submission.fields.getTextInputValue('inputSecret');
        await service.newGuild(interaction.guildId, interaction.guild?.name);
        Logger.info('Saving Tebex setup');
        const updated = await service.updateToken(interaction.guildId, token);
        await respond(submission, {
          content: updated
            ? 'Configuración completada. El token de Tebex se ha guardado.'
            : messages.database_error,
        });
      } catch (error) {
        Logger.error('Tebex setup failed', error);
        await respond(submission, { content: messages.database_error });
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'InteractionCollectorError')
        throw error;
    } finally {
      await interaction.editReply({ components: [] }).catch(() => {});
    }
  }

  return new Command(data, enabled, execute);
}
const command = createSetupCommand();
export { command };
