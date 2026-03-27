import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { State } from '../state.js';

export class BreakerGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 480;
    this.canvas.height = 400;
    this.paddle = { x: 200, y: 380, w: 80, h: 10, speed: 400 };
    this.ball = { x: 240, y: 370, r: 5, vx: 200, vy: -200 };
    this.bricks = [];
    this.level = 1;
    this.keys = {};
    this.buildLevel();
  }

  buildLevel() {
    this.bricks = [];
    const rows = 5 + Math.floor(this.level / 2);
    const cols = 8;
    const w = 50;
    const h = 20;
    const padding = 8;
    const offsetX = (480 - (cols * (w + padding))) / 2;
    const offsetY = 40;

    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        let hp = 1;
        let type = 'normal';
        if (this.level >= 3 && Math.random() < 0.1) type = 'gold'; // indestructible
        else if (r < 2) hp = 2;

        this.bricks.push({
          x: offsetX + c*(w+padding),
          y: offsetY + r*(h+padding),
          w, h, hp, type, active: true
        });
      }
    }
    this.ball.x = this.paddle.x + this.paddle.w/2;
    this.ball.y = this.paddle.y - 10;
    const speed = 200 + (this.level * 20);
    this.ball.vx = speed * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vy = -speed;
    this.updateHUDExtra(`LVL ${this.level}`);
  }

  update(dt) {
    const sec = dt / 1000;
    
    // Paddle move
    if (this.keys['ArrowLeft']) this.paddle.x -= this.paddle.speed * sec;
    if (this.keys['ArrowRight']) this.paddle.x += this.paddle.speed * sec;
    // Mouse/Touch override happens in handlers
    this.paddle.x = Math.max(0, Math.min(480 - this.paddle.w, this.paddle.x));

    // Ball move
    this.ball.x += this.ball.vx * sec;
    this.ball.y += this.ball.vy * sec;

    // Walls
    if (this.ball.x < this.ball.r) { this.ball.x = this.ball.r; this.ball.vx *= -1; }
    if (this.ball.x > 480 - this.ball.r) { this.ball.x = 480 - this.ball.r; this.ball.vx *= -1; }
    if (this.ball.y < this.ball.r) { this.ball.y = this.ball.r; this.ball.vy *= -1; }
    
    // Drop
    if (this.ball.y > 400 + this.ball.r) return this.over();

    // Paddle Hit
    if (this.ball.vy > 0 && 
        this.ball.y + this.ball.r > this.paddle.y && 
        this.ball.y - this.ball.r < this.paddle.y + this.paddle.h &&
        this.ball.x > this.paddle.x && 
        this.ball.x < this.paddle.x + this.paddle.w) {
      this.ball.vy *= -1;
      this.ball.y = this.paddle.y - this.ball.r;
      const hitPoint = (this.ball.x - (this.paddle.x + this.paddle.w/2)) / (this.paddle.w/2);
      const speed = Math.sqrt(this.ball.vx**2 + this.ball.vy**2);
      this.ball.vx = speed * hitPoint;
    }

    // Bricks hit
    let activeBreakables = 0;
    for (let b of this.bricks) {
      if (!b.active) continue;
      if (b.type !== 'gold') activeBreakables++;

      if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w &&
          this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
          
        this.ball.vy *= -1; // simplistic bounce
        if (b.type !== 'gold') {
          b.hp--;
          if (b.hp <= 0) {
            b.active = false;
            this.addScore(100 * this.level);
            activeBreakables--;
          }
        }
        break; // only hit one per frame
      }
    }

    if (activeBreakables === 0) {
      Bus.emit('coin:earn', 1);
      this.level++;
      if (this.level >= 5 && !State.player.achievements.includes('BLOCK_BUSTER')) {
        State.player.achievements.push('BLOCK_BUSTER');
        Bus.emit('achievement:unlock', 'BLOCK_BUSTER');
      }
      this.buildLevel();
    }
  }

  render() {
    this.ctx.fillStyle = '#111118';
    this.ctx.fillRect(0, 0, 480, 400);

    // Paddle
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

    // Ball
    this.ctx.beginPath();
    this.ctx.fillStyle = '#39ff14';
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI*2);
    this.ctx.fill();

    // Bricks
    for (let b of this.bricks) {
      if (!b.active) continue;
      if (b.type === 'gold') this.ctx.fillStyle = '#ffe600';
      else if (b.hp === 2) this.ctx.fillStyle = '#ff2d78';
      else this.ctx.fillStyle = '#bf00ff';
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      this.ctx.strokeStyle = '#252535';
      this.ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }

  onKeyDown(e) { this.keys[e.key] = true; }
  onKeyUp(e) { this.keys[e.key] = false; }
  
  onTouch(e) {
    if (e.type === 'touchstart' || e.type === 'touchmove') {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
      this.paddle.x = x - this.paddle.w/2;
    } else if (e.type === 'mousemove' || e.type === 'mousedown') {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.paddle.x = x - this.paddle.w/2;
    }
  }

  bindEvents() {
    super.bindEvents();
    this.canvas.addEventListener('touchmove', this._handleTouch, {passive: false});
    this.canvas.addEventListener('mousemove', this._handleTouch);
  }
}
