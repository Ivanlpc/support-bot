import { createConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import { config } from '../config';
import { decryptStored, encrypt } from '../API/Util/Crypto';
import Logger from '../API/Util/Logger';
import { registerSecret } from '../API/Util/Log';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--backup-confirmed'))
    throw new Error(
      'Back up the database, then pass --apply --backup-confirmed.',
    );
  [
    config.KEY,
    config.PREVIOUS_ENCRYPTION_KEY,
    config.Database.password,
  ].forEach(registerSecret);
  // Validate the new key even when no rows require encryption.
  encrypt('key-check');
  const connection = await createConnection(config.Database);
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<
      (RowDataPacket & { id: string; token: string; hash: string })[]
    >('SELECT id, token, hash FROM guilds WHERE setup = 1 FOR UPDATE');
    for (const row of rows) {
      const plaintext = decryptStored(row.token, row.hash);
      const updated = encrypt(plaintext);
      await connection.execute(
        'UPDATE guilds SET token = ?, hash = ? WHERE id = ?',
        [updated.token, updated.iv, row.id],
      );
    }
    if (apply) await connection.commit();
    else await connection.rollback();
    Logger.info(
      apply
        ? 'Credential re-encryption committed'
        : 'Credential dry run passed; transaction rolled back',
      { rows: rows.length },
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}
if (require.main === module)
  main().catch((error) => {
    Logger.error('Credential re-encryption failed', error);
    process.exitCode = 1;
  });
