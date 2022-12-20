import { SlashCommandBuilder } from '@discordjs/builders'
import Command from '../structures/Command';
import { Client, ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';
import { config } from '..';

    const data = new SlashCommandBuilder()
        .setName(config.Commands.search_transaction.command_name)
        .setDescription(config.Commands.search_transaction.command_description)
        .addStringOption(option => option
            .setName(config.Commands.search_transaction.command_requirement)
            .setDescription(config.Commands.search_transaction.command_requirement_description)
            .setRequired(true))

    const enabled: boolean = config.Commands.search_transaction.enabled;
    
    async function execute(client: Client,  interaction: ChatInputCommandInteraction) {
        
        if(interaction.member?.roles instanceof GuildMemberRoleManager){

        }
        interaction.reply({
            content: "Bot is working!",
            ephemeral: false
        })
        

    }


const command = new Command(data, enabled, execute);
export {command} 
