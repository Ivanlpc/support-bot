export const Queries = {
    NewGuild: `INSERT IGNORE INTO guilds (id, name) VALUES(?,?)`,
    LeaveGuild: `DELETE FROM guilds WHERE id = ?`,
    UpdateToken: `UPDATE guilds SET token = ?, hash = ?, setup = 1, type = ? WHERE id = ?`,
    GetGuildToken: `SELECT token, hash, type FROM guilds WHERE id = ? AND setup = 1`,
    GetToken: `SELECT token, hash FROM guilds WHERE id = ? AND setup = 1`,
    GetRolesFromGuild: `SELECT p.id FROM permissions p JOIN permissions_name n ON(p.permission_node = n.value) WHERE p.guildId = ? AND (n.command = ? OR n.command = ?)`,
    GetCommandsData: `SELECT name, value FROM permissions_name`,
    NewPermission: `INSERT IGNORE INTO permissions (guildId, id, permission_node) VALUES (?, ?, ?)`,
    RemovePermission: `DELETE FROM permissions WHERE guildId =? AND id=? AND permission_node =?`,
    GetGuildData: `SELECT setup, token, type, hash, lang FROM guilds WHERE id = ?`,
    UpdateLanguage: `UPDATE guilds SET lang = ? WHERE id = ?`,
    GetLastNickname: `SELECT lastNickname FROM user_profiles WHERE premiumId = ? OR uniqueId = ?`
}