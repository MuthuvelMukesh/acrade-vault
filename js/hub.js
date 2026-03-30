import { State } from './state.js';
import { Bus } from './bus.js';
import { Store } from './store.js';
import { Router } from './router.js';
import { FX } from './animator.js';
import { Sound } from './audio.js';

const GAME_CATALOG = [
  { id: 'snake', title: 'PIXEL SNAKE', category: 'classic' },
  { id: 'shooter', title: 'SPACE SHOOTER', category: 'action' },
  { id: 'breaker', title: 'BLOCK BREAKER', category: 'action' },
  { id: 'tiles2048', title: '2048 TILES', category: 'puzzle' },
  { id: 'memory', title: 'MEMORY MATCH', category: 'puzzle' },
  { id: 'reaction', title: 'REACTION BLITZ', category: 'action' }
];

export function initHub() {
  Sound.init();

  Bus.on('view:hub', () => Router.showHub());
  Bus.on('game:launch', (id) => Router.launchGame(id));
  
  Bus.on('coin:earn', (amt) => {
    State.player.coins += amt;
    Store.savePlayer();
    updateUI();
    const el = document.getElementById('ui-coin-count');
    FX.coinBounce(el, amt);
    Sound.playCoin();
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
    
    // Populate stats
    let totalPlays = 0;
    let mostPlayedGameId = '---';
    let highestPlays = 0;

    for (const [gameId, plays] of Object.entries(p.playCounts || {})) {
      totalPlays += plays;
      if (plays > highestPlays) {
        highestPlays = plays;
        mostPlayedGameId = gameId;
      }
    }

    const gameObj = GAME_CATALOG.find(g => g.id === mostPlayedGameId);
    document.getElementById('stat-most-played').innerText = gameObj ? gameObj.title : '---';
    
    // Calculate EXP (Every 5 plays = 1 level, max out visual at 100% for current level)
    const xpPercent = (totalPlays % 5) * 20; 
    document.getElementById('stat-xp-bar').style.width = `${xpPercent}%`;

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

  const tabs = document.querySelectorAll('.tab:not(#toggle-crt)');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      Sound.playBlip();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      State.activeCategory = tab.dataset.category;
      renderGrid();
    });
  });

  // Global CRT Toggle
  const crtBtn = document.getElementById('toggle-crt');
  if (crtBtn) {
    crtBtn.addEventListener('click', () => {
      Sound.playBlip();
      document.body.classList.toggle('crt-screen');
      crtBtn.classList.toggle('active');
    });
  }

  // Settings Modal Toggle (Phase 2 Custom Controls)
  const settingsBtn = document.getElementById('toggle-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      Sound.playBlip();
      const modal = document.getElementById('settings-modal');
      const actionBtn = document.getElementById('btn-remap-action');
      const pauseBtn = document.getElementById('btn-remap-pause');
      
      // Setup current bindings from State
      actionBtn.innerText = State.controls.action === ' ' ? 'Space' : State.controls.action;
      pauseBtn.innerText = State.controls.pause;

      const handleRemap = (btn, keyName) => {
        btn.innerText = 'PRESS KEY...';
        const onKeyPress = (e) => {
          e.preventDefault();
          const newKey = e.key;
          State.controls[keyName] = newKey;
          btn.innerText = newKey === ' ' ? 'Space' : newKey;
          Store.saveSettings();
          document.removeEventListener('keydown', onKeyPress);
        };
        document.addEventListener('keydown', onKeyPress, { once: true });
      };

      actionBtn.onclick = () => handleRemap(actionBtn, 'action');
      pauseBtn.onclick = () => handleRemap(pauseBtn, 'pause');

      modal.style.display = 'flex';
    });
  }

  const closeSettingsBtn = document.getElementById('btn-close-settings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      Sound.playBlip();
      document.getElementById('settings-modal').style.display = 'none';
    });
  }

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
  
  // Search bar logic
  const searchInput = document.getElementById('game-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase();
      renderGrid();
    });
  }

  // Netlify Identity Auth Integration
  const authBtn = document.getElementById('ui-auth');
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => updateAuthUI(user));
    window.netlifyIdentity.on("login", user => {
      updateAuthUI(user);
      window.netlifyIdentity.close();
    });
    window.netlifyIdentity.on("logout", () => updateAuthUI(null));
    
    authBtn.addEventListener('click', () => {
      if (window.netlifyIdentity.currentUser()) {
        window.netlifyIdentity.logout();
      } else {
        window.netlifyIdentity.open();
      }
    });

    // Initialize the widget
    window.netlifyIdentity.init();
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
  const scoresObj = State.player.highScores || {};
  for (const score of Object.values(scoresObj)) {
    if (score > hs) hs = score;
  }
  const stringBase = `INSERT COIN · PRESS START · HIGH SCORE: ${hs} · PLAYER 1 · `;
  const marquee = document.getElementById('marquee-content');
  if (marquee) marquee.innerText = stringBase.repeat(10);
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('ui-auth');
  if (!authBtn) return;

  if (user) {
    authBtn.textContent = 'LOGOUT';
    authBtn.style.color = 'var(--neon-pink)';
    // You can optionally sync player data here using user.id
    console.log("User logged in:", user.email);
  } else {
    authBtn.textContent = 'LOGIN';
    authBtn.style.color = 'var(--text-primary)';
  }
}


function renderGrid() {
  const grid = document.getElementById('hub-grid');
  grid.innerHTML = '';
  
  const filtered = GAME_CATALOG.filter(g => {
    const categoryMatch = State.activeCategory === 'all' || g.category === State.activeCategory;
    const searchMatch = !State.searchQuery || g.title.toLowerCase().includes(State.searchQuery) || g.category.includes(State.searchQuery);
    return categoryMatch && searchMatch;
  });

  filtered.forEach(game => {
    const lb = Store.getLeaderboard(game.id);
    const topScore = lb.length ? lb[0].score : 0;
    
    // Create animated preview background mapping to game id
    const card = document.createElement('div');
    card.className = 'game-card';
    card.tabIndex = 0; // Make focusable for TV/Keyboard
    card.innerHTML = `
      <div class="game-preview preview-${game.id}">
        <div class="hover-overlay">CLICK TO PLAY</div>
        <div>${game.title}</div>
        ${topScore ? `<div class="leaderboard-peek" data-id="${game.id}" style="cursor:pointer; z-index:10;">🏆 ${topScore}</div>` : `<div class="leaderboard-peek" data-id="${game.id}" style="cursor:pointer; z-index:10;">🏆 0</div>`}
      </div>
      <div class="game-info">
        <div class="info-text" style="display:flex; flex-direction:column; gap:4px;">
          <div class="game-title">${game.title}</div>
          <div style="font-size:10px; color:var(--text-secondary);">${game.category.toUpperCase()}</div>
        </div>
        <button class="btn-insert-coin" data-id="${game.id}" tabindex="-1">INSERT COIN</button>
      </div>
    `;
    
    // Launch game on card click or Enter key (TV remote support)
    const launch = () => {
      Sound.playCoin();
      Bus.emit('game:launch', game.id);
    };
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.leaderboard-peek')) launch();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launch();
      }
    });

    grid.appendChild(card);
  });

  document.querySelectorAll('.leaderboard-peek').forEach(peekBtn => {
    peekBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Sound.playBlip();
      const gameId = peekBtn.dataset.id;
      const lb = Store.getLeaderboard(gameId);

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
      
      const closeBtn = document.createElement('button');
      closeBtn.innerText = 'CLOSE';
      closeBtn.style.cssText = 'background:transparent; border:1px solid var(--neon-pink); color:var(--neon-pink); font-family:var(--font-arcade); padding:10px 20px; cursor:pointer; margin-top:10px;';
      closeBtn.onclick = () => {
        Sound.playBlip();
        overlay.remove();
      };
      
      box.innerHTML = html;
      box.appendChild(closeBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  });
}

// Start app
initHub();
