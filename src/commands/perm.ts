import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../structures/Command';
import {
	Client,
	ChatInputCommandInteraction,
    GuildMemberRoleManager,
	
} from 'discord.js';
import { config } from '..';
import { getRolesWithPermission } from '../API/Repositories/PermissionsRepository';


const data = new SlashCommandBuilder()
	.setName(config.Commands.perm.command_name)
	.setDescription(config.Commands.perm.command_description)

const enabled: boolean = config.Commands.perm.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member?.roles instanceof GuildMemberRoleManager) {
		const roles : string[] = await getRolesWithPermission(interaction.guildId, 'search');
        if(!interaction.member.roles.cache.hasAny(...roles) && !roles.includes(interaction.user.id) && interaction.user.id !== interaction.guild?.ownerId){
            return interaction.reply({content: config.Locale.no_permission, ephemeral: true})
        }
        

	}
}


const command = new Command(data, enabled, execute);
export { command }