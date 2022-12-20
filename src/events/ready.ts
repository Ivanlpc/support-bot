import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { config } from '..';
import Event from '../structures/Event';
import Bot from '../structures/Bot';

const event = new Event('ready', async (client): Promise<void> => {

    if (client instanceof Bot) {
        if (client.getRestCommands().length > 0) {
            const rest = new REST({
                version: '10'
            }).setToken(config.TOKEN);
            const CLIENT_ID = client.user?.id
            const GUILD_ID = config.GUILD_ID;
            if (CLIENT_ID) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
                        body: client.getRestCommands()
                        }
                    );

                    console.log('All commands has been registered');

                } catch (error) {
                    if (error) console.error(error);
                }

            }
        }
        console.log(`Logged as ${client.user?.tag}`);
    }
})

export { event }
