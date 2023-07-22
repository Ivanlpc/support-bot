import Logger from "./Util/Logger";
/**
 * 
 * @param input - URL you want to request
 * @param init - Options of the request
 * @returns Promise with the response
 */
export const request = <T>(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<T> => {
    try {
      return new Promise<T>((resolve, reject) => {
        fetch(input, init)
        .then(res => res.json())
        .then(result => resolve(result))
        .catch(err => reject(err));
      });
  
    } catch (error) {
      Logger.error('[request][Error]: ', error);
      throw new Error('failed to request API');
    }
  }