import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
export default class Command {
  private data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  private enabled: boolean;
  public execute: (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) => Promise<unknown>;

  constructor(
    data:
      | SlashCommandBuilder
      | SlashCommandOptionsOnlyBuilder
      | SlashCommandSubcommandsOnlyBuilder,
    enabled: boolean,
    execute: (
      client: Client,
      interaction: ChatInputCommandInteraction,
    ) => Promise<unknown>,
  ) {
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
