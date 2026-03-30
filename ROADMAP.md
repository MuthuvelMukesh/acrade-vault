# Arcade Vault - Product Plan & Roadmap

This document outlines the product strategy, upcoming features, and technical improvements planned for **Arcade Vault**. 

## 🚀 Current State
- **Core Engine:** HTML5 Canvas based games with a universal underlying game loop (`base-game.js`).
- **Infrastructure:** Serverless architecture optimized for Netlify deployments (`netlify.toml` / AWS Lambda).
- **Controls & Accessibility:** Global support for keyboard, multi-touch mobile screens (virtual D-Pad), and TV Remotes / Bluetooth Controllers (Gamepad API).

---

## 📅 Product Plan

### Phase 1: Short-Term (1-3 Months) - "Retention & Polish"
- **~~Progressive Web App (PWA):~~** Add a `manifest.json` and Service Workers to allow users to "Install" the app on their phone/TV and play offline. *(Done)*
- **Local High Scores:** Implement `localStorage` caching so users don't lose their best scores when they close the browser.
- **New Games:** Add 2-3 new classic game clones (e.g., Tetris, Breakout, or Pac-Man) using the existing `base-game.js` boilerplate.
- **Sound & Haptics:** Add an Audio engine (`Howler.js` or native Web Audio API) for 8-bit sound effects. Add Mobile device vibration API for button presses and collisions.

### Phase 2: Medium-Term (3-6 Months) - "Community & Cloud"
- **~~Global Leaderboards:~~** Utilize our Netlify Functions (`api/index.js`) hooked to a lightweight database (like Supabase, Firebase, or MongoDB) to store and fetch top 10 global scores. *(Done - Netlify Blobs)*
- **~~User Authentication:~~** Simple login system (e.g., Google/GitHub OAuth) to track player progress across multiple devices (Mobile to TV). *(Done - Netlify Identity Widget)*
- **~~Customizable Controls:~~** Allow users to remap keyboard keys or Gamepad buttons in an options menu. *(Done)*
- **~~Save States:~~** Allow users to pause and save their exact game state in the cloud. *(Done - Integrated with Netlify Blobs & Netlify Identity)*

### Phase 3: Long-Term (6+ Months) - "Expansion & Multiplayer"
- **~~Real-Time Multiplayer:~~** Introduce WebSockets/Socket.io to allow head-to-head network play (e.g., Pong-Vs or Co-op Snake). *(Done - WebRTC/PeerJS P2P)*
- **~~Achievements & Trophies System:~~** Unlockable badges for reaching certain milestones in different games. *(Done - Integrated `store.js` engine + Toast Modals)*
- **~~Native App Packaging:~~** Use tools like Capacitor or Tauri to wrap the web app into a native `.apk` (Android) or Windows executable to distribute on app stores. *(Done - `@capacitor/core` initialized w/ `build:mobile` script)*
- **Monetization (Optional):** Unobtrusive banner ads on the main hub, or a "Premium" tier unlocking custom game themes and color palettes.

---

## 🛠️ Technical Future Improvements (Developer Backlog)

1. **~~Asset Management & Preloading:~~** *(Done - `AssetLoader` class implemented for scalable pre-fetching)*
   - Create an asset loader that pre-fetches all images/sprites and audio files before the hub loads, avoiding missing frames during initial gameplay.
   - Combine isolated images into Sprite Sheets to reduce HTTP requests.
2. **State Management Refactor:**
   - Move away from raw global variables and DOM manipulation, possibly integrating a lightweight state manager if the application's complexity scales.
3. **Advanced Rendering:**
   - If games become more graphically intense, migrate from `Canvas 2D API` to `WebGL` (using PixiJS or Three.js) for hardware-accelerated 60fps locking on lower-end TVs.
4. **~~Testing Pipeline:~~** *(Done - Jest initialized with baseline unit tests)*
   - Introduce Unit tests (Jest) for game physics/logic and E2E visual tests (Cypress/Playwright) to ensure controllers don't break during architectural updates.
5. **~~Continuous Integration (CI/CD):~~** *(Done - GitHub Actions Pipeline & ESLint/Prettier configured)*
   - Add GitHub Actions to automate Netlify builds, run linting (ESLint/Prettier), and execute tests before pushing to production.
