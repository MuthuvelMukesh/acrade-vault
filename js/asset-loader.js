export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.audio = new Map();
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  // Preload a single image
  loadImage(key, src) {
    this.totalAssets++;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedAssets++;
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  // Preload a single audio file (if we add external audio later)
  loadAudio(key, src) {
    this.totalAssets++;
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        // Ensure we only count loaded once
        if (!this.audio.has(key)) {
          this.loadedAssets++;
          this.audio.set(key, audio);
          resolve(audio);
        }
      };
      audio.onerror = (err) => reject(err);
      audio.src = src;
    });
  }

  getImage(key) {
    return this.images.get(key);
  }

  getAudio(key) {
    return this.audio.get(key);
  }

  getProgress() {
    if (this.totalAssets === 0) return 1;
    return this.loadedAssets / this.totalAssets;
  }
}

export const Assets = new AssetLoader();