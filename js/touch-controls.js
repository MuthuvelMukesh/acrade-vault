export const TouchControls = {
  container: null,
  handlers: {},
  
  renderDpad(container, onDirection) {
    this.container = container;
    this.handlers.dir = (e, dir) => {
      e.preventDefault();
      onDirection(dir);
    };

    const dpadHTML = `
      <div class="dpad">
        <div class="dpad-btn dpad-up" data-dir="up">▲</div>
        <div class="dpad-btn dpad-left" data-dir="left">◀</div>
        <div class="dpad-btn dpad-right" data-dir="right">▶</div>
        <div class="dpad-btn dpad-down" data-dir="down">▼</div>
      </div>
    `;
    
    // Will append after destroying existing
    this.container.insertAdjacentHTML('afterbegin', dpadHTML);
    
    this.container.querySelectorAll('.dpad-btn').forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', (e) => this.handlers.dir(e, dir));
    });
  },

  renderButtons(container, actions) {
    this.container = container;
    const btnContainer = document.createElement('div');
    btnContainer.className = 'action-buttons';
    
    actions.forEach(action => {
      const btn = document.createElement('div');
      btn.className = 'action-btn';
      btn.innerText = action.label;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        action.handler();
      });
      btnContainer.appendChild(btn);
    });
    
    this.container.appendChild(btnContainer);
  },

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
    }
  },

  show() {
    if (this.container && navigator.maxTouchPoints > 0) {
      this.container.style.display = 'flex';
    }
  }
};
