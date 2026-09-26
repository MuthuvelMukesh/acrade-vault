/**
 * Centralized Cosmetic Catalog for Arcade Vault V2
 * Pure cosmetic virtual economy - strictly non-pay-to-win.
 */
const CATALOG = [
  // --- THEMES ---
  {
    id: 'theme_neon_cyber',
    category: 'theme',
    name: 'Cyber Neon',
    description: 'Classic phosphor neon glow with cybernetic accents.',
    price: 0,
    isDefault: true,
    cssClass: 'theme-neon-cyber'
  },
  {
    id: 'theme_amber_terminal',
    category: 'theme',
    name: 'Amber Terminal',
    description: 'Monochrome amber phosphor terminal warmth.',
    price: 100,
    isDefault: false,
    cssClass: 'theme-amber-terminal'
  },
  {
    id: 'theme_gameboy',
    category: 'theme',
    name: '8-Bit Monolith',
    description: 'Nostalgic 4-shade greenish retro handheld palette.',
    price: 150,
    isDefault: false,
    cssClass: 'theme-gameboy'
  },
  {
    id: 'theme_synthwave',
    category: 'theme',
    name: 'Outrun Synthwave',
    description: 'Vibrant hot magenta and sunset cyan twilight palette.',
    price: 200,
    isDefault: false,
    cssClass: 'theme-synthwave'
  },
  {
    id: 'theme_matrix',
    category: 'theme',
    name: 'The Construct',
    description: 'Deep green matrix digital rain interface.',
    price: 250,
    isDefault: false,
    cssClass: 'theme-matrix'
  },

  // --- CRT EFFECTS ---
  {
    id: 'crt_classic',
    category: 'crt',
    name: 'Classic Scanlines',
    description: 'Subtle 240p horizontal scanlines and bezel curve.',
    price: 0,
    isDefault: true,
    cssClass: 'crt-classic'
  },
  {
    id: 'crt_vhs',
    category: 'crt',
    name: 'VHS Glitch Tape',
    description: 'Retro magnetic tape distortion with tracking line jitter.',
    price: 120,
    isDefault: false,
    cssClass: 'crt-vhs'
  },
  {
    id: 'crt_phosphor',
    category: 'crt',
    name: 'High Phosphor Glow',
    description: 'Intense beam persistence with bloom highlights.',
    price: 150,
    isDefault: false,
    cssClass: 'crt-phosphor'
  },
  {
    id: 'crt_vector',
    category: 'crt',
    name: 'Vector Arcade',
    description: 'Sharp beam vector oscilloscope rendering.',
    price: 180,
    isDefault: false,
    cssClass: 'crt-vector'
  },

  // --- BADGES ---
  {
    id: 'badge_novice',
    category: 'badge',
    name: 'Vault Initiate',
    description: 'Awarded to every registered arcade player.',
    price: 0,
    isDefault: true,
    icon: '🎖️'
  },
  {
    id: 'badge_arcade_master',
    category: 'badge',
    name: 'Arcade Master',
    description: 'Display your mastery over retro gaming halls.',
    price: 200,
    isDefault: false,
    icon: '👑'
  },
  {
    id: 'badge_speedster',
    category: 'badge',
    name: 'Lightning Reflexes',
    description: 'For players whose reaction time defies physics.',
    price: 200,
    isDefault: false,
    icon: '⚡'
  },
  {
    id: 'badge_high_roller',
    category: 'badge',
    name: 'High Roller',
    description: 'Flaunt your vault wealth across the leaderboard.',
    price: 300,
    isDefault: false,
    icon: '💎'
  },
  {
    id: 'badge_retro_legend',
    category: 'badge',
    name: 'Retro Legend',
    description: 'Mythical status reserved for the most dedicated players.',
    price: 500,
    isDefault: false,
    icon: '🏆'
  },

  // --- CABINET STYLES ---
  {
    id: 'cab_standard',
    category: 'cabinet',
    name: 'Arcade Standard',
    description: 'Traditional matte black coin-op arcade housing.',
    price: 0,
    isDefault: true,
    cssClass: 'cab-standard'
  },
  {
    id: 'cab_gold',
    category: 'cabinet',
    name: 'Golden Deluxe',
    description: 'Polished gold leaf cabinet trim with neon accents.',
    price: 400,
    isDefault: false,
    cssClass: 'cab-gold'
  },
  {
    id: 'cab_carbon',
    category: 'cabinet',
    name: 'Carbon Fiber',
    description: 'Sleek matte woven carbon fiber body with red bezel.',
    price: 350,
    isDefault: false,
    cssClass: 'cab-carbon'
  }
];

function getCatalog() {
  return CATALOG;
}

function getItem(id) {
  return CATALOG.find(item => item.id === id) || null;
}

function getDefaultInventory() {
  const owned = CATALOG.filter(item => item.isDefault).map(item => item.id);
  const equipped = {};
  CATALOG.filter(item => item.isDefault).forEach(item => {
    equipped[item.category] = item.id;
  });
  return { owned, equipped };
}

module.exports = {
  CATALOG,
  getCatalog,
  getItem,
  getDefaultInventory
};
