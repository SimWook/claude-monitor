import contrib from 'blessed-contrib';
import { toggleTodo } from '../../todo-store.js';

const TICKET_RE = /\b(TSK\d+-\d+)\b/i;

function extractTicket(branch) {
  if (!branch) return '';
  const m = branch.match(TICKET_RE);
  return m ? m[1] : '';
}

function statusIndicator(modified, todo) {
  if (todo && todo.status === 'pending') return '\u25a1';    // □ pending TODO
  if (todo && todo.status === 'completed') return '\u2713';  // ✓ completed
  if (!modified) return ' ';
  const diff = Date.now() - new Date(modified).getTime();
  if (diff < 600_000) return '*';
  if (diff < 3_600_000) return '~';
  return ' ';
}

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len - 2) + '..';
}

export function createWorkHistory(grid, store) {
  const table = grid.set(1, 0, 6, 8, contrib.table, {
    keys: true,
    fg: 'white',
    label: ' 作業履歴 (*=稼働 ~=1h以内 \u25a1=TODO \u2713=完了) [t:TODO切替] ',
    columnSpacing: 1,
    columnWidth: [2, 14, 14, 28, 5, 4],
    style: {
      border: { fg: 'cyan' },
      header: { fg: 'cyan', bold: true },
    },
  });

  // Keep reference to current visible sessions for key handler
  let currentSessions = [];

  const update = () => {
    const sessions = store.get('sessions') || [];
    const todos = store.get('todos') || [];
    currentSessions = sessions.slice(0, 25);

    const data = currentSessions.map((s) => {
      const todo = todos.find((t) => t.sessionId === s.sessionId);
      const st = statusIndicator(s.modified, todo);
      const ticket = extractTicket(s.gitBranch);
      const branch = ticket || truncate(s.gitBranch, 12) || '-';
      return [
        st,
        truncate(s.project, 12),
        branch,
        truncate(s.summary, 26),
        String(s.messageCount || 0),
        s.age || '',
      ];
    });

    table.setData({
      headers: ['St', 'Project', 'Branch', 'Summary', 'Msg', 'Age'],
      data: data.length > 0 ? data : [['', '--', '--', '\u30bb\u30c3\u30b7\u30e7\u30f3\u306a\u3057', '-', '-']],
    });
  };

  // 't' key: toggle TODO on selected row (none → □ → ✓ → none)
  table.rows.key(['t'], () => {
    const dataIdx = table.rows.selected;
    if (dataIdx < 0 || dataIdx >= currentSessions.length) return;

    const session = currentSessions[dataIdx];
    const newTodos = toggleTodo(session);
    store.update('todos', newTodos);
    update();
    table.screen.render();
  });

  store.on('change:sessions', update);
  store.on('change:todos', update);
  update();

  // Auto-focus for keyboard navigation
  table.focus();

  return table;
}
