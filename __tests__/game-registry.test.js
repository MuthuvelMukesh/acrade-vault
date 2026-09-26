import { GameRegistry, getAllGames, getGameById, filterGames } from '../js/game-registry.js';
import { BaseGame } from '../js/base-game.js';

describe('Game Registry V2', () => {
  let canvas;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.getContext = jest.fn().mockReturnValue({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn()
    });
  });

  it('should register all 7 games with required attributes', () => {
    const games = getAllGames();
    expect(games.length).toBe(7);

    const expectedIds = ['snake', 'shooter', 'breaker', 'tiles2048', 'memory', 'reaction', 'pongvs'];
    expectedIds.forEach(id => {
      const g = getGameById(id);
      expect(g).toBeDefined();
      expect(g.id).toBe(id);
      expect(g.title).toBeDefined();
      expect(g.category).toBeDefined();
      expect(typeof g.factory).toBe('function');
    });
  });

  it('should instantiate games inheriting from BaseGame', () => {
    const onGameOver = jest.fn();
    const snakeGame = GameRegistry.snake.factory(canvas, onGameOver);
    expect(snakeGame).toBeInstanceOf(BaseGame);
    expect(typeof snakeGame.init).toBe('function');
    expect(typeof snakeGame.start).toBe('function');
    expect(typeof snakeGame.exportState).toBe('function');
    expect(typeof snakeGame.importState).toBe('function');
  });

  it('should filter games correctly by category and query', () => {
    const actionGames = filterGames('action');
    expect(actionGames.some(g => g.id === 'shooter')).toBe(true);
    expect(actionGames.some(g => g.id === 'snake')).toBe(false);

    const searchMatches = filterGames('all', 'snake');
    expect(searchMatches.length).toBe(1);
    expect(searchMatches[0].id).toBe('snake');
  });
});
