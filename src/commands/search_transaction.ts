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
	.setName(config.Commands.search_transaction.command_name)
	.setDescription(config.Commands.search_transaction.command_description)

const enabled: boolean = config.Commands.search_transaction.enabled;

async function execute(client: Client, interaction: ChatInputCommandInteraction) {
	if (interaction.channel && !interaction.channel.isDMBased() && interaction.guildId && interaction.member?.roles instanceof GuildMemberRoleManager) {
		const roles : string[] = await getRolesWithPermission(interaction.guildId, 'search');
        if(!interaction.member.roles.cache.hasAny(...roles) && !roles.includes(interaction.user.id)){
            return interaction.reply({content: config.Locale.no_permission, ephemeral: true})
        }
	}
}


const command = new Command(data, enabled, execute);
export { command }