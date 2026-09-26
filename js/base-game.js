import { State } from './state.js';
import { Bus, Events } from './bus.js';

export class BaseGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.rafId = null;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.startTime = Date.now();
    this.gamepadState = {};

    // Bind handlers
    this._loop = this._loop.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleTouch = this._handleTouch.bind(this);
  }

  // --- LIFECYCLE ---
  init() {
    this.score = 0;
    this.startTime = Date.now();
    this.bindEvents();
    this._updateHUD();
    Bus.emit(Events.GAME_STARTED, { game: this.constructor.name, score: 0 });
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isRunning = false;
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    Bus.emit(Events.GAME_PAUSED, { game: this.constructor.name });
  }

  resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
    Bus.emit(Events.GAME_RESUMED, { game: this.constructor.name });
  }

  reset() {
    this.pause();
    this.score = 0;
    this.startTime = Date.now();
    this.init();
    this.start();
  }

  destroy() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.unbindEvents();
  }

  togglePause() {
    if (this.isRunning) {
      this.pause();
      const pauseModal = document.getElementById('pause-modal');
      if (pauseModal) pauseModal.style.display = 'flex';

      // Connect modal actions dynamically
      const resumeBtn = document.getElementById('btn-resume-game');
      const quitBtn = document.getElementById('btn-quit-paused');
      const saveBtn = document.getElementById('btn-save-state');
      const loadBtn = document.getElementById('btn-load-state');

      if (resumeBtn) {
        resumeBtn.onclick = () => {
          if (pauseModal) pauseModal.style.display = 'none';
          this.resume();
        };
      }

      if (quitBtn) {
        quitBtn.onclick = () => {
          if (pauseModal) pauseModal.style.display = 'none';
          this.over();
        };
      }

      if (saveBtn) {
        saveBtn.onclick = async () => {
          const state = this.exportState();
          if (state) {
            const { Store } = await import('./store.js');
            await Store.saveGameState(this.constructor.name.toLowerCase().replace('game', ''), state);
            saveBtn.innerText = 'SAVED!';
            setTimeout(() => {
              if (saveBtn) saveBtn.innerText = '☁️ SAVE STATE';
            }, 2000);
          }
        };
      }

      if (loadBtn) {
        loadBtn.onclick = async () => {
          const { Store } = await import('./store.js');
          const state = await Store.loadGameState(this.constructor.name.toLowerCase().replace('game', ''));
          if (state) this.importState(state);
          if (pauseModal) pauseModal.style.display = 'none';
          this.resume();
        };
      }
    } else {
      const pauseModal = document.getElementById('pause-modal');
      if (pauseModal) pauseModal.style.display = 'none';
      this.resume();
    }
  }

  // --- SCORING & STATS ---
  getScore() {
    return this.score;
  }

  getStats() {
    return {
      score: this.score,
      playTime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  addScore(points) {
    this.score += points;
    this._updateHUD();
  }

  updateHUDExtra(text) {
    const el = document.getElementById('hud-extra');
    if (el) el.innerText = text;
  }

  _updateHUD() {
    const el = document.getElementById('hud-score');
    if (el) el.innerText = this.score;
    const sr = document.getElementById('sr-score-announcer');
    if (sr) sr.innerText = `Score: ${this.score}`;
  }

  // --- GAMEPAD INTEGRATION ---
  _pollGamepads() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    const stickUp = gp.axes && gp.axes[1] < -0.5;
    const stickDown = gp.axes && gp.axes[1] > 0.5;
    const stickLeft = gp.axes && gp.axes[0] < -0.5;
    const stickRight = gp.axes && gp.axes[0] > 0.5;

    const currentButtons = {
      ArrowUp: gp.buttons[12]?.pressed || stickUp,
      ArrowDown: gp.buttons[13]?.pressed || stickDown,
      ArrowLeft: gp.buttons[14]?.pressed || stickLeft,
      ArrowRight: gp.buttons[15]?.pressed || stickRight,
      [State.controls.action]: gp.buttons[0]?.pressed,
      [State.controls.pause]: gp.buttons[1]?.pressed || gp.buttons[9]?.pressed
    };

    for (const key of Object.keys(currentButtons)) {
      if (currentButtons[key] && !this.gamepadState[key]) {
        this._handleKeyDown({ key });
      } else if (!currentButtons[key] && this.gamepadState[key]) {
        this._handleKeyUp({ key });
      }
      this.gamepadState[key] = currentButtons[key];
    }
  }

  // --- RENDER & GAME LOOP ---
  _loop(time) {
    if (!this.isRunning) return;
    const dt = time - this.lastTime;
    this.lastTime = time;

    this._pollGamepads();

    try {
      this.update(dt);
      this.render();
    } catch (e) {
      console.error('Game loop exception:', e);
      this.destroy();
      this.onGameOver({ score: this.score, error: true });
      return;
    }

    this.rafId = requestAnimationFrame(this._loop);
  }

  // --- EVENT BINDING ---
  bindEvents() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    this.canvas.addEventListener('touchstart', this._handleTouch, { passive: false });
    this.canvas.addEventListener('mousedown', this._handleTouch);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    this.canvas.removeEventListener('touchstart', this._handleTouch);
    this.canvas.removeEventListener('mousedown', this._handleTouch);
  }

  // --- INPUT HOOKS (Overridden by Games) ---
  handleInput(_action, _active) {}
  update(_dt) {}
  render() {}
  onKeyDown(_e) {}
  onKeyUp(_e) {}
  onTouch(_e) {}

  // --- PERSISTENCE HOOKS ---
  exportState() {
    return null;
  }
  importState(_stateData) {}

  // --- NETWORK HOOKS (Optional Multiplayer) ---
  serializeNetworkState() {
    return null;
  }
  applyNetworkState(_state) {}

  _handleKeyDown(e) {
    if (e.key === State.controls.pause) {
      this.togglePause();
      return;
    }
    this.onKeyDown(e);
  }

  _handleKeyUp(e) {
    this.onKeyUp(e);
  }

  _handleTouch(e) {
    this.onTouch(e);
  }

  over() {
    this.destroy();
    Bus.emit(Events.GAME_COMPLETED, {
      game: this.constructor.name,
      stats: this.getStats()
    });
    if (this.onGameOver) {
      this.onGameOver({ score: this.score });
    }
  }
}
