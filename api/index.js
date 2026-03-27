const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = '/tmp/db.json';

function ensureDB() {
  if (!fs.existsSync('/tmp')) {
    try { fs.mkdirSync('/tmp'); } catch(e) {}
  }
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {}, players: {} }));
    } catch(e) {}
  }
}

function readDB() {
  ensureDB();
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch(e) {
      return { leaderboards: {}, players: {} };
    }
  }
  return { leaderboards: {}, players: {} };
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.get('/api/leaderboards/:gameId', (req, res) => {
  const db = readDB();
  res.json(db.leaderboards[req.params.gameId] || []);
});

app.post('/api/leaderboards/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { initials, score, date } = req.body;
  
  const db = readDB();
  if (!db.leaderboards[gameId]) db.leaderboards[gameId] = [];
  
  db.leaderboards[gameId].push({ initials, score, date: date || new Date().toISOString() });
  db.leaderboards[gameId].sort((a,b) => b.score - a.score);
  db.leaderboards[gameId] = db.leaderboards[gameId].slice(0, 5); // Keep top 5
  
  writeDB(db);
  res.json(db.leaderboards[gameId]);
});

app.get('/api/players/:initials', (req, res) => {
  const db = readDB();
  res.json(db.players[req.params.initials] || null);
});

app.post('/api/players/:initials', (req, res) => {
  const { initials } = req.params;
  const db = readDB();
  // Merge existing player data with incoming data
  const existing = db.players[initials] || {};
  db.players[initials] = { ...existing, ...req.body };
  writeDB(db);
  res.json({ success: true, player: db.players[initials] });
});

// For any other routes, send index.html (SPA routing support)
app.get('*', (req, res) => {
  res.json({ message: "API endpoint running." });
});

module.exports = app;