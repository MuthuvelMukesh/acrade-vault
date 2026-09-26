import { State } from './state.js';
import { Bus } from './bus.js';
import { SyncManager } from './sync.js';
import { AchievementManager } from './progression.js';

export function migratePlayer(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  // Already V2 schema
  if (raw.schemaVersion === 2 && raw.profile && raw.progression) {
    return raw;
  }

  // Migrate V1 to V2
  const initials = (raw.initials || raw.profile?.initials || 'AAA').slice(0, 3).toUpperCase();
  const coins = Number(raw.coins || raw.progression?.coins) || 0;
  const highScores = raw.highScores || raw.stats?.highScores || {};
  const gamesPlayed = Number(raw.gamesPlayed || raw.stats?.gamesPlayed) || 0;
  const achievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  const playCounts = raw.playCounts || raw.stats?.playCounts || {};

  return {
    schemaVersion: 2,
    id: raw.id || `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    token: raw.token || '',
    profile: {
      displayName: raw.displayName || `Pilot ${initials}`,
      initials
    },
    progression: {
      level: 1 + Math.floor(coins / 10),
      xp: coins * 10,
      coins
    },
    stats: {
      gamesPlayed,
      playTime: raw.playTime || 0,
      wins: raw.wins || 0,
      losses: raw.losses || 0,
      playCounts,
      highScores
    },
    achievements,
    inventory: raw.inventory || {
      owned: ['theme_neon_cyber', 'crt_classic', 'badge_novice', 'cab_standard'],
      equipped: {
        theme: 'theme_neon_cyber',
        crt: 'crt_classic',
        badge: 'badge_novice',
        cabinet: 'cab_standard'
      }
    },
    preferences: raw.preferences || {
      controls: { action: ' ', pause: 'Escape' },
      sound: true,
      haptics: true,
      crt: true
    }
  };
}

export const Store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (_e) {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e.message);
    }
  },

  getPlayer() {
    const raw = this.get('arcade_player');
    const migrated = migratePlayer(raw);

    if (migrated) {
      // Merge into reactive state
      State.player.id = migrated.id;
      State.player.token = migrated.token || '';
      State.player.profile.initials = migrated.profile.initials;
      State.player.profile.displayName = migrated.profile.displayName;
      State.player.progression.level = migrated.progression.level;
      State.player.progression.xp = migrated.progression.xp;
      State.player.progression.coins = migrated.progression.coins;
      State.player.stats = { ...State.player.stats, ...migrated.stats };
      State.player.achievements = [...migrated.achievements];
      State.player.inventory = { ...State.player.inventory, ...migrated.inventory };
      State.player.preferences = { ...State.player.preferences, ...migrated.preferences };
    }

    const savedSettings = this.get('arcade_settings');
    if (savedSettings) {
      Object.assign(State.controls, savedSettings);
      if (savedSettings.action) State.player.preferences.controls.action = savedSettings.action;
      if (savedSettings.pause) State.player.preferences.controls.pause = savedSettings.pause;
    }

    // Ensure player has authentic guest credentials if not logged in
    this.ensurePlayerIdentity();
    return State.player;
  },

  async ensurePlayerIdentity() {
    if (!State.player.token) {
      try {
        const res = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: State.player.id || undefined })
        });
        if (res.ok) {
          const body = await res.json();
          State.player.id = body.data.playerId;
          State.player.token = body.data.token;
          this.set('arcade_player', State.player);
        }
      } catch (_e) {
        // Offline mode: proceed with local ID
      }
    }
  },

  savePlayer() {
    this.set('arcade_player', State.player);
    SyncManager.enqueue({
      type: 'PROFILE_SYNC',
      playerData: {
        profile: State.player.profile,
        stats: State.player.stats,
        preferences: State.player.preferences
      }
    });
  },

  saveSettings() {
    this.set('arcade_settings', State.controls);
    if (State.player.preferences?.controls) {
      State.player.preferences.controls.action = State.controls.action;
      State.player.preferences.controls.pause = State.controls.pause;
    }
    this.savePlayer();
  },

  getLeaderboard(gameId) {
    return this.get(`arcade_lb_${gameId.toLowerCase()}`) || [];
  },

  async addScore(gameId, initials, score) {
    const normGameId = gameId.toLowerCase();
    const lb = this.getLeaderboard(normGameId);
    const date = new Date().toISOString();

    // Local optimistic update
    lb.push({
      initials,
      score,
      playerId: State.player.id || 'local',
      date
    });
    lb.sort((a, b) => b.score - a.score);
    const top10 = lb.slice(0, 10);
    this.set(`arcade_lb_${normGameId}`, top10);

    // Update personal best
    if ((State.player.highScores[normGameId] || 0) < score) {
      State.player.highScores[normGameId] = score;
    }

    // Queue for sync
    SyncManager.enqueue({
      type: 'SCORE_SUBMISSION',
      gameId: normGameId,
      initials,
      score,
      playerId: State.player.id || 'local',
      date
    });
  },

  async fetchLeaderboard(gameId) {
    const normGameId = gameId.toLowerCase();
    try {
      const res = await fetch(`/api/leaderboards/${normGameId}`);
      if (res.ok) {
        const data = await res.json();
        this.set(`arcade_lb_${normGameId}`, data);
        return data;
      }
    } catch (_e) {
      // Offline fallback: use local cache
    }
    return this.getLeaderboard(normGameId);
  },

  async loadGameState(gameId) {
    const normGameId = gameId.toLowerCase();
    // Try online load if authenticated
    if (State.player.token && SyncManager.isOnline) {
      try {
        const res = await fetch(`/api/saves/${normGameId}`, {
          headers: { Authorization: `Bearer ${State.player.token}` }
        });
        if (res.ok) {
          const body = await res.json();
          if (body.data) return body.data;
        }
      } catch (_e) {
        // Fallback to local
      }
    }
    return this.get(`arcade_save_${normGameId}`);
  },

  async saveGameState(gameId, stateData) {
    const normGameId = gameId.toLowerCase();
    // Local save first (offline-first)
    this.set(`arcade_save_${normGameId}`, stateData);

    // Enqueue cloud save
    SyncManager.enqueue({
      type: 'SAVE_STATE',
      gameId: normGameId,
      stateData
    });
  },

  checkAchievements() {
    return AchievementManager.checkAll();
  }
};

// Debounced auto-save listener
let savePlayerTimeout = null;
let saveSettingsTimeout = null;

Bus.on('state:updated', ({ path }) => {
  if (path && (path.startsWith('player') || path.startsWith('activeCategory'))) {
    clearTimeout(savePlayerTimeout);
    savePlayerTimeout = setTimeout(() => {
      Store.savePlayer();
    }, 600);
  } else if (path && path.startsWith('controls')) {
    clearTimeout(saveSettingsTimeout);
    saveSettingsTimeout = setTimeout(() => {
      Store.saveSettings();
    }, 600);
  }
});
