import { EventEmitter } from 'events';

class Store extends EventEmitter {
  constructor() {
    super();
    this.state = {
      stats: null,
      sessions: [],
      tasks: [],
      events: [],
      subAgents: [],
      modelUsage: {},
      dailyActivity: [],
      dailyModelTokens: [],
      liveUsage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, turns: 0, sessions: 0, bySession: [], daily: {} },
      totalCostUSD: 0,
      activeModel: '',
      activeSessions: 0,
      todos: [],
    };
  }

  update(key, value) {
    this.state[key] = value;
    this.emit('change', key, value);
    this.emit(`change:${key}`, value);
  }

  get(key) {
    return this.state[key];
  }

  addEvent(event) {
    const events = this.state.events;
    events.push({
      ...event,
      timestamp: new Date(),
    });
    if (events.length > 50) {
      events.splice(0, events.length - 50);
    }
    this.emit('change', 'events', events);
    this.emit('change:events', events);
  }
}

export const store = new Store();
