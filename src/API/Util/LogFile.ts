import fs from 'node:fs';
import path from 'node:path';

export class LogFile {
  private readonly file: string;

  constructor(
    directory: string,
    private readonly maxBytes = 10 * 1024 * 1024,
    private readonly copies = 4,
  ) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o750 });
    this.file = path.join(directory, 'app.log');
  }

  append(line: string): void {
    const size = fs.existsSync(this.file) ? fs.statSync(this.file).size : 0;
    if (size > 0 && size + Buffer.byteLength(line) > this.maxBytes) {
      for (let index = this.copies; index >= 1; index--) {
        const target = this.file + '.' + index;
        const source = index === 1 ? this.file : this.file + '.' + (index - 1);
        if (index === this.copies) fs.rmSync(target, { force: true });
        if (fs.existsSync(source)) fs.renameSync(source, target);
      }
    }
    fs.appendFileSync(this.file, line, { mode: 0o640 });
  }
}
