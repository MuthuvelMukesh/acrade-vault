import { Multiplayer, NetMessageTypes } from '../js/multiplayer.js';
import { Bus, Events } from '../js/bus.js';

describe('Multiplayer Protocol & Subsystem V2', () => {
  beforeEach(() => {
    Multiplayer.close();
    Multiplayer.sequence = 0;
  });

  it('should define all standard network message types', () => {
    expect(NetMessageTypes.HELLO).toBe('HELLO');
    expect(NetMessageTypes.INPUT).toBe('INPUT');
    expect(NetMessageTypes.STATE).toBe('STATE');
    expect(NetMessageTypes.PING).toBe('PING');
    expect(NetMessageTypes.PONG).toBe('PONG');
    expect(NetMessageTypes.GAME_OVER).toBe('GAME_OVER');
  });

  it('should send structured message envelopes over connection', () => {
    const mockSend = jest.fn();
    Multiplayer.conn = {
      open: true,
      send: mockSend,
      close: jest.fn()
    };

    Multiplayer.sendMessage(NetMessageTypes.INPUT, { dir: 1 });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    expect(sent.type).toBe('INPUT');
    expect(sent.version).toBe(1);
    expect(sent.sequence).toBe(1);
    expect(typeof sent.timestamp).toBe('number');
    expect(sent.payload.dir).toBe(1);
  });

  it('should calculate ping latency upon receiving PONG message', () => {
    let measuredLatency = null;
    Bus.on(Events.MP_LATENCY, (ms) => {
      measuredLatency = ms;
    });

    const now = Date.now();
    Multiplayer.handleIncomingMessage({
      type: NetMessageTypes.PONG,
      version: 1,
      sequence: 5,
      timestamp: now,
      payload: { clientTime: now - 40 }
    });

    expect(measuredLatency).toBeGreaterThanOrEqual(15);
  });
});
