import fs from 'node:fs';
import path from 'node:path';

export class LogFile {
  private readonly file: string;

  constructor(directory: string) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o750 });
    this.file = path.join(directory, 'latest.log');
  }

  reset(): void {
    fs.writeFileSync(this.file, '', { mode: 0o600 });
  }

  append(line: string): void {
    fs.appendFileSync(this.file, line, { mode: 0o600 });
  }

  snapshot(maxBytes: number): { data: Buffer; truncated: boolean } {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
      throw new Error('Invalid log snapshot size');
    const descriptor = fs.openSync(this.file, 'r');
    try {
      const size = fs.fstatSync(descriptor).size;
      const start = Math.max(0, size - maxBytes);
      const data = Buffer.alloc(Math.min(size, maxBytes));
      const read = fs.readSync(descriptor, data, 0, data.length, start);
      let result = data.subarray(0, read);
      if (start > 0) {
        const newline = result.indexOf(10);
        if (newline >= 0 && newline < result.length - 1)
          result = result.subarray(newline + 1);
      }
      return { data: result, truncated: start > 0 };
    } finally {
      fs.closeSync(descriptor);
    }
  }
}
