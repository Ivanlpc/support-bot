-- Fresh installation only. Existing databases: see migrations/001-modernize.sql.
CREATE TABLE guilds (
    id varchar(255) NOT NULL PRIMARY KEY,
    joined_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    setup tinyint(1) NOT NULL DEFAULT 0,
    name varchar(255) DEFAULT NULL,
    token text DEFAULT NULL,
    type varchar(32) DEFAULT NULL,
    hash varchar(255) DEFAULT NULL,
    lang varchar(2) NOT NULL DEFAULT 'EN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions_name (
    value int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    command varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions_name (value, name, command) VALUES
    (1, 'Search Transactions', 'search'),
    (2, 'Manage Permissions', 'perm'),
    (3, 'Create GiftCards', 'giftcard.create'),
    (4, 'User Payments', 'payments'),
    (5, 'Delete Giftcards', 'giftcard.delete'),
    (6, 'Ban Players', 'ban'),
    (7, 'All Permissions', 'all');

CREATE TABLE permissions (
    guildId varchar(255) NOT NULL,
    id varchar(255) NOT NULL,
    permission_node int NOT NULL,
    PRIMARY KEY (guildId, id, permission_node),
    CONSTRAINT fk_guildId FOREIGN KEY (guildId) REFERENCES guilds (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_permission_name FOREIGN KEY (permission_node) REFERENCES permissions_name (value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
