import { State } from './state.js';
import { Bus, Events } from './bus.js';
import { Store } from './store.js';
import { FX } from './animator.js';
import { getGameById } from './game-registry.js';
import { RewardManager } from './progression.js';

export const Router = {
  currentGameInstance: null,
  gameStartTime: 0,

  showHub() {
    if (this.currentGameInstance) {
      this.currentGameInstance.destroy();
      this.currentGameInstance = null;
    }
    State.view = 'hub';
    State.activeGame = null;
    document.getElementById('game-overlay').style.display = 'none';
    const hubGrid = document.getElementById('hub-grid');
    if (hubGrid) hubGrid.style.display = 'grid';
    const hubView = document.getElementById('hub-view-container');
    if (hubView) hubView.style.display = 'block';
  },

  launchGame(gameId) {
    const gameDef = getGameById(gameId);
    if (!gameDef) {
      console.warn(`Game not found in registry: ${gameId}`);
      return;
    }

    State.view = 'game';
    State.activeGame = gameId;
    this.gameStartTime = Date.now();

    if (typeof history !== 'undefined' && history.pushState) {
      history.pushState({ view: 'game', gameId }, '');
    }

    const overlay = document.getElementById('game-overlay');
    overlay.style.display = 'flex';

    const hubGrid = document.getElementById('hub-grid');
    if (hubGrid) hubGrid.style.display = 'none';
    const hubView = document.getElementById('hub-view-container');
    if (hubView) hubView.style.display = 'none';

    const canvas = document.getElementById('game-canvas');
    const wrapper = document.querySelector('.canvas-wrapper');

    FX.powerOnCRT(wrapper);

    // Instantiate game from registry factory
    this.currentGameInstance = gameDef.factory(canvas, (data) => this.handleGameOver(gameId, data));
    this.currentGameInstance.init();
    this.currentGameInstance.start();
  },

  async handleGameOver(gameId, result) {
    if (result.error) {
      console.warn('Game ended with error. Returning to hub.');
      Bus.emit(Events.VIEW_HUB);
      return;
    }

    const durationSec = Math.round((Date.now() - this.gameStartTime) / 1000);
    const player = Store.getPlayer();

    // Authoritative progression and reward calculation
    const rewards = RewardManager.evaluateGameCompletion(gameId, result.score, durationSec);

    if (player.profile.initials) {
      await Store.addScore(gameId, player.profile.initials, result.score);
    }

    Store.savePlayer();

    // Show modal with score and rewards
    const modal = document.getElementById('game-over-modal');
    document.getElementById('go-score').innerText = result.score;

    // Display XP and Coins earned on modal if element exists
    const rewardEl = document.getElementById('go-rewards');
    if (rewardEl) {
      rewardEl.innerHTML = `<span style="color:var(--neon-green)">+${rewards.xpEarned} XP</span> · <span style="color:var(--neon-yellow)">+${rewards.coinsEarned} 🪙</span>`;
    }

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
      Bus.emit(Events.VIEW_HUB);
    });
  }
};
