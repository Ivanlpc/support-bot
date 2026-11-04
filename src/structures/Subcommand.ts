import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
export default class SubCommand {
  private data: SlashCommandSubcommandBuilder;
  public execute: (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) => Promise<unknown>;

  constructor(
    data: SlashCommandSubcommandBuilder,
    execute: (
      client: Client,
      interaction: ChatInputCommandInteraction,
    ) => Promise<unknown>,
  ) {
    this.data = data;
    this.execute = execute;
  }

  public getData() {
    return this.data;
  }
}
