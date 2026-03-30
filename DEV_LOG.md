# Development Tracker & Log 📜

This document serves as a chronological journal of updates, tracing our progress along the [ROADMAP.md](./ROADMAP.md) towards the final product.

---

## 🎯 Current Target
**Executing Phase 2 (Community & Cloud)**
- [x] Custom Controls (Remapping UI & logic)
- [x] Global Leaderboards (Connecting Netlify Blobs key-value cloud store)
- [ ] User Authentication & Profiles (OAuth integration)
- [ ] Cloud Save States

---

## 📅 Chronological Log

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
- **Data Store:** Implemented JSON-like player object containing initialization logic, stats, and badges.