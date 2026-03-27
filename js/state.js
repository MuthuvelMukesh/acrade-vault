export const State = {
  view: 'hub',           // 'hub' | 'game'
  activeGame: null,
  activeCategory: 'all',
  gameRunning: false,
  player: {
    initials: '',
    coins: 0,
    highScores: {},      // { gameId: number }
    achievements: [],    // [ achievementId, ... ]
    gamesPlayed: 0
  }
};
