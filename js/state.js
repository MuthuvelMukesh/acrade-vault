import { Bus } from './bus.js';

const initialPlayer = {
  id: '',
  token: '',
  profile: {
    displayName: 'Arcade Pilot',
    initials: ''
  },
  progression: {
    level: 1,
    xp: 0,
    coins: 0
  },
  stats: {
    gamesPlayed: 0,
    playTime: 0,
    wins: 0,
    losses: 0,
    playCounts: {},
    highScores: {}
  },
  achievements: [],
  inventory: {
    owned: ['theme_neon_cyber', 'crt_classic', 'badge_novice', 'cab_standard'],
    equipped: {
      theme: 'theme_neon_cyber',
      crt: 'crt_classic',
      badge: 'badge_novice',
      cabinet: 'cab_standard'
    }
  },
  preferences: {
    controls: {
      action: ' ',
      pause: 'Escape'
    },
    sound: true,
    haptics: true,
    crt: true
  },

  // Backward compatibility convenience accessors
  get initials() {
    return this.profile.initials;
  },
  set initials(v) {
    this.profile.initials = v;
  },
  get coins() {
    return this.progression.coins;
  },
  set coins(v) {
    this.progression.coins = v;
  },
  get highScores() {
    return this.stats.highScores;
  },
  set highScores(v) {
    this.stats.highScores = v;
  },
  get gamesPlayed() {
    return this.stats.gamesPlayed;
  },
  set gamesPlayed(v) {
    this.stats.gamesPlayed = v;
  },
  get playCounts() {
    return this.stats.playCounts;
  },
  set playCounts(v) {
    this.stats.playCounts = v;
  }
};

const initialState = {
  schemaVersion: 2,
  view: 'hub', // 'hub' | 'game'
  activeGame: null,
  activeCategory: 'all',
  searchQuery: '',
  gameRunning: false,
  syncStatus: 'offline', // 'synced' | 'saving' | 'offline' | 'error'
  controls: {
    action: ' ',
    pause: 'Escape'
  },
  player: initialPlayer
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
