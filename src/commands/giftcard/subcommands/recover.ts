import { ChatInputCommandInteraction, Client, SlashCommandSubcommandBuilder, GuildMember } from "discord.js";
import { config } from "../../..";
import SubCommand from "../../../structures/Subcommand";
import { getServerInformation } from "../../../API/Services/Guilds"; 
import { TebexAPI } from "../../../API/External/TebexAPI";
import { Embeds } from "../../../API/Util/Embeds";

const data = new SlashCommandSubcommandBuilder()
    .setName(config.Commands.giftcard.subcommand.recover.name)
    .setDescription(config.Commands.giftcard.subcommand.recover.description)
		


const execute = async(client: Client, interaction: ChatInputCommandInteraction) => {
    if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
    const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {
			try {
				const request = await TebexAPI.recoverGiftcard(serverInfo.token, interaction.user.id);
				if('error_code' in request){
					return interaction.reply({content: "TEBEX: "+request.error_message, ephemeral: true});
				}
				if (request.code) {
					return interaction.reply({ embeds: [Embeds.giftcard_embed(request.code, request.balance.starting, request.id.toString(), undefined, request.balance.currency)], ephemeral: true })
				}
				return interaction.reply({ content: config.Locale.error_giftcard })
			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.command_error, ephemeral: true })
			}
		} else {
			return interaction.reply({ content: config.Locale.craftingstore_not_support, ephemeral: true })
			
		}
    }
}

const recover = new SubCommand(data, execute);
export { recover }