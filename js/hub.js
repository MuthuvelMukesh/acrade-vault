import { State } from './state.js';
import { Bus, Events } from './bus.js';
import { Store } from './store.js';
import { Router } from './router.js';
import { FX } from './animator.js';
import { Sound } from './audio.js';
import { Multiplayer } from './multiplayer.js';
import { getAllGames, filterGames } from './game-registry.js';
import { ProgressionManager, ChallengeManager, ACHIEVEMENTS } from './progression.js';
import { SyncManager } from './sync.js';
import { CosmeticEngine } from './cosmetics.js';

export function initHub() {
  Sound.init();
  SyncManager.init();
  CosmeticEngine.init();

  // Navigation & Routing listeners
  Bus.on(Events.VIEW_HUB, () => Router.showHub());
  Bus.on(Events.GAME_LAUNCH, (id) => Router.launchGame(id));

  // Android hardware back-button & browser history support
  window.addEventListener('popstate', () => {
    if (State.view === 'game') {
      Bus.emit(Events.VIEW_HUB);
    }
  });

  // Progression & Reward reactions
  Bus.on(Events.COIN_EARN, (amt) => {
    const el = document.getElementById('ui-coin-count');
    if (el) FX.coinBounce(el, amt);
    Sound.playCoin();
    updateUI();
  });

  Bus.on(Events.XP_EARN, () => {
    updateUI();
  });

  Bus.on(Events.LEVEL_UP, ({ newLevel, bonusCoins }) => {
    Sound.playCoin();
    FX.achievementToast(`LEVEL UP! You reached Level ${newLevel}! (+${bonusCoins} coins bonus)`);
    updateUI();
  });

  Bus.on(Events.ACHIEVEMENT_UNLOCK, (ach) => {
    Sound.playCoin();
    const title = ach.title || ach.id || 'Milestone';
    const rewardText = ach.reward ? ` (+${ach.reward.xp} XP, +${ach.reward.coins} 🪙)` : '';
    FX.achievementToast(`${title}${rewardText}`);
    updateUI();
  });

  Bus.on(Events.CHALLENGE_COMPLETED, (ch) => {
    Sound.playCoin();
    FX.achievementToast(`DAILY CHALLENGE COMPLETE: ${ch.title}! (+${ch.reward.xp} XP, +${ch.reward.coins} 🪙)`);
    renderDailyChallenge();
    updateUI();
  });

  Bus.on(Events.SYNC_STATUS, ({ status, message }) => {
    updateSyncIndicator(status, message);
  });

  Bus.on(Events.ITEM_PURCHASED, (item) => {
    Sound.playCoin();
    FX.achievementToast(`UNLOCKED: ${item.name}!`);
    renderShop();
    updateUI();
  });

  Bus.on(Events.ITEM_EQUIPPED, (item) => {
    Sound.playBlip();
    FX.achievementToast(`EQUIPPED: ${item.name}`);
    renderShop();
  });

  // Quit game button
  const quitBtn = document.getElementById('btn-quit-game');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      Bus.emit(Events.VIEW_HUB);
    });
  }

  // Netplay controls
  const closeMpBtn = document.getElementById('btn-close-mp');
  if (closeMpBtn) {
    closeMpBtn.addEventListener('click', () => {
      document.getElementById('multiplayer-modal').style.display = 'none';
      Multiplayer.close();
    });
  }

  const joinMpBtn = document.getElementById('btn-mp-join');
  if (joinMpBtn) {
    joinMpBtn.addEventListener('click', () => {
      const input = document.getElementById('mp-join-input');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (!code || code.length !== 5) {
        document.getElementById('mp-status').innerText = 'Please enter a valid 5-character code.';
        return;
      }
      document.getElementById('mp-status').innerText = 'Connecting to match room...';
      try {
        Multiplayer.join(code);
      } catch (e) {
        document.getElementById('mp-status').innerText = `Error: ${e.message}`;
      }
    });
  }

  Bus.on(Events.MP_READY, (code) => {
    const el = document.getElementById('mp-own-code');
    if (el) el.innerText = code;
    const statusEl = document.getElementById('mp-status');
    if (statusEl) statusEl.innerText = 'Waiting for opponent to connect...';
  });

  Bus.on(Events.MP_CONNECTED, () => {
    document.getElementById('multiplayer-modal').style.display = 'none';
    Bus.emit(Events.GAME_LAUNCH, 'pongvs');
  });

  Bus.on(Events.MP_LATENCY, (ms) => {
    const el = document.getElementById('mp-latency');
    if (el) el.innerText = `Ping: ${ms} ms`;
  });

  Bus.on(Events.MP_ERROR, (err) => {
    const modal = document.getElementById('multiplayer-modal');
    if (modal && modal.style.display !== 'none') {
      const statusEl = document.getElementById('mp-status');
      if (statusEl) statusEl.innerText = `Netplay Error: ${err}`;
    }
  });

  // Category & Tab Switching
  const tabs = document.querySelectorAll('.tab:not(#toggle-crt):not(#toggle-settings)');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      Sound.playBlip();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.dataset.category;
      State.activeCategory = category;

      const hubView = document.getElementById('hub-view-container');
      const shopView = document.getElementById('shop-view-container');
      const searchBox = document.getElementById('game-search');

      if (category === 'shop') {
        if (hubView) hubView.style.display = 'none';
        if (shopView) shopView.style.display = 'flex';
        if (searchBox) searchBox.style.display = 'none';
        renderShop();
      } else {
        if (hubView) hubView.style.display = 'block';
        if (shopView) shopView.style.display = 'none';
        if (searchBox) searchBox.style.display = 'block';
        renderGrid();
      }
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

  // System Options Modal
  const settingsBtn = document.getElementById('toggle-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      Sound.playBlip();
      const modal = document.getElementById('settings-modal');
      const actionBtn = document.getElementById('btn-remap-action');
      const pauseBtn = document.getElementById('btn-remap-pause');

      if (actionBtn) actionBtn.innerText = State.controls.action === ' ' ? 'Space' : State.controls.action;
      if (pauseBtn) pauseBtn.innerText = State.controls.pause;

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

      if (actionBtn) actionBtn.onclick = () => handleRemap(actionBtn, 'action');
      if (pauseBtn) pauseBtn.onclick = () => handleRemap(pauseBtn, 'pause');

      if (modal) modal.style.display = 'flex';
    });
  }

  const closeSettingsBtn = document.getElementById('btn-close-settings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      Sound.playBlip();
      document.getElementById('settings-modal').style.display = 'none';
    });
  }

  // Profile Modal setup
  const initialsBtn = document.getElementById('ui-initials');
  const badgeBtn = document.getElementById('ui-player-badge');
  const openProfile = () => {
    Sound.playBlip();
    renderProfileModal();
    document.getElementById('achievements-modal').style.display = 'flex';
  };

  if (initialsBtn) initialsBtn.addEventListener('click', openProfile);
  if (badgeBtn) badgeBtn.addEventListener('click', openProfile);

  const closeAchBtn = document.getElementById('btn-close-achievements');
  if (closeAchBtn) {
    closeAchBtn.addEventListener('click', () => {
      document.getElementById('achievements-modal').style.display = 'none';
    });
  }

  // Initials check on first launch
  const p = Store.getPlayer();
  if (!p.profile.initials) {
    const modal = document.getElementById('initials-modal');
    if (modal) modal.style.display = 'flex';
    const saveInitBtn = document.getElementById('btn-save-initials');
    if (saveInitBtn) {
      saveInitBtn.addEventListener('click', () => {
        const input = document.getElementById('initials-input');
        const val = input ? input.value.trim().toUpperCase() : '';
        if (val.length > 0) {
          p.profile.initials = val.substring(0, 3);
          p.profile.displayName = `Pilot ${p.profile.initials}`;
          Store.savePlayer();
          if (modal) modal.style.display = 'none';
          updateUI();
          renderGrid();
        }
      });
    }
  }

  // Search box listener
  const searchInput = document.getElementById('game-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value;
      renderGrid();
    });
  }

  // Netlify Identity Auth Integration
  const authBtn = document.getElementById('ui-auth');
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => updateAuthUI(user));
    window.netlifyIdentity.on('login', user => {
      updateAuthUI(user);
      if (user && user.token) {
        State.player.token = user.token.access_token;
        Store.savePlayer();
      }
      window.netlifyIdentity.close();
    });
    window.netlifyIdentity.on('logout', () => {
      updateAuthUI(null);
      State.player.token = '';
      Store.savePlayer();
    });

    if (authBtn) {
      authBtn.addEventListener('click', () => {
        if (window.netlifyIdentity.currentUser()) {
          window.netlifyIdentity.logout();
        } else {
          window.netlifyIdentity.open();
        }
      });
    }

    window.netlifyIdentity.init();
  }

  // Daily challenge check & initial renders
  renderDailyChallenge();
  updateUI();
  renderGrid();
  fetchAllLeaderboards();

  // Reactive state listeners
  Bus.on('state:updated', ({ path }) => {
    if (path && (path.startsWith('player') || path.startsWith('activeCategory') || path.startsWith('searchQuery'))) {
      updateUI();
    }
  });
}

async function fetchAllLeaderboards() {
  const games = getAllGames();
  await Promise.all(games.map(g => Store.fetchLeaderboard(g.id)));
  renderGrid();
}

function updateSyncIndicator(status, message) {
  const el = document.getElementById('ui-sync-status');
  if (!el) return;

  el.className = `sync-status-indicator ${status}`;
  const textMap = {
    saved: '● SAVED',
    saving: '● SAVING...',
    offline: '○ OFFLINE',
    syncing: '● SYNCING',
    error: '▲ RETRY'
  };
  el.innerText = textMap[status] || '● SYNC';
  if (message) el.title = message;
}

function updateUI() {
  const coinEl = document.getElementById('ui-coin-count');
  if (coinEl) coinEl.innerText = State.player.progression.coins;

  const lvlEl = document.getElementById('ui-level');
  if (lvlEl) lvlEl.innerText = State.player.progression.level;

  const initEl = document.getElementById('ui-initials');
  if (initEl) initEl.innerText = State.player.profile.initials || 'AAA';

  // Set Marquee text with top personal best
  let hs = 0;
  const scoresObj = State.player.stats?.highScores || {};
  for (const score of Object.values(scoresObj)) {
    if (score > hs) hs = score;
  }
  const marquee = document.getElementById('marquee-content');
  if (marquee) {
    const stringBase = `INSERT COIN · HIGH SCORE: ${hs} · PILOT: ${State.player.profile.initials || 'AAA'} · `;
    marquee.innerText = stringBase.repeat(8);
  }
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('ui-auth');
  if (!authBtn) return;

  if (user) {
    authBtn.textContent = 'LOGOUT';
    authBtn.style.color = 'var(--neon-pink)';
  } else {
    authBtn.textContent = 'LOGIN';
    authBtn.style.color = 'var(--text-primary)';
  }
}

function renderDailyChallenge() {
  const container = document.getElementById('daily-challenge-container');
  if (!container) return;

  const challenge = ChallengeManager.getDailyChallenge();
  container.innerHTML = `
    <div class="challenge-banner">
      <div class="challenge-info">
        <div class="challenge-title">⭐ DAILY CHALLENGE: ${challenge.title.toUpperCase()} ${challenge.completed ? '✓ (COMPLETED)' : ''}</div>
        <div class="challenge-desc">${challenge.description}</div>
        <div class="challenge-bounty">BOUNTY: +${challenge.reward.xp} XP · +${challenge.reward.coins} 🪙</div>
      </div>
      <button class="btn-primary" id="btn-play-challenge" style="font-size:10px; padding:8px 12px;" ${challenge.completed ? 'disabled' : ''}>
        ${challenge.completed ? 'CLAIMED' : 'PLAY NOW'}
      </button>
    </div>
  `;

  const btn = document.getElementById('btn-play-challenge');
  if (btn && !challenge.completed) {
    btn.addEventListener('click', () => {
      Sound.playCoin();
      Bus.emit(Events.GAME_LAUNCH, challenge.targetGame);
    });
  }
}

function renderGrid() {
  const grid = document.getElementById('hub-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = filterGames(State.activeCategory, State.searchQuery);

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; color:var(--text-secondary); padding:40px; font-family:var(--font-arcade); font-size:12px;">NO GAMES MATCH SEARCH</div>';
    return;
  }

  filtered.forEach(game => {
    const lb = Store.getLeaderboard(game.id);
    const topScore = lb.length ? lb[0].score : 0;
    const personalBest = State.player.stats?.highScores?.[game.id] || 0;

    const card = document.createElement('div');
    card.className = 'game-card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="game-preview ${game.previewClass}">
        <div class="hover-overlay">CLICK TO PLAY</div>
        <div>${game.title}</div>
        <div class="leaderboard-peek" data-id="${game.id}" style="cursor:pointer; z-index:10;" title="Global High Score">🏆 ${topScore}</div>
      </div>
      <div class="game-info">
        <div class="info-text" style="display:flex; flex-direction:column; gap:4px; text-align:left;">
          <div class="game-title">${game.title}</div>
          <div style="font-size:10px; display:flex; justify-content:space-between; color:var(--text-secondary); gap:10px;">
            <span>${game.category.toUpperCase()}</span>
            <span style="color:var(--neon-yellow)">BEST: ${personalBest}</span>
          </div>
        </div>
        <button class="btn-insert-coin" data-id="${game.id}" tabindex="-1">INSERT COIN</button>
      </div>
    `;

    const launch = () => {
      Sound.playCoin();
      if (game.id === 'pongvs') {
        const modal = document.getElementById('multiplayer-modal');
        if (modal) {
          modal.style.display = 'flex';
          document.getElementById('mp-own-code').innerText = 'Generating...';
          document.getElementById('mp-status').innerText = 'Starting PeerJS connection...';
          Multiplayer.init();
        }
        return;
      }
      Bus.emit(Events.GAME_LAUNCH, game.id);
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

  // High score popups
  document.querySelectorAll('.leaderboard-peek').forEach(peekBtn => {
    peekBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Sound.playBlip();
      const gameId = peekBtn.dataset.id;
      const lb = Store.getLeaderboard(gameId);

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const box = document.createElement('div');
      box.className = 'modal-content';

      let html = '<h2 style="color:var(--neon-yellow); margin-top:0;">🏆 HIGH SCORES</h2><div style="margin:20px 0; font-size:12px; line-height:2;">';

      if (lb.length === 0) {
        html += '<p>NO SCORES RECORDED</p>';
      } else {
        lb.forEach((entry, i) => {
          const isMe = entry.initials === State.player.profile.initials;
          const color = isMe ? 'var(--neon-cyan)' : 'var(--text-primary)';
          html += `<div style="display:flex; justify-content:space-between; color:${color};"><span style="text-align:left;">${i + 1}. ${entry.initials}</span> <span>${entry.score}</span></div>`;
        });
      }
      html += '</div>';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn-secondary';
      closeBtn.innerText = 'CLOSE';
      closeBtn.onclick = () => overlay.remove();

      box.innerHTML = html;
      box.appendChild(closeBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  });
}

function renderShop(filter = 'all') {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const catalog = CosmeticEngine.catalog;
  const filtered = filter === 'all' ? catalog : catalog.filter(item => item.category === filter);

  const owned = State.player.inventory?.owned || [];
  const equipped = State.player.inventory?.equipped || {};

  filtered.forEach(item => {
    const isOwned = owned.includes(item.id) || item.isDefault;
    const isEquipped = equipped[item.category] === item.id;

    const card = document.createElement('div');
    card.className = `shop-card ${isEquipped ? 'equipped' : ''}`;
    card.innerHTML = `
      <div class="shop-card-header">
        <div>
          <div class="shop-item-name">${item.icon ? item.icon + ' ' : ''}${item.name}</div>
          <div class="shop-item-category">${item.category}</div>
        </div>
        ${isEquipped ? '<span class="tag-equipped">EQUIPPED</span>' : ''}
      </div>
      <div class="shop-item-desc">${item.description}</div>
      <div class="shop-card-footer">
        <div class="shop-price-tag">${item.price === 0 ? 'FREE' : item.price + ' 🪙'}</div>
        <div class="shop-actions">
          ${
            isEquipped
              ? '<button class="btn-shop-action btn-equip" disabled style="opacity:0.6;">ACTIVE</button>'
              : isOwned
              ? `<button class="btn-shop-action btn-equip" data-id="${item.id}">EQUIP</button>`
              : `<button class="btn-shop-action btn-buy" data-id="${item.id}">BUY</button>`
          }
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach purchase/equip listeners
  grid.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.id;
      btn.innerText = 'BUYING...';
      const result = await CosmeticEngine.purchaseItem(itemId);
      if (!result.success) {
        alert(result.error);
        renderShop(filter);
      }
    });
  });

  grid.querySelectorAll('.btn-equip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.id;
      await CosmeticEngine.equipItem(itemId);
    });
  });

  // Shop filter buttons
  document.querySelectorAll('.btn-shop-filter').forEach(filterBtn => {
    filterBtn.onclick = () => {
      document.querySelectorAll('.btn-shop-filter').forEach(b => {
        b.className = 'btn-secondary btn-shop-filter';
      });
      filterBtn.className = 'btn-primary btn-shop-filter';
      renderShop(filterBtn.dataset.filter);
    };
  });
}

function renderProfileModal() {
  const p = Store.getPlayer();

  document.getElementById('stat-player-id').innerText = `${p.profile.displayName} (${p.id.slice(0, 10)}...)`;
  document.getElementById('profile-level-num').innerText = p.progression.level;

  const currentLevelXp = ProgressionManager.getLevelProgress(p.progression.xp);
  document.getElementById('profile-xp-text').innerText = `${currentLevelXp} / 100 XP (Total: ${p.progression.xp})`;
  document.getElementById('stat-xp-bar').style.width = `${currentLevelXp}%`;

  document.getElementById('stat-total-games').innerText = p.stats.gamesPlayed || 0;
  const playTimeMin = Math.round((p.stats.playTime || 0) / 60);
  document.getElementById('stat-play-time').innerText = `${playTimeMin}m`;

  let mostPlayedId = '---';
  let highestCount = 0;
  for (const [gid, count] of Object.entries(p.stats.playCounts || {})) {
    if (count > highestCount) {
      highestCount = count;
      mostPlayedId = gid;
    }
  }
  const mostPlayedObj = getAllGames().find(g => g.id === mostPlayedId);
  document.getElementById('stat-most-played').innerText = mostPlayedObj ? `${mostPlayedObj.title} (${highestCount}x)` : '---';

  // Render Achievements list
  const list = document.getElementById('achievements-list');
  if (!list) return;

  list.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = p.achievements.includes(ach.id);
    const color = unlocked ? 'var(--neon-green)' : 'var(--text-muted)';
    const statusIcon = unlocked ? '✓' : '🔒';
    return `
      <div style="border-bottom:1px solid var(--color-screen); padding:6px 0; color:${color};">
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
          <span>${statusIcon} ${ach.title}</span>
          <span style="font-size:9px; color:var(--neon-yellow)">+${ach.reward.xp}XP +${ach.reward.coins}🪙</span>
        </div>
        <div style="font-size:10px; color:var(--text-secondary);">${ach.description}</div>
      </div>
    `;
  }).join('');
}

// Boot application
initHub();
