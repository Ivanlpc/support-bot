import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LogFile } from '../API/Util/LogFile';
import Logger from '../API/Util/Logger';
import { registerSecret, logContext } from '../API/Util/Log';
import { APIError, request } from '../API/Requests';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';

it('limits snapshots to recent lines without changing the file', () => {
  const temporary = temporaryDirectory();
  try {
    const sink = new LogFile(temporary.directory);
    sink.reset();
    sink.append('primera\nsegunda\núltima\n');
    const snapshot = sink.snapshot(Buffer.byteLength('egunda\núltima\n'));
    assert.equal(snapshot.truncated, true);
    assert.equal(snapshot.data.toString('utf8'), 'última\n');
    assert.equal(
      sink.snapshot(1000).data.toString('utf8'),
      'primera\nsegunda\núltima\n',
    );
  } finally {
    temporary.cleanup();
  }
});

it('captures console output once in the terminal and file, hides secrets and resets startup logs', (t) => {
  const temporary = temporaryDirectory();
  const previousDirectory = process.env.LOG_DIR;
  const previousLevel = process.env.LOG_LEVEL;
  let restore: (() => void) | undefined;
  try {
    process.env.LOG_DIR = temporary.directory;
    process.env.LOG_LEVEL = 'error';
    fs.writeFileSync(
      path.join(temporary.directory, 'latest.log'),
      'previous run',
    );
    const stdout = t.mock.method(process.stdout, 'write', () => true);
    const stderr = t.mock.method(process.stderr, 'write', () => true);
    registerSecret('console-private-secret');
    restore = Logger.initialize();
    console.log('Hola %s', 'console-private-secret');
    console.info({ token: 'hidden-console-token' });
    console.warn('aviso');
    console.error(new Error('fallo console-private-secret'));
    console.debug('detalle');
    restore();
    restore = undefined;
    const output = Logger.snapshot(10000).data.toString('utf8');
    const records = output
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.equal(records.length, 5);
    assert.deepEqual(
      records.map((record) => record.level),
      ['info', 'info', 'warn', 'error', 'debug'],
    );
    assert.ok(
      !/console-private-secret|hidden-console-token|previous run/.test(output),
    );
    assert.equal(records[0].message, 'Hola [REDACTED]');
    const terminal = [...stdout.mock.calls, ...stderr.mock.calls]
      .map((call) => String(call.arguments[0]))
      .sort();
    assert.equal(terminal.length, 5);
    assert.match(terminal.join(''), /\[INFO\] Hola \[REDACTED\]/);
    assert.match(terminal.join(''), /\[WARN\] aviso/);
    assert.ok(
      !/console-private-secret|hidden-console-token/.test(terminal.join('')),
    );
  } finally {
    restore?.();
    if (previousDirectory === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previousDirectory;
    if (previousLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previousLevel;
    temporary.cleanup();
  }
});

it('prints API failures with readable context, body and stack while keeping JSON in the file', (t) => {
  const temporary = temporaryDirectory();
  const previousDirectory = process.env.LOG_DIR;
  try {
    process.env.LOG_DIR = temporary.directory;
    const stderr = t.mock.method(process.stderr, 'write', () => true);
    registerSecret('pretty-private-token');
    logContext.run({ command: 'giftcard', guildId: '123' }, () => {
      Logger.error(
        'API request failed',
        {
          provider: 'plugin.tebex.io',
          resource: 'gift-cards',
          method: 'POST',
          durationMs: 12,
        },
        new APIError(403, {
          error_message: 'Forbidden',
          token: 'pretty-private-token',
        }),
      );
    });
    const terminal = String(stderr.mock.calls[0].arguments[0]);
    assert.match(terminal, /\[ERROR\] API request failed/);
    assert.match(terminal, /command=giftcard/);
    assert.match(terminal, /status: 403/);
    assert.match(terminal, /responseBody:/);
    assert.match(terminal, /error_message: 'Forbidden'/);
    assert.match(terminal, /\n\s+at /);
    assert.ok(!terminal.includes('pretty-private-token'));
    const record = JSON.parse(Logger.snapshot(10000).data.toString('utf8'));
    assert.equal(record.details[1].responseBody.error_message, 'Forbidden');
    assert.equal(record.details[1].responseBody.token, '[REDACTED]');
  } finally {
    if (previousDirectory === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previousDirectory;
    temporary.cleanup();
  }
});

it('prints failed request payloads and the exact Tebex header in the terminal and file', async (t) => {
  const temporary = temporaryDirectory();
  const previousDirectory = process.env.LOG_DIR;
  const previousLevel = process.env.LOG_LEVEL;
  const server = createServer((_req, res) => {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error_message: 'Blocked for debugging' }));
  });
  try {
    process.env.LOG_DIR = temporary.directory;
    process.env.LOG_LEVEL = 'error';
    const stderr = t.mock.method(process.stderr, 'write', () => true);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const body = new FormData();
    body.append('amount', '25');
    body.append('note', 'LINKED:42: Created with Discord bot');
    await assert.rejects(
      request(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/gift-cards`,
        {
          method: 'POST',
          headers: { 'X-Tebex-Secret': 'exact-tebex-debug-key' },
          body,
        },
      ),
      APIError,
    );
    const terminal = stderr.mock.calls
      .map((call) => String(call.arguments[0]))
      .join('');
    assert.match(terminal, /payload:/);
    assert.match(terminal, /amount: \[ '25' \]/);
    assert.match(terminal, /LINKED:42: Created with Discord bot/);
    assert.match(terminal, /'X-Tebex-Secret': 'exact-tebex-debug-key'/);
    const records = Logger.snapshot(20000)
      .data.toString('utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.deepEqual(records[0].details[0].request.payload, {
      amount: ['25'],
      note: ['LINKED:42: Created with Discord bot'],
    });
    assert.equal(
      records[0].details[0].request.sentHeaders['x-tebex-secret'],
      '[REDACTED]',
    );
    assert.equal(
      records[1].details[0]['X-Tebex-Secret'],
      'exact-tebex-debug-key',
    );
    Logger.error('Other secrets stay hidden', {
      token: 'exact-tebex-debug-key',
      password: 'hidden-password',
    });
    const last = String(stderr.mock.calls.at(-1)!.arguments[0]);
    assert.ok(!last.includes('exact-tebex-debug-key'));
    assert.ok(!last.includes('hidden-password'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousDirectory === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previousDirectory;
    if (previousLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previousLevel;
    temporary.cleanup();
  }
});

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'support-bot-log-'));
  return {
    directory,
    cleanup: () => {
      for (const file of fs.readdirSync(directory))
        fs.unlinkSync(path.join(directory, file));
      fs.rmdirSync(directory);
    },
  };
}

it('keeps the latest execution and discards the previous run on reset', () => {
  const temporary = temporaryDirectory();
  try {
    const sink = new LogFile(temporary.directory);
    sink.append('previous run\n');
    sink.reset();
    for (let index = 1; index <= 4; index++)
      sink.append(JSON.stringify({ message: 'entry-' + index }) + '\n');
    assert.deepEqual(fs.readdirSync(temporary.directory), ['latest.log']);
    const snapshot = sink.snapshot(1024);
    assert.equal(snapshot.truncated, false);
    assert.deepEqual(
      snapshot.data
        .toString('utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).message),
      ['entry-1', 'entry-2', 'entry-3', 'entry-4'],
    );
    sink.reset();
    assert.equal(sink.snapshot(1024).data.length, 0);
  } finally {
    temporary.cleanup();
  }
});

it('persists the sanitized console record without credentials', () => {
  const temporary = temporaryDirectory();
  const previousDirectory = process.env.LOG_DIR;
  const previousLevel = process.env.LOG_LEVEL;
  try {
    process.env.LOG_DIR = temporary.directory;
    process.env.LOG_LEVEL = 'info';
    registerSecret('private-file-test-secret');
    Logger.error('Credential private-file-test-secret failed', {
      password: 'never-persist',
    });
    const contents = fs.readFileSync(
      path.join(temporary.directory, 'latest.log'),
      'utf8',
    );
    assert.ok(!contents.includes('private-file-test-secret'));
    assert.ok(!contents.includes('never-persist'));
    assert.equal(JSON.parse(contents).level, 'error');
    assert.ok(contents.includes('[REDACTED]'));
  } finally {
    if (previousDirectory === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previousDirectory;
    if (previousLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previousLevel;
    temporary.cleanup();
  }
});
