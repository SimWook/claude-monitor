import blessed from 'blessed';

function formatT(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function buildWeekDates() {
  const dates = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function drawBar(pct, width) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

export function createTokenBudget(grid, store) {
  const box = grid.set(1, 8, 3, 4, blessed.box, {
    label: ' トークン効率 (週間) ',
    tags: true,
    padding: { left: 1, right: 1 },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
    },
  });

  const update = () => {
    const liveUsage = store.get('liveUsage') || {};
    const daily = liveUsage.daily || {};
    const weekDates = buildWeekDates();
    const todayKey = weekDates[weekDates.length - 1];

    const totalInput = liveUsage.inputTokens || 0;
    const totalOutput = liveUsage.outputTokens || 0;
    const totalCacheRead = liveUsage.cacheReadTokens || 0;
    const totalCacheCreate = liveUsage.cacheCreationTokens || 0;

    // Cache Hit%
    const cacheDenom = totalCacheRead + totalCacheCreate + totalInput;
    const cacheHitPct = cacheDenom > 0 ? Math.round((totalCacheRead / cacheDenom) * 100) : 0;

    // Output%
    const ioDenom = totalInput + totalOutput;
    const outputPct = ioDenom > 0 ? Math.round((totalOutput / ioDenom) * 100) : 0;

    // Today/Avg
    const todayData = daily[todayKey];
    const todayTotal = todayData
      ? (todayData.input || 0) + (todayData.output || 0) + (todayData.cacheRead || 0) + (todayData.cacheCreate || 0)
      : 0;

    const daysWithData = weekDates.filter((d) => daily[d]).length;
    let dailyAvg = 0;
    if (daysWithData > 0) {
      let weekTotal = 0;
      for (const d of weekDates) {
        const dd = daily[d];
        if (dd) weekTotal += (dd.input || 0) + (dd.output || 0) + (dd.cacheRead || 0) + (dd.cacheCreate || 0);
      }
      dailyAvg = weekTotal / daysWithData;
    }
    const todayAvgPct = dailyAvg > 0 ? Math.min(200, Math.round((todayTotal / dailyAvg) * 100)) : 0;

    const barWidth = 14;
    const weekTokens = totalInput + totalOutput + totalCacheRead + totalCacheCreate;
    box.setLabel(` トークン効率 | 本日: ${formatT(todayTotal)} | 週計: ${formatT(weekTokens)} `);

    const cacheColor = cacheHitPct >= 80 ? 'green' : cacheHitPct >= 50 ? 'yellow' : 'red';
    const outColor = 'yellow';
    const avgColor = todayAvgPct > 120 ? 'red' : 'cyan';

    const lines = [
      ` Cache命中 {${cacheColor}-fg}${drawBar(cacheHitPct, barWidth)}{/${cacheColor}-fg} ${String(cacheHitPct).padStart(3)}%`,
      ` 出力比率 {${outColor}-fg}${drawBar(outputPct, barWidth)}{/${outColor}-fg} ${String(outputPct).padStart(3)}%`,
      ` 本日/平均 {${avgColor}-fg}${drawBar(Math.min(100, todayAvgPct), barWidth)}{/${avgColor}-fg} ${String(todayAvgPct).padStart(3)}%`,
    ];

    box.setContent(lines.join('\n'));
  };

  store.on('change:liveUsage', update);
  update();

  return box;
}
