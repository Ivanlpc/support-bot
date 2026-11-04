import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import { Client, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { create } from './subcommands/create';
import { remove } from './subcommands/delete';
import { recover } from './subcommands/recover';
import { hasPermission } from '../../API/Services/Permissions';
import Logger from '../../API/Util/Logger';

import { config } from '../../config';
import { messages } from '../../messages';

const data = new SlashCommandBuilder()
  .setName(config.Commands.giftcard.command_name)
  .setDescription(config.Commands.giftcard.command_description)
  .addSubcommand(create.getData())
  .addSubcommand(remove.getData())
  .addSubcommand(recover.getData());

const enabled: boolean = config.Commands.giftcard.enabled;

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
    const selected = interaction.options.getSubcommand();
    const subcommands = config.Commands.giftcard.subcommand;
    const action =
      selected === subcommands.create.name
        ? 'create'
        : selected === subcommands.delete.name
          ? 'delete'
          : 'recover';
    const allowed =
      action === 'recover' ||
      (await hasPermission(interaction.member, 'giftcard.' + action));
    if (!allowed) {
      return respond(interaction, {
        content: messages.EN.no_permission,
        ephemeral: true,
      });
    }
    if (action === 'create') {
      try {
        await create.execute(client, interaction);
      } catch (err) {
        Logger.error('Giftcard creation failed', err);

        return respond(interaction, {
          content: messages.EN.command_error,
          ephemeral: true,
        });
      }
    } else if (action === 'delete') {
      try {
        await remove.execute(client, interaction);
      } catch (err) {
        Logger.error('Giftcard deletion failed', err);

        return respond(interaction, {
          content: messages.EN.command_error,
          ephemeral: true,
        });
      }
    } else {
      try {
        await recover.execute(client, interaction);
      } catch (err) {
        Logger.error('Giftcard recovery failed', err);
        return respond(interaction, {
          content: messages.EN.command_error,
          ephemeral: true,
        });
      }
    }
  }
}

const command = new Command(data, enabled, execute);
export { command };
