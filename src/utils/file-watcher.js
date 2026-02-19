import { watch } from 'chokidar';

export function createFileWatcher(paths, onChange, options = {}) {
  const watcher = watch(paths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ...options,
  });

  watcher.on('change', (path) => onChange(path, 'change'));
  watcher.on('add', (path) => onChange(path, 'add'));
  watcher.on('unlink', (path) => onChange(path, 'unlink'));

  return watcher;
}
