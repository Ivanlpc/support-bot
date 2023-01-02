import { ChatInputCommandInteraction, Client, SlashCommandSubcommandBuilder, GuildMember } from "discord.js";
import { config } from "../../..";
import SubCommand from "../../../structures/Subcommand";
import { getServerInformation } from "../../../API/Services/Guilds";
import { TebexAPI } from "../../../API/External/TebexAPI";
import { CraftingstoreAPI } from "../../../API/External/CraftingstoreAPI";
import { Embeds } from "../../../API/Util/Embeds";

const data = new SlashCommandSubcommandBuilder()
	.setName(config.Commands.giftcard.subcommand.delete.name)
	.setDescription(config.Commands.giftcard.subcommand.delete.description)
	.addStringOption(option => option
		.setName('id')
		.setDescription(config.Commands.giftcard.subcommand.delete.requirement_id)
		.setRequired(true))


const execute = async (client: Client, interaction: ChatInputCommandInteraction) => {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
		const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {
			try {
				const request = await TebexAPI.deleteGiftcard(serverInfo.token, interaction.options.getString('id', true));
				if (request.error_code === 404){
					return interaction.reply({ content: config.Locale.giftcard_not_found, ephemeral: true })
				}
				if(request.error_code){
					return interaction.reply({content: "TEBEX: "+request.error_message, ephemeral: true});
				}
				if (request.data.void) {
					return interaction.reply({ content: config.Locale.giftcard_deleted, ephemeral: false })
				}
				
			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.command_error, ephemeral: true })
			}
		} else {

			return interaction.reply({content: 'This command is not available in CraftingStore!', ephemeral: true})
			
			//CraftingStore API is not working here! This command is coded based on their API docs, but it's not working
			// try {
			// 	const request = await CraftingstoreAPI.deleteGiftcard(serverInfo.token, interaction.options.getString('id', true));
			// 	if (!request.success) {
			// 		return interaction.reply({ content: config.Locale.giftcard_not_found })
			// 	} else {
			// 		return interaction.reply({ content: config.Locale.giftcard_deleted, ephemeral: false });
			// 	}
			// } catch (err) {
			// 	console.error(err);
			// 	return interaction.reply({ content: config.command_error, ephemeral: true })
			// }
		}
	}
}

const remove = new SubCommand(data, execute);
export { remove }