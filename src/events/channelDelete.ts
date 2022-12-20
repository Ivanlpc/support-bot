import { NonThreadGuildBasedChannel, DMChannel, Message } from 'discord.js';
import Event from '../structures/Event';
import {config} from '..';


const event = new Event('channelDelete', (channel : DMChannel | NonThreadGuildBasedChannel) => {

    if(channel.isTextBased() && !channel.isDMBased() && !channel.isVoiceBased() && channel.guildId === config.GUILD_ID){
    }

})

export {event}