import { State } from './state.js';
import { Bus } from './bus.js';

const ACHIEVEMENTS_DEFS = {
  FIRST_BLOOD: p => p.gamesPlayed >= 1,
  COIN_HOARDER: p => p.coins >= 50,
  SNAKE_CHARMER: p => (p.highScores['snake'] || 0) >= 200,
  ACE_PILOT: p => p.achievements.includes('ACE_PILOT'), // handled specific case
  BLOCK_BUSTER: p => p.achievements.includes('BLOCK_BUSTER'), // handled specific case
  MIND_PALACE: p => p.achievements.includes('MIND_PALACE'),
  LIGHTNING: p => p.achievements.includes('LIGHTNING'),
  LEGEND_2048: p => p.achievements.includes('LEGEND_2048')
};

export const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  },
  getPlayer() {
    const saved = this.get('arcade_player');
    if (saved) {
      Object.assign(State.player, saved);
    }
    const savedSettings = this.get('arcade_settings');
    if (savedSettings) {
      Object.assign(State.controls, savedSettings);
    }
    return State.player;
  },
  savePlayer() {
    this.set('arcade_player', State.player);
    this.apiSyncPlayer();
  },
  saveSettings() {
    this.set('arcade_settings', State.controls);
  },
  getLeaderboard(gameId) {
    return this.get(`arcade_lb_${gameId}`) || [];
  },
  async addScore(gameId, initials, score) {
    // Local optimistic update
    const lb = this.getLeaderboard(gameId);
    lb.push({ initials, score, date: new Date().toISOString() });
    lb.sort((a,b) => b.score - a.score);
    const top5 = lb.slice(0, 5);
    this.set(`arcade_lb_${gameId}`, top5);
    
    // Update player high score
    if ((State.player.highScores[gameId] || 0) < score) {
      State.player.highScores[gameId] = score;
      this.savePlayer();
    }

    // Sync to Backend
    try {
      const res = await fetch(`/api/leaderboards/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials, score })
      });
      if(res.ok) {
        const data = await res.json();
        this.set(`arcade_lb_${gameId}`, data);
      }
    } catch(e) {
      console.warn('Backend sync failed', e);
    }
  },
  async fetchLeaderboard(gameId) {
    try {
      const res = await fetch(`/api/leaderboards/${gameId}`);
      if(res.ok) {
        const data = await res.json();
        this.set(`arcade_lb_${gameId}`, data);
      }
    } catch(e) {
      console.warn('Backend fetch failed', e);
    }
  },
  async apiSyncPlayer() {
    if (!State.player.initials) return;
    try {
      await fetch(`/api/players/${State.player.initials}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(State.player)
      });
    } catch(e) {
      console.warn('Player sync failed', e);
    }
  },
  checkAchievements() {
    const p = State.player;
    const unlocked = [];
    for (const [key, checkFn] of Object.entries(ACHIEVEMENTS_DEFS)) {
      if (!p.achievements.includes(key) && checkFn(p)) {
        p.achievements.push(key);
        unlocked.push(key);
      }
    }
    if (unlocked.length > 0) {
      this.savePlayer();
      unlocked.forEach(a => Bus.emit('achievement:unlock', a));
    }
    return unlocked;
  }
};
