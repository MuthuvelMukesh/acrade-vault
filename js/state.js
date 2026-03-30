import { Bus } from './bus.js';

const initialState = {
  view: 'hub',           // 'hub' | 'game'
  activeGame: null,
  activeCategory: 'all',
  searchQuery: '',       // NEW: tracking search input
  gameRunning: false,
  controls: {
    action: ' ',
    pause: 'Escape'
  },
  player: {
    initials: '',
    coins: 0,
    highScores: {},      // { gameId: number }
    achievements: [],    // [ achievementId, ... ]
    gamesPlayed: 0,
    playCounts: {}       // NEW: tracking most played game
  }
};

// Lightweight Reactive State Manager
function createReactiveState(obj, path = '') {
  if (typeof obj !== 'object' || obj === null) return obj;

  const handler = {
    get(target, prop, receiver) {
      if (prop === '__isProxy') return true;
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const oldVal = target[prop];
      
      // Make nested objects reactive
      if (typeof value === 'object' && value !== null && !value.__isProxy) {
        value = createReactiveState(value, path ? `${path}.${prop}` : prop);
      }
      
      const success = Reflect.set(target, prop, value, receiver);
      
      if (success && oldVal !== value) {
        const fullPath = path ? `${path}.${prop}` : prop;
        // Emit specific path change (e.g. "state:updated:player.coins")
        Bus.emit(`state:updated:${fullPath}`, { oldValue: oldVal, newValue: value });
        // Emit global state change for any render listeners
        Bus.emit('state:updated', { path: fullPath, oldValue: oldVal, newValue: value });
      }
      return success;
    }
  };

  // Recursively wrap initial children
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = createReactiveState(obj[key], path ? `${path}.${key}` : key);
    }
  }

  return new Proxy(obj, handler);
}

export const State = createReactiveState(initialState);
