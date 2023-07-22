import { WebhookClient } from "discord.js";
import Trigger from "../../../structures/Trigger";
import { CraftingstoreAPI } from "../../../API/External/CraftingstoreAPI";
import { getNameByUUID } from "../../../API/Services/User";
import { Embeds } from "../../../API/Util/Embeds";
import { validatePayment } from "../../../API/Services/Payments";
import Logger from "../../../API/Util/Logger";

const config = require("../../../../config.json");

const webhook = new WebhookClient({url: config.WEBHOOK_BANS})

const MySQLEvents = require('@rodrigogs/mysql-events').STATEMENTS;


const expression = '*.litebans_bans';

const statement = MySQLEvents.DELETE

const MySQLTrigger = new Trigger('DeleteHistory', expression, statement, (event) => {
    event.affectedRows.forEach(async row => {
        try {
            const nickname = await getNameByUUID(event.schema, row.before.uuid);
            webhook.send({ embeds: [Embeds.delete_ban_embed(row.before, nickname, event.schema)] });
        } catch (e) {
            Logger.error(e)
        }
    })
});


export { MySQLTrigger }

