/**
 * Arcade Vault V2 Event Bus & Domain Event Constants
 */

export const Events = {
  // Game Lifecycle
  GAME_LAUNCH: 'game:launch',
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_COMPLETED: 'game:completed',
  GAME_ERROR: 'game:error',
  VIEW_HUB: 'view:hub',

  // Player & Progression
  COIN_EARN: 'coin:earn',
  XP_EARN: 'xp:earn',
  LEVEL_UP: 'progression:levelup',
  ACHIEVEMENT_UNLOCK: 'achievement:unlock',
  CHALLENGE_PROGRESS: 'challenge:progress',
  CHALLENGE_COMPLETED: 'challenge:completed',

  // Economy & Shop
  ITEM_PURCHASED: 'shop:purchased',
  ITEM_EQUIPPED: 'shop:equipped',

  // Sync & Cloud
  SYNC_STATUS: 'sync:status',
  AUTH_CHANGED: 'auth:changed',

  // Multiplayer
  MP_READY: 'mp:ready',
  MP_CONNECTED: 'mp:connected',
  MP_DATA: 'mp:data',
  MP_LATENCY: 'mp:latency',
  MP_DISCONNECTED: 'mp:disconnected',
  MP_ERROR: 'mp:error',

  // State
  STATE_UPDATED: 'state:updated'
};

export const Bus = {
  events: {},

  on(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
    return () => this.off(event, cb);
  },

  once(event, cb) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      cb(data);
    };
    this.on(event, wrapper);
  },

  emit(event, data) {
    if (this.events[event]) {
      // Create a shallow copy to prevent mutations during iteration
      const listeners = [...this.events[event]];
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  },

  off(event, cb) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(f => f !== cb);
  },

  clear() {
    this.events = {};
  }
};
