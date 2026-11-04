import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function healthy(value: unknown, now = Date.now()): boolean {
  if (!value || typeof value !== 'object') return false;
  const state = value as { ready?: unknown; time?: unknown };
  return (
    state.ready === true &&
    typeof state.time === 'number' &&
    Number.isFinite(state.time) &&
    now >= state.time &&
    now - state.time < 30_000
  );
}
if (require.main === module) {
  try {
    const file =
      process.env.HEALTH_FILE ??
      path.join(os.tmpdir(), 'support-bot-health.json');
    process.exitCode = healthy(JSON.parse(fs.readFileSync(file, 'utf8')))
      ? 0
      : 1;
  } catch {
    process.exitCode = 1;
  }
}
