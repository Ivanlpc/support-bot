import { writeLog } from './Log';
export default class Logger {
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
}
