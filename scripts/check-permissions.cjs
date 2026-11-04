const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');

module.exports = async function checkPermissions(connection, env) {
  const [nodes] = await connection.query(
    "SELECT value, command FROM permissions_name WHERE command IN ('search','payments','all')",
  );
  const node = Object.fromEntries(nodes.map((row) => [row.command, row.value]));
  await connection.query(
    "INSERT INTO guilds (id,name) VALUES ('permissions-main','Main'),('permissions-other','Other')",
  );
  const [legacy] = await connection.query(
    "INSERT INTO permissions_name (name,command) VALUES ('Inactive test permission','legacy.test')",
  );
  try {
    await connection.query(
      'INSERT INTO permissions (guildId,id,permission_node) VALUES ?',
      [
        [
          ['permissions-main', 'shared', node.search],
          ['permissions-main', 'shared', node.payments],
          ['permissions-main', 'shared', node.all],
          ['permissions-main', 'shared', legacy.insertId],
          ['permissions-main', 'role', node.search],
          ['permissions-main', 'all-holder', node.all],
          ['permissions-other', 'shared', node.search],
        ],
      ],
    );
    const code = `
      const assert=require('node:assert/strict');
      const service=require('./dist/API/Services/Permissions');
      const {Shopy}=require('./dist/API/Database');
      (async()=>{
        try {
          const direct=await service.listPermissions('permissions-main','shared');
          assert.deepEqual(direct.map(row=>row.command),['search','payments','all']);
          const matches=await service.searchPermission('permissions-main',${Number(node.search)});
          assert.equal(matches.length,4);
          assert.ok(matches.some(row=>row.id==='all-holder'&&row.command==='all'));
          assert.equal(await service.clearPermissions('permissions-main','shared'),4);
          assert.equal(await service.clearPermissions('permissions-main','shared'),0);
          assert.deepEqual(await service.listPermissions('permissions-main','shared'),[]);
          assert.equal((await service.listPermissions('permissions-other','shared')).length,1);
          assert.equal((await service.listPermissions('permissions-main','role')).length,1);
          assert.equal((await service.searchPermission('permissions-main',${Number(node.search)})).length,2);
        } finally {await Shopy.promise().end();}
      })().catch(error=>{console.error(error);process.exitCode=1;});
    `;
    await new Promise((resolve, reject) =>
      execFile(
        process.execPath,
        ['-e', code],
        { env },
        (error, stdout, stderr) =>
          error ? reject(new Error(stderr || error.message)) : resolve(stdout),
      ),
    );
    const [remaining] = await connection.query(
      "SELECT guildId,id FROM permissions WHERE guildId IN ('permissions-main','permissions-other') ORDER BY guildId,id",
    );
    assert.deepEqual(remaining, [
      { guildId: 'permissions-main', id: 'all-holder' },
      { guildId: 'permissions-main', id: 'role' },
      { guildId: 'permissions-other', id: 'shared' },
    ]);
    console.log(
      'Permission services: list, search including all, clear, repeated clear, and guild/target isolation passed.',
    );
  } finally {
    await connection.query(
      "DELETE FROM guilds WHERE id IN ('permissions-main','permissions-other')",
    );
    await connection.query('DELETE FROM permissions_name WHERE value = ?', [
      legacy.insertId,
    ]);
  }
};
