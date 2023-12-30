import Event from '../structures/Event';
import { newGuild } from '../API/Services/Guilds';
import { Guild } from 'discord.js';

const event = new Event('guildCreate', async (guild : Guild): Promise<void> => {

    if(guild.id){
        await newGuild(guild.id, guild.name);
    }


})

export {event};