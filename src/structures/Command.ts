import { Client, ChatInputCommandInteraction, InteractionResponse } from 'discord.js';
export default class Command {

    private data: object
    private enabled: boolean
    public execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void | InteractionResponse<boolean> | undefined>

    constructor(data: object, enabled: boolean, execute: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void | InteractionResponse<boolean> | undefined>) {
        this.data = data;
        this.enabled = enabled;
        this.execute = execute;
    }

    public getData() {
        return this.data;
    }

    public getEnabled() {
        return this.enabled;
    }
    
}

