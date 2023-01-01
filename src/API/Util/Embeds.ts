import { EmbedBuilder } from "discord.js";
import { config } from '../..';
import { IPaymentFromID } from "../External/TebexAPI";
import { IPayment } from "../External/CraftingstoreAPI";


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
            .setFooter({ text: config.Locale.Embeds.footer })
    },
    transaction_tebex_embed: (transaction: IPaymentFromID) => {
        const packages = transaction.packages.map(elem => elem.name);
        return new EmbedBuilder()
            .setTitle(`Transaction: ${transaction.id}`)
            .setDescription('Information:')
            .setThumbnail(config.TRANSACTION_AVATAR_URL + transaction.player.name)
            .addFields([
                { name: "Player", value: transaction.player.name },
                { name: "UUID: ", value: transaction.player.uuid.toString() },
                { name: "Packages:", value: packages.join(',') },
                { name: "Price: ", value: transaction.amount.toString() + transaction.currency.symbol },
                { name: "Status: ", value: transaction.status }
            ])
            .setColor(transaction.status !== 'Complete' ? 'Red' : 'Green')
            .setFooter({ text: 'Using Tebex API' });
    },
    transaction_craftingstore_embed: (transaction: IPayment) => {
        return new EmbedBuilder()
        .setTitle(`Transaction: ${transaction.transactionId}`)
        .setDescription('Information:')
        .setThumbnail(config.TRANSACTION_AVATAR_URL + transaction.inGameName)
        .addFields([
            { name: "Player", value: transaction.inGameName },
            { name: "UUID: ", value: transaction.uuid !== null ? transaction.uuid : 'None' },
            { name: "Email: ", value: transaction.email ? transaction.email : 'No email provided' },
            { name: "Packages:", value: transaction.packageName },
            { name: "Price: ", value: transaction.price.toString() },
            { name: "Gateway: ", value: transaction.gateway },
            { name: "Status: ", value: transaction.status },
            { name: "Fecha: ", value: new Date(transaction.timestamp * 1000).toDateString() }

        ])
        .setColor(transaction.status !== 'PAID' ? 'Red' : 'Green')
        .setFooter({ text: 'Using CraftingstoreAPI.' })
    },
    help_embed: () => {
        return new EmbedBuilder()
        .setTitle('Showing help')
        .setDescription('List of commands:')
        .addFields(
            {name: '/setup', value: "```Configurate the bot to use it in your server```"},
            {name: '/perm (add/remove) (permission) (user/role)', value: "```Manage the permissions of this bot```"},
            {name: '/search (id) (user)', value: "```Shows the purchase with that Transaction ID```"},
            {name: '/payments (user)', value: "```Shows all purchases done with that username```"},
            {name: '/giftcard create (amount)', value: "```Create a Giftcard with the amount provided```"},
            {name: '/giftcard delete (id)', value: "```Delete the giftcard with that ID. TEBEX ONLY```"},
            {name: '/ban', value: "```Bans a player from buying in the shop. TEBEX ONLY```"},



        ).setFooter({
            text: config.Locale.Embeds.footer
        })
        .setColor("Aqua")
    },
    giftcard_embed: (code: string, amount: string, id: string, currency? : string) => {
        return new EmbedBuilder()
        .setTitle(`Giftcard Created ID: ${id}`)
        .setDescription('Here is the information:')
        .addFields(
            {name: 'Code: ', value: "```" + code + "```"},
            {name: 'Amount: ', value: "```" + amount + " " + (currency ? currency : "") + "```"},
        )
        .setColor("Green")
    },
    ban_embed: (user: string, reason: string, id: string, ip: string | undefined) => {
        const embed =  new EmbedBuilder()
        .setTitle(`Ban created ID: ${id}`)
        .setDescription('Information:')
        .addFields(
            {name: 'Username: ', value: "```" + user + "```"})
        
        .setTimestamp()
        if(ip) embed.addFields({name: 'IP: ', value: "```" + ip + "```"})
        embed.addFields({name: 'Reason: ', value: "```" + reason + "```"})
        .setColor('Red')
        return embed;
    }
}