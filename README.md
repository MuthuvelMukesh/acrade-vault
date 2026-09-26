# 🕹️ ARCADE VAULT V2

> **A persistent, cross-platform arcade gaming platform with progression, player identity, anti-cheat leaderboards, cloud synchronization, cosmetic economy, peer-to-peer multiplayer, offline support, and extensible game engine architecture.**

---

## 🏛️ Platform Architecture

```text
                               ARCADE VAULT V2
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
          Frontend                                         Backend
              │                                               │
      ┌───────┼──────────────┐                    ┌───────────┼───────────┐
      │       │              │                    │           │           │
    Shell   Engine        Systems                Auth        API       Storage
      │       │              │                    │           │           │
      │       │     ┌────────┴────────┐           │           │           │
      │       │     │ • State (Proxy) │           │           │           │
      │       │     │ • EventBus (V2) │           │           │           │
      │       │     │ • Audio Synth   │           │           │           │
      │       │     │ • Input/Haptics │           │           │           │
      │       │     │ • SyncManager   │           │           │           │
      │       │     │ • Progression   │           │           │           │
      │       │     │ • CosmeticEng   │           │           │           │
      │       │     │ • MultiplayerV2 │           │           │           │
      │       │     └─────────────────┘           │           │           │
      └───────┴──────────────┬────────────────────┴───────────┴───────────┘
                             │
                       Game Registry
                             │
     ┌──────────┬────────────┼────────────┬──────────┬──────────┬──────────┐
     │          │            │            │          │          │          │
   Snake     Shooter      Breaker      Tiles2048   Memory    Reaction    PongVs
```

---

## ✨ V2 Key Features & Subsystems

### 1. Game Engine V2 (`BaseGame`)
Every game conforms to a strictly enforced, predictable lifecycle:
- `init()`: Canvas initialization, bindings, and HUD configuration.
- `start()`: High-precision `requestAnimationFrame` render loop with delta time (`dt`).
- `update(dt)`: Deterministic physics and mechanics.
- `render()`: Efficient canvas rendering.
- `pause()` / `resume()`: Seamless overlay suspension and timing recovery.
- `reset()` / `destroy()`: Full resource teardown, event unbinding, and RAF cancellation.
- `exportState()` / `importState(state)`: Standardized freeze/thaw serialization for cloud saves across **all 7 games**.
- Gamepad API polling loop natively mapped to TV remotes, console gamepads, and touch screens.

### 2. Centralized Game Registry (`GameRegistry`)
Game metadata is decoupled from view controllers:
- Metadata (`id`, `title`, `category`, `description`, `previewClass`, `controls`, `supportsTouch`, `supportsMultiplayer`).
- Adding a new game only requires:
  1. Creating a `BaseGame` subclass.
  2. Registering in `GameRegistry`.
  3. No changes across unrelated files.

### 3. Server-Authoritative Player Identity V2
- Stable, cryptographically signed player identifier (`p_<id>.<sig>`).
- Supports anonymous guest players with automatic token generation.
- Bridges seamlessly with Netlify Identity OAuth JWTs (`net_<sub_id>`).
- **Backward-Compatible**: Existing local player state migrations seamlessly upgrade V1 profiles to schema version 2 without losing initials, coins, or high scores.

### 4. Anti-Cheat & Secure Leaderboards
- Mutating endpoints authoritatively validate scores against game-specific mechanics and physical limits.
- Submissions are rate-limited via sliding-window limiters to prevent replay attacks and spam.
- Strict payload boundaries and parameter sanitation.

### 5. Progression & Meta-Game Economy
- Centralized `ProgressionManager`, `RewardManager`, `AchievementManager`, and `ChallengeManager`.
- Level curve derived deterministically from XP (`Level = 1 + floor(XP / 100)`).
- Level-up coin bounties.
- Daily challenges generated deterministically based on date seed with one-click "PLAY NOW" navigation.
- Milestone achievements with bounties.

### 6. Virtual Cosmetic Economy & Shop
- **Strictly Cosmetic**: Zero pay-to-win mechanics.
- Server-authoritative inventory transactions (`POST /api/shop/purchase`, `POST /api/shop/equip`).
- Prevents negative coins, duplicate purchases, and unauthorized inventory injection.
- **Dynamic Application**:
  - **Themes**: *Cyber Neon*, *Amber Terminal*, *8-Bit Monolith (GameBoy)*, *Outrun Synthwave*, *The Construct (Matrix)*.
  - **CRT Filters**: *Classic Scanlines*, *VHS Glitch Tape*, *High Phosphor Glow*, *Vector Arcade*.
  - **Cabinets**: *Arcade Standard*, *Golden Deluxe*, *Carbon Fiber*.
  - **Player Badges**: *Vault Initiate*, *Arcade Master*, *Lightning Reflexes*, *High Roller*, *Retro Legend*.

### 7. Cloud Saves & Resilient SyncManager
- True offline-first architecture with local cache and background retry queue.
- Reconnection detection via `online`/`offline` lifecycle hooks.
- Real-time HUD status indicators: `● SAVED`, `● SAVING...`, `○ OFFLINE`, `● SYNCING`.

### 8. Multiplayer V2 Protocol
- WebRTC PeerJS architecture with structured, versioned message envelopes:
  ```json
  {
    "type": "INPUT",
    "version": 1,
    "sequence": 42,
    "timestamp": 123456789,
    "payload": { "dir": -1 }
  }
  ```
- Latency monitor with periodic PING/PONG heartbeats (displayed live in ms).
- Graceful disconnect and reconnect handling.

### 9. Multi-Tiered Offline Service Worker (`sw.js`)
- **HTML**: Network-first with offline cache fallback.
- **JS / CSS**: Cache-first for instant boot times.
- **Assets / Icons**: Stale-while-revalidate for seamless asset updates.
- **Read APIs**: Network-first with cache fallback.
- **Write APIs**: Client-side queued in `SyncManager`.

### 10. Native Android Release Packaging (Capacitor)
- Native Android shell under package `com.arcade.vault`.
- Configured with ProGuard/R8 shrinking rules for optimized APK production.
- Android hardware back-button mapped to browser history for seamless hub return.
- Tested and verified with modern JDK 21 LTS and Gradle 8.

---

## 🛠️ REST API Specification

All endpoints return a standardized JSON envelope:

### Success Response:
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and platform version | No |
| `POST` | `/api/auth/guest` | Mint an authentic signed guest player token | No |
| `GET` | `/api/auth/me` | Resolve authenticated player profile | Optional |
| `GET` | `/api/leaderboards/:gameId` | Fetch top scores for game | No |
| `POST` | `/api/leaderboards/:gameId` | Submit score with anti-cheat validation | Optional / Token |
| `GET` | `/api/player` | Get player profile, inventory, and progression | Yes (Bearer) |
| `POST` | `/api/player` | Update player callsign, preferences, stats | Yes (Bearer) |
| `GET` | `/api/saves/:gameId` | Fetch cloud save state for game | Yes (Bearer) |
| `POST` | `/api/saves/:gameId` | Authoritatively write cloud save state | Yes (Bearer) |
| `GET` | `/api/shop/catalog` | Get complete cosmetic catalog | No |
| `POST` | `/api/shop/purchase` | Authoritatively purchase cosmetic item | Yes (Bearer) |
| `POST` | `/api/shop/equip` | Equip owned cosmetic theme/filter/badge | Yes (Bearer) |
| `POST` | `/api/progression/reward` | Authoritatively claim XP and coin bounties | Yes (Bearer) |

---

## 💻 Local Development

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/MuthuvelMukesh/acrade-vault.git
cd acrade-vault

# Install root dependencies
npm install

# Install API serverless dependencies
cd api && npm install && cd ..
```

### 2. Testing & Quality Checks
```bash
# Run unit, integration, and API test suites
npm test

# Run ESLint validation
npm run lint

# Run code formatter
npm run format
```

### 3. Running Locally
```bash
# Run local development server
npm start
# Server boots at http://localhost:3000
```

### 4. Production Web Build
```bash
# Compile and bundle static assets to /dist
npm run build
```

### 5. Native Android Build
```bash
# Synchronize web assets to Capacitor Android project
npm run build:mobile

# Compile native Android APK using Gradle
cd android
./gradlew assembleDebug
# Generates: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🎮 Included Games
1. **Pixel Snake** (`classic`): Retro slither arcade with progressive speed scaling and golden apples.
2. **Space Shooter** (`action`): Vertical scrolling shmup with alien scout waves and mothership boss encounters.
3. **Block Breaker** (`action`): Paddle ball deflection with multi-hit and gold bricks across escalating levels.
4. **2048 Tiles** (`puzzle`): Cybernetic number grid sliding and tile merging.
5. **Memory Match** (`puzzle`): Cyber card memory challenge with move tracking.
6. **Reaction Blitz** (`action`): Millisecond reflex twitch benchmark.
7. **Pong Versus** (`multiplayer`): Low-latency WebRTC P2P head-to-head pong.

---

## 🔒 Security Summary
- Authentication derived securely from verified tokens.
- Server-authoritative economy preventing client-side coin/inventory manipulation.
- Anti-cheat score bounds and rate-limiting per game.
- Ownership-enforced save states.
- Sanitized input and structured error responses.
- Safe CORS policy with request-size caps (64KB).

---

## 📜 License
Arcade Vault V2 is open-source under the ISC License.
