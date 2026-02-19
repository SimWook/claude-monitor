import { JsonlTailer } from '../utils/jsonl-tailer.js';
import { config } from '../config.js';

let tailer = null;

export function startHistoryCollector(store) {
  tailer = new JsonlTailer(config.paths.history, (entry) => {
    const project = extractProject(entry.project);
    const display = (entry.display || '').slice(0, 80);
    store.addEvent({
      project,
      message: display,
      sessionId: entry.sessionId || '',
    });
  });

  tailer.start();
}

export function stopHistoryCollector() {
  if (tailer) {
    tailer.stop();
    tailer = null;
  }
}

function extractProject(path) {
  if (!path) return 'global';
  const parts = path.split('/');
  return parts[parts.length - 1] || 'global';
}
