import { AssetLoader } from '../js/asset-loader.js';

describe('AssetLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new AssetLoader();
  });

  it('should initialize empty', () => {
    expect(loader.totalAssets).toBe(0);
    expect(loader.getProgress()).toBe(1);
  });
});