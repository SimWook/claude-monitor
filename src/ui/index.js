import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createHeader } from './widgets/header.js';
import { createWorkHistory } from './widgets/work-history.js';
import { createTokenBudget } from './widgets/token-budget.js';
import { createAgentPanel } from './widgets/agent-panel.js';
import { createTokenChart } from './widgets/token-chart.js';
import { createTodoPanel } from './widgets/todo-panel.js';
import { createActivitySparkline } from './widgets/activity-sparkline.js';

export function createUI(store) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Claude Monitor',
    fullUnicode: true,
  });

  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen,
  });

  // Row 0: Header (1 row, full width)
  const header = createHeader(grid, store);

  // Rows 1-6: Work History (left 8 cols)
  const workHistory = createWorkHistory(grid, store);

  // Rows 1-3: Token Budget gauges (right 4 cols)
  const tokenBudget = createTokenBudget(grid, store);

  // Rows 4-6: Agent Panel (right 4 cols)
  const agentPanel = createAgentPanel(grid, store);

  // Rows 7-9: Token Trend chart (left 8 cols)
  const tokenChart = createTokenChart(grid, store);

  // Rows 7-9: TODO List (right 4 cols)
  const todoPanel = createTodoPanel(grid, store);

  // Rows 10-11: Daily Activity sparkline (full width)
  const activitySparkline = createActivitySparkline(grid, store);

  // Resize handling: debounce to let blessed recalculate element dimensions,
  // then force all widgets to redraw with new canvas sizes
  let resizeTimer = null;
  screen.on('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      screen.realloc();
      for (const key of Object.keys(store.state)) {
        store.emit(`change:${key}`, store.state[key]);
      }
      screen.render();
    }, 150);
  });

  // Key bindings
  screen.key(['q', 'C-c', 'escape'], () => {
    process.exit(0);
  });

  screen.key(['r'], () => {
    screen.render();
  });

  screen.key(['tab'], () => {
    screen.focusNext();
  });

  screen.key(['S-tab'], () => {
    screen.focusPrevious();
  });

  return screen;
}
