import { writeLog, initializeLogging, readLatestLog } from './Log';
export default class Logger {
  static initialize(): () => void {
    return initializeLogging();
  }
  static snapshot(maxBytes: number) {
    return readLatestLog(maxBytes);
  }
  static debug(message: string, ...details: unknown[]): void {
    writeLog('debug', message, details);
  }
  static info(message: string, ...details: unknown[]): void {
    writeLog('info', message, details);
  }
  static warn(message: string, ...details: unknown[]): void {
    writeLog('warn', message, details);
  }
  static error(message: unknown, ...details: unknown[]): void {
    writeLog(
      'error',
      typeof message === 'string' ? message : 'Unexpected error',
      typeof message === 'string' ? details : [message, ...details],
    );
  }
  static tebexAuthenticationDebug(secret: string): void {
    writeLog(
      'error',
      'Tebex request authentication (debug)',
      [],
      false,
      secret,
    );
  }
}
