const fs = require('fs');
const path = require('path');
const { getStore } = require('@netlify/blobs');

const isNetlifyEnv = !!(process.env.NETLIFY || process.env.URL);
const isServerless = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;
const DB_FILE = isServerless ? '/tmp/db.json' : path.join(__dirname, '../db.json');

// --- LOCAL DB FALLBACK FUNCTIONS ---
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {}, players: {}, saves: {} }, null, 2));
    } catch (e) {
      console.error('Error initializing db.json:', e.message);
    }
  }
}

function readLocalDB() {
  ensureDB();
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      parsed.leaderboards = parsed.leaderboards || {};
      parsed.players = parsed.players || {};
      parsed.saves = parsed.saves || {};
      return parsed;
    } catch (_e) {
      return { leaderboards: {}, players: {}, saves: {} };
    }
  }
  return { leaderboards: {}, players: {}, saves: {} };
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing to local DB:', e.message);
  }
}

// --- DATABASE ACCESSORS ---
async function getLeaderboard(gameId) {
  const normalizedGameId = gameId.toLowerCase();
  try {
    if (isNetlifyEnv) {
      const store = getStore('leaderboards');
      const data = await store.getJSON(normalizedGameId);
      return data || [];
    }
  } catch (e) {
    console.error('Netlify Blobs getLeaderboard error:', e.message);
  }
  const db = readLocalDB();
  return db.leaderboards[normalizedGameId] || [];
}

async function saveLeaderboardEntry(gameId, newEntry) {
  const normalizedGameId = gameId.toLowerCase();
  try {
    if (isNetlifyEnv) {
      const store = getStore('leaderboards');
      let data = (await store.getJSON(normalizedGameId)) || [];
      data.push(newEntry);
      data.sort((a, b) => b.score - a.score);
      data = data.slice(0, 10); // Keep top 10
      await store.setJSON(normalizedGameId, data);
      return data;
    }
  } catch (e) {
    console.error('Netlify Blobs saveLeaderboard error:', e.message);
  }
  const db = readLocalDB();
  if (!db.leaderboards[normalizedGameId]) db.leaderboards[normalizedGameId] = [];
  db.leaderboards[normalizedGameId].push(newEntry);
  db.leaderboards[normalizedGameId].sort((a, b) => b.score - a.score);
  db.leaderboards[normalizedGameId] = db.leaderboards[normalizedGameId].slice(0, 10);
  writeLocalDB(db);
  return db.leaderboards[normalizedGameId];
}

async function getPlayer(playerId) {
  if (!playerId) return null;
  try {
    if (isNetlifyEnv) {
      const store = getStore('players');
      return (await store.getJSON(playerId)) || null;
    }
  } catch (e) {
    console.error('Netlify Blobs getPlayer error:', e.message);
  }
  const db = readLocalDB();
  return db.players[playerId] || null;
}

async function savePlayer(playerId, playerData) {
  if (!playerId) return null;
  try {
    if (isNetlifyEnv) {
      const store = getStore('players');
      const existing = (await store.getJSON(playerId)) || {};
      const updated = { ...existing, ...playerData, id: playerId, updatedAt: new Date().toISOString() };
      await store.setJSON(playerId, updated);
      return updated;
    }
  } catch (e) {
    console.error('Netlify Blobs savePlayer error:', e.message);
  }
  const db = readLocalDB();
  const existing = db.players[playerId] || {};
  const updated = { ...existing, ...playerData, id: playerId, updatedAt: new Date().toISOString() };
  db.players[playerId] = updated;
  writeLocalDB(db);
  return updated;
}

async function getGameState(userId, gameId) {
  const key = `${userId}_${gameId.toLowerCase()}`;
  try {
    if (isNetlifyEnv) {
      const store = getStore('saves');
      return (await store.getJSON(key)) || null;
    }
  } catch (e) {
    console.error('Netlify Blobs getGameState error:', e.message);
  }
  const db = readLocalDB();
  return db.saves[key] || null;
}

async function saveGameState(userId, gameId, stateData) {
  const key = `${userId}_${gameId.toLowerCase()}`;
  const payload = {
    ...stateData,
    savedAt: new Date().toISOString()
  };
  try {
    if (isNetlifyEnv) {
      const store = getStore('saves');
      await store.setJSON(key, payload);
      return { success: true };
    }
  } catch (e) {
    console.error('Netlify Blobs saveGameState error:', e.message);
  }
  const db = readLocalDB();
  db.saves[key] = payload;
  writeLocalDB(db);
  return { success: true };
}

module.exports = {
  isNetlifyEnv,
  getLeaderboard,
  saveLeaderboardEntry,
  getPlayer,
  savePlayer,
  getGameState,
  saveGameState
};
