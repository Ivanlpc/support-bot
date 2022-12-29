import { Client, ChatInputCommandInteraction, InteractionResponse, SlashCommandSubcommandBuilder } from 'discord.js';
export default class SubCommand {

    private data: SlashCommandSubcommandBuilder
    public execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void | InteractionResponse<boolean> | undefined>

    constructor(data: SlashCommandSubcommandBuilder, execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void | InteractionResponse<boolean> | undefined>) {
        this.data = data;
        this.execute = execute;
    }

    public getData() {
        return this.data;
    }

    
}

