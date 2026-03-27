export class BaseGame {
  constructor(canvas, onGameOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.rafId = null;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.score = 0;
    
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

  _loop(time) {
    if (!this.isRunning) return;
    const dt = time - this.lastTime;
    this.lastTime = time;
    
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
