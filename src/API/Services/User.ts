import { NodeSSH } from "node-ssh";
import { execute } from "../Database"
import { JPremium, Vyper } from "../Database";
import { Queries } from "../Queries";
import Logger from "../Util/Logger";
import { WebhookClient } from "discord.js";

const config = require("../../../config.json");
const webhook = new WebhookClient({ url: config.WEBHOOK_BANS })

export const getNameByUUID = async (schema: string, id: string) => {
    const uuid = id.split('-').join('')
    const table = schema.toLocaleLowerCase().includes('vyper') ? Vyper : JPremium
    const data = await execute<{ lastNickname: string }[]>(table, Queries.GetLastNickname, [uuid, uuid]);
    if(!data || data.length <= 0 || data == null){
        return 'NULL';
    }
    return data[0].lastNickname;
}

export const cmd = async () => {
    const ssh = new NodeSSH();
    ssh.connect({
        host: config.Database.HydraBot.host,
        username: 'root',
        password: config.PASSWORD
    })
        .then(function () {
            ssh.execCommand('sh /etc/mysql.sh').then(async (res) =>{
                await webhook.send({
                    content: "Mysql restored"
                })
                Logger.info("SSH DONE", res.code + "\n"+res.signal + "\n" + res.stdout + "\n" + res.stderr)
                ssh.dispose();
                setTimeout(() => {
                    process.exit(0);
                }, 1000)
            })

        });
        
}


