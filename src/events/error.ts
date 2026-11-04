import Event from '../structures/Event';
import Logger from '../API/Util/Logger';
export const event = new Event('error', (error) =>
  Logger.error('Discord client error', error),
);
