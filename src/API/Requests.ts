
export const request = <T>(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<T> => {
    try {
      return new Promise<T>((resolve, reject) => {
        fetch(input, init)
        .then(res => res.json())
        .then(result => resolve(result))
        .catch(err => reject(err));
      });
  
    } catch (error) {
      console.error('[request][Error]: ', error);
      throw new Error('failed to request API');
    }
  }