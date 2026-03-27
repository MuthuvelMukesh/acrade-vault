import { BaseGame } from '../base-game.js';
import { Bus } from '../bus.js';
import { State } from '../state.js';
import { TouchControls } from '../touch-controls.js';

export class Tiles2048Game extends BaseGame {
  init() {
    super.init();
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.grid = Array(4).fill(0).map(()=>Array(4).fill(0));
    this.addTile();
    this.addTile();
    this.milestone = 1000;
    this.won = false;

    TouchControls.renderDpad(document.getElementById('touch-controls-panel'), (dir) => {
      this.move(dir);
    });
    TouchControls.show();
  }

  addTile() {
    let empty = [];
    for(let r=0; r<4; r++) for(let c=0; c<4; c++) if(this.grid[r][c]===0) empty.push({r,c});
    if(empty.length===0) return;
    let spot = empty[Math.floor(Math.random()*empty.length)];
    this.grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
  }

  move(dir) {
    let moved = false;
    let newScore = 0;
    
    // Core logic for 2048 sliding and merging
    const slide = (row) => {
      let arr = row.filter(val => val);
      for(let i=0; i<arr.length-1; i++) {
        if(arr[i] === arr[i+1]) {
          arr[i] *= 2;
          newScore += arr[i];
          arr[i+1] = 0;
        }
      }
      arr = arr.filter(val => val);
      while(arr.length < 4) arr.push(0);
      return arr;
    };

    if (dir === 'left' || dir === 'right') {
      for(let r=0; r<4; r++) {
        let row = this.grid[r];
        if (dir === 'right') row.reverse();
        let newRow = slide(row);
        if (dir === 'right') newRow.reverse();
        for(let c=0; c<4; c++) {
          if (this.grid[r][c] !== newRow[c]) moved = true;
          this.grid[r][c] = newRow[c];
        }
      }
    } else {
      for(let c=0; c<4; c++) {
        let col = [this.grid[0][c], this.grid[1][c], this.grid[2][c], this.grid[3][c]];
        if (dir === 'down') col.reverse();
        let newCol = slide(col);
        if (dir === 'down') newCol.reverse();
        for(let r=0; r<4; r++) {
          if (this.grid[r][c] !== newCol[r]) moved = true;
          this.grid[r][c] = newCol[r];
        }
      }
    }

    if (moved) {
      this.addScore(newScore);
      if (this.score >= this.milestone) {
        Bus.emit('coin:earn', 1);
        this.milestone += 1000;
      }
      this.addTile();
      this.checkState();
    }
  }

  checkState() {
    let empty = 0;
    let max = 0;
    for(let r=0; r<4; r++){
      for(let c=0; c<4; c++){
        if(this.grid[r][c]===0) empty++;
        if(this.grid[r][c] > max) max = this.grid[r][c];
      }
    }

    if (max >= 2048 && !this.won) {
      this.won = true;
      if (!State.player.achievements.includes('LEGEND_2048')) {
        State.player.achievements.push('LEGEND_2048');
        Bus.emit('achievement:unlock', 'LEGEND_2048');
      }
    }

    if (empty === 0) {
      // Check adjacent
      for(let r=0; r<4; r++){
        for(let c=0; c<4; c++){
          if(c<3 && this.grid[r][c] === this.grid[r][c+1]) return;
          if(r<3 && this.grid[r][c] === this.grid[r+1][c]) return;
        }
      }
      this.over();
    }
  }

  update(dt) {}

  render() {
    this.ctx.fillStyle = '#1c1c28';
    this.ctx.fillRect(0, 0, 400, 400);

    const size = 88;
    const pad = 10;
    for(let r=0; r<4; r++){
      for(let c=0; c<4; c++){
        const val = this.grid[r][c];
        const x = pad + c * (size + pad);
        const y = pad + r * (size + pad);

        this.ctx.fillStyle = val === 0 ? '#252535' : this.getColor(val);
        this.ctx.fillRect(x, y, size, size);

        if (val > 0) {
          this.ctx.fillStyle = val > 4 ? '#050508' : '#e8ffe8';
          this.ctx.font = val > 512 ? '20px "Press Start 2P"' : '24px "Press Start 2P"';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(val, x + size/2, y + size/2);
        }
      }
    }
  }

  getColor(val) {
    if(val <= 2) return '#363650';
    if(val <= 4) return '#8a9a8a';
    if(val <= 8) return '#ff2d78';
    if(val <= 16) return '#bf00ff';
    if(val <= 64) return '#00e5ff';
    if(val <= 256) return '#ffe600';
    return '#39ff14';
  }

  onKeyDown(e) {
    if (['ArrowUp','w','W'].includes(e.key)) this.move('up');
    if (['ArrowDown','s','S'].includes(e.key)) this.move('down');
    if (['ArrowLeft','a','A'].includes(e.key)) this.move('left');
    if (['ArrowRight','d','D'].includes(e.key)) this.move('right');
  }

  destroy() { super.destroy(); TouchControls.destroy(); }
}
