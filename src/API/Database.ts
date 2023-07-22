import mysql2, { Pool } from 'mysql2';
import Logger from './Util/Logger';

const config = require("../../config.json");

const HydraBot = mysql2.createPool(config.Database.HydraBot);

HydraBot.getConnection((err, conn) => {
  if (err) {

    Logger.error("\x1b[31m", err, "\u001b[0m");
    process.exit(1);

  } else {
    if (conn) conn.release()
    return;
  }
})

const JPremium = mysql2.createPool(config.Database.JPremium);
const Vyper = mysql2.createPool(config.Database.Vyper);

Vyper.getConnection((err, conn) => {
  if (err) {
    Logger.error("\x1b[31m", err, "\u001b[0m");
    process.exit(1);

  } else {
    if (conn) conn.release()
    return;
  }
});
JPremium.getConnection((err, conn) => {
  if (err) {
    Logger.error("\x1b[31m", err, "\u001b[0m");
    process.exit(1);

  } else {
    if (conn) conn.release()
    return;
  }
})

HydraBot.on('connection', (conn) => {
  conn.on('error', (err: any) => {
    Logger.error("Conexión a la base de datos perdida...")
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  })
})

export const execute = <T>(pool: Pool, query: string, params: string[] | Object): Promise<T> => {
  try {
    if (!pool) throw new Error('Pool was not created. Ensure pool is created when running the app.');

    return new Promise<T>((resolve, reject) => {
      pool.query(query, params, (error, results: any) => {
        if (error) reject(error);
        else resolve(results);
      });
    });

  } catch (error) {
    Logger.error('[mysql][execute][Error]: ', error);
    throw new Error('failed to execute MySQL query');
  }
}

export { HydraBot, JPremium, Vyper };