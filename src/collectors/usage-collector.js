import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';

let timer = null;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_MS = 600_000; // 10 minutes

export function startUsageCollector(store) {
  const collect = () => {
    try {
      const projectsDir = config.paths.projectsDir;
      if (!existsSync(projectsDir)) return;

      const now = new Date();
      const weekAgoMs = now.getTime() - WEEK_MS;
      const weekAgoDate = new Date(weekAgoMs).toISOString().slice(0, 10);

      const usage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        turns: 0,
        sessions: 0,
        bySession: [],
        daily: {},
      };

      let latestMtime = 0;
      let latestModel = '';
      let liveActiveCount = 0;

      const projectDirs = readdirSync(projectsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const dir of projectDirs) {
        const dirPath = join(projectsDir, dir);
        let jsonlFiles;
        try {
          jsonlFiles = readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
        } catch { continue; }

        for (const file of jsonlFiles) {
          const filePath = join(dirPath, file);
          try {
            const stat = statSync(filePath);
            if (now.getTime() - stat.mtimeMs > WEEK_MS) continue;

            // Track active sessions by file mtime
            if (now.getTime() - stat.mtimeMs < ACTIVE_MS) {
              liveActiveCount++;
            }

            const sessionUsage = parseSessionUsage(filePath, weekAgoDate, usage.daily);
            if (sessionUsage.turns === 0) continue;

            // Track model from most recently modified file
            if (stat.mtimeMs > latestMtime && sessionUsage.model) {
              latestMtime = stat.mtimeMs;
              latestModel = sessionUsage.model;
            }

            usage.inputTokens += sessionUsage.inputTokens;
            usage.outputTokens += sessionUsage.outputTokens;
            usage.cacheReadTokens += sessionUsage.cacheReadTokens;
            usage.cacheCreationTokens += sessionUsage.cacheCreationTokens;
            usage.turns += sessionUsage.turns;
            usage.sessions++;
            usage.bySession.push({
              project: dir,
              sessionId: file.replace('.jsonl', ''),
              ...sessionUsage,
            });
          } catch {
            // skip unreadable files
          }
        }
      }

      store.update('liveUsage', usage);

      // Update active model from jsonl data (more accurate than stats-cache)
      if (latestModel) {
        store.update('activeModel', formatModelName(latestModel));
      }

      // Update active sessions from jsonl mtime (more accurate than sessions-index)
      store.update('activeSessions', liveActiveCount);
    } catch {
      // graceful degradation
    }
  };

  collect();
  timer = setInterval(collect, config.polling.usage);
}

export function stopUsageCollector() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function parseSessionUsage(filePath, weekAgoDate, daily) {
  const result = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    turns: 0,
    model: '',
  };

  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  for (const line of lines) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      const msg = obj.message;
      if (!msg || !msg.usage) continue;

      const ts = (obj.timestamp || '').slice(0, 10);
      if (ts && ts < weekAgoDate) continue;

      // Extract model name from assistant messages
      if (msg.model) {
        result.model = msg.model;
      }

      const u = msg.usage;
      const inp = u.input_tokens || 0;
      const out = u.output_tokens || 0;
      const cr = u.cache_read_input_tokens || 0;
      const cc = u.cache_creation_input_tokens || 0;

      result.inputTokens += inp;
      result.outputTokens += out;
      result.cacheReadTokens += cr;
      result.cacheCreationTokens += cc;
      result.turns++;

      // Daily aggregation
      const day = ts || 'unknown';
      if (!daily[day]) {
        daily[day] = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, turns: 0 };
      }
      daily[day].input += inp;
      daily[day].output += out;
      daily[day].cacheRead += cr;
      daily[day].cacheCreate += cc;
      daily[day].turns++;
    } catch {
      // skip malformed lines
    }
  }

  return result;
}

function formatModelName(model) {
  if (!model) return '';
  return model
    .replace('claude-', '')
    .replace(/-\d{8,}$/, '')
    .replace(/-(\d+)-(\d+)/, '-$1.$2')
    .replace(/-/g, ' ');
}
