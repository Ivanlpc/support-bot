import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'discord.js';
import { Pool } from 'mysql2';
import Logger from './API/Util/Logger';

export const healthFile =
  process.env.HEALTH_FILE ?? path.join(os.tmpdir(), 'support-bot-health.json');
let commandsReady = false;
export function markCommandsReady(): void {
  commandsReady = true;
}

export function startHealthMonitor(
  client: Client,
  pool: Pool,
  onFailure: () => void,
): () => void {
  let inFlight = false;
  let stopped = false;
  let failures = 0;
  const started = Date.now();
  const check = async () => {
    if (inFlight || stopped) return;
    inFlight = true;
    try {
      await new Promise<void>((resolve, reject) =>
        pool.query({ sql: 'SELECT 1', timeout: 5_000 }, (error) =>
          error ? reject(error) : resolve(),
        ),
      );
      const ready = client.isReady() && commandsReady;
      await fs.writeFile(
        healthFile,
        JSON.stringify({ ready, time: Date.now() }),
        { mode: 0o600 },
      );
      if (ready) {
        failures = 0;
        Logger.debug('Health check passed');
      } else if (Date.now() - started > 90_000) failures++;
    } catch (error) {
      failures++;
      await fs.rm(healthFile, { force: true }).catch(() => {});
      Logger.error(
        'Health check failed',
        { consecutiveFailures: failures },
        error,
      );
    } finally {
      inFlight = false;
      if (!stopped && failures >= 3) {
        Logger.error('Health watchdog is stopping the bot');
        onFailure();
      }
    }
  };
  const timer = setInterval(() => void check(), 10_000);
  timer.unref();
  void check();
  return () => {
    stopped = true;
    clearInterval(timer);
    void fs.rm(healthFile, { force: true }).catch(() => {});
  };
}
