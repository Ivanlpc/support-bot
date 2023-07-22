import { EmbedBuilder, roleMention } from "discord.js";
import { IPaymentFromID } from "../External/TebexAPI";
import { IPayment } from "../External/CraftingstoreAPI";
import { ILitebansBans, IAction } from "../../events/V2/types";


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
    },
    unban_embed: (data: { after: ILitebansBans, before: ILitebansBans }, unban: boolean, name: string, schema: string) => {
        return new EmbedBuilder()
            .setTitle('NUEVO DESBANEO')
            .setDescription('Informacion')
            .setColor(unban ? 'Green' : 'Red')
            .setThumbnail(config.TRANSACTION_AVATAR_URL + name)
            .addFields(
                { name: 'UUID:', value: data.after.uuid },
                { name: 'Nombre: ', value: name },
                { name: 'Desbaneado por:', value: data.after.removed_by_name },
                { name: 'Razón:', value: data.before.reason },
                { name: 'Razón de desbaneo:', value: data.after.removed_by_reason },
                { name: 'DESBANEO en su ultima compra (anterior a 1h):', value: unban.toString() },
                { name: 'Schema', value: schema}
            )
    },
    unmute_embed: (data: ILitebansBans, unban: boolean, name: string, schema: string) => {
        return new EmbedBuilder()
            .setTitle('NUEVO DESMUTEO')
            .setDescription('Informacion')
            .setColor(unban ? 'Green' : 'Red')
            .setThumbnail(config.TRANSACTION_AVATAR_URL + name)
            .addFields(
                { name: 'UUID:', value: data.uuid },
                { name: 'Nombre: ', value: name },
                { name: 'Desmuteado por:', value: data.removed_by_name },
                { name: 'Razón:', value: data.reason },
                { name: 'Razón de desbaneo:', value: data.removed_by_reason },
                { name: 'Ha comprado DESMUTEO en su ultima compra:', value: unban.toString() },
                { name: 'Schema', value: schema}
            )
    },
    delete_action_embed: (data: IAction, schema: string) => {
        return new EmbedBuilder()
            .setTitle('SE HAN BORRADO LOGS DE ACCIONES')
            .setDescription('Información')
            .setColor('Red')
            .addFields(
                { name: 'Tipo (U = usuario, G = rango)', value: data.type },
                { name: 'Comando de luckperms ejecutado por:', value: data.actor_name },
                { name: 'UUID del que lo ejecuta:', value: data.actor_uuid },
                { name: 'Ejecutado el:', value: new Date(Number.parseInt(data.time) * 1000).toLocaleDateString() },
                { name: 'Usuario sobre el que se ejecutó el comando:', value: data.acted_name },
                { name: 'Acción realizada: ', value: data.action },
                { name: 'Schema', value: schema}
            )
    },
    new_rank_embed: (uuid: string, rank: string,tienda: boolean, name: string, schema: string, value: boolean, temp? : boolean) => {
        const embed =  new EmbedBuilder()
            .setTitle('NUEVO RANGO / PERMISO')
            .setDescription('Información')
            .setColor(tienda ? 'Green' : 'Red')
            .setThumbnail(config.TRANSACTION_AVATAR_URL + name)
            .addFields(
                { name: 'UUID:', value: uuid },
                { name: 'Nick:', value: name},
                { name: 'Rango o permiso: ', value: rank },
                { name: 'Su última compra (anterior a 1 día) coincide con el rango:', value: tienda.toString() },
                { name: 'Schema', value: schema},
                { name: "Valor:", value: value ? 'True' : 'False'}
            )
            if(temp) embed.addFields({ name: "Permanente:", value: temp.toString()})
            return embed;
    },
    delete_ban_embed: (data: ILitebansBans, name: string, schema: string) => {
        const embed = new EmbedBuilder()
            .setTitle('SANCIÓN ELIMINADA')
            .setDescription('Informacion')
            .setColor('Red')
            .setThumbnail(config.TRANSACTION_AVATAR_URL + name)
            .addFields(
                { name: 'UUID:', value: data.uuid },
                { name: 'Nombre: ', value: name},
                { name: 'Baneado por:', value: data.banned_by_name },
                { name: 'Razón:', value: data.reason },
                { name: 'Fecha:', value: new Date(data.time).toLocaleDateString()},
                { name: 'Expira en:', value: data.until != -1 ? new Date(data.until).toLocaleDateString() : 'Permanente'},
                { name: 'Baneo de ip:', value: data.ipban.toString()},
                { name: 'Schema', value: schema}
            )
            if(data.removed_by_name !== null) embed.addFields(
                {name: "Desbaneado por:", value: data.removed_by_name },
                {name: 'Motivo del unban:', value: data.removed_by_reason || 'Ninguno'}
            )
            return embed;

    }
}