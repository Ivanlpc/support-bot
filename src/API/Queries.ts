export const Queries = {
    NewGuild: `INSERT IGNORE INTO guilds (id, name) VALUES(?,?)`,
    LeaveGuild: `DELETE FROM guilds WHERE id = ?`,
    UpdateToken: `UPDATE guilds SET token = ?, hash = ?, setup = 1, type = ? WHERE id = ?`,
    GetGuildToken: `SELECT token, hash, type FROM guilds WHERE id = ? AND setup = 1`,
    GetToken: `SELECT token, hash FROM guilds WHERE id = ? AND setup = 1`,
    GetRolesFromGuild: `SELECT p.id FROM permissions p JOIN permissions_name n ON(p.permission_node = n.id) WHERE p.guildId = ? AND n.permission = ?`
}