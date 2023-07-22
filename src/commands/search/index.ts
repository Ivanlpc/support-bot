import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember
} from 'discord.js';
import { hasPermission } from '../../API/Services/Permissions';

import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { CraftingstoreAPI } from '../../API/External/CraftingstoreAPI';
import { Embeds } from '../../API/Util/Embeds';
import Logger from '../../API/Util/Logger';

const config = require("../../../config.json");
const messages = require("../../../messages.json");


const data = new SlashCommandBuilder()
	.setName(config.Commands.search_transaction.command_name)
	.setDescription(config.Commands.search_transaction.command_description)
	.addStringOption(option => option
		.setName('id')
		.setDescription(config.Commands.search_transaction.command_requirements_id)
		.setRequired(true))
	.addStringOption(option => option
		.setName('user')
		.setDescription(config.Commands.search_transaction.command_requirements_user)
		.setRequired(false))
	

const enabled: boolean = config.Commands.search_transaction.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
		
		const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: messages[serverInfo.lang].setup_not_done, ephemeral: true })
		const allowed: boolean = await hasPermission(interaction.member, config.Commands.search_transaction.command_name);
		if (!allowed) {
			return interaction.reply({ content: messages[serverInfo.lang].no_permission, ephemeral: true })
		}
		if (serverInfo.type === 'tebex') {
			try {
				const request = await TebexAPI.getPaymentFromId(serverInfo.token, interaction.options.getString('id', true));
				if (!Array.isArray(request)) {
					if (request.error_code) {
						return interaction.reply({ content: "TEBEX: "+request.error_message, ephemeral: true })
					}
					return interaction.reply({ embeds: [Embeds.transaction_tebex_embed(request, serverInfo.lang)] })
				}
				return interaction.reply({ content: messages[serverInfo.lang].payment_not_found })
			} catch (err) {
				Logger.error("Error while TebexAPI getPaymentFromId in search command");
				return interaction.reply({ content: messages[serverInfo.lang].command_error, ephemeral: true })
			}
		} else {
			let user = interaction.options.getString('user', false);
			if(!user) return interaction.reply({content: messages[serverInfo.lang].user_required_craftingstore, ephemeral: true})
			try {
				const request = await CraftingstoreAPI.getPaymentByID(interaction.options.getString('user', true), interaction.options.getString('id', true), serverInfo.token, 1);
				if (request === null) {

					return interaction.reply({ content: messages[serverInfo.lang].payment_not_found })
				} else {
					return interaction.reply({ embeds: [Embeds.transaction_craftingstore_embed(request, serverInfo.lang)] })

				}
			} catch (err) {
				return interaction.reply({ content: messages[serverInfo.lang].command_error + ". Probably an invalid Craftingstore token was provided", ephemeral: true })
			}

		}
	}
}

const command = new Command(data, enabled, execute);
export { command }