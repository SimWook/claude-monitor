import { homedir } from 'os';
import { join } from 'path';

const CLAUDE_DIR = join(homedir(), '.claude');

export const config = {
  paths: {
    claudeDir: CLAUDE_DIR,
    statsCache: join(CLAUDE_DIR, 'stats-cache.json'),
    projectsDir: join(CLAUDE_DIR, 'projects'),
    tasksDir: join(CLAUDE_DIR, 'tasks'),
    history: join(CLAUDE_DIR, 'history.jsonl'),
  },

  polling: {
    stats: 5000,
    sessions: 3000,
    tasks: 2000,
    render: 1000,
    usage: 3000,
  },

  tokens: {
    weeklyLimit: 10_000_000,
  },

  ui: {
    eventLogMax: 50,
    activityDays: 14,
  },

  team: {
    thresholds: {
      solo: 0.4,
      teamOptional: 0.7,
    },
    weights: {
      concurrentSessions: 0.15,
      subAgents: 0.20,
      pendingTasks: 0.15,
      blockedTasks: 0.05,
      crossProject: 0.15,
      toolCallFrequency: 0.15,
      directorySpread: 0.15,
    },
  },
};
