import { startStatsCollector, stopStatsCollector } from './stats-collector.js';
import {
  startSessionCollector,
  stopSessionCollector,
} from './session-collector.js';
import { startTaskCollector, stopTaskCollector } from './task-collector.js';
import {
  startHistoryCollector,
  stopHistoryCollector,
} from './history-collector.js';
import {
  startUsageCollector,
  stopUsageCollector,
} from './usage-collector.js';

export function startCollectors(store) {
  startStatsCollector(store);
  startSessionCollector(store);
  startTaskCollector(store);
  startHistoryCollector(store);
  startUsageCollector(store);
}

export function stopCollectors() {
  stopStatsCollector();
  stopSessionCollector();
  stopTaskCollector();
  stopHistoryCollector();
  stopUsageCollector();
}
