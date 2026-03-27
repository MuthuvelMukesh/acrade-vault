import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { TouchControls } from '../touch-controls.js';
import { State } from '../state.js';

export class SnakeGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.grid = 20;
    this.snake = [{x: 10, y: 10}];
    this.dir = {x: 1, y: 0};
    this.nextDir = {x: 1, y: 0};
    this.apple = this.spawnApple();
    this.golden = null;
    this.applesEaten = 0;
    this.speed = 150; // ms per move
    this.timeAccum = 0;

    TouchControls.renderDpad(document.getElementById('touch-controls-panel'), (dir) => {
      if (dir==='up' && this.dir.y===0) this.nextDir = {x:0, y:-1};
      if (dir==='down' && this.dir.y===0) this.nextDir = {x:0, y:1};
      if (dir==='left' && this.dir.x===0) this.nextDir = {x:-1, y:0};
      if (dir==='right' && this.dir.x===0) this.nextDir = {x:1, y:0};
    });
    TouchControls.show();
  }

  spawnApple() {
    return {
      x: Math.floor(Math.random() * (400 / this.grid)),
      y: Math.floor(Math.random() * (400 / this.grid))
    };
  }

  update(dt) {
    this.timeAccum += dt;
    if (this.timeAccum < this.speed) return;
    this.timeAccum = 0;

    this.dir = { ...this.nextDir };
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    // Walls
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
      return this.over();
    }
    // Self
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      return this.over();
    }

    this.snake.unshift(head);

    // Eat Apple
    if (head.x === this.apple.x && head.y === this.apple.y) {
      this.addScore(10);
      this.applesEaten++;
      Bus.emit('coin:earn', 1);
      
      if (this.applesEaten % 5 === 0) this.speed = Math.max(50, this.speed - 10);
      
      this.apple = this.spawnApple();
      if (Math.random() < 0.05) {
        this.golden = this.spawnApple();
      }
    } 
    // Eat Golden
    else if (this.golden && head.x === this.golden.x && head.y === this.golden.y) {
      this.addScore(50);
      Bus.emit('coin:earn', 5);
      this.golden = null;
    } else {
      this.snake.pop();
    }
  }

  render() {
    this.ctx.fillStyle = '#111118';
    this.ctx.fillRect(0, 0, 400, 400);

    // grid
    this.ctx.strokeStyle = 'rgba(57,255,20,0.08)';
    for(let i=0; i<400; i+=this.grid) {
      this.ctx.beginPath(); this.ctx.moveTo(i,0); this.ctx.lineTo(i,400); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(0,i); this.ctx.lineTo(400,i); this.ctx.stroke();
    }

    // Snake
    this.ctx.fillStyle = '#39ff14';
    this.snake.forEach(s => {
      this.ctx.fillRect(s.x * this.grid, s.y * this.grid, this.grid - 1, this.grid - 1);
    });

    // Apple
    this.ctx.fillStyle = '#ff2d78';
    this.ctx.fillRect(this.apple.x * this.grid, this.apple.y * this.grid, this.grid - 1, this.grid - 1);

    if (this.golden) {
      this.ctx.fillStyle = '#ffe600';
      this.ctx.fillRect(this.golden.x * this.grid, this.golden.y * this.grid, this.grid - 1, this.grid - 1);
    }
  }

  onKeyDown(e) {
    if (e.key === 'ArrowUp' && this.dir.y === 0) this.nextDir = {x: 0, y: -1};
    if (e.key === 'ArrowDown' && this.dir.y === 0) this.nextDir = {x: 0, y: 1};
    if (e.key === 'ArrowLeft' && this.dir.x === 0) this.nextDir = {x: -1, y: 0};
    if (e.key === 'ArrowRight' && this.dir.x === 0) this.nextDir = {x: 1, y: 0};
  }

  destroy() {
    super.destroy();
    TouchControls.destroy();
  }
}
