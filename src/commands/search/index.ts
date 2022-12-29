import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember
} from 'discord.js';
import { config } from '../..';
import { hasPermission } from '../../API/Services/Permissions';

import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { CraftingstoreAPI } from '../../API/External/CraftingstoreAPI';
import { Embeds } from '../../API/Util/Embeds';

const data = new SlashCommandBuilder()
	.setName(config.Commands.search_transaction.command_name)
	.setDescription(config.Commands.search_transaction.command_description)
	.addStringOption(option => option
		.setName('user')
		.setDescription(config.Commands.search_transaction.command_requirements_user)
		.setRequired(true))
	.addStringOption(option => option
		.setName('id')
		.setDescription(config.Commands.search_transaction.command_requirements_id)
		.setRequired(true))

const enabled: boolean = config.Commands.search_transaction.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
		const allowed: boolean = await hasPermission(interaction.member, config.Commands.search_transaction.command_name);
		if (!allowed) {
			return interaction.reply({ content: config.Locale.no_permission, ephemeral: true })
		}
		const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {
			try {
				const request = await TebexAPI.getPaymentFromId(serverInfo.token, interaction.options.getString('id', true));
				if (!Array.isArray(request)) {
					if (request.error_code) {
						return interaction.reply({ content: request.error_message, ephemeral: true })
					}
					return interaction.reply({ embeds: [Embeds.transaction_tebex_embed(request)] })
				}
				return interaction.reply({ content: config.Locale.payment_not_found })
			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.command_error, ephemeral: true })
			}
		} else {
			try {
				const request = await CraftingstoreAPI.getPaymentByID(interaction.options.getString('user', true), interaction.options.getString('id', true), serverInfo.token, 1);
				if (request === null) {

					return interaction.reply({ content: config.Locale.payment_not_found })
				} else {
					return interaction.reply({ embeds: [Embeds.transaction_craftingstore_embed(request)] })

				}
			} catch (err) {
				return interaction.reply({ content: config.Locale.command_error + ". Probably an invalid Craftingstore token was provided", ephemeral: true })
			}

		}
	}
}

const command = new Command(data, enabled, execute);
export { command }