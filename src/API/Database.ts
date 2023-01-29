import mysql2 from 'mysql2';

import config from "../config.json";


const pool = mysql2.createPool(config.Database);

pool.getConnection((err, conn) => {
    if (err) {
       
            console.error("\x1b[31m", err, "\u001b[0m");
            process.exit(1);

    } else {
        if (conn) conn.release()
        console.log('Connected to MySQL Database');
        return;
    }
})

/**
 * 
 * @param query - SQL query you want to execute
 * @param params - Params of the SQL query
 * @returns Promise
 */

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