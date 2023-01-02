import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember,

} from 'discord.js';
import { config } from '../..';
import { getCommandChoices, addPermission, removePermission } from '../../API/Services/Permissions';
import { hasPermission } from '../../API/Services/Permissions';

module.exports = (async function () {
	const perms = await getCommandChoices();

	const data = new SlashCommandBuilder()
		.setName(config.Commands.perm.command_name)
		.setDescription(config.Commands.perm.command_description)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add permission to the user / role')
				.addIntegerOption(option => option
					.setName('perm')
					.setDescription('Permission to add')
					.addChoices(...perms)
					.setRequired(true))
				.addMentionableOption(option => option
					.setName('id')
					.setDescription('User / role to add permission')
					.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove permission to the user / role')
				.addIntegerOption(option => option
					.setName('perm')
					.setDescription('Permission to remove')
					.addChoices(...perms)
					.setRequired(true))
				.addMentionableOption(option => option
					.setName('id')
					.setDescription('User / role to remove permission')
					.setRequired(true)))

	const enabled: boolean = config.Commands.perm.enabled;

	async function execute(client: Client, interaction: ChatInputCommandInteraction) {
		if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
			const allowed: boolean = await hasPermission(interaction.member, config.Commands.perm.command_name);
			if (!allowed) {
				return interaction.reply({ content: config.Locale.no_permission, ephemeral: true })
			}
			if (interaction.options.getSubcommand() === 'add') {
				try {
					const request = await addPermission(interaction.guildId, interaction.options.getMentionable('id', true).valueOf().toString(), interaction.options.getInteger('perm', true));
					if (request) {
						interaction.reply({ content: 'Permission added!' })
					} else {
						interaction.reply({ content: 'That user/role already has that permission' }) //Already in DB
					}
				} catch (err) {
					interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
				}

			} else {
				try {
					const request = await removePermission(interaction.guildId, interaction.options.getMentionable('id', true).valueOf().toString(), interaction.options.getInteger('perm', true));
					if (request) {
						interaction.reply({ content: 'Permission removed!' })
					} else {
						interaction.reply({ content: 'That user/role does not have permission' }) //Not in DB
					}
				} catch (err) {
					interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
				}
			}
		}
	}

	const command = new Command(data, enabled, execute);
	return { command }
})();
