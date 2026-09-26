/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../api/index.js');
const { createGuestToken } = require('../api/auth.js');

describe('Arcade Vault V2 API Test Suite', () => {
  let playerId;
  let guestAuth;

  beforeAll(() => {
    playerId = 'test_p_' + Date.now();
    guestAuth = createGuestToken(playerId);
  });

  describe('Health & Metadata', () => {
    it('should return operational status and version 2.0.0', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('2.0.0');
    });
  });

  describe('Authentication & Identity V2', () => {
    it('should generate an authentic guest token', async () => {
      const res = await request(app)
        .post('/api/auth/guest')
        .send({ playerId: 'guest_user_99' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.playerId).toBe('guest_user_99');
      expect(res.body.data.token).toContain('.');
    });

    it('should resolve player identity with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${guestAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authenticated).toBe(true);
      expect(res.body.data.player.id).toBe(playerId);
    });

    it('should reject protected route without auth', async () => {
      const res = await request(app).get('/api/player');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Leaderboard & Anti-Cheat Validation', () => {
    it('should accept valid score within game rules', async () => {
      const res = await request(app)
        .post('/api/leaderboards/snake')
        .send({
          initials: 'TOP',
          score: 150
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const entry = res.body.find(e => e.initials === 'TOP');
      expect(entry).toBeDefined();
      expect(entry.score).toBe(150);
    });

    it('should reject impossible score for Snake', async () => {
      const res = await request(app)
        .post('/api/leaderboards/snake')
        .send({
          initials: 'HCK',
          score: 9999999 // Exceeds upper bound and impossible in standard game
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_SCORE');
    });

    it('should reject invalid game ID', async () => {
      const res = await request(app)
        .post('/api/leaderboards/not_a_real_game')
        .send({
          initials: 'AAA',
          score: 100
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_GAME_ID');
    });
  });

  describe('Virtual Economy & Cosmetic Shop V2', () => {
    it('should fetch the cosmetic catalog', async () => {
      const res = await request(app).get('/api/shop/catalog');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(5);
    });

    it('should reject purchase with insufficient coins', async () => {
      const res = await request(app)
        .post('/api/shop/purchase')
        .set('Authorization', `Bearer ${guestAuth.token}`)
        .send({ itemId: 'theme_synthwave' }); // costs 200 coins, player has 0

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should purchase and equip item when player has enough coins', async () => {
      // 1. Award coins via progression endpoint
      await request(app)
        .post('/api/progression/reward')
        .set('Authorization', `Bearer ${guestAuth.token}`)
        .send({ coins: 200, xp: 100 });

      // 2. Purchase item
      const buyRes = await request(app)
        .post('/api/shop/purchase')
        .set('Authorization', `Bearer ${guestAuth.token}`)
        .send({ itemId: 'theme_amber_terminal' }); // costs 100 coins

      expect(buyRes.status).toBe(200);
      expect(buyRes.body.success).toBe(true);
      expect(buyRes.body.data.remainingCoins).toBe(100);
      expect(buyRes.body.data.inventory.owned).toContain('theme_amber_terminal');

      // 3. Equip item
      const equipRes = await request(app)
        .post('/api/shop/equip')
        .set('Authorization', `Bearer ${guestAuth.token}`)
        .send({ itemId: 'theme_amber_terminal' });

      expect(equipRes.status).toBe(200);
      expect(equipRes.body.success).toBe(true);
      expect(equipRes.body.data.equipped.theme).toBe('theme_amber_terminal');
    });
  });

  describe('Cloud Saves V2', () => {
    it('should save and load state authoritatively', async () => {
      const savePayload = {
        score: 420,
        snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }]
      };

      const saveRes = await request(app)
        .post('/api/saves/snake')
        .set('Authorization', `Bearer ${guestAuth.token}`)
        .send(savePayload);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);

      const loadRes = await request(app)
        .get('/api/saves/snake')
        .set('Authorization', `Bearer ${guestAuth.token}`);

      expect(loadRes.status).toBe(200);
      expect(loadRes.body.success).toBe(true);
      expect(loadRes.body.data.score).toBe(420);
    });
  });
});
