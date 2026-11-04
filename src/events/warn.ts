import Event from '../structures/Event';
import Logger from '../API/Util/Logger';
export const event = new Event('warn', (message) =>
  Logger.warn('Discord warning', message),
);
