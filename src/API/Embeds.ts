import { ColorResolvable, EmbedBuilder } from "discord.js";
import { config } from '..';


export function search_transaction_embed(){
    return {
    embed: new EmbedBuilder()
    .setTitle(config.Locale.search_transaction_embed.Title)
    .setDescription(config.translate.select_language_embed.description)
    .setColor(config.translate.select_language_embed.color as ColorResolvable),
    
    }
}

export function select_store_embed() {
    return new EmbedBuilder()
    .setTitle("Please select your store type")
    .setDescription("This bot only works with this stores\n"+
                    "with every game linked")
    .setColor('#b2ffff')
}

export function accepting_terms_embed(){
    return new EmbedBuilder()
    .setTitle("¿Do you accept Terms of Service?")
    .setDescription("You must enter your store secret token to let the bot make request to the API. \n" + 
                    "It will be encrypted and stored in our database, if you want to delete it \n"+
                    "just change the token in your web panel or kick the bot from this server. \n"+
                    "When the bot is leaving a server, all the information is deleted from the database.")
    .setColor("#00FF00")
    .setFooter({text: config.Locale.Embeds.footer})
}

export function transaction_embed(){
    return new EmbedBuilder()
    .setTitle
}