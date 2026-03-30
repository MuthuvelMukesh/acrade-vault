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
- **~~Local High Scores:~~** Implement `localStorage` caching so users don't lose their best scores when they close the browser. *(Done)*
- **~~New Games:~~** Add 2-3 new classic game clones (e.g., Tetris, Breakout, or Pac-Man) using the existing `base-game.js` boilerplate. *(Done - We have 7 distinct games)*
- **~~Sound & Haptics:~~** Add an Audio engine (`Howler.js` or native Web Audio API) for 8-bit sound effects. Add Mobile device vibration API for button presses and collisions. *(Done - Web Audio API & `navigator.vibrate()` implemented)*

### Phase 2: Medium-Term (3-6 Months) - "Community & Cloud"
- **~~Global Leaderboards:~~** Utilize our Netlify Functions (`api/index.js`) hooked to a lightweight database (like Supabase, Firebase, or MongoDB) to store and fetch top 10 global scores. *(Done - Netlify Blobs)*
- **~~User Authentication:~~** Simple login system (e.g., Google/GitHub OAuth) to track player progress across multiple devices (Mobile to TV). *(Done - Netlify Identity Widget)*
- **~~Customizable Controls:~~** Allow users to remap keyboard keys or Gamepad buttons in an options menu. *(Done)*
- **~~Save States:~~** Allow users to pause and save their exact game state in the cloud. *(Done - Integrated with Netlify Blobs & Netlify Identity)*

### Phase 3: Long-Term (6+ Months) - "Expansion & Multiplayer"
- **~~Real-Time Multiplayer:~~** Introduce WebSockets/Socket.io to allow head-to-head network play (e.g., Pong-Vs or Co-op Snake). *(Done - WebRTC/PeerJS P2P)*
- **~~Achievements & Trophies System:~~** Unlockable badges for reaching certain milestones in different games. *(Done - Integrated `store.js` engine + Toast Modals)*
- **~~Native App Packaging:~~** Use tools like Capacitor or Tauri to wrap the web app into a native `.apk` (Android) or Windows executable to distribute on app stores. *(Done - `@capacitor/core` initialized w/ `build:mobile` script)*

### Phase 4: The Meta-Game & Player Economy (Next Up)
- **Virtual Currency Store:** Provide a marketplace where players can spend `State.player.coins` earned in-game to purchase custom Hub UI themes, neon color palettes, or unique background CRT overlays.
- **User-Generated Content (Level Editor):** Implement an in-browser visual grid editor for "Block Breaker" (or other spatial games). Save these custom tile maps to Netlify Blobs so players can share 5-digit level codes with friends.
- **AI Competitors:** Train basic offline AI bots for "Pong-Vs" to dynamically scale difficulty depending on the player's active win streak.

### Phase 5: Deep Social Integration (Future Vision)
- **Persistent Lobbies & Matchmaking:** Shift from manual 5-digit room codes to a dedicated lobby matchmaking queue utilizing a serverless Redis/Supabase backplane. 
- **Friends Lists & Presence:** Allow authenticated users to add each other and see an active "Online/In-Game" status indicator on the Hub UI via WebSocket or server-sent events polling.
- **Ghost Data Racing:** Allow players to download the "Ghost Data" of the #1 Global Leaderboard player for specific games (like fastest Reaction Blitz time) and visually compete against them locally.
- **Freemium Tier Integration:** Keep all core games completely free forever. Introduce an optional "Vault Pass" (Premium) that provides an completely ad-free experience, unique neon cosmetic UI unlocks, and expanded cloud-save capacities.

---

## 🛠️ Technical Future Improvements (Developer Backlog)

1. **~~Asset Management & Preloading:~~** *(Done - `AssetLoader` class implemented for scalable pre-fetching)*
   - Create an asset loader that pre-fetches all images/sprites and audio files before the hub loads, avoiding missing frames during initial gameplay.
   - Combine isolated images into Sprite Sheets to reduce HTTP requests.
2. **~~State Management Refactor:~~** *(Done - Deep reactive Proxy store implemented over the `Bus` emitter)*
   - Move away from raw global variables and DOM manipulation, possibly integrating a lightweight state manager if the application's complexity scales.
3. **Advanced Rendering:**
   - If games become more graphically intense, migrate from `Canvas 2D API` to `WebGL` (using PixiJS or Three.js) for hardware-accelerated 60fps locking on lower-end TVs.
4. **~~Testing Pipeline:~~** *(Done - Jest initialized with baseline unit tests)*
   - Introduce Unit tests (Jest) for game physics/logic and E2E visual tests (Cypress/Playwright) to ensure controllers don't break during architectural updates.
5. **~~Continuous Integration (CI/CD):~~** *(Done - GitHub Actions Pipeline & ESLint/Prettier configured)*
   - Add GitHub Actions to automate Netlify builds, run linting (ESLint/Prettier), and execute tests before pushing to production.
6. **Freemium Architecture & Entitlements:**
   - **Role-Based Access Control (RBAC):** Extend Netlify Identity to issue JWT metadata containing user tiers (Free vs. Premium). Guarantee that core gameplay routes remain unlocked and open to the public without paywalls.
   - **Dynamic Ad Sub-System:** Implement lazy-loaded ad modules (e.g., Capacitor AdMob for native, web banners for desktop) that are conditionally initialized. Premium users should completely bypass ad-tracking scripts to save bandwidth.
   - **Server-Side Validation:** Authoritatively validate purchases or unlocks for custom Hub UI themes and premium VIP features via Netlify Functions, preventing malicious clients from spoofing their "Premium" account status.
