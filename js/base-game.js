import { State } from './state.js';

export class BaseGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.rafId = null;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.score = 0;
    this.gamepadState = {}; // Stores last known gamepad button states

    // Bind methods
    this._loop = this._loop.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleTouch = this._handleTouch.bind(this);
  }

  init() {
    this.score = 0;
    this.bindEvents();
    this._updateHUD();
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  pause() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  destroy() {
    this.pause();
    this.unbindEvents();
  }

  getScore() {
    return this.score;
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

  addScore(points) {
    this.score += points;
    this._updateHUD();
  }
  
  _pollGamepads() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // Just use first connected controller
    if (!gp) return;

    // Standard Gamepad Map: 12=Up, 13=Down, 14=Left, 15=Right, 0=A/Space
    const mappings = {
      12: 'ArrowUp',
      13: 'ArrowDown',
      14: 'ArrowLeft',
      15: 'ArrowRight',
      0: ' ', // space/shoot
      1: 'Escape', 
    };

    // Also support Left Analog Stick
    let stickUp = gp.axes[1] < -0.5;
    let stickDown = gp.axes[1] > 0.5;
    let stickLeft = gp.axes[0] < -0.5;
    let stickRight = gp.axes[0] > 0.5;

    const currentButtons = {
      'ArrowUp': gp.buttons[12]?.pressed || stickUp,
      'ArrowDown': gp.buttons[13]?.pressed || stickDown,
      'ArrowLeft': gp.buttons[14]?.pressed || stickLeft,
      'ArrowRight': gp.buttons[15]?.pressed || stickRight,
      [State.controls.action]: gp.buttons[0]?.pressed,
      [State.controls.pause]: gp.buttons[1]?.pressed
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

  _loop(time) {
    if (!this.isRunning) return;
    const dt = time - this.lastTime;
    this.lastTime = time;

    this._pollGamepads();

    try {
      this.update(dt);
      this.render();

    } catch (e) {
      console.error("Game crashed:", e);
      this.destroy();
      this.onGameOver({ score: this.score, error: true });
      return;
    }
    
    this.rafId = requestAnimationFrame(this._loop);
  }

  bindEvents() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    this.canvas.addEventListener('touchstart', this._handleTouch, {passive: false});
    this.canvas.addEventListener('mousedown', this._handleTouch);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    this.canvas.removeEventListener('touchstart', this._handleTouch);
    this.canvas.removeEventListener('mousedown', this._handleTouch);
  }

  // To override
  update(dt) {}
  render() {}
  onKeyDown(e) {}
  onKeyUp(e) {}
  onTouch(e) {}

  _handleKeyDown(e) { this.onKeyDown(e); }
  _handleKeyUp(e) { this.onKeyUp(e); }
  _handleTouch(e) { this.onTouch(e); }
  
  over() {
    this.destroy();
    if(this.onGameOver) this.onGameOver({ score: this.score });
  }
}
