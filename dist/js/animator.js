export const FX = {
  coinBounce(element, amount) {
    const x = element.getBoundingClientRect().left;
    const y = element.getBoundingClientRect().top;
    const bounce = document.createElement('div');
    bounce.style.cssText = `position:fixed; left:${x}px; top:${y}px; color:var(--neon-yellow); font-family:var(--font-arcade); font-size:12px; z-index:1000; animation:coinBounce 1s forwards;`;
    bounce.innerText = `+${amount}🪙`;
    document.body.appendChild(bounce);
    setTimeout(() => bounce.remove(), 1000);
  },
  screenFlash(color, ms) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed; inset:0; background:${color}; z-index:9999; pointer-events:none; transition: opacity ${ms}ms ease-out; opacity: 0.8;`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '0');
    setTimeout(() => overlay.remove(), ms);
  },
  powerOnCRT(wrapper) {
    wrapper.classList.remove('power-on-fx');
    void wrapper.offsetWidth; // trigger reflow
    wrapper.classList.add('power-on-fx');
  },
  achievementToast(achievement) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="color:var(--neon-yellow)">🏆 ACHIEVEMENT UNLOCKED</span><br/>${achievement}`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
};
