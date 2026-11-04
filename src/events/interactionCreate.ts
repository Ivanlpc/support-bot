import Event from '../structures/Event';
import Logger from '../API/Util/Logger';
import { client } from '..';
import { BaseInteraction, GuildMember } from 'discord.js';
import { config } from '../config';
import { respond } from '../API/Util/Respond';
import { hasPermission } from '../API/Services/Permissions';

import { messages } from '../messages';
import {
  getSession,
  renderPage,
  forgetSession,
  ExpiredSessionError,
} from '../API/Services/Pagination';
import { SearchLimitError } from '../API/External/CraftingstoreAPI';

const event = new Event(
  'interactionCreate',
  async (interaction: BaseInteraction): Promise<void> => {
    if (!interaction.isRepliable()) return;
    const started = performance.now();
    Logger.info('Interaction received', { type: interaction.type });
    try {
      if (!interaction.guildId) {
        await respond(interaction, {
          content: 'Use this bot in a server.',
          ephemeral: true,
        });
        return;
      }
      if (interaction.isChatInputCommand()) {
        const command = client.getCommand(interaction.commandName);
        if (!command) return;
        if (
          ![
            config.Commands.setup.command_name,
            config.Commands.ban.command_name,
          ].includes(interaction.commandName)
        ) {
          await interaction.deferReply({ ephemeral: true });
        }
        await command.execute(client, interaction);
        return;
      }
      if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
      const owner =
        interaction.message.interactionMetadata?.user.id ??
        interaction.message.interaction?.user.id;
      if (owner !== interaction.user.id) {
        await respond(interaction, {
          content: messages.EN.different_user,
          ephemeral: true,
        });
        return;
      }
      if (interaction.isStringSelectMenu()) {
        const menu = client.getSelectMenu(interaction.customId.split(';')[0]);
        if (!menu) return;
        if (interaction.customId.startsWith('payments;')) {
          await interaction.deferUpdate();
          // A role may have been revoked since the original command was sent.
          if (
            !(interaction.member instanceof GuildMember) ||
            !(await hasPermission(interaction.member, 'payments'))
          ) {
            await respond(interaction, {
              content: messages.EN.no_permission,
              ephemeral: true,
            });
            return;
          }
        }
        await menu.execute(client, interaction);
      } else if (interaction.customId.startsWith('page;')) {
        await interaction.deferUpdate();
        const [, id, page] = interaction.customId.split(';');
        const session = getSession(
          id,
          interaction.user.id,
          interaction.guildId,
        );
        if (
          session.kind !== 'GC' &&
          (!(interaction.member instanceof GuildMember) ||
            !(await hasPermission(interaction.member, 'payments')))
        ) {
          await respond(interaction, { content: messages.EN.no_permission });
          return;
        }
        await respond(interaction, await renderPage(session, Number(page)));
      } else if (
        interaction.customId.startsWith('close;') ||
        interaction.customId === 'close'
      ) {
        const id = interaction.customId.split(';')[1];
        if (id) {
          getSession(id, interaction.user.id, interaction.guildId);
          forgetSession(id);
        }
        await interaction.update({ content: '❌', embeds: [], components: [] });
      }
    } catch (error) {
      Logger.error('Interaction failed:', error);
      await respond(interaction, {
        content:
          (error instanceof ExpiredSessionError ||
          error instanceof SearchLimitError
            ? error.message
            : messages.EN.command_error) +
          ' (reference: ' +
          interaction.id +
          ')',
        ephemeral: true,
      }).catch((error) => Logger.error('Error response failed:', error));
    } finally {
      Logger.info('Interaction completed', {
        durationMs: Math.round(performance.now() - started),
        replied: interaction.replied,
        deferred: interaction.deferred,
      });
    }
  },
);
export { event };
