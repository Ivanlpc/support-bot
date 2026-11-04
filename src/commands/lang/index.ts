import { respond } from '../../API/Util/Respond';
import { SlashCommandBuilder } from 'discord.js';
import Command from '../../structures/Command';
import { Client, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import {
  changeLanguage,
  getServerInformation,
} from '../../API/Services/Guilds';

import { config } from '../../config';
import { messages } from '../../messages';

const languages: ILanguages[] = new Array();
for (const language of Object.keys(messages)) {
  languages.push({ name: messages[language].name, value: language });
}

const data = new SlashCommandBuilder()
  .setName(config.Commands.lang.command_name)
  .setDescription(config.Commands.lang.command_description)
  .addStringOption((option) =>
    option
      .setName('language')
      .setDescription('Language')
      .addChoices(...languages),
  );

const enabled: boolean = config.Commands.lang.enabled;

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (
    interaction.channel &&
    !interaction.channel.isDMBased() &&
    interaction.guildId &&
    interaction.member instanceof GuildMember
  ) {
    const serverInfo = await getServerInformation(interaction.guildId);
    if (serverInfo.setup === 0)
      return respond(interaction, {
        content: messages[serverInfo.lang].setup_not_done,
        ephemeral: true,
      });
    if (interaction.user.id !== interaction.guild?.ownerId)
      return respond(interaction, {
        content: messages[serverInfo.lang].server_owner,
        ephemeral: true,
      });
    const language: string = interaction.options.getString('language', true);
    const change = await changeLanguage(interaction.guildId, language);
    if (change)
      return respond(interaction, {
        content: messages[language].language_changed,
        ephemeral: true,
      });
    return respond(interaction, {
      content: messages[serverInfo.lang].command_error,
      ephemeral: true,
    });
  }
}

const command = new Command(data, enabled, execute);
export { command };

interface ILanguages {
  name: string;
  value: string;
}
