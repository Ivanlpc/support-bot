import { Client, InteractionResponse, StringSelectMenuInteraction } from 'discord.js';

export default class SelectMenu {
    
    private customId: string;
    public execute: (client: Client, interaction: StringSelectMenuInteraction) => Promise<void | InteractionResponse<boolean> | undefined>;

    constructor(customId: string, execute: (client: Client, interaction: StringSelectMenuInteraction) => Promise<void | InteractionResponse<boolean> | undefined>) {
        this.customId = customId;
        this.execute = execute;
    }
    public getCustomId() {
        return this.customId;
    }
}