import { config } from '..';
import Event from '../structures/Event';
import { newGuild } from '../API/Repositories/GuildRespository';
import { Guild } from 'discord.js';

const event = new Event('guildCreate', async (guild : Guild): Promise<void> => {

    if(guild.id){
        newGuild(guild.id, guild.name);
    }


})

export {event};