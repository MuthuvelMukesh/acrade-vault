import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { TouchControls } from '../touch-controls.js';
import { State } from '../state.js';

export class ShooterGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 480;
    this.canvas.height = 600;
    this.player = { x: 240, y: 550, w: 20, h: 20, speed: 300, dx: 0, cooldown: 0 };
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.wave = 1;
    this.enemiesToSpawn = 5;
    this.spawnTimer = 0;
    this.boss = null;
    this.keys = {};

    TouchControls.renderDpad(document.getElementById('touch-controls-panel'), (dir) => {
      // simplified handling below
    });
    TouchControls.renderButtons(document.getElementById('touch-controls-panel'), [
      { label: 'FIRE', handler: () => this.shoot() }
    ]);
    TouchControls.show();
    this.updateHUDExtra(`WAVE 1`);
  }

  shoot() {
    if (this.player.cooldown <= 0) {
      this.bullets.push({ x: this.player.x, y: this.player.y - 10, vy: -500, type: 'player' });
      this.player.cooldown = 0.2;
    }
  }

  spawnEnemy() {
    const x = Math.random() * 440 + 20;
    if (this.wave % 5 === 0 && !this.boss && this.enemiesToSpawn === 1) {
      this.boss = { x: 240, y: 50, w: 80, h: 40, hp: 20, maxHp: 20, type: 'boss', vx: 100 };
      this.enemies.push(this.boss);
    } else {
      this.enemies.push({ x, y: -20, w: 20, h: 20, hp: 1, type: 'scout', vy: 100 + (this.wave * 10) });
    }
  }

  update(dt) {
    const sec = dt / 1000;
    this.player.cooldown -= sec;

    // Player Move
    if (this.keys['ArrowLeft']) this.player.x -= this.player.speed * sec;
    if (this.keys['ArrowRight']) this.player.x += this.player.speed * sec;
    if (this.keys[' ']) this.shoot();
    this.player.x = Math.max(10, Math.min(470, this.player.x));

    // Spawning
    if (this.enemiesToSpawn > 0) {
      this.spawnTimer -= sec;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.enemiesToSpawn--;
        this.spawnTimer = 1.0 - Math.min(0.8, this.wave * 0.05);
      }
    } else if (this.enemies.length === 0) {
      this.wave++;
      this.updateHUDExtra(`WAVE ${this.wave}`);
      Bus.emit('coin:earn', 1);
      this.enemiesToSpawn = 5 + (this.wave * 2);
    }

    // Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.y += b.vy * sec;
      if (b.y < -10 || b.y > 610) { this.bullets.splice(i, 1); continue; }
      
      // Collision
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        let e = this.enemies[j];
        if (Math.abs(b.x - e.x) < e.w/2 + 2 && Math.abs(b.y - e.y) < e.h/2 + 5) {
          e.hp--;
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this.addScore(e.type==='boss'? 500 : 10);
            if (e.type === 'boss') {
              Bus.emit('coin:earn', 5);
              if(!State.player.achievements.includes('ACE_PILOT')) {
                 State.player.achievements.push('ACE_PILOT');
                 Bus.emit('achievement:unlock', 'ACE_PILOT');
                 State.player.savePlayer && State.player.savePlayer();
              }
              this.boss = null;
            }
            this.createExplosion(e.x, e.y);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let e = this.enemies[i];
      if (e.type === 'boss') {
        e.x += e.vx * sec;
        if (e.x < 40 || e.x > 440) e.vx *= -1;
      } else {
        e.y += e.vy * sec;
      }
      
      if (e.y > 620) {
        this.enemies.splice(i, 1);
      } else if (Math.abs(this.player.x - e.x) < (this.player.w + e.w)/2 && Math.abs(this.player.y - e.y) < (this.player.h + e.h)/2) {
        return this.over(); // crash
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.life -= sec;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  createExplosion(x, y) {
    for (let i=0; i<8; i++) {
      const angle = (i/8) * Math.PI * 2;
      this.particles.push({
        x, y, 
        vx: Math.cos(angle) * 100, 
        vy: Math.sin(angle) * 100, 
        life: 0.4, maxLife: 0.4
      });
    }
  }

  render() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, 480, 600);

    // Player
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x, this.player.y - 15);
    this.ctx.lineTo(this.player.x + 15, this.player.y + 10);
    this.ctx.lineTo(this.player.x - 15, this.player.y + 10);
    this.ctx.fill();

    // Enemies
    this.enemies.forEach(e => {
      this.ctx.fillStyle = e.type === 'boss' ? '#ffe600' : '#ff2d78';
      this.ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      if (e.type === 'boss') {
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(e.x - 40, e.y - 30, 80, 5);
        this.ctx.fillStyle = '#39ff14';
        this.ctx.fillRect(e.x - 40, e.y - 30, 80 * (e.hp/e.maxHp), 5);
      }
    });

    // Bullets
    this.ctx.fillStyle = '#39ff14';
    this.bullets.forEach(b => {
      this.ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
    });

    // Particles
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = '#ff2d78';
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    this.ctx.globalAlpha = 1;
  }

  onKeyDown(e) { this.keys[e.key] = true; }
  onKeyUp(e) { this.keys[e.key] = false; }
  onTouch(e) {
    if(e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
      this.player.x = x;
      this.shoot();
    }
  }

  destroy() { super.destroy(); TouchControls.destroy(); }
}
