import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const defaults: typeof import('../example.config.json') = require('../example.config.json');
const command = z.object({
  enabled: z.boolean(),
  command_name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9_-]+$/),
  command_description: z.string().min(1).max(100),
  command_requirements_user: z.string().default(''),
  command_requirements_id: z.string().default(''),
});
const subcommand = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  requirement_amount: z.string().default(''),
  non_required_user: z.string().default(''),
  requirement_id: z.string().default(''),
});
const configSchema = z.object({
  TOKEN: z.string(),
  KEY: z.string(),
  PREVIOUS_ENCRYPTION_KEY: z.string().default(''),
  TEBEX_URL: z.url(),
  CRAFTINGSTORE_URL: z.url(),
  TRANSACTION_AVATAR_URL: z.url(),
  Database: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().min(1).max(65535).default(3306),
    user: z.string().min(1),
    password: z.string(),
    database: z.string().min(1),
    connectionLimit: z.number().int().positive().default(10),
  }),
  Commands: z.object({
    all_permissions: z.string(),
    setup: command,
    search_transaction: command,
    help: command,
    perm: command,
    giftcard: command.extend({
      subcommand: z.object({
        create: subcommand,
        delete: subcommand,
        recover: subcommand,
      }),
    }),
    ban: command,
    payments: command,
    lang: command,
  }),
});
export type Config = z.output<typeof configSchema>;
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function merge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    const previous = result[key];
    result[key] =
      record(previous) && record(value) ? merge(previous, value) : value;
  }
  return result;
}
export function loadConfig(
  local: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Config {
  if (!record(local)) throw new Error('Configuration must be a JSON object');
  const database =
    record(local.Database) && record(local.Database.shopy)
      ? local.Database.shopy
      : local.Database;
  const candidate = merge(defaults, {
    ...local,
    ...(database ? { Database: database } : {}),
  });
  const mappings: Record<string, string> = {
    DISCORD_TOKEN: 'TOKEN',
    ENCRYPTION_KEY: 'KEY',
    PREVIOUS_ENCRYPTION_KEY: 'PREVIOUS_ENCRYPTION_KEY',
    TEBEX_URL: 'TEBEX_URL',
    CRAFTINGSTORE_URL: 'CRAFTINGSTORE_URL',
  };
  for (const [variable, key] of Object.entries(mappings))
    if (env[variable] !== undefined) candidate[key] = env[variable];
  const db = candidate.Database as Record<string, unknown>;
  for (const [variable, key] of Object.entries({
    DB_HOST: 'host',
    DB_PORT: 'port',
    DB_USER: 'user',
    DB_PASSWORD: 'password',
    DB_NAME: 'database',
  }))
    if (env[variable] !== undefined) db[key] = env[variable];
  const result = configSchema.safeParse(candidate);
  if (!result.success)
    throw new Error(
      'Invalid configuration fields: ' +
        result.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  return result.data;
}
const configPath = path.resolve(__dirname, '../config.json');
export const config = loadConfig(
  fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {},
);
export function validateConfig(): void {
  if (!config.TOKEN)
    throw new Error('Set DISCORD_TOKEN or TOKEN in config.json.');
  if (Buffer.byteLength(config.KEY, 'utf8') !== 16)
    throw new Error(
      'ENCRYPTION_KEY / KEY must contain exactly 16 UTF-8 bytes. Keep the original key for stored tokens.',
    );
  if (
    config.PREVIOUS_ENCRYPTION_KEY &&
    Buffer.byteLength(config.PREVIOUS_ENCRYPTION_KEY, 'utf8') !== 16
  )
    throw new Error('PREVIOUS_ENCRYPTION_KEY must contain 16 UTF-8 bytes.');
  for (const value of [config.TEBEX_URL, config.CRAFTINGSTORE_URL])
    if (new URL(value).protocol !== 'https:')
      throw new Error('Production API URLs must use HTTPS.');
  if (
    !['debug', 'info', 'warn', 'error'].includes(
      process.env.LOG_LEVEL ?? 'info',
    )
  )
    throw new Error('Invalid LOG_LEVEL');
  const names = Object.entries(config.Commands)
    .filter(
      (entry): entry is [string, Config['Commands']['setup']] =>
        typeof entry[1] === 'object',
    )
    .filter(([, value]) => value.enabled)
    .map(([, value]) => value.command_name);
  if (new Set(names).size !== names.length)
    throw new Error('Enabled command names must be unique');
}
