import { execute } from "../Database"
import { encrypt, decrypt } from "../Crypto";
import { Queries } from "../Queries"

export const newGuild = async (guildId : string | null, name: string | undefined ) : Promise<void> => {
    execute<void>(Queries.NewGuild, [guildId, name]);
}

export const leaveGuild = async (guildId : string) : Promise<void> => {
    execute<void>(Queries.LeaveGuild, [guildId])
}
export const updateToken = async (guildId: string | null, tkn: string, store : string | null) => {
    const {token, iv} = encrypt(tkn);
    return execute(Queries.UpdateToken, [token, iv, store, guildId]);
}

export const getTokenByGuild = async (guildId : string) => {
    const res = await execute<IToken[]>(Queries.GetToken, [guildId]);

    const token = decrypt(res[0].token, res[0].hash);
    return {
        token: token,
        type: res[0].type
    }
    
}

interface IToken {
    token: string,
    hash: string,
    type: string
}