import contrib from 'blessed-contrib';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

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

function formatT(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function dayLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const day = DAY_NAMES[d.getDay()];
  const num = parseInt(isoDate.slice(8, 10), 10);
  return `${num}(${day})`;
}

export function createActivitySparkline(grid, store) {
  const bar = grid.set(10, 0, 2, 12, contrib.bar, {
    label: ' 日別トークン消費量 (7日間, 単位: 百万) ',
    barWidth: 8,
    barSpacing: 2,
    xOffset: 0,
    maxHeight: 100,
    style: {
      border: { fg: 'cyan' },
    },
    barBgColor: 'cyan',
  });

  const update = () => {
    const liveUsage = store.get('liveUsage') || {};
    const daily = liveUsage.daily || {};
    const weekDates = buildWeekDates();

    const totals = weekDates.map((date) => {
      const d = daily[date];
      if (!d) return 0;
      return (d.input || 0) + (d.output || 0) + (d.cacheRead || 0) + (d.cacheCreate || 0);
    });

    const turns = weekDates.map((date) => {
      const d = daily[date];
      return d ? d.turns : 0;
    });

    const todayTokens = totals[totals.length - 1] || 0;
    const todayTurns = turns[turns.length - 1] || 0;
    const weekTotal = totals.reduce((a, b) => a + b, 0);

    bar.setLabel(
      ` 日別トークン消費量 (百万) | 本日: ${formatT(todayTokens)} / ${todayTurns}ターン | 週計: ${formatT(weekTotal)} `
    );

    const titles = weekDates.map(dayLabel);
    const data = totals.map((v) => Math.round(v / 1_000_000));

    bar.setData({ titles, data });
  };

  store.on('change:liveUsage', update);
  update();

  return bar;
}
