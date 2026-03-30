import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { State } from '../state.js';

export class ReactionGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 480;
    this.canvas.height = 320;
    
    this.stage = 0; 
    this.mode = 'wait'; // wait, ready
    this.waitTime = 0;
    this.timer = 0;
    this.results = [];
    this.bgcolor = '#ff2d78';
    
    this.nextRound();
  }

  nextRound() {
    this.stage++;
    if (this.stage > 5) {
      const avg = this.results.reduce((a,b)=>a+b, 0) / 5;
      this.score = Math.max(0, 1000 - Math.floor(avg));
      
      if (avg <= 250) {
        Bus.emit('coin:earn', 3);
        if (!State.player.achievements.includes('LIGHTNING')) {
          State.player.achievements.push('LIGHTNING');
          Bus.emit('achievement:unlock', 'LIGHTNING');
        }
      }
      else if (avg <= 400) Bus.emit('coin:earn', 2);
      else Bus.emit('coin:earn', 1);

      this.updateHUDExtra(`AVG: ${Math.floor(avg)}ms`);
      return setTimeout(() => this.over(), 2000);
    }
    
    this.mode = 'wait';
    this.bgcolor = '#ff2d78';
    this.waitTime = 1000 + Math.random() * 2500;
    this.updateHUDExtra(`ROUND ${this.stage}/5`);
  }

  update(dt) {
    if (this.stage > 5) return;
    
    if (this.mode === 'wait') {
      this.waitTime -= dt;
      if (this.waitTime <= 0) {
        this.mode = 'ready';
        this.bgcolor = '#39ff14';
        this.timer = performance.now();
      }
    }
  }

  render() {
    this.ctx.fillStyle = this.bgcolor;
    this.ctx.fillRect(0, 0, 480, 320);

    this.ctx.fillStyle = '#050508';
    this.ctx.font = '24px "Press Start 2P"';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.stage > 5) {
      this.ctx.fillText("COMPLETE!", 240, 160);
    } else if (this.mode === 'wait') {
      this.ctx.fillText("WAIT...", 240, 160);
    } else {
      this.ctx.fillText("TAP NOW!!!", 240, 160);
    }
  }

  onTouch(e) {
    if (this.stage > 5) return;
    
    // Simplistic handling for all 5 rounds just measuring reaction to color change
    if (this.mode === 'wait') {
      // Penalty for early tap
      this.results.push(1000);
      this.bgcolor = '#ffe600';
      this.mode = 'result';
      setTimeout(() => this.nextRound(), 1000);
    } else if (this.mode === 'ready') {
      const ms = performance.now() - this.timer;
      this.results.push(ms);
      this.bgcolor = '#00e5ff';
      this.mode = 'result';
      this.updateHUDExtra(`${Math.floor(ms)}ms`);
      setTimeout(() => this.nextRound(), 1000);
    }
  }
}
