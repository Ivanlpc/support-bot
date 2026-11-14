import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LogFile } from '../API/Util/LogFile';
import Logger from '../API/Util/Logger';
import { registerSecret } from '../API/Util/Log';

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

it('rotates persisted logs and retains only the configured history', () => {
  const temporary = temporaryDirectory();
  try {
    const sink = new LogFile(temporary.directory, 30, 2);
    for (let index = 1; index <= 4; index++)
      sink.append(JSON.stringify({ message: 'entry-' + index }) + '\n');
    assert.deepEqual(fs.readdirSync(temporary.directory).sort(), [
      'app.log',
      'app.log.1',
      'app.log.2',
    ]);
    for (const [file, expected] of [
      ['app.log', 'entry-4'],
      ['app.log.1', 'entry-3'],
      ['app.log.2', 'entry-2'],
    ]) {
      const contents = fs.readFileSync(
        path.join(temporary.directory, file),
        'utf8',
      );
      assert.equal(JSON.parse(contents).message, expected);
    }
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
      path.join(temporary.directory, 'app.log'),
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
