import { SyncManager, SyncStatus } from '../js/sync.js';
import { Bus, Events } from '../js/bus.js';

describe('SyncManager Offline-First Engine V2', () => {
  beforeEach(() => {
    localStorage.clear();
    SyncManager.isOnline = true;
  });

  it('should enqueue mutations and maintain queue in storage', () => {
    SyncManager.enqueue({
      type: 'SCORE_SUBMISSION',
      gameId: 'snake',
      initials: 'XYZ',
      score: 100
    });

    const queue = SyncManager.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('SCORE_SUBMISSION');
    expect(queue[0].score).toBe(100);
  });

  it('should notify listeners of status transitions', () => {
    let currentStatus = null;
    Bus.on(Events.SYNC_STATUS, ({ status }) => {
      currentStatus = status;
    });

    SyncManager.setStatus(SyncStatus.OFFLINE);
    expect(currentStatus).toBe(SyncStatus.OFFLINE);

    SyncManager.setStatus(SyncStatus.SAVED);
    expect(currentStatus).toBe(SyncStatus.SAVED);
  });
});
