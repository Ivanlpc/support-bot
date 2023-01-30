import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
	ButtonStyle,
	StringSelectMenuBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	ButtonBuilder
} from 'discord.js';
import { Embeds } from '../../API/Util/Embeds';
import { newGuild, updateToken } from '../../API/Services/Guilds';

const config = require("../../../config.json");
const messages = require("../../../messages.json");


const data = new SlashCommandBuilder()
	.setName(config.Commands.setup.command_name)
	.setDescription(config.Commands.setup.command_description)

const enabled: boolean = config.Commands.setup.enabled;

const row = new ActionRowBuilder<StringSelectMenuBuilder>()
	.addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('storeType')
			.setPlaceholder('SELECT YOUR STORE TYPE')
			.addOptions(
				{
					label: 'TEBEX',
					value: 'tebex',
					emoji: '™'
				},
				{
					label: 'CRAFTINGSTORE',
					value: 'craftingstore',
					emoji: '©'
				},
			),
	);

const buttons = new ActionRowBuilder<ButtonBuilder>()
	.addComponents(
		new ButtonBuilder()
			.setCustomId('yes')
			.setLabel('YES')
			.setEmoji('✅')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('no')
			.setLabel('NO')
			.setEmoji('❌')
			.setStyle(ButtonStyle.Primary),
	);

const modal = new ModalBuilder()
	.setCustomId('secret')
	.setTitle('API');
const token_input = new TextInputBuilder()
	.setCustomId('inputSecret')
	.setLabel("Secret token here")
	.setStyle(TextInputStyle.Short);
modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(token_input));


async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId) {
		if(interaction.guild?.ownerId !== interaction.user.id) return interaction.reply({content: messages.EN.server_owner, ephemeral: true})
		await interaction.reply({ embeds: [Embeds.accepting_terms_embed()], components: [buttons] })
		
		const filter = (d: any) => {
			if (d.user.id) {
				if (d.user.id === interaction.user.id) return true;
			}
			try{
				d.reply({content: messages.EN.different_user, ephemeral: true})
			}catch(err){}
			return false;
		}

		const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 2 });
		collector.on('collect', async interact => {
			if (interact.isStringSelectMenu() && interact.customId === 'storeType') {
				await interaction.deleteReply();
				await interact.showModal(modal);
				interaction.awaitModalSubmit({
					filter: (i) => {
						return i.customId === 'secret';
					}, time: 10000
				}).then(async res => {
					let token = res.fields.getTextInputValue('inputSecret');
					await newGuild(interaction.guildId, interaction.guild?.name);
					const query2: any = await updateToken(interaction.guildId, token, interact.values[0]);
					if (query2) {
						res.reply({ content: `Setup done! This server will now use ${interact.values[0]} with token ${token}`, ephemeral: true });
					} else {
						res.reply({content: 'There was an error while trying to update your server data', ephemeral: true})
					}
					collector.stop();
				}).catch(err => err);

			} else if (interact.isButton()) {
				if (interact.customId === 'no') {
					await interact.deferUpdate();

					collector.stop();
				} else {
					await interact.deferUpdate();
					await interaction.editReply({ embeds: [Embeds.select_store_embed()], components: [row] });
				}
			}
		})
		collector.on('end', async collected => {
			if (collected.size < 2) {
				interaction.fetchReply().then(async () => await interaction.deleteReply()).catch(() => { });
			}
		});
	}
}

const command = new Command(data, enabled, execute);
export { command }