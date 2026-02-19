import { readFileSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'fs';
import { join, basename } from 'path';
import { config } from '../config.js';

function readFirstLine(filePath) {
  let fd;
  try {
    fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(4096);
    const bytesRead = readSync(fd, buf, 0, 4096, 0);
    if (bytesRead === 0) return null;
    const chunk = buf.toString('utf8', 0, bytesRead);
    const nlIdx = chunk.indexOf('\n');
    return nlIdx >= 0 ? chunk.slice(0, nlIdx) : chunk;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function extractAgentTask(filePath) {
  const line = readFirstLine(filePath);
  if (!line) return '';
  try {
    const obj = JSON.parse(line);
    const content = obj.message?.content;
    if (typeof content === 'string') return content.slice(0, 200);
    if (Array.isArray(content)) {
      const text = content.find((c) => c.type === 'text');
      return text ? (text.text || '').slice(0, 200) : '';
    }
    return '';
  } catch {
    return '';
  }
}

let timer = null;

export function startSessionCollector(store) {
  const collect = () => {
    try {
      const sessions = [];
      const subAgents = [];
      const projectsDir = config.paths.projectsDir;

      if (!existsSync(projectsDir)) return;

      const projectDirs = readdirSync(projectsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const dir of projectDirs) {
        const indexPath = join(projectsDir, dir, 'sessions-index.json');
        if (!existsSync(indexPath)) continue;

        try {
          const raw = readFileSync(indexPath, 'utf8');
          const data = JSON.parse(raw);
          const projectName = extractProjectName(data.originalPath || dir);

          for (const entry of data.entries || []) {
            const age = getAge(entry.modified || entry.created);
            sessions.push({
              project: projectName,
              sessionId: entry.sessionId,
              summary: entry.summary || entry.firstPrompt || '',
              age,
              modified: entry.modified,
              messageCount: entry.messageCount || 0,
              gitBranch: entry.gitBranch || '',
            });

            // Check for subagents
            const subagentDir = join(
              projectsDir,
              dir,
              entry.sessionId,
              'subagents'
            );
            if (existsSync(subagentDir)) {
              try {
                const agentFiles = readdirSync(subagentDir).filter((f) =>
                  f.startsWith('agent-')
                );
                for (const af of agentFiles) {
                  const agentPath = join(subagentDir, af);
                  try {
                    const stat = statSync(agentPath);
                    const ageMs = Date.now() - stat.mtimeMs;
                    if (ageMs < 300000) {
                      // active within 5 minutes
                      const task = extractAgentTask(agentPath);
                      subAgents.push({
                        sessionId: entry.sessionId,
                        agentFile: af,
                        project: projectName,
                        lastActive: stat.mtimeMs,
                        task,
                      });
                    }
                  } catch {
                    // skip inaccessible files
                  }
                }
              } catch {
                // skip inaccessible dirs
              }
            }
          }
        } catch {
          // skip malformed index files
        }
      }

      // Sort by most recently modified
      sessions.sort((a, b) => {
        const ta = a.modified ? new Date(a.modified).getTime() : 0;
        const tb = b.modified ? new Date(b.modified).getTime() : 0;
        return tb - ta;
      });

      store.update('sessions', sessions);
      store.update('subAgents', subAgents);
    } catch {
      // graceful degradation
    }
  };

  collect();
  timer = setInterval(collect, config.polling.sessions);
}

export function stopSessionCollector() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function extractProjectName(path) {
  if (!path) return 'unknown';
  const parts = path.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || 'unknown';
}

function getAge(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}
