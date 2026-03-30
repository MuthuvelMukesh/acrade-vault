import { State } from '../js/state.js';

describe('State Management', () => {
  it('should initialize with default values', () => {
    expect(State.view).toBe('hub');
    expect(State.activeCategory).toBe('all');
    expect(State.player.coins).toBe(0);
    expect(State.controls.action).toBe(' ');
  });
});