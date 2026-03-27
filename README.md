# 🕹️ Arcade Vault

Arcade Vault is a fully interactive, production-quality mini browser games hub. Designed with a retro-futurist arcade cabinet aesthetic, it features 6 fully playable HTML5 mini-games built with pure Vanilla JavaScript, CSS, and HTML.

## ✨ Features

- **6 Fully Playable Mini-Games**:
  - 🐍 **Pixel Snake**: Classic grid-based snake with golden apples.
  - 💥 **Space Shooter**: Vertical space scroller with enemy waves and bosses.
  - 🧱 **Block Breaker**: Brick-breaking physics with progressive difficulty.
  - 🧩 **2048 Tiles**: The addictive grid-sliding math puzzle.
  - 🃏 **Memory Match**: Card flipping memory game.
  - ⚡ **Reaction Blitz**: Multi-stage reflex testing game.
- **Retro-Futurist Aesthetics**: Immersive CRT scanlines, flicker effects, phosphor neon styling, and a dynamic marquee.
- **Persistent Progression Engine**: Maintains your high scores, total coins, and unlocked achievements via a Node.js JSON backend + LocalStorage.
- **Coin Economy**: Earn coins by playing games.
- **Accessibility & Responsiveness**: 
  - Dynamic on-screen D-Pad and Action buttons for mobile touch devices.
  - Screen-reader support with hidden ARIA-live regions.
  - WCAG-compliant contrast and focus rings.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)

### Installation & Running

1. Clone the repository:
   ```bash
   git clone https://github.com/MuthuvelMukesh/acrade-vault.git
   cd acrade-vault
   ```

2. Install dependencies (for the backend server):
   ```bash
   npm install
   ```

3. Start the local server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   **[http://localhost:3001](http://localhost:3001)**

## 🛠️ Tech Stack

- **Frontend**: HTML5 Canvas, CSS3 Custom Properties, Vanilla JavaScript (ES Modules).
- **Backend**: Node.js, Express.js (JSON-based persistence).
- **Architecture**: Singleton State management, Custom Event Bus architecture, OOP Game inheritance (`BaseGame`).
