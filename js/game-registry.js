/**
 * Centralized Game Registry for Arcade Vault V2
 * Single source of truth for game metadata, factories, and capability flags.
 */

import { SnakeGame } from './games/snake.js';
import { ShooterGame } from './games/shooter.js';
import { BreakerGame } from './games/breaker.js';
import { Tiles2048Game } from './games/tiles2048.js';
import { MemoryGame } from './games/memory.js';
import { ReactionGame } from './games/reaction.js';
import { PongVsGame } from './games/pong-vs.js';

export const GameRegistry = {
  snake: {
    id: 'snake',
    title: 'PIXEL SNAKE',
    category: 'classic',
    description: 'Slither through the neon grid, gobble pixel pellets and golden apples, avoid walls and your own tail.',
    previewClass: 'preview-snake',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['D-Pad / Arrow Keys: Move'],
    factory: (canvas, onGameOver) => new SnakeGame(canvas, onGameOver)
  },

  shooter: {
    id: 'shooter',
    title: 'SPACE SHOOTER',
    category: 'action',
    description: 'Blast through waves of enemy space scouts and titan mothership bosses in retro vertical shmup action.',
    previewClass: 'preview-shooter',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['Left/Right: Move Ship', 'Space / Fire: Laser Cannons'],
    factory: (canvas, onGameOver) => new ShooterGame(canvas, onGameOver)
  },

  breaker: {
    id: 'breaker',
    title: 'BLOCK BREAKER',
    category: 'action',
    description: 'Deflect high-velocity plasma balls to shatter neon brick formations across advancing difficulty levels.',
    previewClass: 'preview-breaker',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['Left/Right / Touch: Slide Paddle'],
    factory: (canvas, onGameOver) => new BreakerGame(canvas, onGameOver)
  },

  tiles2048: {
    id: 'tiles2048',
    title: '2048 TILES',
    category: 'puzzle',
    description: 'Slide matching number tiles across a 4x4 cybernetic matrix to merge them and reach the mythical 2048.',
    previewClass: 'preview-tiles2048',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['Arrow Keys / Swipe: Shift Grid'],
    factory: (canvas, onGameOver) => new Tiles2048Game(canvas, onGameOver)
  },

  memory: {
    id: 'memory',
    title: 'MEMORY MATCH',
    category: 'puzzle',
    description: 'Exercise neural RAM by flipping cyber cards and uncovering pairs with minimal moves.',
    previewClass: 'preview-memory',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['Click / Touch: Flip Card'],
    factory: (canvas, onGameOver) => new MemoryGame(canvas, onGameOver)
  },

  reaction: {
    id: 'reaction',
    title: 'REACTION BLITZ',
    category: 'action',
    description: 'Test your neuromuscular twitch speed. Tap immediately when the phosphor screen flashes green.',
    previewClass: 'preview-reaction',
    supportsTouch: true,
    supportsMultiplayer: false,
    controls: ['Click / Touch: Strike on Green'],
    factory: (canvas, onGameOver) => new ReactionGame(canvas, onGameOver)
  },

  pongvs: {
    id: 'pongvs',
    title: 'PONG VERSUS',
    category: 'multiplayer',
    description: 'Head-to-head WebRTC PeerJS multiplayer pong over low-latency P2P netplay channels.',
    previewClass: 'preview-pongvs',
    supportsTouch: true,
    supportsMultiplayer: true,
    controls: ['Up/Down / Touch: Move Paddle'],
    factory: (canvas, onGameOver) => new PongVsGame(canvas, onGameOver)
  }
};

/**
 * Returns array of all registered games
 */
export function getAllGames() {
  return Object.values(GameRegistry);
}

/**
 * Get game metadata by ID
 */
export function getGameById(id) {
  return GameRegistry[id] || null;
}

/**
 * Filter games by category and search query
 */
export function filterGames(category = 'all', query = '') {
  const cleanQuery = query.toLowerCase().trim();
  return getAllGames().filter(game => {
    const categoryMatch = category === 'all' || game.category === category;
    const queryMatch =
      !cleanQuery ||
      game.title.toLowerCase().includes(cleanQuery) ||
      game.category.toLowerCase().includes(cleanQuery) ||
      game.description.toLowerCase().includes(cleanQuery);
    return categoryMatch && queryMatch;
  });
}
