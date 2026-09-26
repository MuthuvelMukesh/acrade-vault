/**
 * Arcade Vault V2 Cosmetic & Customization Engine
 * Applies active themes, CRT filters, cabinet styles, and badges to the DOM.
 */

import { State } from './state.js';
import { Bus, Events } from './bus.js';

export const CosmeticEngine = {
  catalog: [],

  async init() {
    await this.fetchCatalog();
    this.applyEquipped();

    Bus.on('state:updated:player.inventory.equipped', () => {
      this.applyEquipped();
    });

    Bus.on('state:updated', ({ path }) => {
      if (path && path.startsWith('player.inventory')) {
        this.applyEquipped();
      }
    });
  },

  async fetchCatalog() {
    try {
      const res = await fetch('/api/shop/catalog');
      if (res.ok) {
        const body = await res.json();
        this.catalog = body.data || [];
        return this.catalog;
      }
    } catch (e) {
      console.warn('Failed to fetch online cosmetic catalog, using offline fallback:', e.message);
    }

    // Offline fallback catalog
    this.catalog = [
      { id: 'theme_neon_cyber', category: 'theme', name: 'Cyber Neon', price: 0, isDefault: true },
      { id: 'theme_amber_terminal', category: 'theme', name: 'Amber Terminal', price: 100, isDefault: false },
      { id: 'theme_gameboy', category: 'theme', name: '8-Bit Monolith', price: 150, isDefault: false },
      { id: 'theme_synthwave', category: 'theme', name: 'Outrun Synthwave', price: 200, isDefault: false },
      { id: 'theme_matrix', category: 'theme', name: 'The Construct', price: 250, isDefault: false },
      { id: 'crt_classic', category: 'crt', name: 'Classic Scanlines', price: 0, isDefault: true },
      { id: 'crt_vhs', category: 'crt', name: 'VHS Glitch Tape', price: 120, isDefault: false },
      { id: 'crt_phosphor', category: 'crt', name: 'High Phosphor Glow', price: 150, isDefault: false },
      { id: 'badge_novice', category: 'badge', name: 'Vault Initiate', price: 0, isDefault: true, icon: '🎖️' },
      { id: 'badge_arcade_master', category: 'badge', name: 'Arcade Master', price: 200, isDefault: false, icon: '👑' },
      { id: 'cab_standard', category: 'cabinet', name: 'Arcade Standard', price: 0, isDefault: true },
      { id: 'cab_gold', category: 'cabinet', name: 'Golden Deluxe', price: 400, isDefault: false }
    ];
    return this.catalog;
  },

  applyEquipped() {
    const equipped = State.player?.inventory?.equipped || {};

    // 1. Apply Theme
    const activeTheme = equipped.theme || 'theme_neon_cyber';
    document.body.classList.remove(
      'theme-neon-cyber',
      'theme-amber-terminal',
      'theme-gameboy',
      'theme-synthwave',
      'theme-matrix'
    );
    document.body.classList.add(activeTheme.replace('_', '-'));

    // 2. Apply CRT Filter
    const activeCrt = equipped.crt || 'crt_classic';
    document.body.classList.remove('crt-classic', 'crt-vhs', 'crt-phosphor', 'crt-vector');
    document.body.classList.add(activeCrt.replace('_', '-'));

    // 3. Apply Cabinet Style
    const activeCab = equipped.cabinet || 'cab_standard';
    document.body.classList.remove('cab-standard', 'cab-gold', 'cab-carbon');
    document.body.classList.add(activeCab.replace('_', '-'));

    // 4. Update Badge UI in top bar
    const badgeEl = document.getElementById('ui-player-badge');
    if (badgeEl) {
      const activeBadge = this.catalog.find(i => i.id === equipped.badge);
      badgeEl.innerText = activeBadge?.icon || '🎖️';
      badgeEl.title = `Badge: ${activeBadge?.name || 'Initiate'}`;
    }
  },

  async purchaseItem(itemId) {
    const item = this.catalog.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    const owned = State.player.inventory.owned || [];
    if (owned.includes(itemId)) {
      return { success: false, error: 'Item is already owned' };
    }

    if (State.player.progression.coins < item.price) {
      return { success: false, error: `Need ${item.price} coins (you have ${State.player.progression.coins})` };
    }

    // Try server purchase
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (State.player.token) headers['Authorization'] = `Bearer ${State.player.token}`;

      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId })
      });

      if (res.ok) {
        const body = await res.json();
        State.player.progression.coins = body.data.remainingCoins;
        State.player.inventory = body.data.inventory;
        Bus.emit(Events.ITEM_PURCHASED, item);
        return { success: true, item };
      }
    } catch (_e) {
      // Offline fallback purchase
    }

    // Local optimistic purchase if server unavailable
    State.player.progression.coins -= item.price;
    State.player.inventory.owned.push(item.id);
    Bus.emit(Events.ITEM_PURCHASED, item);
    return { success: true, item };
  },

  async equipItem(itemId) {
    const item = this.catalog.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    const owned = State.player.inventory.owned || [];
    if (!owned.includes(itemId) && !item.isDefault) {
      return { success: false, error: 'Item not owned' };
    }

    // Try server equip
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (State.player.token) headers['Authorization'] = `Bearer ${State.player.token}`;

      await fetch('/api/shop/equip', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId })
      });
    } catch (_e) {
      // Offline fallback
    }

    State.player.inventory.equipped[item.category] = itemId;
    this.applyEquipped();
    Bus.emit(Events.ITEM_EQUIPPED, item);
    return { success: true, item };
  }
};
