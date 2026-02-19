import blessed from 'blessed';

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len - 2) + '..';
}

function agentAge(lastActive) {
  if (!lastActive) return '';
  const diff = Date.now() - lastActive;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m`;
}

function taskSummary(task, maxLen) {
  if (!task) return '';
  // 最初の意味ある行を取得（改行・空行を飛ばす）
  const line = task.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  return truncate(line, maxLen);
}

export function createAgentPanel(grid, store) {
  const box = grid.set(4, 8, 3, 4, blessed.box, {
    label: ' サブエージェント ',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    padding: { left: 1, right: 1 },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
    },
  });

  const update = () => {
    const subAgents = store.get('subAgents') || [];
    const tasks = store.get('tasks') || [];

    if (subAgents.length > 0) {
      box.setLabel(` サブエージェント (${subAgents.length}稼働中) `);
      const lines = [];

      const sorted = [...subAgents].sort((a, b) => b.lastActive - a.lastActive);
      for (const agent of sorted.slice(0, 5)) {
        const id = (agent.agentFile || '').replace('agent-', '').slice(0, 6);
        const age = agentAge(agent.lastActive);
        const desc = taskSummary(agent.task, 28);
        lines.push(` {cyan-fg}${id}{/cyan-fg} ${age.padStart(3)}  ${truncate(agent.project, 10)}`);
        if (desc) {
          lines.push(`  {gray-fg}${desc}{/gray-fg}`);
        }
      }

      const pending = tasks.filter((t) => t.status === 'pending').length;
      const active = tasks.filter((t) => t.status === 'in_progress').length;
      if (pending > 0 || active > 0) {
        lines.push('{gray-fg}' + '\u2500'.repeat(22) + '{/gray-fg}');
        lines.push(` タスク: ${pending}待機, ${active}実行中`);
      }

      box.setContent(lines.join('\n'));
    } else {
      box.setLabel(' サブエージェント ');
      box.setContent(' {gray-fg}稼働中のエージェントなし{/gray-fg}');
    }
  };

  store.on('change:subAgents', update);
  store.on('change:tasks', update);
  update();

  return box;
}
