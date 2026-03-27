import { State } from './state.js';
import { Bus } from './bus.js';
import { Store } from './store.js';
import { Router } from './router.js';
import { FX } from './animator.js';

const GAME_CATALOG = [
  { id: 'snake', title: 'PIXEL SNAKE', category: 'classic' },
  { id: 'shooter', title: 'SPACE SHOOTER', category: 'action' },
  { id: 'breaker', title: 'BLOCK BREAKER', category: 'action' },
  { id: 'tiles2048', title: '2048 TILES', category: 'puzzle' },
  { id: 'memory', title: 'MEMORY MATCH', category: 'puzzle' },
  { id: 'reaction', title: 'REACTION BLITZ', category: 'action' }
];

export function initHub() {
  Bus.on('view:hub', () => Router.showHub());
  Bus.on('game:launch', (id) => Router.launchGame(id));
  
  Bus.on('coin:earn', (amt) => {
    State.player.coins += amt;
    Store.savePlayer();
    updateUI();
    const el = document.getElementById('ui-coin-count');
    FX.coinBounce(el, amt);
  });
  
  Bus.on('achievement:unlock', (ach) => {
    FX.achievementToast(ach);
  });

  document.getElementById('btn-quit-game').addEventListener('click', () => {
    Bus.emit('view:hub');
  });

  document.getElementById('ui-initials').addEventListener('click', () => {
    const modal = document.getElementById('achievements-modal');
    const list = document.getElementById('achievements-list');
    const p = Store.getPlayer();
    
    if (p.achievements.length === 0) {
      list.innerHTML = '<p style="color:var(--text-secondary);text-align:center;">NO ACHIEVEMENTS YET</p>';
    } else {
      list.innerHTML = p.achievements.map(a => `<div style="color:var(--neon-green)">★ ${a.replace('_', ' ')}</div>`).join('');
    }
    
    modal.style.display = 'flex';
  });

  document.getElementById('btn-close-achievements').addEventListener('click', () => {
    document.getElementById('achievements-modal').style.display = 'none';
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      State.activeCategory = tab.dataset.category;
      renderGrid();
    });
  });

  const p = Store.getPlayer();
  if (!p.initials) {
    const modal = document.getElementById('initials-modal');
    modal.style.display = 'flex';
    document.getElementById('btn-save-initials').addEventListener('click', () => {
      const val = document.getElementById('initials-input').value.trim().toUpperCase();
      if(val.length > 0) {
        p.initials = val.substring(0,3);
        Store.savePlayer();
        modal.style.display = 'none';
        updateUI();
      }
    });
  } else {
    // Attempt to sync offline loaded player to backend
    Store.apiSyncPlayer();
  }

  checkDaily();
  updateUI();
  fetchAllLeaderboards();
}

async function fetchAllLeaderboards() {
  await Promise.all(GAME_CATALOG.map(g => Store.fetchLeaderboard(g.id)));
  renderGrid();
}

function checkDaily() {
  const today = new Date().toDateString();
  const lastBonus = Store.get('arcade_daily');
  if (lastBonus !== today) {
    Store.set('arcade_daily', today);
    setTimeout(() => Bus.emit('coin:earn', 10), 1000);
  }
}

function updateUI() {
  document.getElementById('ui-coin-count').innerText = State.player.coins;
  document.getElementById('ui-initials').innerText = State.player.initials;
  
  // Set Marquee text
  let hs = 0;
  for (const score of Object.values(State.player.highScores)) {
    if (score > hs) hs = score;
  }
  const stringBase = `INSERT COIN · PRESS START · HIGH SCORE: ${hs} · PLAYER 1 · `;
  document.getElementById('marquee-content').innerText = stringBase.repeat(10);
}

function renderGrid() {
  const grid = document.getElementById('hub-grid');
  grid.innerHTML = '';
  
  const filtered = GAME_CATALOG.filter(g => 
    State.activeCategory === 'all' || g.category === State.activeCategory
  );

  filtered.forEach(game => {
    const lb = Store.getLeaderboard(game.id);
    const topScore = lb.length ? lb[0].score : 0;
    
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="game-preview">
        <div>${game.title}</div>
        ${topScore ? `<div class="leaderboard-peek" data-id="${game.id}" style="cursor:pointer; z-index:10;">🏆 ${topScore}</div>` : `<div class="leaderboard-peek" data-id="${game.id}" style="cursor:pointer; z-index:10;">🏆 0</div>`}
      </div>
      <div class="game-info">
        <div class="game-title">${game.title}</div>
        <button class="btn-insert-coin" data-id="${game.id}">INSERT COIN</button>
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll('.btn-insert-coin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      Bus.emit('game:launch', e.target.dataset.id);
    });
  });

  document.querySelectorAll('.leaderboard-peek').forEach(peek => {
    peek.addEventListener('click', (e) => {
      e.stopPropagation();
      const lb = Store.getLeaderboard(e.target.dataset.id);
      
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column;';
      
      const box = document.createElement('div');
      box.style.cssText = 'background:var(--color-cabinet); border:2px solid var(--neon-cyan); padding:var(--space-4); border-radius:var(--radius-md); font-family:var(--font-arcade); box-shadow:var(--glow-cyan); text-align:center; min-width:300px;';
      
      let html = '<h2 style="color:var(--neon-yellow); margin-top:0;">🏆 HIGH SCORES 🏆</h2><div style="margin:20px 0; font-size:12px; line-height:2;">';
      
      if(lb.length === 0) {
        html += '<p>NO SCORES YET</p>';
      } else {
        lb.forEach((entry, i) => {
          const isMe = entry.initials === State.player.initials;
          const color = isMe ? 'var(--neon-cyan)' : 'var(--text-primary)';
          html += `<div style="display:flex; justify-content:space-between; color:${color};"><span style="margin-right:20px; text-align:left;">${i+1}. ${entry.initials}</span> <span>${entry.score}</span></div>`;
        });
      }
      html += '</div>';
      
      const btn = document.createElement('button');
      btn.innerText = 'CLOSE';
      btn.style.cssText = 'background:transparent; border:1px solid var(--neon-pink); color:var(--neon-pink); font-family:var(--font-arcade); padding:10px 20px; cursor:pointer;';
      btn.onclick = () => overlay.remove();
      
      box.innerHTML = html;
      box.appendChild(btn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  });
}

// Start app
initHub();
