import { config } from '..';
import Event from '../structures/Event';
import { Guild } from 'discord.js';
import { leaveGuild } from '../API/Services/Guilds';
const event = new Event('guildDelete', async (guild : Guild): Promise<void> => {

    if(guild.id){
        leaveGuild(guild.id);
    }


})

export {event};