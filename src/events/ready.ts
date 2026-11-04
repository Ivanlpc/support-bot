import { REST } from 'discord.js';
import { Routes } from 'discord.js';
import { ActivityType } from 'discord.js';
import Event from '../structures/Event';
import { markCommandsReady } from '../health';
import Bot from '../structures/Bot';
import Logger from '../API/Util/Logger';

import { config } from '../config';

const event = new Event('clientReady', async (client): Promise<void> => {
  if (client instanceof Bot) {
    if (client.getRestCommands().length > 0) {
      const rest = new REST({
        version: '10',
      }).setToken(config.TOKEN);
      const CLIENT_ID = client.user?.id;
      if (CLIENT_ID) {
        try {
          await rest.put(Routes.applicationCommands(CLIENT_ID), {
            body: client.getRestCommands(),
          });

          Logger.info('Discord commands registered', {
            count: client.getRestCommands().length,
          });
        } catch (error) {
          Logger.error('Discord command registration failed', error);
          throw error;
        }
      }
    }
    markCommandsReady();
    Logger.info('Discord ready', { botId: client.user?.id });
    client.user?.setActivity('/help', { type: ActivityType.Playing });
  }
});

export { event };
