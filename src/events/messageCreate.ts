import Event from '../structures/Event';
import { Message, TextChannel } from 'discord.js';
import { config } from '..';

import { client } from '..';

const event = new Event('messageCreate', async (message: Message<boolean>): Promise<void> => {
    if(message.author.id === client.user?.id) return;
    if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guildId === config.GUILD_ID) {
      
    }


})
export { event }
