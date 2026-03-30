export const Bus = {
  events: {},
  on(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  },
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  },
  off(event, cb) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(f => f !== cb);
  }
};
