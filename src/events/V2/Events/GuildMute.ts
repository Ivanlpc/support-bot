import { WebhookClient } from "discord.js";
import Trigger from "../../../structures/Trigger";
import { CraftingstoreAPI } from "../../../API/External/CraftingstoreAPI";
import { getNameByUUID } from "../../../API/Services/User";
import { Embeds } from "../../../API/Util/Embeds";
import { validatePayment } from "../../../API/Services/Payments";
import Logger from "../../../API/Util/Logger";

const config = require("../../../../config.json");
const webhook = new WebhookClient({ url: config.WEBHOOK_BANS })

const MySQLEvents = require('@rodrigogs/mysql-events').STATEMENTS;


const expression = '*.litebans_mutes';

const statement = MySQLEvents.UPDATE

const MySQLTrigger = new Trigger('Unmute', expression, statement, event => {
    event.affectedRows.forEach(async row => {
        if (row.after.removed_by_reason === '#expired' || row.after.removed_by_reason === null) return;
        try {
            const nickname = await getNameByUUID(event.schema, row.after.uuid);
            const payment = await CraftingstoreAPI.getUserPayments(config.CRAFTINGSTORE_TOKEN, nickname);
            
            webhook.send({ embeds: [Embeds.unmute_embed(row.after, validatePayment(payment.data[0], config.unmute_package_name), nickname, event.schema)] });
        } catch (e) {
            Logger.error(e)
        }
    })
});


export { MySQLTrigger }