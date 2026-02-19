#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { isRunning, readPid, removePid } from '../src/pid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN_PATH = join(__dirname, 'claude-monitor.js');

const command = process.argv[2];

switch (command) {
  case 'on':
    cmdOn();
    break;
  case 'off':
    cmdOff();
    break;
  case 'toggle':
    isRunning() ? cmdOff() : cmdOn();
    break;
  case 'status':
    cmdStatus();
    break;
  default:
    // No argument: launch TUI directly (original behavior)
    await launchTUI();
    break;
}

async function launchTUI() {
  // Force compatible terminal type to avoid blessed terminfo parse warnings
  // (ghostty terminfo contains capabilities blessed cannot parse)
  if (process.env.TERM && process.env.TERM.includes('ghostty')) {
    process.env.TERM = 'xterm-256color';
  }
  const { start } = await import('../src/index.js');
  start();
}

function cmdOn() {
  if (isRunning()) {
    console.log(`claude-monitor: already running (PID: ${readPid()})`);
    return;
  }
  execFile('open', ['-na', 'Ghostty.app', '--args', '-e', BIN_PATH], (err) => {
    if (err) {
      console.error('claude-monitor: failed to open Ghostty tab', err.message);
      process.exit(1);
    }
    console.log('claude-monitor: started in Ghostty');
  });
}

function cmdOff() {
  const pid = readPid();
  if (!isRunning() || pid === null) {
    console.log('claude-monitor: not running');
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
    removePid();
    console.log(`claude-monitor: stopped (PID: ${pid})`);
  } catch {
    removePid();
    console.log('claude-monitor: process already exited, cleaned up PID file');
  }
}

function cmdStatus() {
  const pid = readPid();
  if (isRunning()) {
    console.log(`claude-monitor: running (PID: ${pid})`);
  } else {
    console.log('claude-monitor: stopped');
  }
}
