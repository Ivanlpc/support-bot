import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction
} from 'discord.js';
import { config } from '../..';
import { Embeds } from '../../API/Util/Embeds';

const data = new SlashCommandBuilder()
	.setName(config.Commands.help.command_name)
	.setDescription(config.Commands.help.command_description)

const enabled: boolean = config.Commands.help.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	await interaction.reply({embeds: [Embeds.help_embed()]})
}

const command = new Command(data, enabled, execute);
export { command }