import { State } from './state.js';
import { Bus } from './bus.js';
import { Store } from './store.js';
import { FX } from './animator.js';

// Game Importers (Lazy or Direct - will be direct for simplicity)
import { SnakeGame } from './games/snake.js';
import { ShooterGame } from './games/shooter.js';
import { BreakerGame } from './games/breaker.js';
import { Tiles2048Game } from './games/tiles2048.js';
import { MemoryGame } from './games/memory.js';
import { ReactionGame } from './games/reaction.js';
import { PongVsGame } from './games/pong-vs.js';

const GAMES = {
  'snake': SnakeGame,
  'shooter': ShooterGame,
  'breaker': BreakerGame,
  'tiles2048': Tiles2048Game,
  'memory': MemoryGame,
  'reaction': ReactionGame,
  'pongvs': PongVsGame
};

export const Router = {
  currentGameInstance: null,

  showHub() {
    if (this.currentGameInstance) {
      this.currentGameInstance.destroy();
      this.currentGameInstance = null;
    }
    State.view = 'hub';
    document.getElementById('game-overlay').style.display = 'none';
    document.getElementById('hub-grid').style.display = 'grid';
  },

  launchGame(gameId) {
    if (!GAMES[gameId]) return;
    
    State.view = 'game';
    State.activeGame = gameId;
    
    const overlay = document.getElementById('game-overlay');
    overlay.style.display = 'flex';
    document.getElementById('hub-grid').style.display = 'none';
    
    const canvas = document.getElementById('game-canvas');
    const wrapper = document.querySelector('.canvas-wrapper');
    
    FX.powerOnCRT(wrapper);
    
    const GameClass = GAMES[gameId];
    this.currentGameInstance = new GameClass(canvas, (data) => this.handleGameOver(gameId, data));
    
    this.currentGameInstance.init();
    this.currentGameInstance.start();
    
    State.player.gamesPlayed++;
    State.player.playCounts = State.player.playCounts || {};
    State.player.playCounts[gameId] = (State.player.playCounts[gameId] || 0) + 1;
    Store.savePlayer();
  },

  async handleGameOver(gameId, result) {
    if (result.error) {
      alert("GAME ERROR - Returning to hub");
      Bus.emit('view:hub');
      return;
    }
    
    const player = Store.getPlayer();
    if(player.initials) {
       await Store.addScore(gameId, player.initials, result.score);
    }
    
    Store.checkAchievements();
    
    // Show custom modal instead of confirm()
    const modal = document.getElementById('game-over-modal');
    document.getElementById('go-score').innerText = result.score;
    modal.style.display = 'flex';

    // Clear old listeners by cloning
    const btnPlay = document.getElementById('btn-play-again');
    const newPlay = btnPlay.cloneNode(true);
    btnPlay.parentNode.replaceChild(newPlay, btnPlay);
    
    const btnHub = document.getElementById('btn-back-hub');
    const newHub = btnHub.cloneNode(true);
    btnHub.parentNode.replaceChild(newHub, btnHub);

    newPlay.addEventListener('click', () => {
      modal.style.display = 'none';
      this.launchGame(gameId);
    });

    newHub.addEventListener('click', () => {
      modal.style.display = 'none';
      Bus.emit('view:hub');
    });
  }
};
