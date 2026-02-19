import blessed from 'blessed';

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len - 2) + '..';
}

function formatTodoDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

export function createTodoPanel(grid, store) {
  const box = grid.set(7, 8, 3, 4, blessed.box, {
    label: ' TODO ',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    padding: { left: 1, right: 1 },
    scrollbar: {
      style: { bg: 'blue' },
    },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
    },
  });

  const update = () => {
    const todos = store.get('todos') || [];
    const pending = todos.filter((t) => t.status === 'pending');
    const completed = todos.filter((t) => t.status === 'completed');

    if (pending.length === 0 && completed.length === 0) {
      box.setLabel(' TODO ');
      box.setContent(' {gray-fg}なし{/gray-fg}\n {gray-fg}作業履歴で t キーで登録{/gray-fg}');
      return;
    }

    box.setLabel(` TODO (${pending.length}件) `);
    const lines = [];

    // Pending TODOs first
    for (const todo of pending) {
      const proj = truncate(todo.project, 10);
      const summary = truncate(todo.summary, 18);
      lines.push(`{yellow-fg}\u25a1{/yellow-fg} ${proj} ${summary}`);
      lines.push(`  {gray-fg}${formatTodoDate(todo.createdAt)} 登録{/gray-fg}`);
    }

    // Completed TODOs (dimmed)
    if (completed.length > 0) {
      if (pending.length > 0) {
        lines.push('{gray-fg}' + '\u2500'.repeat(22) + '{/gray-fg}');
      }
      for (const todo of completed.slice(-3)) {
        const proj = truncate(todo.project, 10);
        const summary = truncate(todo.summary, 18);
        lines.push(`{gray-fg}\u2713 ${proj} ${summary}{/gray-fg}`);
      }
      if (completed.length > 3) {
        lines.push(`{gray-fg}  ...+${completed.length - 3}件完了{/gray-fg}`);
      }
    }

    box.setContent(lines.join('\n'));
  };

  store.on('change:todos', update);
  update();

  return box;
}
