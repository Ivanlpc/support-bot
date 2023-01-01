import { execute } from "../Database"
import { encrypt, decrypt } from "../Util/Crypto";
import { Queries } from "../Queries"
import { OkPacket } from "mysql2";

export const newGuild = async (guildId : string | null, name: string | undefined ) : Promise<boolean> => {
    const query: OkPacket = await execute(Queries.NewGuild, [guildId, name]);
    return query.affectedRows > 0;
}

export const leaveGuild = async (guildId : string) : Promise<boolean> => {
    const query: OkPacket = await execute(Queries.LeaveGuild, [guildId]);
    return query.affectedRows > 0;
}
export const updateToken = async (guildId: string | null, tkn: string, store : string | null) : Promise<boolean> => {
    const {token, iv} = encrypt(tkn);
    const query : OkPacket = await execute(Queries.UpdateToken, [token, iv, store, guildId]);
    return query.affectedRows > 0;
}

export const getTokenByGuild = async (guildId : string) => {
    const res = await execute<IToken[]>(Queries.GetToken, [guildId]);

    const token = decrypt(res[0].token, res[0].hash);
    return {
        token: token,
        type: res[0].type
    }
}
export const getServerInformation = async (guildId: string) : Promise<IServer> => {
    const info = await execute<IGuilds[]>(Queries.GetGuildData, [guildId]);
    if(info[0].setup === 1) {
        const token = decrypt(info[0].token, info[0].hash);
        return{
            setup: 1,
            token: token,
            type: info[0].type
        }
    } else {
        return {
            setup: 0,
            token: '',
            type: ''
        }
    }
}
    
interface IGuilds {
    setup: number,
    token: string,
    hash: string,
    type: string
}
interface IToken {
    token: string,
    hash: string,
    type: string
}

interface IServer {
    setup: number,
    token: string
    type: string
    
}