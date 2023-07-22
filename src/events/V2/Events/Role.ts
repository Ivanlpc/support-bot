import { WebhookClient } from "discord.js";
import Trigger from "../../../structures/Trigger";
import { CraftingstoreAPI } from "../../../API/External/CraftingstoreAPI";
import { getNameByUUID } from "../../../API/Services/User";
import { Embeds } from "../../../API/Util/Embeds";
import { validatePayment } from "../../../API/Services/Payments";
import Logger from "../../../API/Util/Logger";

const config = require("../../../../config.json");
const blacklistFile = require("../../../../blacklist.json");
const webhook = new WebhookClient({ url: config.WEBHOOK_BANS })

const MySQLEvents = require('@rodrigogs/mysql-events').STATEMENTS;

var rgxArray: string = blacklistFile.words.map((str: string) => new RegExp(str).source).join('|');
const rgx = new RegExp(rgxArray)

const expression = '*.luckperms_user_permissions';

const statement = MySQLEvents.INSERT

const MySQLTrigger = new Trigger('NewRank', expression, statement, event => {
    if (event.schema.toLocaleLowerCase() === 'vyperperms') return;
    event.affectedRows.forEach(async row => {
        if (rgx.test(row.after.permission) && row.after.permission != "*") return;
        const perm = row.after.permission.split('group.').join('');
        if (perm.includes('-') || perm.length === 1 || config.Rankups.includes(perm)) return;
        try {
            const nickname = await getNameByUUID(event.schema, row.after.uuid);
            const temp = row.after.expiry == 0 ? true : false;
            if (perm.includes('.')) {
                webhook.send({ embeds: [Embeds.new_rank_embed(row.after.uuid, perm, false, nickname, event.schema, row.after.value, temp)] })
                return;
            }
            const payment = await CraftingstoreAPI.getUserPayments(config.CRAFTINGSTORE_TOKEN, nickname);
            webhook.send({ embeds: [Embeds.new_rank_embed(row.after.uuid, perm, validatePayment(payment.data[0], perm.toLocaleUpperCase()), nickname, event.schema, row.after.value, temp)] })
        } catch (e) {
            Logger.error(e)
        }
    })
});


export { MySQLTrigger }

