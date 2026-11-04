-- Back up the database first. Run against the bot database, with the bot stopped.
-- DDL auto-commits in MySQL; this script is not transactional.
ALTER TABLE guilds MODIFY COLUMN token TEXT NULL;

-- Add the column only when upgrading a schema that does not already have it.
SET @has_lang = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guilds' AND COLUMN_NAME = 'lang');
SET @lang_sql = IF(@has_lang = 0,
    'ALTER TABLE guilds ADD COLUMN lang VARCHAR(2) NOT NULL DEFAULT ''EN''',
    'SELECT 1');
PREPARE lang_statement FROM @lang_sql;
EXECUTE lang_statement;
DEALLOCATE PREPARE lang_statement;

INSERT INTO permissions_name (name, command)
SELECT 'Ban Players', 'ban' WHERE NOT EXISTS (SELECT 1 FROM permissions_name WHERE command = 'ban');
INSERT INTO permissions_name (name, command)
SELECT 'All Permissions', 'all' WHERE NOT EXISTS (SELECT 1 FROM permissions_name WHERE command = 'all');
