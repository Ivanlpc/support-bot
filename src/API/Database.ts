import mysql2, { Pool, QueryValues } from 'mysql2';
import { config } from '../config';
import Logger from './Util/Logger';

export const Shopy = mysql2.createPool({
  ...config.Database,
  connectTimeout: 10_000,
  waitForConnections: true,
  queueLimit: 100,
});
Shopy.on('connection', (connection) => {
  Logger.debug('MySQL connection opened', {
    connectionId: connection.threadId,
  });
  connection.on('error', (error) =>
    Logger.error('MySQL connection error', error),
  );
});

export async function connectDatabase(): Promise<void> {
  const connection = await Shopy.promise().getConnection();
  connection.release();
}

export function execute<T>(
  pool: Pool,
  query: string,
  params: QueryValues,
): Promise<T> {
  const started = performance.now();
  const operation = query.trim().split(/\s/)[0];
  return new Promise((resolve, reject) => {
    pool.query({ sql: query, timeout: 10_000 }, params, (error, results) => {
      const durationMs = Math.round(performance.now() - started);
      if (error) {
        Logger.error('Database query failed', { operation, durationMs }, error);
        reject(error);
      } else {
        Logger.debug('Database query completed', { operation, durationMs });
        resolve(results as T);
      }
    });
  });
}
