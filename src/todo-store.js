import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const TODO_PATH = join(homedir(), '.claude-monitor-todos.json');

export function loadTodos() {
  try {
    if (!existsSync(TODO_PATH)) return [];
    return JSON.parse(readFileSync(TODO_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  writeFileSync(TODO_PATH, JSON.stringify(todos, null, 2), 'utf8');
}

/**
 * Cycle: none → pending(□) → completed(✓) → none
 */
export function toggleTodo(session) {
  const todos = loadTodos();
  const idx = todos.findIndex((t) => t.sessionId === session.sessionId);

  if (idx === -1) {
    // none → pending
    todos.push({
      sessionId: session.sessionId,
      project: session.project || '',
      branch: session.gitBranch || '',
      summary: session.summary || '',
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'pending',
    });
  } else if (todos[idx].status === 'pending') {
    // pending → completed
    todos[idx].status = 'completed';
    todos[idx].completedAt = new Date().toISOString();
  } else {
    // completed → remove
    todos.splice(idx, 1);
  }

  saveTodos(todos);
  return todos;
}
