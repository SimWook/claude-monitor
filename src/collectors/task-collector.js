import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';

let timer = null;

export function startTaskCollector(store) {
  const collect = () => {
    try {
      const tasksDir = config.paths.tasksDir;
      if (!existsSync(tasksDir)) return;

      const tasks = [];
      const sessionDirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const sessionDir of sessionDirs) {
        const dirPath = join(tasksDir, sessionDir);
        try {
          const files = readdirSync(dirPath).filter((f) => f.endsWith('.json'));
          for (const file of files) {
            try {
              const raw = readFileSync(join(dirPath, file), 'utf8');
              const task = JSON.parse(raw);
              tasks.push({
                id: task.id,
                subject: task.subject || '',
                status: task.status || 'pending',
                activeForm: task.activeForm || '',
                sessionId: sessionDir,
                blocks: task.blocks || [],
                blockedBy: task.blockedBy || [],
              });
            } catch {
              // skip malformed task files
            }
          }
        } catch {
          // skip inaccessible directories
        }
      }

      store.update('tasks', tasks);
    } catch {
      // graceful degradation
    }
  };

  collect();
  timer = setInterval(collect, config.polling.tasks);
}

export function stopTaskCollector() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
