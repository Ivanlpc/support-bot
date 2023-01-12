import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../../structures/Command';
import {
    Client,
    ChatInputCommandInteraction,
    GuildMember,
    ActionRowBuilder
} from 'discord.js';
import { config } from '../..';
import { hasPermission } from '../../API/Services/Permissions';
import { Embeds } from '../../API/Util/Embeds';
import { getServerInformation } from '../../API/Services/Guilds';
import { TebexAPI } from '../../API/External/TebexAPI';


const data = new SlashCommandBuilder()
    .setName(config.Commands.lang.command_name)
    .setDescription(config.Commands.lang.command_description)


const enabled: boolean = config.Commands.ban.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member instanceof GuildMember) {
        const allowed: boolean = await hasPermission(interaction.member, config.Commands.ban.command_name);
        if (!allowed) {
            return interaction.reply({ content: config.Locale.no_permission, ephemeral: true })
        }
        const serverInfo = await getServerInformation(interaction.guildId);
        if (serverInfo.setup === 0) return interaction.reply({ content: config.Locale.setup_not_done, ephemeral: true })
        if (serverInfo.type === 'tebex') {
            interaction.awaitModalSubmit({
                filter: (i) => {
                    return i.customId === 'reason';
                }, time: 10000
            }).then(async res => {
                let reason = res.fields.getTextInputValue('inputReason');
                try {
                    let username = res.fields.getTextInputValue('inputUsername');
                    let ip = res.fields.getTextInputValue('inputIP');
                    const request = await TebexAPI.createBan(serverInfo.token, username, reason, res.fields.getTextInputValue('inputIP'))
                    if (!request.error_code) {
                        return res.reply({ embeds: [Embeds.ban_embed(request.data.user.ign, request.data.reason, request.data.id.toString(), ip)] })
                    } else {
                        if (request.error_code == 422) {
                            return res.reply({ content: `The username ${username} is already banned!` })

                        } else if (request.error_code) {
                            return res.reply({ content: "TEBEX: "+request.error_message, ephemeral: true })


                        }
                    }
                } catch (err) {
                    return res.reply({ content: config.Locale.command_error })
                }

            }).catch(err => err);

        } else {
            return interaction.reply({ content: config.Locale.craftingstore_not_support, ephemeral: true })
        }
    }
}

const command = new Command(data, enabled, execute);
export { command }