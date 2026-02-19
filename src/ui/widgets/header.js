import blessed from 'blessed';

export function createHeader(grid, store) {
  const box = grid.set(0, 0, 1, 12, blessed.box, {
    content: ' CLAUDE MONITOR | 読込中...',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
      bold: true,
    },
  });

  const update = () => {
    const model = store.get('activeModel') || 'N/A';
    const active = store.get('activeSessions') || 0;
    const cost = store.get('totalCostUSD') || 0;
    const subAgents = store.get('subAgents') || [];

    let content = ` {bold}CLAUDE MONITOR{/bold} | モデル: ${model} | 稼働中: ${active} | 費用: $${cost.toFixed(2)}`;
    if (subAgents.length > 0) {
      content += ` | エージェント: ${subAgents.length}`;
    }

    box.setContent(content);
  };

  store.on('change:activeModel', update);
  store.on('change:activeSessions', update);
  store.on('change:totalCostUSD', update);
  store.on('change:subAgents', update);
  update();

  return box;
}
