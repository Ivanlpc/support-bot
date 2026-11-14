import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LogFile } from '../API/Util/LogFile';
import Logger from '../API/Util/Logger';
import { registerSecret } from '../API/Util/Log';

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
    assert.deepEqual(
      terminal,
      output
        .trim()
        .split('\n')
        .map((line) => line + '\n')
        .sort(),
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
