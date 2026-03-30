import { BaseGame } from '../base-game.js';
import { Multiplayer } from '../multiplayer.js';
import { Bus } from '../bus.js';
import { TouchControls } from '../touch-controls.js';
import { Sound } from '../audio.js';

export class PongVsGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 600;
    this.canvas.height = 400;

    // Game state
    this.paddleW = 10;
    this.paddleH = 80;
    this.ballSize = 10;
    
    // Server Authority logic (Host calculates ball physics, Client just sends inputs/receives state)
    this.isHost = Multiplayer.isHost;

    this.state = {
      p1y: 160,
      p2y: 160,
      bx: 300,
      by: 200,
      bvx: 5,
      bvy: 3,
      score1: 0,
      score2: 0
    };

    // Input state
    this.myDir = 0; // -1 up, 1 down

    // Netplay communication
    this.onNetData = this.onNetData.bind(this);
    this.onNetDisconnect = this.onNetDisconnect.bind(this);
    Bus.on('mp:data', this.onNetData);
    Bus.on('mp:disconnected', this.onNetDisconnect);

    TouchControls.renderDpad(document.getElementById('touch-controls-panel'), (dir) => {
      if(dir === 'up') this.myDir = -1;
      if(dir === 'down') this.myDir = 1;
    });
    TouchControls.show();

    if (!Multiplayer.conn) {
      alert("No multiplayer connection found! Re-routing to Hub.");
      this.over();
    }
  }

  onNetData(data) {
    if (this.isHost) {
      // Host receives client input
      if (data.type === 'input') {
        this.clientDir = data.dir;
      }
    } else {
      // Client receives authoritative state
      if (data.type === 'state') {
        this.state = data.state;
        this.score = this.state.score2; // I am player 2
        this._updateHUD();
      }
    }
  }

  onNetDisconnect() {
    alert("Opponent Disconnected!");
    this.over();
  }

  update(dt) {
    // Both sides update their own paddle based on local input (prediction)
    if (this.isHost) {
      this.state.p1y += this.myDir * 300 * (dt / 1000);
      if (this.clientDir) this.state.p2y += this.clientDir * 300 * (dt / 1000);
    } else {
      // Send input to host
      Multiplayer.send({ type: 'input', dir: this.myDir });
      // Client side predicts its own paddle (p2)
      this.state.p2y += this.myDir * 300 * (dt / 1000);
    }

    // Clamp paddles
    this.state.p1y = Math.max(0, Math.min(this.canvas.height - this.paddleH, this.state.p1y));
    this.state.p2y = Math.max(0, Math.min(this.canvas.height - this.paddleH, this.state.p2y));

    // Host calculates physics
    if (this.isHost) {
      let stepX = this.state.bvx * 60 * (dt / 1000);
      let stepY = this.state.bvy * 60 * (dt / 1000);
      
      this.state.bx += stepX;
      this.state.by += stepY;

      // Ball Bounce Top/Bottom
      if (this.state.by <= 0 || this.state.by >= this.canvas.height - this.ballSize) {
        this.state.bvy *= -1;
        Sound.playBlip();
      }

      // Ball Hit Paddles
      // P1 (Left)
      if (this.state.bx <= 20 + this.paddleW && this.state.bx > 20 && this.state.by + this.ballSize >= this.state.p1y && this.state.by <= this.state.p1y + this.paddleH) {
        this.state.bvx = Math.abs(this.state.bvx) * 1.05;
        this.state.bx = 20 + this.paddleW;
        Sound.playCoin();
      }
      // P2 (Right)
      if (this.state.bx + this.ballSize >= this.canvas.width - 20 - this.paddleW && this.state.bx < this.canvas.width - 20 && this.state.by + this.ballSize >= this.state.p2y && this.state.by <= this.state.p2y + this.paddleH) {
        this.state.bvx = -Math.abs(this.state.bvx) * 1.05;
        this.state.bx = this.canvas.width - 20 - this.paddleW - this.ballSize;
        Sound.playCoin();
      }

      // Ball Out of Bounds (Score)
      if (this.state.bx < 0) {
        this.state.score2++;
        this.resetBall(-1);
      } else if (this.state.bx > this.canvas.width) {
        this.state.score1++;
        this.resetBall(1);
      }

      this.score = this.state.score1; // Host is P1
      this._updateHUD();

      // Sync state to client
      Multiplayer.send({ type: 'state', state: this.state });
    }
  }

  resetBall(dir) {
    this.state.bx = this.canvas.width / 2;
    this.state.by = this.canvas.height / 2;
    this.state.bvx = 5 * dir;
    this.state.bvy = 3 * (Math.random() > 0.5 ? 1 : -1);
    Sound.playHurt();
  }

  render() {
    this.ctx.fillStyle = '#111118';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Center divider
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < this.canvas.height; i += 20) {
      this.ctx.fillRect(this.canvas.width / 2 - 2, i, 4, 10);
    }

    // Paddles
    this.ctx.fillStyle = this.isHost ? '#39ff14' : '#ff2d78'; // I am green, they are pink
    this.ctx.fillRect(20, this.state.p1y, this.paddleW, this.paddleH);
    
    this.ctx.fillStyle = this.isHost ? '#ff2d78' : '#39ff14';
    this.ctx.fillRect(this.canvas.width - 20 - this.paddleW, this.state.p2y, this.paddleW, this.paddleH);

    // Ball
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.fillRect(this.state.bx, this.state.by, this.ballSize, this.ballSize);

    // Scores
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.font = '40px "Press Start 2P"';
    this.ctx.fillText(this.state.score1, this.canvas.width/4, 60);
    this.ctx.fillText(this.state.score2, 3*this.canvas.width/4, 60);
  }

  onKeyDown(e) {
    if (['ArrowUp','w','W'].includes(e.key)) this.myDir = -1;
    if (['ArrowDown','s','S'].includes(e.key)) this.myDir = 1;
  }

  onKeyUp(e) {
    if (['ArrowUp','w','W'].includes(e.key) && this.myDir === -1) this.myDir = 0;
    if (['ArrowDown','s','S'].includes(e.key) && this.myDir === 1) this.myDir = 0;
  }

  destroy() {
    super.destroy();
    Bus.off('mp:data', this.onNetData);
    Bus.off('mp:disconnected', this.onNetDisconnect);
    Multiplayer.close();
    TouchControls.destroy();
  }
}