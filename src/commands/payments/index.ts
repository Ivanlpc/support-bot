import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember,
	StringSelectMenuBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { hasPermission } from '../../API/Services/Permissions';

import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { CraftingstoreAPI } from '../../API/External/CraftingstoreAPI';

const config = require("../../../config.json");
const messages = require("../../../messages.json");


const emojis: { [key: number]: string } = {
	1: '✅',
	3: '↩️',
	0: '❌'
};


const data = new SlashCommandBuilder()
	.setName(config.Commands.payments.command_name)
	.setDescription(config.Commands.payments.command_description)
	.addStringOption(option => option
		.setName('user')
		.setDescription(config.Commands.payments.command_requirements_user)
		.setRequired(true))


const enabled: boolean = config.Commands.payments.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
		
		const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: messages[serverInfo.lang].setup_not_done, ephemeral: true })
		const allowed: boolean = await hasPermission(interaction.member, config.Commands.payments.command_name);
		if (!allowed) {
			return interaction.reply({ content: messages[serverInfo.lang].no_permission, ephemeral: true })
		}
		if (serverInfo.type === 'tebex') {
			const request = await TebexAPI.getPaymentsFromUser(serverInfo.token, interaction.options.getString('user', true));
			if (("error_code" in (request))) {
				return interaction.reply({ content: "TEBEX: "+request.error_message, ephemeral: true })
			}
			if (request.payments.length === 0) {
				return interaction.reply({ content: messages[serverInfo.lang].no_payments_found, ephemeral: true })
			}

			const transactions = request.payments.slice(0, 25).map(elem => ({
				label: 'ID: ' + elem.txn_id.split('-')[1] + '... - ' + new Date(elem.time * 1000).toLocaleDateString(),
				value: elem.txn_id,
				emoji: {
					name: emojis[elem.status] || emojis[0]
				}
			}));
			let button = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('close')
					.setLabel(messages[serverInfo.lang].close)
					.setEmoji('❌')
					.setStyle(ButtonStyle.Primary)
			);
			let select_menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('payments;TB')
					.setPlaceholder(messages[serverInfo.lang].select_transaction)
					.addOptions(...transactions))
			return interaction.reply({ components: [select_menu, button] })
		}
		const request = await CraftingstoreAPI.getUserPayments(serverInfo.token, interaction.options.getString('user', true));

		if (!request.success) {
			return interaction.reply({ content: messages[serverInfo.lang].command_error, ephemeral: true })
		}
		if (request.data.length <= 0) {
			return interaction.reply({ content: messages[serverInfo.lang].no_payments_found })
		}
		const transactions = request.data.map(elem => ({
			label: (elem.packageName.length > 25 ? elem.packageName.substring(0, 25) + '...' : elem.packageName) + ' - ' + new Date(elem.timestamp * 1000).toLocaleDateString(),
			value: elem.inGameName + ';' + elem.transactionId
		}))
		let button = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
			.setCustomId('close')
			.setLabel(messages[serverInfo.lang].close)
			.setEmoji('❌')
			.setStyle(ButtonStyle.Primary)
		)
		let select_menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('payments;CS')
				.setPlaceholder(messages[serverInfo.lang].select_transaction)
				.addOptions(...transactions));
		await interaction.reply({ components: [select_menu, button] });
	}
}

const command = new Command(data, enabled, execute);
export { command }