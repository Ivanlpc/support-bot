import { execute } from "../Database";
import { Queries } from "../Queries";
import { OkPacket } from "mysql2";
import { GuildMember } from "discord.js";

export const getRolesWithPermission = async (guildId: string | null, permission_node: string) : Promise<Array<string>> => {
    const perms = await execute<IRoles[]>(Queries.GetRolesFromGuild, [guildId, permission_node])
    return perms.map<string>(elem => elem.id);
}
export const getCommandChoices = (): Promise<ICommand[]> => {
    return execute<ICommand[]>(Queries.GetCommandsData, []);
}
export const addPermission = async(guildId: string | null,id: string, permission_node: number ) : Promise<boolean> => {
    const query : OkPacket = await execute(Queries.NewPermission, [guildId, id, permission_node]);
    return query.affectedRows > 0;
}

export const removePermission = async (guildId: string|null, id: string, permission_node: number) : Promise<boolean> => {
    const query: OkPacket = await execute(Queries.RemovePermission, [guildId, id, permission_node]);
    return query.affectedRows > 0;
}
export const hasPermission = async (interaction: GuildMember, permission: string) : Promise<boolean> => {
    const roles : string[] = await getRolesWithPermission(interaction.guild.id, permission);
	if(!interaction.roles.cache.hasAny(...roles) && !roles.includes(interaction.id) && interaction.id !== interaction.guild.ownerId){
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