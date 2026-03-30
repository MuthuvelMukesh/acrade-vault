const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const serverless = require('serverless-http');
const { getStore } = require('@netlify/blobs');

const app = express();
app.use(cors());
app.use(express.json());

const isNetlifyEnv = !!(process.env.NETLIFY || process.env.URL); // Check if deployed on Netlify
const isServerless = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;
const DB_FILE = isServerless ? '/tmp/db.json' : path.join(__dirname, '../db.json');

// --- LOCAL DB FALLBACK FUNCTIONS ---
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {}, players: {} })); } catch(e) { console.error(e); }
  }
}
function readLocalDB() {
  ensureDB();
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return { leaderboards: {}, players: {} }; }
  }
  return { leaderboards: {}, players: {} };
}
function writeLocalDB(data) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch(e) { console.error(e); }
}

// --- DATABASE ACCESSORS ---
async function getLeaderboard(gameId) {
  try {
    if (isNetlifyEnv) {
      const store = getStore("leaderboards");
      const data = await store.getJSON(gameId);
      return data || [];
    }
  } catch (e) {
    console.error("Blob get error", e);
  }
  return readLocalDB().leaderboards[gameId] || [];
}

async function saveLeaderboard(gameId, newEntry) {
  try {
    if (isNetlifyEnv) {
      const store = getStore("leaderboards");
      let data = await store.getJSON(gameId);
      data = data || [];
      data.push(newEntry);
      data.sort((a,b) => b.score - a.score);
      data = data.slice(0, 5);
      await store.setJSON(gameId, data);
      return data;
    }
  } catch (e) {
    console.error("Blob save error", e);
  }
  const db = readLocalDB();
  if (!db.leaderboards[gameId]) db.leaderboards[gameId] = [];
  db.leaderboards[gameId].push(newEntry);
  db.leaderboards[gameId].sort((a,b) => b.score - a.score);
  db.leaderboards[gameId] = db.leaderboards[gameId].slice(0, 5);
  writeLocalDB(db);
  return db.leaderboards[gameId];
}

async function getPlayer(initials) {
  try {
    if (isNetlifyEnv) {
      const store = getStore("players");
      return (await store.getJSON(initials)) || null;
    }
  } catch(e) {}
  return readLocalDB().players[initials] || null;
}

async function savePlayer(initials, playerData) {
  try {
    if (isNetlifyEnv) {
      const store = getStore("players");
      const existing = (await store.getJSON(initials)) || {};
      const updated = { ...existing, ...playerData };
      await store.setJSON(initials, updated);
      return updated;
    }
  } catch(e) {}
  const db = readLocalDB();
  const existing = db.players[initials] || {};
  db.players[initials] = { ...existing, ...playerData };
  writeLocalDB(db);
  return db.players[initials];
}

// --- ROUTES ---
const apiRouter = express.Router();

apiRouter.get('/leaderboards/:gameId', async (req, res) => {
  const lb = await getLeaderboard(req.params.gameId);
  res.json(lb);
});

apiRouter.post('/leaderboards/:gameId', async (req, res) => {
  const { initials, score, date } = req.body;
  const newEntry = { initials, score, date: date || new Date().toISOString() };
  const updatedLb = await saveLeaderboard(req.params.gameId, newEntry);
  res.json(updatedLb);
});

apiRouter.get('/players/:initials', async (req, res) => {
  const p = await getPlayer(req.params.initials);
  res.json(p);
});

apiRouter.post('/players/:initials', async (req, res) => {
  const updated = await savePlayer(req.params.initials, req.body);
  res.json({ success: true, player: updated });
});

app.use('/api', apiRouter);
app.use('/.netlify/functions/index/api', apiRouter);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.use(express.static(path.join(__dirname, '../')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
  app.listen(PORT, () => console.log(`Local Arcade Vault running on http://localhost:${PORT}`));
}

module.exports.handler = serverless(app);
