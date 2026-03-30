# 🕹️ Arcade Vault  
  
Arcade Vault is a cross-platform HTML5 retro arcade platform with PWA support, serverless backend, and native mobile/TV controller integration.  
  
## ✨ Features  
- **Mobile/TV Optimized**: Native Gamepad API, multi-touch virtual D-Pad, haptic vibration feedback, and custom TV-remote focus states.  
- **PWA Ready**: Works offline with a fully cached Service Worker and installable manifest.json.  
- **8-Bit Audio**: In-browser Web Audio synth for retro sound effects.  
- **Custom Controls**: Dynamically remap your keyboard layout directly in the UI options menu.
- **Serverless Cloud Edge Backend**: Powered by Netlify Edge and Netlify Blobs for persistent, fast storage.
- **Global Leaderboards & Auth**: Out-of-the-box Netlify Identity user accounts with global highest scores synchronized across devices.
- **Cloud Save States**: Pause any game, freeze it into JSON, and sync it to your cloud profile to resume later anywhere!
- **Achievements & Trophies**: Earn badges like `COIN_HOARDER` or `SNAKE_CHARMER` with native toast alerts that track via player state over time.
- **Real-Time P2P Multiplayer**: No dedicated websocket servers needed. Uses `PeerJS` (WebRTC) to bridge two clients using 5-digit room codes for latency-free netplay directly in the browser. 
- **Android Native App Version**: Ships with `@capacitor/core` and an `/android` folder setup to export straight to an APK. 
- **7 Fully Playable Mini-Games**: Pixel Snake, Space Shooter, Block Breaker, 2048 Tiles, Memory Match, Reaction Blitz, **and Pong Versus** (Netplay).  
- **Retro-Futurist Aesthetics**: Immersive CRT scanlines, flicker effects, custom tokens.  
  
## 🚀 Roadmap  
Phase 1, Phase 2, and Phase 3 are **100% Complete**! 
The project now includes full Mobile Native support, Auth, Cloud Saves, CI/CD Testing, and Real-Time Multiplayer.
See the [DEV_LOG.md](./DEV_LOG.md) to track our feature delivery.
  
## 💻 Local Development  
1. Clone repo  
2. `npm install` inside the root and `api` folder.
3. Run `netlify dev` to test the full stack (Identity, Blobs, and Functions locally).

### 📱 Build Mobile App
You can natively package this web application using modern Capacitor scripts:
1. `npm run build:mobile` (Compiles static assets to `/dist`)
2. `npx cap open android` (Opens Android Studio) 
