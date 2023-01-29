import { execute } from "../Database"
import { encrypt, decrypt } from "../Util/Crypto";
import { Queries } from "../Queries"
import { OkPacket } from "mysql2";

/**
 * Inserts a new Guild into database
 * 
 * @param guildId - Id of the discord server
 * @param name - Name of the discord server
 * @returns Boolean if the guild with `guildId` and `name` has been inserted into database
 *
 */
export const newGuild = async (guildId: string | null, name: string | undefined): Promise<boolean> => {
    const query: OkPacket = await execute(Queries.NewGuild, [guildId, name]);
    return query.affectedRows > 0;
}

/**
 * Delete a guild from database
 * 
 * @param guildId - Id of the discord server
 * @returns Boolean if the guild with `guildId` has been deleted from database
 *
 */
export const leaveGuild = async (guildId: string): Promise<boolean> => {
    const query: OkPacket = await execute(Queries.LeaveGuild, [guildId]);
    return query.affectedRows > 0;
}

/**
 * Updates a guild with the new Craftingstore or Tebex token
 * 
 * @param guildId - Id of the discord server
 * @param tkn - Craftingstore or tebex token
 * @param store = Craftingstore | Tebex
 * @returns Boolean if the guild with `guildId` has been updated in database with `tkn` and `store`
 *
 */

export const updateToken = async (guildId: string | null, tkn: string, store: string | null): Promise<boolean> => {
    const { token, iv } = encrypt(tkn);
    const query: OkPacket = await execute(Queries.UpdateToken, [token, iv, store, guildId]);
    return query.affectedRows > 0;
}


/**
 * Get the token
 * 
 * @param guildId - Id of the discord server
 * @param tkn - Craftingstore or tebex token
 * @param store = Craftingstore | Tebex
 * @returns Boolean if the guild with `guildId` has been updated in database with `tkn` and `store`
 *
 */

export const getTokenByGuild = async (guildId: string) => {
    const res = await execute<IToken[]>(Queries.GetToken, [guildId]);

    const token = decrypt(res[0].token, res[0].hash);
    return {
        token: token,
        type: res[0].type
    }
}
/**
 * Get the information of the server with the provided ID
 * 
 * @param guildId - Id of the discord server
 * @returns IServer
 *
 */
export const getServerInformation = async (guildId: string): Promise<IServer> => {
    const info = await execute<IGuilds[]>(Queries.GetGuildData, [guildId]);
    if (info.length <= 0 || info[0].setup === 0) return {
        setup: 0,
        token: '',
        type: '',
        lang: 'EN'
    }

    const token = decrypt(info[0].token, info[0].hash);
    return {
        setup: 1,
        token: token,
        type: info[0].type,
        lang: info[0].lang
    }
}
/**
 * Update the language of the bot in the Database
 * 
 * @param guildId - Id of the discord server
 * @param language - Language you want to set
 * @returns Boolean if the language has been updated in the database
 *
 */
export const changeLanguage = async (guildId: string, language: string): Promise<boolean> => {
    const res: OkPacket = await execute(Queries.UpdateLanguage, [language, guildId]);
    if (res.affectedRows > 0) return true;
    return false;
}

interface IGuilds {
    setup: number,
    token: string,
    hash: string,
    type: string,
    lang: string
}
interface IToken {
    token: string,
    hash: string,
    type: string
}

interface IServer {
    setup: number,
    token: string
    type: string,
    lang: string

}