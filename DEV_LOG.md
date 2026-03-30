# Development Tracker & Log 📜

This document serves as a chronological journal of updates, tracing our progress along the [ROADMAP.md](./ROADMAP.md) towards the final product.

---

## 🎯 Current Target
**Executing Technical Backlog (Deep Polish)**
- [x] Asset Loader
- [x] CI/CD Pipeline & Tests
- [x] State Management Refactor

---

## 📅 Chronological Log

### [v2.1.0] - State Management Framework
- **Lightweight State System**: Refactored `state.js` from a raw global mutable object into a `Proxy`-based reactive state container. Intersects gracefully with the `bus.js` emitter.
- **Global Data Binding**: Completely scrubbed one-off `updateUI()` and DOM manipulations from `hub.js` components. Event listeners automatically intercept deep proxy events (e.g., `state:updated:player.coins`) handling synchronous data injection, local `arcade_player` save bouncing, and immediate component refreshes without breaking layout loops.

### [v2.0.0] - Phase 3 Mobile App & Achievements
- **Native Android APK Initialization**: Added `@capacitor/core` and `@capacitor/cli`. Generated `/android` working directory. App can now be built entirely as a native Android or iOS application!
- **Build Pipeline**: Created locally-scoped `scripts/build.js` that pulls necessary public assets and dumps them to `/dist` to isolate native bundling from AWS Lambda files.
- **Achievements Framework Complete**: Plumbed the missing `toast-container` to `index.html` allowing `FX.achievementToast` to successfully slide in on milestones (like 50 coins or scoring 200 in Snake).

### [v1.6.0] - Technical Improvements & CI/CD Pipeline
- **Continuous Integration**: Configured `.github/workflows/ci.yml` pipeline to automatically test and lint code on push/PRs.
- **Code Quality**: Added ESLint and Prettier for strict JS styling, plus Babel for ES module compilation in Node.
- **Unit Testing**: Initialized Jest testing framework and added baseline tests for global `State` and `AssetLoader`.
- **Asset Management**: Added `js/asset-loader.js` class for robust image and audio map preloading logic.

### [v1.5.0] - Phase 2 Cloud Save States completed
- **Backend**: Added secure `GET /api/saves/:userId/:gameId` and `POST /api/saves/:userId/:gameId` routes using Netlify Blobs.
- **Frontend**: Created Pause UI modal overlay triggered by the custom `State.controls.pause` key dynamically. 
- **Game Engine**: Refactored `js/base-game.js` to intercept pause logic, introducing `exportState()` and `importState()` standard override methods for individual game engines. Updated *Snake* and *2048* logic to stringify their grids onto the backend!

### [v1.4.0] - Phase 2 User Authentication
- **Feature:** Added `netlify-identity-widget` out-of-the-box user authentication.
- **UI Adjustments:** Updated `index.html` to inject the widget script. Reconfigured `js/hub.js` top-bar logic to emit `netlifyIdentity` login/logout event hooks and dynamically display a LOGIN button without requiring custom JWT servers.

### [v1.3.0] - 2026-03-30 : Phase 2 Cloud Database (Netlify Blobs)
- **Feature:** Replaced ephemeral `/tmp/db.json` with `@netlify/blobs` for persistent serverless data storage.
- **Logic:** `api/index.js` now dynamically detects if it is running in a Netlify lambda container. If true, it automatically reads/writes Leaderboards and Player Stats directly to the Netlify Global Edge network using the Blobs SDK.
- **Support:** Maintained a local Node.js filesystem fallback for when testing offline without standard Netlify build environments.

### [v1.2.0] - 2026-03-29 : Phase 2 Initiation (Custom Controls)
- **Feature:** Added "Options" modal into the main hub UI for custom control bindings.
- **Logic:** Users can now remap the global `Action` (Fire/Select) and `Pause` buttons.
- **Integration:** Re-bound keys are dynamically injected into `touch-controls.js` (mobile) and the Gamepad API in `base-game.js` (console controllers).
- **Persistence:** Custom mappings are saved to `LocalStorage` via the `Store` module.
- **Meta:** Generated `README.md` and this `DEV_LOG.md` document.

### [v1.1.0] - 2026-03-29 : Phase 1 Completion (PWA, Audio, Haptics)
- **PWA (Offline Support):** Added `manifest.json` and a caching Service Worker (`sw.js`). The app is now installable and fully playable without an internet connection.
- **Audio Engine:** Developed a zero-dependency Web Audio API synthesizer (`js/audio.js`) that procedurally generates 8-bit sound effects (coins, blips, lasers).
- **Haptics Integration:** Piped `navigator.vibrate()` into the touch controls to provide tactile feedback on mobile devices.
- **Local Scores:** Validated and secured the `Store` architecture caching module so players don't lose high scores between offline sessions.

### [v1.0.1] - 2026-03-29 : Infrastructure Pivot & TV/Mobile Accessibility
- **Serverless Architecture:** Transitioned away from standard Node/Express (Vercel) to a Netlify serverless deployment using `netlify.toml` and `serverless-http`. 
- **Gamepad API Integration:** Built a `navigator.getGamepads()` poll loop directly into the `BaseGame` render cycle, seamlessly mapping physical Xbox/PlayStation/TV controllers to native keyboard events.
- **Advanced Touch Upgrades:** Completely refactored `touch-controls.js` to dispatch synthesized global `KeyboardEvent`s instead of hard-coded game callbacks, bridging compatibility for *all* games on mobile.
- **Viewport Hardening:** Disabled zoom & "pull-to-refresh" properties via CSS `touch-action: none` / `overscroll-behavior: none` to fix mobile layout thrashing during heavy inputs.
- **D-Pad TV Navigation:** Included `tabIndex` focus parameters to the main Arcade Hub, allowing users to scroll and select games using just a TV Remote.

### [v1.0.0] - Prior : Base Arcade Foundation
- **UI/UX Setup:** Finished retro HTML5 index framework equipped with pure CSS CRT scanline and phosphor glow effects.
- **6 Core Games Linked:** Deployed and linked Snake, Space Shooter, Block Breaker, 2048 Tiles, Memory Match, and Reaction Blitz.
- **Event Bus Pipeline:** Built an internal event emitter (`bus.js`) to handle UI state, notifications, Coin collections, and Player Exp generation concurrently off the main thread.
- **Data Store:** Implemented JSON-like player object containing initialization logic, stats, and badges."### Local High Scores Complete!"  
"- Verified localStorage state hydration for player profiles via \`js/store.js\`."  
"- Added distinct 'BEST: [score]' UI tags directly inside the game selection cards in \`js/hub.js\` to visualize local caching decoupling from Global Leaderboards." 
