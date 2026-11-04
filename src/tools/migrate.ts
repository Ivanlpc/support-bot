import fs from 'node:fs/promises';
import path from 'node:path';
import { createConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import { config } from '../config';
import Logger from '../API/Util/Logger';
import { registerSecret } from '../API/Util/Log';

async function main(): Promise<void> {
  if (!process.argv.includes('--backup-confirmed'))
    throw new Error(
      'Back up the database first, then pass --backup-confirmed.',
    );
  registerSecret(config.Database.password);
  const connection = await createConnection({
    ...config.Database,
    multipleStatements: true,
  });
  try {
    const [lock] = await connection.query<
      (RowDataPacket & { acquired: number })[]
    >('SELECT GET_LOCK(?,10) AS acquired', ['support_bot_schema']);
    if (lock[0].acquired !== 1) throw new Error('Another migration is running');
    const directory = path.resolve(__dirname, '../../migrations');
    for (const file of (await fs.readdir(directory))
      .filter((file) => /^\d+-[a-z-]+\.sql$/.test(file))
      .sort()) {
      Logger.info('Applying schema migration', { migration: file });
      await connection.query(
        await fs.readFile(path.join(directory, file), 'utf8'),
      );
    }
    Logger.info('Schema migration complete');
  } finally {
    await connection
      .query('SELECT RELEASE_LOCK(?)', ['support_bot_schema'])
      .catch(() => {});
    await connection.end();
  }
}
if (require.main === module)
  main().catch((error) => {
    Logger.error('Schema migration failed', error);
    process.exitCode = 1;
  });
