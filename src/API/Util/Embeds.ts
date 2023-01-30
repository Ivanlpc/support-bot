import { EmbedBuilder } from "discord.js";
import { IPaymentFromID } from "../External/TebexAPI";
import { IPayment } from "../External/CraftingstoreAPI";

const config = require("../../../config.json");
const messages = require("../../../messages.json");

export const Embeds = {
    select_store_embed: () => {
        return new EmbedBuilder()
            .setTitle("Please select your store type")
            .setDescription("This bot only works with Tebex or Craftingstore\n" +
                "It will use their API to return the data and manage your\n" +
                "server from discord")
            .setColor('#b2ffff')
    },
    accepting_terms_embed: () => {
        return new EmbedBuilder()
            .setTitle("¿Do you accept Terms of Service?")
            .setDescription("You must enter your store secret token to let the bot make request to the API. \n" +
                "It will be encrypted and stored in our database, if you want to delete it \n" +
                "just change the token in your web panel or kick the bot from this server. \n" +
                "When the bot is leaving a server, all the information is deleted from the database.")
            .setColor("#00FF00")
            .setFooter({ text: messages.EN.footer })
    },
    transaction_tebex_embed: (transaction: IPaymentFromID, lang = 'EN') => {
        const packages = transaction.packages.map(elem => elem.name);
        return new EmbedBuilder()
            .setTitle(`${messages[lang].transaction}: ${transaction.id}`)
            .setDescription(`${messages[lang].information}:`)
            .setThumbnail(config.TRANSACTION_AVATAR_URL + transaction.player.name)
            .addFields([
                { name: `${messages[lang].player}:`, value: transaction.player.name },
                { name: `${messages[lang].uuid}:`, value: transaction.player.uuid.toString() },
                { name: `${messages[lang].packages}:`, value: packages.join(',') },
                { name: `${messages[lang].price}:`, value: transaction.amount.toString() + transaction.currency.symbol },
                { name: `${messages[lang].status}`, value: transaction.status }
            ])
            .setColor(transaction.status !== 'Complete' ? 'Red' : 'Green')
            .setFooter({ text: 'Tebex API' });
    },
    transaction_craftingstore_embed: (transaction: IPayment, lang = 'EN') => {
        return new EmbedBuilder()
        .setTitle(`${messages[lang].transaction}: ${transaction.transactionId}`)
        .setDescription(`${messages[lang].information}:`)
        .setThumbnail(config.TRANSACTION_AVATAR_URL + transaction.inGameName)
        .addFields([
            { name: `${messages[lang].player}:`, value: transaction.inGameName },
            { name: `${messages[lang].uuid}:`, value: transaction.uuid !== null ? transaction.uuid : 'None' },
            { name: `${messages[lang].email}:`, value: transaction.email ? transaction.email : 'No email provided' },
            { name: `${messages[lang].packages}:`, value: transaction.packageName },
            { name: `${messages[lang].price}:`, value: transaction.price.toString() },
            { name: `${messages[lang].gateway}:`, value: transaction.gateway },
            { name: `${messages[lang].status}:`, value: transaction.status },
            { name: `${messages[lang].date}:`, value: new Date(transaction.timestamp * 1000).toLocaleDateString() }

        ])
        .setColor(transaction.status !== 'PAID' ? 'Red' : 'Green')
        .setFooter({ text: 'Craftingstore API.' })
    },
    help_embed: (lang = 'EN') => {
        return new EmbedBuilder()
        .setTitle(`${messages[lang].showing_help}:`)
        .setDescription(`${messages[lang].command_list}:`)
        .addFields(
            {name: '/setup', value: "```"+messages[lang].setup+"```"},
            {name: '/perm (add/remove) (permission) (user/role)', value: "```"+messages[lang].perm+"```"},
            {name: '/search (id) (user)', value: "```"+messages[lang].search+"```"},
            {name: '/payments (user)', value: "```"+messages[lang].payments+"```"},
            {name: '/giftcard create (amount)', value: "```"+messages[lang].giftcard_create+"```"},
            {name: '/giftcard delete (id)', value: "```"+messages[lang].giftcard_delete+"```"},
            {name: '/ban', value: "```"+messages[lang].ban+"```"},



        ).setFooter({
            text: messages[lang].footer
        })
        .setColor("#2F3136")
    },
    giftcard_embed: (code: string, amount: string, id: string, lang = 'EN', user?: string,  currency?: string) => {
        return new EmbedBuilder()
        .setTitle(`${messages[lang].giftcard_created}: ${id}`)
        .setDescription(`${messages[lang].information}:`)
        .addFields(
            {name: `${messages[lang].code}:`, value: "```" + code + "```"},
            {name: `${messages[lang].amount}:`, value: "```" + amount + " " + (currency ? currency : "") + "```"},
        )
        .setColor("Green")
    },
    ban_embed: (user: string, reason: string, id: string, lang = 'EN', ip?: string) => {
        const embed =  new EmbedBuilder()
        .setTitle(`${messages[lang].ban_created}: ${id}`)
        .setDescription(`${messages[lang].information}:`)
        .addFields(
            {name: `${messages[lang].username}:`, value: "```" + user + "```"})
        
        .setTimestamp()
        if(ip) embed.addFields({name: `${messages[lang].ip}:`, value: "```" + ip + "```"})
        embed.addFields({name: `${messages[lang].reason}:`, value: "```" + reason + "```"})
        .setColor('Red')
        return embed;
    }
}