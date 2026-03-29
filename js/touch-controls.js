import { Sound } from './audio.js';

export const TouchControls = {
  container: null,
  activeKeys: new Set(),
  
  dispatchKey(key, type) {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key,
      bubbles: true
    });
    window.dispatchEvent(event);
  },

  handleTouchStart(e, key) {
    e.preventDefault();
    if (!this.activeKeys.has(key)) {
      this.activeKeys.add(key);
      this.dispatchKey(key, 'keydown');
      // Haptics & Sound for phase 1
      if (navigator.vibrate) navigator.vibrate(15);
      Sound.playBlip();
    }
  },

  handleTouchEnd(e, key) {
    e.preventDefault();
    if (this.activeKeys.has(key)) {
      this.activeKeys.delete(key);
      this.dispatchKey(key, 'keyup');
    }
  },

  renderDpad(container, legacyCallback) {
    this.container = container;

    const dpadHTML = `
      <div class="dpad">
        <div class="dpad-btn dpad-up" data-key="ArrowUp" data-dir="up">▲</div>
        <div class="dpad-btn dpad-left" data-key="ArrowLeft" data-dir="left">◀</div>
        <div class="dpad-btn dpad-right" data-key="ArrowRight" data-dir="right">▶</div>
        <div class="dpad-btn dpad-down" data-key="ArrowDown" data-dir="down">▼</div>
      </div>
    `;
    
    const existingDpad = container.querySelector('.dpad');
    if (existingDpad) existingDpad.remove();
    this.container.insertAdjacentHTML('afterbegin', dpadHTML);
    
    this.container.querySelectorAll('.dpad-btn').forEach(btn => {
      const key = btn.dataset.key;
      const dir = btn.dataset.dir;
      
      btn.addEventListener('touchstart', (e) => {
        this.handleTouchStart(e, key);
        if (legacyCallback) legacyCallback(dir); // For snake game which expects callback
      }, { passive: false });
      
      btn.addEventListener('touchend', (e) => {
        this.handleTouchEnd(e, key);
      }, { passive: false });
      
      btn.addEventListener('touchcancel', (e) => {
        this.handleTouchEnd(e, key);
      }, { passive: false });
    });
  },

  renderButtons(container, actions) {
    this.container = container;
    
    let btnContainer = container.querySelector('.action-buttons');
    if (btnContainer) btnContainer.remove();
    
    btnContainer = document.createElement('div');
    btnContainer.className = 'action-buttons';

    actions.forEach(action => {
      const btn = document.createElement('div');
      btn.className = 'action-btn';
      btn.innerText = action.label;
      const mappedKey = action.label === 'FIRE' ? ' ' : 'Enter';
      
      btn.addEventListener('touchstart', (e) => {
        this.handleTouchStart(e, mappedKey);
        if (action.handler) action.handler(); 
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        this.handleTouchEnd(e, mappedKey);
      }, { passive: false });

      btn.addEventListener('touchcancel', (e) => {
        this.handleTouchEnd(e, mappedKey);
      }, { passive: false });
      
      btnContainer.appendChild(btn);
    });

    this.container.appendChild(btnContainer);
  },

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      this.activeKeys.forEach(key => this.dispatchKey(key, 'keyup'));
      this.activeKeys.clear();
    }
  },

  show() {
    if (this.container) {
      // Always show on touch devices, or forcibly enable for testing if maxTouchPoints missing locally
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      if (isTouch) {
        this.container.style.display = 'flex';
      }
    }
  }
};
