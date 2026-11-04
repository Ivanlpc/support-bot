import { Client, StringSelectMenuInteraction } from 'discord.js';

export default class SelectMenu {
  private customId: string;
  public execute: (
    client: Client,
    interaction: StringSelectMenuInteraction,
  ) => Promise<unknown>;

  constructor(
    customId: string,
    execute: (
      client: Client,
      interaction: StringSelectMenuInteraction,
    ) => Promise<unknown>,
  ) {
    this.customId = customId;
    this.execute = execute;
  }
  public getCustomId() {
    return this.customId;
  }
}
