import { watch } from 'chokidar';
import { openSync, readSync, closeSync, statSync } from 'fs';

export class JsonlTailer {
  constructor(filePath, onLine) {
    this.filePath = filePath;
    this.onLine = onLine;
    this.offset = 0;
    this.watcher = null;
  }

  start() {
    try {
      const stat = statSync(this.filePath);
      this.offset = stat.size;
    } catch {
      this.offset = 0;
    }

    this.watcher = watch(this.filePath, {
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    });

    this.watcher.on('change', () => this._readNew());
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  _readNew() {
    try {
      const stat = statSync(this.filePath);
      if (stat.size <= this.offset) {
        if (stat.size < this.offset) this.offset = 0;
        return;
      }
      const len = stat.size - this.offset;
      const buf = Buffer.alloc(len);
      const fd = openSync(this.filePath, 'r');
      try {
        readSync(fd, buf, 0, len, this.offset);
      } finally {
        closeSync(fd);
      }
      this.offset = stat.size;

      const text = buf.toString('utf8');
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          this.onLine(parsed);
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // file may be temporarily unavailable
    }
  }
}
