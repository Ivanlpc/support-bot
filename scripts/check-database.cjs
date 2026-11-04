const mysql = require('mysql2/promise');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');

async function main() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      'Set TEST_DATABASE_URL to a disposable local MySQL instance with CREATE DATABASE permission.',
    );
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Database checks require a local test server.');
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
  });
  const created = [];
  try {
    const schema = fs.readFileSync('discordbot.sql', 'utf8');
    const migration =
      fs.readFileSync('migrations/001-modernize.sql', 'utf8') +
      '\n' +
      fs.readFileSync('migrations/002-giftcard-permissions.sql', 'utf8');
    for (const legacy of [false, true]) {
      const name = 'support_bot_check_' + randomBytes(8).toString('hex');
      await connection.query('CREATE DATABASE ' + name);
      created.push(name);
      await connection.query('USE ' + name);
      const initial = legacy
        ? schema
            .replaceAll("'giftcard.create'", "'giftcard'")
            .replaceAll("'giftcard.delete'", "'giftcard'")
            .replace('token text', 'token varchar(255)')
            .replace(/,\n    lang varchar\(2\) NOT NULL DEFAULT 'EN'/, '')
            .replace(
              "    (5, 'Delete Giftcards', 'giftcard'),\n    (6, 'Ban Players', 'ban'),\n    (7, 'All Permissions', 'all');",
              "    (5, 'Delete Giftcards', 'giftcard');",
            )
        : schema;
      await connection.query(initial);
      await connection.query(
        "INSERT INTO guilds (id, name, token, hash) VALUES ('test-guild', 'Test', 'legacy-ciphertext', '0123456789abcdef')",
      );
      await connection.query(
        "INSERT INTO permissions (guildId, id, permission_node) VALUES ('test-guild', 'test-user', 1)",
      );
      if (legacy)
        await connection.query(
          "INSERT INTO permissions (guildId, id, permission_node) VALUES ('test-guild', 'giftcard-user', 3)",
        );
      await connection.query(migration);
      await connection.query(migration);
      const [guilds] = await connection.query(
        'SELECT token, hash, lang FROM guilds',
      );
      require('node:assert/strict').deepEqual(guilds, [
        { token: 'legacy-ciphertext', hash: '0123456789abcdef', lang: 'EN' },
      ]);
      const [roles] = await connection.query('SELECT * FROM permissions');
      require('node:assert/strict').equal(roles.length, legacy ? 4 : 1);
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM guilds LIKE 'token'",
      );
      require('node:assert/strict').equal(columns[0].Type, 'text');
      const [permissions] = await connection.query(
        "SELECT command FROM permissions_name WHERE command IN ('all','ban')",
      );
      require('node:assert/strict').equal(permissions.length, 2);
      if (legacy) {
        const [grants] = await connection.query(
          "SELECT n.command FROM permissions p JOIN permissions_name n ON n.value=p.permission_node WHERE p.id='giftcard-user' AND n.command IN ('giftcard.create','giftcard.delete')",
        );
        require('node:assert/strict').equal(grants.length, 2);
        await connection.query(
          "DELETE p FROM permissions p JOIN permissions_name n ON n.value=p.permission_node WHERE p.id='giftcard-user' AND n.command='giftcard.delete'",
        );
        await connection.query(migration);
        const [remaining] = await connection.query(
          "SELECT n.command FROM permissions p JOIN permissions_name n ON n.value=p.permission_node WHERE p.id='giftcard-user' AND n.command IN ('giftcard.create','giftcard.delete')",
        );
        require('node:assert/strict').deepEqual(remaining, [
          { command: 'giftcard.create' },
        ]);
      }
      if (!legacy) {
        const assert = require('node:assert/strict');
        const crypto = require('node:crypto');
        const { execFileSync } = require('node:child_process');
        const { decrypt } = require('../dist/API/Util/Crypto');
        const oldKey = '0123456789abcdef',
          newKey = 'fedcba9876543210',
          iv = '0123456789abcdef';
        const cipher = crypto.createCipheriv('aes-128-ofb', oldKey, iv);
        const token =
          cipher.update('database-store-secret', 'utf8', 'hex') +
          cipher.final('hex');
        await connection.query('UPDATE guilds SET setup=1,token=?,hash=?', [
          token,
          iv,
        ]);
        const env = {
          ...process.env,
          DB_HOST: url.hostname,
          DB_PORT: url.port || '3306',
          DB_USER: decodeURIComponent(url.username),
          DB_PASSWORD: decodeURIComponent(url.password),
          DB_NAME: name,
          ENCRYPTION_KEY: newKey,
          PREVIOUS_ENCRYPTION_KEY: oldKey,
        };
        await require('./check-permissions.cjs')(connection, env);
        const run = (args) =>
          execFileSync(process.execPath, ['dist/tools/reencrypt.js', ...args], {
            env,
            stdio: 'pipe',
          });
        await new Promise((resolve) => setImmediate(resolve));
        const runAsync = (args) =>
          new Promise((resolve, reject) =>
            require('node:child_process').execFile(
              process.execPath,
              ['dist/tools/reencrypt.js', ...args],
              { env },
              (error, stdout) => (error ? reject(error) : resolve(stdout)),
            ),
          );
        await runAsync([]);
        const [unchanged] = await connection.query(
          'SELECT token,hash FROM guilds',
        );
        assert.deepEqual(unchanged, [{ token, hash: iv }]);
        await runAsync(['--apply', '--backup-confirmed']);
        const [updated] = await connection.query(
          'SELECT token,hash FROM guilds',
        );
        assert.ok(updated[0].token.startsWith('v2:'));
        assert.equal(
          decrypt(updated[0].token, updated[0].hash, newKey),
          'database-store-secret',
        );
        assert.throws(() => run(['--apply']));
        console.log(
          'Credential tool: dry run rolls back, apply re-encrypts, missing backup acknowledgement is rejected.',
        );
      }
      console.log(
        (legacy ? 'Legacy' : 'Fresh') +
          ' schema: migration is repeatable and preserves stored rows.',
      );
    }
  } finally {
    for (const name of created) await connection.query('DROP DATABASE ' + name);
    await connection.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
