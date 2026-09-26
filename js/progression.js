/**
 * Arcade Vault V2 Progression, Rewards, Achievements, and Daily Challenges
 */

import { State } from './state.js';
import { Bus, Events } from './bus.js';

// --- ACHIEVEMENTS DEFINITIONS ---
export const ACHIEVEMENTS = [
  {
    id: 'FIRST_BLOOD',
    title: 'First Coin-Op',
    description: 'Play your first arcade game in the vault.',
    reward: { xp: 50, coins: 25 },
    check: (player, _event) => (player.stats?.gamesPlayed || 0) >= 1
  },
  {
    id: 'COIN_HOARDER',
    title: 'Coin Hoarder',
    description: 'Accumulate at least 50 coins in your bank.',
    reward: { xp: 100, coins: 50 },
    check: (player, _event) => (player.progression?.coins || 0) >= 50
  },
  {
    id: 'SNAKE_CHARMER',
    title: 'Snake Charmer',
    description: 'Score 200 points or more in Pixel Snake.',
    reward: { xp: 100, coins: 50 },
    check: (player, _event) => (player.stats?.highScores?.snake || 0) >= 200
  },
  {
    id: 'ACE_PILOT',
    title: 'Ace Pilot',
    description: 'Destroy the mothership boss in Space Shooter.',
    reward: { xp: 150, coins: 75 },
    check: (_player, event) => event?.type === 'BOSS_DEFEATED' || event?.game === 'shooter' && event?.bossDefeated
  },
  {
    id: 'BLOCK_BUSTER',
    title: 'Block Buster',
    description: 'Reach Level 5 in Block Breaker.',
    reward: { xp: 150, coins: 75 },
    check: (_player, event) => event?.game === 'breaker' && event?.level >= 5
  },
  {
    id: 'MIND_PALACE',
    title: 'Mind Palace',
    description: 'Clear Memory Match in 20 moves or less.',
    reward: { xp: 120, coins: 60 },
    check: (_player, event) => event?.game === 'memory' && event?.moves <= 20
  },
  {
    id: 'LIGHTNING',
    title: 'Lightning Reflex',
    description: 'Average 250ms or faster in Reaction Blitz.',
    reward: { xp: 120, coins: 60 },
    check: (_player, event) => event?.game === 'reaction' && event?.avgMs <= 250
  },
  {
    id: 'LEGEND_2048',
    title: '2048 Legend',
    description: 'Merge tiles to create the 2048 tile.',
    reward: { xp: 250, coins: 150 },
    check: (_player, event) => event?.game === 'tiles2048' && event?.tile >= 2048
  },
  {
    id: 'NETPLAY_GLADIATOR',
    title: 'Netplay Gladiator',
    description: 'Connect and play a head-to-head multiplayer match.',
    reward: { xp: 100, coins: 50 },
    check: (_player, event) => event?.type === 'MP_MATCH_PLAYED'
  },
  {
    id: 'SHOPPER',
    title: 'Arcade Stylist',
    description: 'Purchase your first cosmetic item in the shop.',
    reward: { xp: 100, coins: 50 },
    check: (player, _event) => (player.inventory?.owned?.length || 0) > 3 // more than defaults
  }
];

// --- PROGRESSION MANAGER ---
export const ProgressionManager = {
  calculateLevel(xp) {
    return 1 + Math.floor(Math.max(0, xp) / 100);
  },

  getLevelProgress(xp) {
    return Math.max(0, xp) % 100;
  },

  awardXp(amount) {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;

    const oldLevel = State.player.progression.level;

    State.player.progression.xp += safeAmount;
    const newLevel = this.calculateLevel(State.player.progression.xp);
    State.player.progression.level = newLevel;

    Bus.emit(Events.XP_EARN, { amount: safeAmount, totalXp: State.player.progression.xp });

    if (newLevel > oldLevel) {
      Bus.emit(Events.LEVEL_UP, {
        oldLevel,
        newLevel,
        bonusCoins: (newLevel - oldLevel) * 20
      });
      this.awardCoins((newLevel - oldLevel) * 20);
    }
  },

  awardCoins(amount) {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;

    State.player.progression.coins += safeAmount;
    Bus.emit(Events.COIN_EARN, safeAmount);
  }
};

// --- REWARD MANAGER ---
export const RewardManager = {
  evaluateGameCompletion(gameId, score, durationSec = 0) {
    // Scoring reward curve: 1 XP per 10 score (capped at 100 XP per match), 1 coin per 50 score
    const xpEarned = Math.min(100, Math.max(5, Math.floor(score / 10)));
    const coinsEarned = Math.min(25, Math.max(1, Math.floor(score / 50)));

    ProgressionManager.awardXp(xpEarned);
    ProgressionManager.awardCoins(coinsEarned);

    // Update player gameplay statistics
    const stats = State.player.stats;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.playTime = (stats.playTime || 0) + durationSec;
    stats.playCounts = stats.playCounts || {};
    stats.playCounts[gameId] = (stats.playCounts[gameId] || 0) + 1;

    // Check personal best
    stats.highScores = stats.highScores || {};
    if ((stats.highScores[gameId] || 0) < score) {
      stats.highScores[gameId] = score;
    }

    // Trigger challenge and achievement checks
    ChallengeManager.recordProgress(gameId, score);
    AchievementManager.checkAll({ game: gameId, score });

    return { xpEarned, coinsEarned };
  }
};

// --- ACHIEVEMENT MANAGER ---
export const AchievementManager = {
  checkAll(eventData = null) {
    const player = State.player;
    player.achievements = player.achievements || [];
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (!player.achievements.includes(ach.id)) {
        const passed = ach.check(player, eventData);
        if (passed) {
          player.achievements.push(ach.id);
          newlyUnlocked.push(ach);

          // Award achievement bounty
          if (ach.reward) {
            ProgressionManager.awardXp(ach.reward.xp);
            ProgressionManager.awardCoins(ach.reward.coins);
          }

          Bus.emit(Events.ACHIEVEMENT_UNLOCK, ach);
        }
      }
    }

    return newlyUnlocked;
  },

  getAchievement(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null;
  }
};

// --- DAILY CHALLENGE MANAGER ---
export const ChallengeManager = {
  getDailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    // Deterministic challenge generation based on date seed
    const dayNum = parseInt(today.replace(/-/g, ''), 10);

    const challengeTemplates = [
      {
        id: `daily_${today}_1`,
        title: 'Pixel Master',
        description: 'Score 150 or more in Pixel Snake.',
        targetGame: 'snake',
        targetScore: 150,
        reward: { xp: 80, coins: 40 }
      },
      {
        id: `daily_${today}_2`,
        title: 'Starfighter Command',
        description: 'Score 200 or more in Space Shooter.',
        targetGame: 'shooter',
        targetScore: 200,
        reward: { xp: 80, coins: 40 }
      },
      {
        id: `daily_${today}_3`,
        title: 'Wall Crusher',
        description: 'Score 300 or more in Block Breaker.',
        targetGame: 'breaker',
        targetScore: 300,
        reward: { xp: 80, coins: 40 }
      },
      {
        id: `daily_${today}_4`,
        title: 'Matrix Merger',
        description: 'Score 400 or more in 2048 Tiles.',
        targetGame: 'tiles2048',
        targetScore: 400,
        reward: { xp: 80, coins: 40 }
      }
    ];

    const challenge = challengeTemplates[dayNum % challengeTemplates.length];
    const completedChallenges = State.player.preferences?.completedChallenges || [];
    challenge.completed = completedChallenges.includes(challenge.id);
    return challenge;
  },

  recordProgress(gameId, score) {
    const challenge = this.getDailyChallenge();
    if (!challenge.completed && challenge.targetGame === gameId && score >= challenge.targetScore) {
      this.completeChallenge(challenge);
    }
  },

  completeChallenge(challenge) {
    State.player.preferences = State.player.preferences || {};
    State.player.preferences.completedChallenges = State.player.preferences.completedChallenges || [];

    if (!State.player.preferences.completedChallenges.includes(challenge.id)) {
      State.player.preferences.completedChallenges.push(challenge.id);
      ProgressionManager.awardXp(challenge.reward.xp);
      ProgressionManager.awardCoins(challenge.reward.coins);
      Bus.emit(Events.CHALLENGE_COMPLETED, challenge);
    }
  }
};
