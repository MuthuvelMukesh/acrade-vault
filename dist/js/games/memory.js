import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { State } from '../state.js';

const SYMBOLS = ['★', '♥', '◆', '♣', '⬡', '◉', '▲', '✦'];

export class MemoryGame extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 480;
    this.canvas.height = 400;
    
    let deck = [...SYMBOLS, ...SYMBOLS];
    deck.sort(() => Math.random() - 0.5);
    
    this.cards = [];
    for(let i=0; i<16; i++) {
      this.cards.push({
        id: i,
        symbol: deck[i],
        r: Math.floor(i / 4),
        c: i % 4,
        state: 'down' // down, up, matched
      });
    }

    this.first = null;
    this.second = null;
    this.lock = false;
    this.moves = 0;
    this.matches = 0;
    
    this.updateHUDExtra(`MOVES: 0`);
  }

  update(dt) { }

  render() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, 480, 400);

    const w = 100, h = 80, pad = 16;
    const offsetX = (480 - (4*w + 3*pad)) / 2;
    const offsetY = (400 - (4*h + 3*pad)) / 2;

    this.cards.forEach(card => {
      const x = offsetX + card.c * (w + pad);
      const y = offsetY + card.r * (h + pad);
      
      this.ctx.strokeStyle = '#363650';
      this.ctx.lineWidth = 2;
      
      if (card.state === 'down') {
        this.ctx.fillStyle = '#1c1c28';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
      } else {
        this.ctx.fillStyle = card.state === 'matched' ? '#111118' : '#252535';
        this.ctx.fillRect(x, y, w, h);
        if (card.state === 'matched') this.ctx.strokeStyle = '#39ff14';
        else this.ctx.strokeStyle = '#00e5ff';
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.fillStyle = card.state === 'matched' ? '#39ff14' : '#00e5ff';
        this.ctx.font = '40px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(card.symbol, x + w/2, y + h/2 + 4);
      }
    });
  }

  onTouch(e) {
    if (this.lock) return;
    const rect = this.canvas.getBoundingClientRect();
    const ex = e.touches ? e.touches[0].clientX : e.clientX;
    const ey = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (ex - rect.left) * (this.canvas.width / rect.width);
    const y = (ey - rect.top) * (this.canvas.height / rect.height);

    const w = 100, h = 80, pad = 16;
    const offsetX = (480 - (4*w + 3*pad)) / 2;
    const offsetY = (400 - (4*h + 3*pad)) / 2;

    const c = Math.floor((x - offsetX) / (w + pad));
    const r = Math.floor((y - offsetY) / (h + pad));

    if (c >= 0 && c < 4 && r >= 0 && r < 4) {
      const card = this.cards.find(cd => cd.c === c && cd.r === r);
      if (card && card.state === 'down') {
        this.flip(card);
      }
    }
  }

  flip(card) {
    card.state = 'up';
    if (!this.first) {
      this.first = card;
    } else {
      this.second = card;
      this.moves++;
      this.updateHUDExtra(`MOVES: ${this.moves}`);
      this.lock = true;
      
      if (this.first.symbol === this.second.symbol) {
        this.first.state = 'matched';
        this.second.state = 'matched';
        this.addScore(100);
        this.matches++;
        this.resetTurn();
        
        if (this.matches === 8) {
          if (this.moves <= 20) {
            Bus.emit('coin:earn', 5);
            if (!State.player.achievements.includes('MIND_PALACE')) {
              State.player.achievements.push('MIND_PALACE');
              Bus.emit('achievement:unlock', 'MIND_PALACE');
            }
          }
          else if (this.moves <= 35) Bus.emit('coin:earn', 3);
          else Bus.emit('coin:earn', 1);

          setTimeout(() => this.over(), 1000);
        }
      } else {
        setTimeout(() => {
          this.first.state = 'down';
          this.second.state = 'down';
          this.resetTurn();
        }, 800);
      }
    }
  }

  resetTurn() {
    this.first = null;
    this.second = null;
    this.lock = false;
  }
}
