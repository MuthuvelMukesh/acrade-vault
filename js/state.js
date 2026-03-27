export const State = {
  view: 'hub',           // 'hub' | 'game'
  activeGame: null,
  activeCategory: 'all',
  searchQuery: '',       // NEW: tracking search input
  gameRunning: false,
  player: {
    initials: '',
    coins: 0,
    highScores: {},      // { gameId: number }
    achievements: [],    // [ achievementId, ... ]
    gamesPlayed: 0,
    playCounts: {}       // NEW: tracking most played game
  }
};
