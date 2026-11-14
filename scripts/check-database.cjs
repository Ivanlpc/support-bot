const mysql = require('mysql2/promise');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

async function main() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      'Set TEST_DATABASE_URL to a disposable local MySQL instance with CREATE DATABASE permission.',
    );
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Database checks require a local test server.');
  const options = {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
  const connection = await mysql.createConnection({
    ...options,
    multipleStatements: true,
  });
  const name = 'support_bot_check_' + randomBytes(8).toString('hex');
  let created = false;
  try {
    await connection.query('CREATE DATABASE ' + name);
    created = true;
    await connection.query('USE ' + name);
    await connection.query(fs.readFileSync('discordbot.sql', 'utf8'));
    const [tables] = await connection.query('SHOW TABLES');
    assert.deepEqual(tables.map((row) => Object.values(row)[0]).sort(), [
      'guilds',
      'permissions',
      'permissions_name',
    ]);
    const [permissions] = await connection.query(
      'SELECT command FROM permissions_name ORDER BY value',
    );
    assert.deepEqual(
      permissions.map((row) => row.command),
      [
        'search',
        'perm',
        'giftcard.create',
        'payments',
        'giftcard.delete',
        'ban',
        'all',
      ],
    );
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM guilds LIKE 'token'",
    );
    assert.equal(columns[0].Type, 'text');
    const [providerColumns] = await connection.query(
      "SHOW COLUMNS FROM guilds LIKE 'type'",
    );
    assert.equal(providerColumns.length, 0);
    await connection.execute('INSERT INTO guilds (id,name) VALUES (?,?)', [
      'schema-test',
      'Servidor 🔑',
    ]);
    const [rows] = await connection.query(
      'SELECT setup,name FROM guilds WHERE id = ?',
      ['schema-test'],
    );
    assert.deepEqual(rows, [{ setup: 0, name: 'Servidor 🔑' }]);
    const { encrypt, decrypt } = require('../dist/API/Util/Crypto');
    const key = '0123456789abcdef';
    const encrypted = encrypt('test-store-token', key);
    await connection.execute(
      'UPDATE guilds SET token=?,hash=?,setup=1 WHERE id=?',
      [encrypted.token, encrypted.iv, 'schema-test'],
    );
    const [stored] = await connection.query(
      'SELECT token,hash FROM guilds WHERE id=?',
      ['schema-test'],
    );
    assert.equal(
      decrypt(stored[0].token, stored[0].hash, key),
      'test-store-token',
    );
    const env = {
      ...process.env,
      DB_HOST: options.host,
      DB_PORT: String(options.port),
      DB_USER: options.user,
      DB_PASSWORD: options.password,
      DB_NAME: name,
      ENCRYPTION_KEY: key,
    };
    await promisify(execFile)(
      process.execPath,
      [
        '-e',
        `
      const assert = require('node:assert/strict');
      const guilds = require('./dist/API/Services/Guilds');
      const { Shopy } = require('./dist/API/Database');
      (async () => {
        try {
          assert.equal(await guilds.newGuild('tebex-setup', 'Tebex server'), true);
          assert.deepEqual(await guilds.getServerInformation('tebex-setup'), {
            setup: 0, token: ''
          });
          assert.equal(await guilds.updateToken('tebex-setup', 'test-tebex-token'), true);
          assert.deepEqual(await guilds.getServerInformation('tebex-setup'), {
            setup: 1, token: 'test-tebex-token'
          });
          await guilds.leaveGuild('tebex-setup');
        } finally { await Shopy.promise().end(); }
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `,
      ],
      { env },
    );
    await require('./check-permissions.cjs')(connection, env);
    await connection.execute(
      'INSERT INTO permissions (guildId,id,permission_node) VALUES (?,?,?)',
      ['schema-test', 'user', 1],
    );
    await connection.execute('DELETE FROM guilds WHERE id=?', ['schema-test']);
    const [grants] = await connection.query(
      'SELECT * FROM permissions WHERE guildId=?',
      ['schema-test'],
    );
    assert.equal(grants.length, 0);
    console.log(
      'Fresh installation passed: schema, initial permissions, Unicode, defaults, authenticated token storage and cascading deletion.',
    );
  } finally {
    if (created) await connection.query('DROP DATABASE ' + name);
    await connection.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
