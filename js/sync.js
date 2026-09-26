/**
 * Arcade Vault V2 SyncManager
 * Provides resilient offline-first data replication, mutation queuing, and cloud synchronization.
 */

import { State } from './state.js';
import { Bus, Events } from './bus.js';

export const SyncStatus = {
  SAVED: 'saved',
  SAVING: 'saving',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  CONFLICT: 'conflict',
  ERROR: 'error'
};

const SYNC_QUEUE_KEY = 'arcade_v2_sync_queue';

export const SyncManager = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncTimer: null,
  isProcessing: false,

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
    this.setStatus(this.isOnline ? SyncStatus.SAVED : SyncStatus.OFFLINE);

    // If online at launch, process any leftover queue items
    if (this.isOnline) {
      this.processQueue();
    }
  },

  setStatus(status, message = '') {
    State.syncStatus = status;
    Bus.emit(Events.SYNC_STATUS, { status, message });
  },

  handleNetworkChange(online) {
    this.isOnline = online;
    if (online) {
      this.setStatus(SyncStatus.SYNCING, 'Reconnected to network. Syncing...');
      this.processQueue();
    } else {
      this.setStatus(SyncStatus.OFFLINE, 'Offline mode active. Local saves enabled.');
    }
  },

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || [];
    } catch (_e) {
      return [];
    }
  },

  saveQueue(queue) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Sync queue persistence error:', e.message);
    }
  },

  enqueue(action) {
    const queue = this.getQueue();
    queue.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      retries: 0,
      ...action
    });
    this.saveQueue(queue);

    if (this.isOnline) {
      this.scheduleProcessing();
    } else {
      this.setStatus(SyncStatus.OFFLINE, 'Queued for cloud sync');
    }
  },

  scheduleProcessing(delay = 300) {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.processQueue(), delay);
  },

  async processQueue() {
    if (this.isProcessing || !this.isOnline) return;
    const queue = this.getQueue();
    if (queue.length === 0) {
      this.setStatus(SyncStatus.SAVED);
      return;
    }

    this.isProcessing = true;
    this.setStatus(SyncStatus.SYNCING, `Syncing ${queue.length} item(s)...`);

    const headers = { 'Content-Type': 'application/json' };
    if (State.player.token) {
      headers['Authorization'] = `Bearer ${State.player.token}`;
    }

    const remainingQueue = [];

    for (const item of queue) {
      try {
        let response;
        if (item.type === 'SCORE_SUBMISSION') {
          response = await fetch(`/api/leaderboards/${item.gameId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              initials: item.initials,
              score: item.score,
              playerId: item.playerId,
              date: item.date
            })
          });
        } else if (item.type === 'SAVE_STATE') {
          response = await fetch(`/api/saves/${item.gameId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(item.stateData)
          });
        } else if (item.type === 'PROFILE_SYNC') {
          response = await fetch('/api/player', {
            method: 'POST',
            headers,
            body: JSON.stringify(item.playerData)
          });
        }

        if (response && response.ok) {
          // Successfully synchronized
          continue;
        } else {
          // If server returned a 4xx error (validation or bad request), drop it to avoid poison pills
          if (response && response.status >= 400 && response.status < 500) {
            console.warn(`Dropped invalid queue item (${item.type}): HTTP ${response.status}`);
            continue;
          }
          // Server error or network error: retain for retry
          item.retries = (item.retries || 0) + 1;
          if (item.retries < 5) remainingQueue.push(item);
        }
      } catch (err) {
        console.warn('Network error while processing sync queue:', err.message);
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 5) remainingQueue.push(item);
        break; // Network dropped, pause queue processing
      }
    }

    this.saveQueue(remainingQueue);
    this.isProcessing = false;

    if (remainingQueue.length === 0) {
      this.setStatus(SyncStatus.SAVED, 'All data synced');
    } else {
      this.setStatus(SyncStatus.ERROR, `${remainingQueue.length} item(s) pending retry`);
      // Retry in 10 seconds
      setTimeout(() => this.processQueue(), 10000);
    }
  }
};
