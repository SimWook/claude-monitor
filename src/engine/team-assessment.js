import { config } from '../config.js';

export function computeTeamScore(store) {
  const weights = config.team.weights;
  const thresholds = config.team.thresholds;
  let score = 0;

  // 1. Concurrent sessions (>= 3 active)
  const activeSessions = store.get('activeSessions') || 0;
  if (activeSessions >= 3) {
    score += weights.concurrentSessions;
  } else if (activeSessions >= 2) {
    score += weights.concurrentSessions * 0.5;
  }

  // 2. Sub-agents present
  const subAgents = store.get('subAgents') || [];
  const subAgentCount = subAgents.length;
  if (subAgentCount > 0) {
    score += Math.min(weights.subAgents, weights.subAgents * (subAgentCount / 3));
  }

  // 3. Pending tasks (> 5)
  const tasks = store.get('tasks') || [];
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  if (pendingCount > 5) {
    score += weights.pendingTasks;
  } else if (pendingCount > 2) {
    score += weights.pendingTasks * 0.5;
  }

  // 4. Blocked tasks
  const blockedCount = tasks.filter(
    (t) => t.blockedBy && t.blockedBy.length > 0
  ).length;
  if (blockedCount > 0) {
    score += weights.blockedTasks;
  }

  // 5. Cross-project (>= 2 projects)
  const sessions = store.get('sessions') || [];
  const activeRecentSessions = sessions.filter((s) => {
    if (!s.modified) return false;
    return Date.now() - new Date(s.modified).getTime() < 600000;
  });
  const uniqueProjects = new Set(activeRecentSessions.map((s) => s.project));
  if (uniqueProjects.size >= 2) {
    score += weights.crossProject;
  }

  // 6. Tool call frequency (> 200/day)
  const activity = store.get('dailyActivity') || [];
  const today = activity[activity.length - 1];
  if (today && today.toolCallCount > 200) {
    score += weights.toolCallFrequency;
  } else if (today && today.toolCallCount > 100) {
    score += weights.toolCallFrequency * 0.5;
  }

  // 7. Directory spread (> 5 unique directories)
  const dirs = new Set(
    activeRecentSessions
      .map((s) => s.project)
      .filter(Boolean)
  );
  if (dirs.size > 5) {
    score += weights.directorySpread;
  } else if (dirs.size > 3) {
    score += weights.directorySpread * 0.5;
  }

  // Clamp to 0-1
  score = Math.min(1.0, Math.max(0.0, score));

  let label;
  if (score < thresholds.solo) {
    label = 'SOLO';
  } else if (score < thresholds.teamOptional) {
    label = 'TEAM OPTIONAL';
  } else {
    label = 'TEAM RECOMMENDED';
  }

  return { score, label, subAgentCount };
}
