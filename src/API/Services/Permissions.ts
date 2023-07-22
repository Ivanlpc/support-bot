import { execute, HydraBot } from "../Database";
import { Queries } from "../Queries";
import { OkPacket } from "mysql2";
import { GuildMember } from "discord.js";

const config = require("../../../config.json");


/**
 * Get all IDs that has the given permission node on that discord server
 * @async
 * @param guildId - Id of the discord server
 * @param permission_node - Permission you want to get
 * @returns Array of strings containing all the Ids that can be user ids or role id.
 *
 */
const getRolesWithPermission = async (guildId: string | null, permission_node: string) : Promise<Array<string>> => {
    const perms = await execute<IRoles[]>(HydraBot, Queries.GetRolesFromGuild, [guildId, permission_node, config.Commands.all_permissions])
    return perms.map<string>(elem => elem.id);
}

/**
 * @async
 * @returns A list of the permissions you can add/remove to users using the /perm command 
 */
export const getCommandChoices = async (): Promise<ICommand[]> => {
    return await execute<ICommand[]>(HydraBot, Queries.GetCommandsData, []);
}

/**
 * Add a permission to the database
 * @async
 * @param guildId - Id of the discord server
 * @param id - User ID or Role ID you want to give permission
 * @param permission_node - Permission you want to grant that ID
 * @returns Boolean if the permission has been inserted into database
 */
export const addPermission = async(guildId: string | null,id: string, permission_node: number ) : Promise<boolean> => {
    const query : OkPacket = await execute(HydraBot, Queries.NewPermission, [guildId, id, permission_node]);
    return query.affectedRows > 0;
}
/**
 * Remove a permission of the database
 * @async
 * @param guildId - Id of the discord server
 * @param id - User ID or Role ID you want to give permission
 * @param permission_node - Permission you want to grant that ID
 * @returns Boolean if the permission has been removed from the database
 */
export const removePermission = async (guildId: string|null, id: string, permission_node: number) : Promise<boolean> => {
    const query: OkPacket = await execute(HydraBot, Queries.RemovePermission, [guildId, id, permission_node]);
    return query.affectedRows > 0;
}
/**
 * Check if a user has permission
 * @async
 * @param member - GuildMember
 * @param id - User ID or Role ID you want to give permission
 * @param perm - Permission you want to check
 * @returns Boolean if `ID` has `perm` permission
 */
export const hasPermission = async (member: GuildMember, perm: string) : Promise<boolean> => {
    const roles : string[] = await getRolesWithPermission(member.guild.id, perm);
	if(!member.roles.cache.hasAny(...roles) && !roles.includes(member.id) && member.id !== member.guild.ownerId){
		return false;
	} else return true;
}

interface ICommand {
    name: string,
    value: number
}
interface IRoles {
    id: string
}