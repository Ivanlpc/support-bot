import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import { Client, ChatInputCommandInteraction } from 'discord.js';
import { Embeds } from '../../API/Util/Embeds';

import { config } from '../../config';

const data = new SlashCommandBuilder()
  .setName(config.Commands.help.command_name)
  .setDescription(config.Commands.help.command_description);

const enabled: boolean = config.Commands.help.enabled;

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  await respond(interaction, { embeds: [Embeds.help_embed()] });
}

const command = new Command(data, enabled, execute);
export { command };
