import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember
} from 'discord.js';
import { config } from '../..';
import { create } from './subcommands/create';
import { remove } from './subcommands/delete';
import { hasPermission } from '../../API/Services/Permissions';

const data = new SlashCommandBuilder()
	.setName(config.Commands.giftcard.command_name)
	.setDescription(config.Commands.giftcard.command_description)
	.addSubcommand(create.getData())
	.addSubcommand(remove.getData())

const enabled: boolean = config.Commands.giftcard.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
		const allowed: boolean = await hasPermission(interaction.member, config.Commands.giftcard.command_name);
		if (!allowed) {
			return interaction.reply({ content: config.Locale.no_permission, ephemeral: true })
		}
		if (interaction.options.getSubcommand() === 'create') {
			try {
				await create.execute(client, interaction)

			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.Locale.command_error, ephemeral: true })
			}
		} else {
			try {
				await remove.execute(client, interaction)

			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.Locale.command_error, ephemeral: true })
			}
		}
	}
}

const command = new Command(data, enabled, execute);
export { command }