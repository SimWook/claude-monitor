import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PID_FILE = join(homedir(), '.claude-monitor.pid');

export function writePid(pid = process.pid) {
  writeFileSync(PID_FILE, String(pid), 'utf8');
}

export function readPid() {
  if (!existsSync(PID_FILE)) return null;
  const content = readFileSync(PID_FILE, 'utf8').trim();
  const pid = parseInt(content, 10);
  return Number.isNaN(pid) ? null : pid;
}

export function isRunning() {
  const pid = readPid();
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    removePid();
    return false;
  }
}

export function removePid() {
  try {
    unlinkSync(PID_FILE);
  } catch {
    // already removed
  }
}
