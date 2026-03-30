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
- **6 Fully Playable Mini-Games**: Pixel Snake, Space Shooter, Block Breaker, 2048 Tiles, Memory Match, Reaction Blitz.  
- **Retro-Futurist Aesthetics**: Immersive CRT scanlines, flicker effects, custom tokens.  
  
## 🚀 Roadmap  
Phase 1 & Phase 2 are **100% Complete**! See the [DEV_LOG.md](./DEV_LOG.md) to track our feature delivery.
Next up: See [ROADMAP.md](./ROADMAP.md) for full details on Phase 3 (Real-Time Multiplayer & Executable Packaging).  
  
## 💻 Local Development  
1. Clone repo  
2. `npm install` inside the `api` folder (for serverless deps).
3. Run `netlify dev` to test the full stack (Identity, Blobs, and Functions locally). 
