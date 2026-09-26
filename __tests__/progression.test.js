import { State } from '../js/state.js';
import { ProgressionManager, RewardManager, AchievementManager, ChallengeManager } from '../js/progression.js';

describe('Progression & Reward Subsystem V2', () => {
  beforeEach(() => {
    State.player.progression.level = 1;
    State.player.progression.xp = 0;
    State.player.progression.coins = 0;
    State.player.achievements = [];
    State.player.stats.gamesPlayed = 0;
  });

  describe('ProgressionManager', () => {
    it('should accurately calculate levels from XP', () => {
      expect(ProgressionManager.calculateLevel(0)).toBe(1);
      expect(ProgressionManager.calculateLevel(99)).toBe(1);
      expect(ProgressionManager.calculateLevel(100)).toBe(2);
      expect(ProgressionManager.calculateLevel(250)).toBe(3);
    });

    it('should award XP and trigger level up bonuses', () => {
      ProgressionManager.awardXp(150);
      expect(State.player.progression.xp).toBe(150);
      expect(State.player.progression.level).toBe(2);
      // Level up from 1 to 2 awards 20 bonus coins
      expect(State.player.progression.coins).toBe(20);
    });
  });

  describe('RewardManager', () => {
    it('should convert game scores to XP and coins upon game completion', () => {
      const result = RewardManager.evaluateGameCompletion('snake', 200, 30);
      expect(result.xpEarned).toBeGreaterThan(0);
      expect(result.coinsEarned).toBeGreaterThan(0);
      expect(State.player.stats.gamesPlayed).toBe(1);
      expect(State.player.stats.highScores.snake).toBe(200);
    });
  });

  describe('AchievementManager', () => {
    it('should deterministically unlock First Blood achievement on first play', () => {
      State.player.stats.gamesPlayed = 1;
      const unlocked = AchievementManager.checkAll();
      expect(unlocked.some(a => a.id === 'FIRST_BLOOD')).toBe(true);
      expect(State.player.achievements).toContain('FIRST_BLOOD');
    });

    it('should not re-unlock already achieved badges', () => {
      State.player.achievements = ['FIRST_BLOOD'];
      State.player.stats.gamesPlayed = 10;
      const unlocked = AchievementManager.checkAll();
      expect(unlocked.some(a => a.id === 'FIRST_BLOOD')).toBe(false);
    });
  });

  describe('ChallengeManager', () => {
    it('should provide a valid daily challenge with reward', () => {
      const challenge = ChallengeManager.getDailyChallenge();
      expect(challenge).toBeDefined();
      expect(challenge.title).toBeDefined();
      expect(challenge.targetGame).toBeDefined();
      expect(challenge.reward.xp).toBeGreaterThan(0);
      expect(challenge.reward.coins).toBeGreaterThan(0);
    });
  });
});
