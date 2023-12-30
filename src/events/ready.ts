import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { ActivityType } from 'discord.js';
import Event from '../structures/Event';
import Bot from '../structures/Bot';
import Logger from '../API/Util/Logger';

const config = require("../../config.json");

const event = new Event('ready', async (client): Promise<void> => {

    if (client instanceof Bot) {
        if (client.getRestCommands().length > 0) {
            const rest = new REST({
                version: '10'
            }).setToken(config.TOKEN);
            const CLIENT_ID = client.user?.id
            if (CLIENT_ID) {
                try {
                    await rest.put(
                        Routes.applicationCommands(CLIENT_ID), {
                        body: client.getRestCommands()
                        }
                    );

                    Logger.info('All commands has been registered');

                } catch (error) {
                    if (error) console.error(error);
                }

            }
        }
        Logger.info(`Logged as ${client.user?.tag}`);
        client.user?.setActivity('/help', { type: ActivityType.Playing })
    }
})

export { event }
