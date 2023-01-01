import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	GuildMember,
	StringSelectMenuBuilder,
	ActionRowBuilder
} from 'discord.js';
import { config } from '../..';
import { hasPermission } from '../../API/Services/Permissions';

import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';
import { CraftingstoreAPI } from '../../API/External/CraftingstoreAPI';
import { Embeds } from '../../API/Util/Embeds';




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
		const allowed: boolean = await hasPermission(interaction.member, config.Commands.payments.command_name);
		if (!allowed) {
			return interaction.reply({ content: config.Locale.no_permission, ephemeral: true })
		}
		const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {
			const request = await TebexAPI.getPaymentsFromUser(serverInfo.token, interaction.options.getString('user', true));
			if (("error_code" in (request))) {
				return interaction.reply({ content: request.error_message, ephemeral: true })
			}
			if (request.payments.length === 0) {
				return interaction.reply({ content: config.Locale.no_payments_found, ephemeral: true })
			}
			const filter = (d: any) => {
				if (d.user.id) {
					if (d.user.id === interaction.user.id) return true;
				}
				try {
					d.reply({ content: config.Locale.different_user, ephemeral: true })
				} catch (err) { }
				return false;
			}
			const transactions = request.payments.map(elem => ({ label: 'ID: ' + elem.txn_id + ' - ' + new Date(elem.time * 1000).toLocaleDateString(), value: elem.txn_id }))
			let select_menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('paymentsTB')
					.setPlaceholder('SELECT TRANSACTION')
					.addOptions(...transactions))
			interaction.reply({ components: [select_menu] })
			const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
			collector.on('collect', async interaction2 => {
				interaction2.deferUpdate();
				if (interaction2.isStringSelectMenu() && interaction2.customId === 'paymentsTB') {
					let transaction_id = interaction2.values[interaction2.values.length - 1];
					let req = await TebexAPI.getPaymentFromId(serverInfo.token, transaction_id);
					if (!Array.isArray(req) && !req.error_code) {

						interaction.editReply({ embeds: [Embeds.transaction_tebex_embed(req)], components: [select_menu] })

					} else {
						interaction.editReply({ content: config.Locale.command_error })
					}
				}
			})
			collector.on('end', async () => {
				interaction.fetchReply().then(async () => await interaction.editReply({ content: 'Timeout reached', components: [] })).catch(() => { });
			})
		}
		const request = await CraftingstoreAPI.getUserPayments(serverInfo.token, interaction.options.getString('user', true));

		if (!request.success) {
			return interaction.reply({ content: config.Locale.command_error, ephemeral: true })
		}
		if(request.data.length >= 0) {
			return interaction.reply({content: config.Locale.no_payments_found})
		}
		const transactions = request.data.map(elem => ({
			label: (elem.packageName.length > 35 ? elem.packageName.substring(0, 35) +'...' : elem.packageName) + ' - ' + new Date(elem.timestamp * 1000).toLocaleDateString(),
			value: elem.transactionId
		}))
		let select_menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('paymentsCS')
				.setPlaceholder('SELECT TRANSACTION')
				.addOptions(...transactions))
		const filter = (d: any) => {
			if (d.user.id) {
				if (d.user.id === interaction.user.id) return true;
			}
			try {
				d.reply({ content: config.Locale.different_user, ephemeral: true })
			} catch (err) { }
			return false;
		}
		await interaction.reply({ components: [select_menu] })
		const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
		collector.on('collect', async interaction2 => {
			interaction2.deferUpdate();
			if (interaction2.isStringSelectMenu() && interaction2.customId === 'paymentsCS') {
				let transaction = request.data.find(elem => elem.transactionId === interaction2.values[interaction2.values.length - 1]);
				if (!transaction) {
					interaction.editReply({ content: config.Locale.command_error });
					return;
				}
				interaction.editReply({ embeds: [Embeds.transaction_craftingstore_embed(transaction)], components: [select_menu] });
				return;
			}
		})
		collector.on('end', async () => {
			interaction.fetchReply().then(async () => await interaction.editReply({ content: 'Timeout reached', components: [] })).catch(() => { });
		})
	}
}

const command = new Command(data, enabled, execute);
export { command }