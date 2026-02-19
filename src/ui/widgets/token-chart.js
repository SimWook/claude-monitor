import contrib from 'blessed-contrib';

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

function formatDateLabel(isoDate) {
  const m = parseInt(isoDate.slice(5, 7), 10);
  const d = parseInt(isoDate.slice(8, 10), 10);
  return `${m}/${d}`;
}

export function createTokenChart(grid, store) {
  const line = grid.set(7, 0, 3, 8, contrib.line, {
    label: ' トークン推移 (7日間: キャッシュ vs I/O) ',
    showLegend: true,
    legend: { width: 12 },
    xPadding: 3,
    wholeNumbersOnly: true,
    style: {
      line: 'yellow',
      text: 'white',
      baseline: 'white',
      border: { fg: 'cyan' },
    },
  });

  const update = () => {
    const liveUsage = store.get('liveUsage') || {};
    const daily = liveUsage.daily || {};
    const weekDates = buildWeekDates();
    const xLabels = weekDates.map(formatDateLabel);

    const weekTotal =
      (liveUsage.inputTokens || 0) +
      (liveUsage.outputTokens || 0) +
      (liveUsage.cacheReadTokens || 0) +
      (liveUsage.cacheCreationTokens || 0);
    const turns = liveUsage.turns || 0;
    const sessions = liveUsage.sessions || 0;

    line.setLabel(
      ` トークン推移 (7日間) | 合計: ${formatT(weekTotal)} | ${turns}ターン / ${sessions}セッション `
    );

    // Build daily series: input+output vs cache
    const ioData = weekDates.map((date) => {
      const d = daily[date];
      if (!d) return 0;
      return Math.round(((d.input || 0) + (d.output || 0)) / 1000);
    });

    const cacheData = weekDates.map((date) => {
      const d = daily[date];
      if (!d) return 0;
      return Math.round(((d.cacheRead || 0) + (d.cacheCreate || 0)) / 1_000_000);
    });

    const series = [
      {
        title: 'Cache(M)',
        x: xLabels,
        y: cacheData,
        style: { line: 'cyan' },
      },
      {
        title: 'I/O(K)',
        x: xLabels,
        y: ioData,
        style: { line: 'yellow' },
      },
    ];

    line.setData(series);
  };

  store.on('change:liveUsage', update);
  update();

  return line;
}
