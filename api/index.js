const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const serverless = require('serverless-http');

const {
  createGuestToken,
  requireAuth,
  optionalAuth
} = require('./auth');

const {
  isValidGameId,
  sanitizeInitials,
  validateScore,
  scoreRateLimiter,
  apiRateLimiter
} = require('./validation');

const {
  getCatalog,
  getItem,
  getDefaultInventory
} = require('./catalog');

const {
  getLeaderboard,
  saveLeaderboardEntry,
  getPlayer,
  savePlayer,
  getGameState,
  saveGameState
} = require('./storage');

const app = express();

// Security & Parsing Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '64kb' })); // Restrict request body size

// Request ID & Logging Middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// General API rate limiter
app.use((req, res, next) => {
  const clientKey = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  if (apiRateLimiter.isRateLimited(clientKey)) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
    });
  }
  next();
});

const apiRouter = express.Router();

// -------------------------------------------------------------
// 1. HEALTH & METADATA
// -------------------------------------------------------------
apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & IDENTITY V2
// -------------------------------------------------------------
// Generate or retrieve authentic guest identity token
apiRouter.post('/auth/guest', (req, res) => {
  const customId = req.body?.playerId ? String(req.body.playerId).slice(0, 32) : null;
  const guestAuth = createGuestToken(customId);
  res.json({
    success: true,
    data: {
      playerId: guestAuth.playerId,
      token: guestAuth.token,
      isGuest: true
    }
  });
});

// Get currently authenticated player identity
apiRouter.get('/auth/me', optionalAuth, async (req, res) => {
  if (!req.player) {
    return res.json({
      success: true,
      data: { authenticated: false, player: null }
    });
  }
  const profile = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    profile: {
      displayName: req.player.name || 'Arcade Pilot',
      initials: 'AAA'
    },
    progression: { level: 1, xp: 0, coins: 0 },
    stats: { gamesPlayed: 0, playTime: 0, wins: 0, losses: 0 },
    achievements: [],
    inventory: getDefaultInventory(),
    preferences: {}
  };

  res.json({
    success: true,
    data: {
      authenticated: true,
      authType: req.player.authType,
      player: profile
    }
  });
});

// -------------------------------------------------------------
// 3. SECURE LEADERBOARDS
// -------------------------------------------------------------
apiRouter.get('/leaderboards/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!isValidGameId(gameId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_GAME_ID', message: `Unknown game ID: ${gameId}` }
    });
  }
  const lb = await getLeaderboard(gameId);
  res.json(lb);
});

apiRouter.post('/leaderboards/:gameId', optionalAuth, async (req, res) => {
  const { gameId } = req.params;
  const body = req.body || {};

  if (!isValidGameId(gameId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_GAME_ID', message: `Unknown game ID: ${gameId}` }
    });
  }

  // Derive player identity
  const playerId = req.player ? req.player.id : (body.playerId || 'anonymous');
  const rateLimitKey = `${req.ip}_${gameId}_${playerId}`;

  if (scoreRateLimiter.isRateLimited(rateLimitKey)) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Score submissions rate-limited. Please wait.' }
    });
  }

  const score = Number(body.score);
  const scoreCheck = validateScore(gameId, score);
  if (!scoreCheck.valid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SCORE', message: scoreCheck.error }
    });
  }

  const initials = sanitizeInitials(body.initials);
  const newEntry = {
    initials,
    score,
    playerId,
    date: body.date || new Date().toISOString()
  };

  const updatedLb = await saveLeaderboardEntry(gameId, newEntry);
  res.json(updatedLb);
});

// -------------------------------------------------------------
// 4. SECURE PLAYER PROFILE & PROGRESSION V2
// -------------------------------------------------------------
apiRouter.get('/player', requireAuth, async (req, res) => {
  const player = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    profile: { displayName: req.player.name || 'Player', initials: 'AAA' },
    progression: { level: 1, xp: 0, coins: 0 },
    stats: { gamesPlayed: 0, playTime: 0, wins: 0, losses: 0 },
    achievements: [],
    inventory: getDefaultInventory(),
    preferences: {}
  };
  res.json({ success: true, data: player });
});

apiRouter.post('/player', requireAuth, async (req, res) => {
  const existing = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    profile: { displayName: req.player.name || 'Player', initials: 'AAA' },
    progression: { level: 1, xp: 0, coins: 0 },
    stats: { gamesPlayed: 0, playTime: 0, wins: 0, losses: 0 },
    achievements: [],
    inventory: getDefaultInventory(),
    preferences: {}
  };

  const body = req.body || {};

  // Safely merge profile fields (protect economy values from arbitrary client overwrites)
  if (body.profile) {
    existing.profile.displayName = String(body.profile.displayName || existing.profile.displayName).slice(0, 32);
    if (body.profile.initials) {
      existing.profile.initials = sanitizeInitials(body.profile.initials);
    }
  }

  if (body.preferences) {
    existing.preferences = { ...existing.preferences, ...body.preferences };
  }

  if (body.stats) {
    existing.stats = {
      gamesPlayed: Math.max(existing.stats.gamesPlayed, Number(body.stats.gamesPlayed) || 0),
      playTime: Math.max(existing.stats.playTime, Number(body.stats.playTime) || 0),
      wins: Math.max(existing.stats.wins, Number(body.stats.wins) || 0),
      losses: Math.max(existing.stats.losses, Number(body.stats.losses) || 0),
      playCounts: { ...existing.stats.playCounts, ...(body.stats.playCounts || {}) }
    };
  }

  const saved = await savePlayer(req.player.id, existing);
  res.json({ success: true, data: saved });
});

// Backward compatibility player routes
apiRouter.get('/players/:initials', async (req, res) => {
  const p = await getPlayer(req.params.initials);
  res.json(p);
});

apiRouter.post('/players/:initials', optionalAuth, async (req, res) => {
  const targetId = req.player ? req.player.id : req.params.initials;
  const updated = await savePlayer(targetId, req.body);
  res.json({ success: true, player: updated });
});

// -------------------------------------------------------------
// 5. SECURE CLOUD SAVES V2
// -------------------------------------------------------------
apiRouter.get('/saves/:gameId', requireAuth, async (req, res) => {
  const { gameId } = req.params;
  if (!isValidGameId(gameId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_GAME_ID', message: `Unknown game ID: ${gameId}` }
    });
  }
  const state = await getGameState(req.player.id, gameId);
  res.json({ success: true, data: state || null, empty: !state });
});

apiRouter.post('/saves/:gameId', requireAuth, async (req, res) => {
  const { gameId } = req.params;
  if (!isValidGameId(gameId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_GAME_ID', message: `Unknown game ID: ${gameId}` }
    });
  }
  await saveGameState(req.player.id, gameId, req.body);
  res.json({ success: true, message: 'Game state saved securely' });
});

// Backward compatibility save routes
apiRouter.get('/saves/:userId/:gameId', async (req, res) => {
  const state = await getGameState(req.params.userId, req.params.gameId);
  res.json(state || { empty: true });
});

apiRouter.post('/saves/:userId/:gameId', async (req, res) => {
  const result = await saveGameState(req.params.userId, req.params.gameId, req.body);
  res.json(result);
});

// -------------------------------------------------------------
// 6. VIRTUAL ECONOMY & COSMETIC SHOP V2
// -------------------------------------------------------------
// Catalog listing
apiRouter.get('/shop/catalog', (_req, res) => {
  res.json({
    success: true,
    data: getCatalog()
  });
});

// Authoritative item purchase
apiRouter.post('/shop/purchase', requireAuth, async (req, res) => {
  const { itemId } = req.body || {};
  const item = getItem(itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: 'Item does not exist in the shop catalog' }
    });
  }

  const player = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    progression: { level: 1, xp: 0, coins: 0 },
    inventory: getDefaultInventory()
  };

  player.progression = player.progression || { level: 1, xp: 0, coins: 0 };
  player.inventory = player.inventory || getDefaultInventory();
  player.inventory.owned = player.inventory.owned || [];
  player.inventory.equipped = player.inventory.equipped || {};

  // Check if already owned
  if (player.inventory.owned.includes(item.id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'ALREADY_OWNED', message: 'You already own this item' }
    });
  }

  // Check coin balance
  if (player.progression.coins < item.price) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient coins: requires ${item.price} coins, you have ${player.progression.coins}`
      }
    });
  }

  // Authoritatively deduct coins and grant item
  player.progression.coins -= item.price;
  player.inventory.owned.push(item.id);

  // Auto-equip if first item in category
  if (!player.inventory.equipped[item.category]) {
    player.inventory.equipped[item.category] = item.id;
  }

  await savePlayer(req.player.id, player);

  res.json({
    success: true,
    data: {
      purchasedItem: item,
      remainingCoins: player.progression.coins,
      inventory: player.inventory
    }
  });
});

// Authoritative item equip
apiRouter.post('/shop/equip', requireAuth, async (req, res) => {
  const { itemId } = req.body || {};
  const item = getItem(itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: 'Item does not exist' }
    });
  }

  const player = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    inventory: getDefaultInventory()
  };

  player.inventory = player.inventory || getDefaultInventory();
  player.inventory.owned = player.inventory.owned || [];
  player.inventory.equipped = player.inventory.equipped || {};

  // Verify ownership
  if (!player.inventory.owned.includes(item.id) && !item.isDefault) {
    return res.status(403).json({
      success: false,
      error: { code: 'NOT_OWNED', message: 'You do not own this item' }
    });
  }

  player.inventory.equipped[item.category] = item.id;
  await savePlayer(req.player.id, player);

  res.json({
    success: true,
    data: {
      equipped: player.inventory.equipped
    }
  });
});

// -------------------------------------------------------------
// 7. REWARDS & PROGRESSION SYNC V2
// -------------------------------------------------------------
apiRouter.post('/progression/reward', requireAuth, async (req, res) => {
  const { xp = 0, coins = 0, achievementId } = req.body || {};

  // Bounds validation
  const safeXp = Math.min(Math.max(0, Number(xp) || 0), 1000);
  const safeCoins = Math.min(Math.max(0, Number(coins) || 0), 200);

  const player = (await getPlayer(req.player.id)) || {
    id: req.player.id,
    progression: { level: 1, xp: 0, coins: 0 },
    achievements: [],
    inventory: getDefaultInventory()
  };

  player.progression = player.progression || { level: 1, xp: 0, coins: 0 };
  player.achievements = player.achievements || [];

  player.progression.xp += safeXp;
  player.progression.coins += safeCoins;

  // Level curve: Level = 1 + floor(XP / 100)
  player.progression.level = 1 + Math.floor(player.progression.xp / 100);

  if (achievementId && typeof achievementId === 'string' && !player.achievements.includes(achievementId)) {
    player.achievements.push(achievementId);
  }

  await savePlayer(req.player.id, player);

  res.json({
    success: true,
    data: {
      progression: player.progression,
      achievements: player.achievements
    }
  });
});

// Mount router
app.use('/api', apiRouter);
app.use('/.netlify/functions/index/api', apiRouter);

// Centralized safe error handling middleware
app.use((err, req, res, _next) => {
  console.error(`[Error] [Req ${req.id}]:`, err.message);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
      requestId: req.id
    }
  });
});

// Local development server runner
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.use(express.static(path.join(__dirname, '../')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../index.html')));
  app.listen(PORT, () => console.log(`Arcade Vault V2 Server running on http://localhost:${PORT}`));
}

module.exports = app;
module.exports.handler = serverless(app);
