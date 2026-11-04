import path from 'node:path';
import fs from 'node:fs';
import Bot from './structures/Bot';
import { loadCommands } from './commands';
import { startHealthMonitor } from './health';
import { registerSecret, logContext, LogContext } from './API/Util/Log';
import Logger from './API/Util/Logger';
import { config, validateConfig } from './config';
import { Shopy, connectDatabase } from './API/Database';

export const client = new Bot();

async function start(): Promise<void> {
  [
    config.TOKEN,
    config.KEY,
    config.PREVIOUS_ENCRYPTION_KEY,
    config.Database.password,
  ].forEach(registerSecret);
  validateConfig();
  Logger.info('Bot starting', {
    version: require('../package.json').version,
    node: process.version,
  });
  await connectDatabase();
  Logger.info('Database connected');
  for (const file of fs.readdirSync(path.join(__dirname, 'events'))) {
    if (!/\.(js|ts)$/.test(file) || file.endsWith('.d.ts')) continue;
    const { event } = require(path.join(__dirname, 'events', file));
    client.on(event.getName(), (...args: unknown[]) => {
      const first = args[0] as
        | {
            id?: string;
            guildId?: string;
            commandName?: string;
            customId?: string;
          }
        | undefined;
      const context: LogContext =
        event.getName() === 'interactionCreate'
          ? {
              interactionId: first?.id ?? '',
              guildId: first?.guildId ?? '',
              command:
                first?.commandName ?? first?.customId?.split(';')[0] ?? '',
            }
          : { event: event.getName() };
      logContext.run(context, () => {
        Promise.resolve()
          .then(() => event.execute(...args))
          .catch((error) => {
            Logger.error('Event failed', error);
            if (event.getName() === 'clientReady') void shutdown(1);
          });
      });
    });
  }
  for (const command of await loadCommands()) {
    client.pushCommand(command.getData().name, command);
    client.pushRestCommand(command.getData().toJSON());
    Logger.info('Command loaded', { command: command.getData().name });
  }
  for (const file of fs.readdirSync(path.join(__dirname, 'select_menu'), {
    withFileTypes: true,
  })) {
    if (!file.isDirectory()) continue;
    const { select_menu } = require(
      path.join(__dirname, 'select_menu', file.name),
    );
    if (select_menu) client.pushSelectmenu(select_menu.customId, select_menu);
  }
  client.on('shardError', (error, shard) =>
    Logger.error('Discord shard error', { shard }, error),
  );
  client.on('shardReconnecting', (shard) =>
    Logger.warn('Discord reconnecting', { shard }),
  );
  client.on('shardResume', (shard, replayed) =>
    Logger.info('Discord connection resumed', { shard, replayed }),
  );
  await client.login(config.TOKEN);
  stopHealth = startHealthMonitor(client, Shopy, () => void shutdown(1));
}

let stopHealth: (() => void) | undefined;
let stopping = false;
async function shutdown(code: number): Promise<void> {
  if (stopping) return;
  stopping = true;
  stopHealth?.();
  Logger.info('Bot stopping', { exitCode: code });
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  try {
    await client.destroy();
    await Shopy.promise().end();
  } finally {
    Logger.info('Bot stopped', { exitCode: code });
    process.exitCode = code;
  }
}

if (require.main === module) {
  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));
  process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled rejection:', error);
    void shutdown(1);
  });
  process.on('uncaughtException', (error) => {
    Logger.error('Uncaught exception:', error);
    void shutdown(1);
  });
  start().catch((error) => {
    Logger.error('Startup failed:', error);
    void shutdown(1);
  });
}
