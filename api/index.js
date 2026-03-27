const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = process.env.VERCEL ? '/tmp/db.json' : path.join(__dirname, '../db.json');

function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {}, players: {} }));
    } catch(e) {
      console.error("Failed to initialize database file", e);
    }
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
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Failed to write to database file", e);
  }
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

// Check if running directly in Node vs Vercel Serverless
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.use(express.static(path.join(__dirname, '../'))); // Serve static files
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`Local Arcade Vault running on http://localhost:${PORT}`);
  });
} else {
  // If required by Vercel serverless environment
  module.exports = app;
}
