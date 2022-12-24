import mysql2 from 'mysql2';

import { config } from  '..';

const pool = mysql2.createPool(config.Database);

pool.getConnection((err, conn) => {
    if (err) {
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
			console.error("\x1b[31m", `Connection lost to Database`, "\u001b[0m")

        }
        if (err.code === "ER_CON_COUNT_ERROR") {
            console.error("\x1b[31m", `Too many connections`, "\u001b[0m")

        }
        if (err.code === "ECONNREFUSED") {
            console.error("\x1b[31m", `Connection refused to database`, "\u001b[0m");
            process.exit(1);

        }
    } else {
        if (conn) conn.release()
        console.log('Connected to MySQL Database');
        return;
    }
})


export const execute = <T>(query: string, params: string[] | Object): Promise<T> => {
    try {
      if (!pool) throw new Error('Pool was not created. Ensure pool is created when running the app.');
  
      return new Promise<T>((resolve, reject) => {
        pool.query(query, params, (error, results: any) => {
          if (error) reject(error);
          else resolve(results);
        });
      });
  
    } catch (error) {
      console.error('[mysql][execute][Error]: ', error);
      throw new Error('failed to execute MySQL query');
    }
  }

export default pool;