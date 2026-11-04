-- Preserve each legacy grant by granting both new permissions before retiring the old nodes.
INSERT INTO permissions_name (name, command)
SELECT 'Create Giftcards', 'giftcard.create' WHERE NOT EXISTS (SELECT 1 FROM permissions_name WHERE command = 'giftcard.create');
INSERT INTO permissions_name (name, command)
SELECT 'Delete Giftcards', 'giftcard.delete' WHERE NOT EXISTS (SELECT 1 FROM permissions_name WHERE command = 'giftcard.delete');

INSERT IGNORE INTO permissions (guildId, id, permission_node)
SELECT p.guildId, p.id, target.value FROM permissions p
JOIN permissions_name source ON source.value = p.permission_node AND source.command = 'giftcard'
JOIN permissions_name target ON target.command IN ('giftcard.create', 'giftcard.delete');

UPDATE permissions_name SET command = 'legacy.giftcard' WHERE command = 'giftcard';
