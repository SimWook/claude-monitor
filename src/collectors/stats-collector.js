import { readFileSync } from 'fs';
import { config } from '../config.js';

// Approximate pricing per 1M tokens (for estimation when costUSD is 0)
const PRICING = {
  'claude-opus-4-5': { input: 15, output: 75 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-haiku': { input: 0.25, output: 1.25 },
};

let timer = null;

export function startStatsCollector(store) {
  const collect = () => {
    try {
      const raw = readFileSync(config.paths.statsCache, 'utf8');
      const data = JSON.parse(raw);

      store.update('stats', data);
      store.update('dailyActivity', data.dailyActivity || []);
      store.update('dailyModelTokens', data.dailyModelTokens || []);

      const usage = data.modelUsage || {};
      store.update('modelUsage', usage);

      let totalCost = 0;
      for (const [model, info] of Object.entries(usage)) {
        const cost = info.costUSD || estimateCost(model, info);
        totalCost += cost;
      }
      store.update('totalCostUSD', totalCost);
    } catch {
      // stats-cache.json may not exist yet
    }
  };

  collect();
  timer = setInterval(collect, config.polling.stats);
}

export function stopStatsCollector() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function estimateCost(model, info) {
  const key = Object.keys(PRICING).find((k) => model.includes(k));
  if (!key) return 0;
  const rates = PRICING[key];
  const inputM = (info.inputTokens || 0) / 1_000_000;
  const outputM = (info.outputTokens || 0) / 1_000_000;
  return inputM * rates.input + outputM * rates.output;
}

function formatModelName(model) {
  if (!model) return 'N/A';
  return model
    .replace('claude-', '')
    .replace(/-\d{8,}$/, '')
    .replace(/-(\d+)-(\d+)/, '-$1.$2')
    .replace(/-/g, ' ');
}
