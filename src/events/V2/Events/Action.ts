import { WebhookClient } from "discord.js";
import Trigger from "../../../structures/Trigger";
import { Embeds } from "../../../API/Util/Embeds";

const config = require("../../../../config.json");

const webhook = new WebhookClient({url: config.WEBHOOK_BANS})

const MySQLEvents = require('@rodrigogs/mysql-events').STATEMENTS;

const expression = '*.luckperms_actions';

const statement = MySQLEvents.DELETE;

const MySQLTrigger = new Trigger('DeleteAction', expression, statement, (event) => {
    
    event.affectedRows.forEach(row => {
        webhook.send({embeds: [Embeds.delete_action_embed(row.before, event.schema)]});
    })
});
export { MySQLTrigger }

