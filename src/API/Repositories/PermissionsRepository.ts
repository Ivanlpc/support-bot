import { execute } from "../Database"
import { Queries } from "../Queries"

export const getRolesWithPermission = (guildId: string | null, permission_node: string) : Promise<Array<string>> => {
    return execute<string[]>(Queries.GetRolesFromGuild, [guildId, permission_node]);
}
