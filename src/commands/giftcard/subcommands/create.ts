import { ChatInputCommandInteraction, Client, SlashCommandSubcommandBuilder, GuildMember } from "discord.js";
import { config } from "../../..";
import SubCommand from "../../../structures/Subcommand";
import { getServerInformation } from "../../../API/Services/Guilds"; 
import { TebexAPI } from "../../../API/External/TebexAPI";
import { CraftingstoreAPI } from "../../../API/External/CraftingstoreAPI";
import { Embeds } from "../../../API/Util/Embeds";

const data = new SlashCommandSubcommandBuilder()
    .setName(config.Commands.giftcard.subcommand.create.name)
    .setDescription(config.Commands.giftcard.subcommand.create.description)
    .addIntegerOption(option => option
        .setName('amount')
        .setDescription(config.Commands.giftcard.subcommand.create.requirement_amount)
        .setRequired(true))
	.addUserOption(option => option
		.setName('user')
		.setDescription(config.Commands.giftcard.subcommand.create.non_required_user)
		.setRequired(false))
		


const execute = async(client: Client, interaction: ChatInputCommandInteraction) => {
    if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
    const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {

			try {
				const request = await TebexAPI.createGiftcard(serverInfo.token, interaction.options.getInteger('amount', true), interaction.user.id, interaction.user.tag, interaction.options.getUser('user', false)?.id);
				if(('error_code' in request)){
					return interaction.reply({content: "TEBEX: "+request.error_message, ephemeral: true});
				}
				if (request.data.code.length > 0) {
					return interaction.reply({ embeds: [Embeds.giftcard_embed(request.data.code, request.data.balance.starting, request.data.id.toString(), interaction.options.getUser('user', false)?.id, request.data.balance.currency)] })
				}
				return interaction.reply({ content: config.Locale.error_giftcard })
			} catch (err) {
				console.error(err);
				return interaction.reply({ content: config.command_error, ephemeral: true })
			}
		} else {
			try{
				const request = await CraftingstoreAPI.createGiftcard(serverInfo.token, interaction.options.getInteger('amount', true));
				if(!request.success) {
					return interaction.reply({content: config.Locale.error_giftcard})
				} else {
					return interaction.reply({embeds: [Embeds.giftcard_embed(request.data.code, request.data.amount, request.data.id.toString(), undefined, undefined)]})
				}
			}catch(err){
				console.error(err);
				return interaction.reply({ content: config.command_error, ephemeral: true })
			}
			
		}
    }
}

const create = new SubCommand(data, execute);
export { create }