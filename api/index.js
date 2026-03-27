const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

const isServerless = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;
const DB_FILE = isServerless ? '/tmp/db.json' : path.join(__dirname, '../db.json');

function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {}, players: {} })); } catch(e) { console.error(e); }
  }
}

function readDB() {
  ensureDB();
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return { leaderboards: {}, players: {} }; }
  }
  return { leaderboards: {}, players: {} };
}

function writeDB(data) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch(e) { console.error(e); }
}

const apiRouter = express.Router();

apiRouter.get('/leaderboards/:gameId', (req, res) => {
  const db = readDB();
  res.json(db.leaderboards[req.params.gameId] || []);
});

apiRouter.post('/leaderboards/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { initials, score, date } = req.body;
  const db = readDB();
  if (!db.leaderboards[gameId]) db.leaderboards[gameId] = [];
  db.leaderboards[gameId].push({ initials, score, date: date || new Date().toISOString() });
  db.leaderboards[gameId].sort((a,b) => b.score - a.score);
  db.leaderboards[gameId] = db.leaderboards[gameId].slice(0, 5);
  writeDB(db);
  res.json(db.leaderboards[gameId]);
});

apiRouter.get('/players/:initials', (req, res) => {
  const db = readDB();
  res.json(db.players[req.params.initials] || null);
});

apiRouter.post('/players/:initials', (req, res) => {
  const { initials } = req.params;
  const db = readDB();
  const existing = db.players[initials] || {};
  db.players[initials] = { ...existing, ...req.body };
  writeDB(db);
  res.json({ success: true, player: db.players[initials] });
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
