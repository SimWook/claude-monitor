import { createUI } from './ui/index.js';
import { startCollectors, stopCollectors } from './collectors/index.js';
import { store } from './store.js';
import { config } from './config.js';
import { writePid, removePid } from './pid.js';
import { loadTodos } from './todo-store.js';

export function start() {
  writePid();

  // Load persisted TODOs
  store.update('todos', loadTodos());

  const screen = createUI(store);

  startCollectors(store);

  let renderTimer = setInterval(() => {
    screen.render();
  }, config.polling.render);

  const cleanup = () => {
    clearInterval(renderTimer);
    stopCollectors();
    removePid();
    screen.destroy();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  screen.render();
}
