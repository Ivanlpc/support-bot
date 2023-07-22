import { ChatInputCommandInteraction, 
	Client, 
	SlashCommandSubcommandBuilder, 
	GuildMember,
	ActionRowBuilder,
	StringSelectMenuBuilder
} from "discord.js";
import SubCommand from "../../../structures/Subcommand";
import Logger from "../../../API/Util/Logger";
import { getServerInformation } from "../../../API/Services/Guilds"; 
import { TebexAPI } from "../../../API/External/TebexAPI";

const config = require("../../../../config.json");
const messages = require("../../../../messages.json");


const data = new SlashCommandSubcommandBuilder()
    .setName(config.Commands.giftcard.subcommand.recover.name)
    .setDescription(config.Commands.giftcard.subcommand.recover.description)
		


const execute = async(client: Client, interaction: ChatInputCommandInteraction) => {
    if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
    const serverInfo = await getServerInformation(interaction.guildId);
		if (serverInfo.setup === 0) return interaction.reply({ content: messages[serverInfo.lang].setup_not_done, ephemeral: true })
		if (serverInfo.type === 'tebex') {
			try {
				const request = await TebexAPI.recoverGiftcard(serverInfo.token, interaction.user.id);
				if('error_code' in request){
					return interaction.reply({content: "TEBEX: "+request.error_message, ephemeral: true});
				}
				
				let giftcards = request.map(elem => ({label: elem.code + ' || ' + elem.balance.remaining+ elem.balance.currency + " / "+elem.balance.starting + elem.balance.currency, value: elem.id + ";"+ elem.balance.remaining+ elem.balance.currency + " / "+ elem.balance.starting+ elem.balance.currency + ";" + elem.code + ";"+ serverInfo.lang}))
				let select_menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('giftcard;recover')
						.setPlaceholder(messages[serverInfo.lang].select_giftcard)
						.addOptions(...giftcards));
				return interaction.reply({ components: [select_menu], ephemeral: true})
			} catch (err) {
				Logger.error("ERROR TebexAPI recoverGiftcard promise", err);

				return interaction.reply({ content: messages[serverInfo.lang].command_error, ephemeral: true })
			}
		} else {
			return interaction.reply({ content: messages[serverInfo.lang].craftingstore_not_support, ephemeral: true })
			
		}
    }
}

const recover = new SubCommand(data, execute);
export { recover }