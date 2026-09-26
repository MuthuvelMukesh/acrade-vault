/**
 * Arcade Vault V2 Multiplayer Subsystem
 * Reusable P2P WebRTC / PeerJS architecture with structured protocol, ping/latency, and reconnect handling.
 */

import { Bus, Events } from './bus.js';

export const NetMessageTypes = {
  HELLO: 'HELLO',
  READY: 'READY',
  START: 'START',
  INPUT: 'INPUT',
  STATE: 'STATE',
  PING: 'PING',
  PONG: 'PONG',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  GAME_OVER: 'GAME_OVER',
  REMATCH: 'REMATCH',
  LEAVE: 'LEAVE',
  ERROR: 'ERROR'
};

export const LobbyState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
  CONNECTED: 'CONNECTED',
  READY: 'READY',
  IN_GAME: 'IN_GAME'
};

export const Multiplayer = {
  peer: null,
  conn: null,
  isHost: false,
  roomCode: null,
  state: LobbyState.DISCONNECTED,
  sequence: 0,
  latency: 0,
  pingTimer: null,
  lastPingTime: 0,
  reconnectAttempts: 0,

  init() {
    if (this.peer && !this.peer.destroyed) {
      if (this.peer.id) {
        this.roomCode = this.peer.id;
        Bus.emit(Events.MP_READY, this.roomCode);
      }
      return;
    }

    this.state = LobbyState.CONNECTING;
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    try {
      this.peer = new Peer(`vault_${roomCode}`);
    } catch (_e) {
      this.peer = new Peer();
    }

    this.peer.on('open', (id) => {
      this.roomCode = id.replace('vault_', '');
      this.state = LobbyState.WAITING_FOR_OPPONENT;
      Bus.emit(Events.MP_READY, this.roomCode);
    });

    this.peer.on('connection', (connection) => {
      this.isHost = true;
      this.setupConnection(connection);
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS connection error:', err.message);
      this.state = LobbyState.DISCONNECTED;
      Bus.emit(Events.MP_ERROR, err.message);
    });
  },

  join(targetCode) {
    if (!this.peer) this.init();

    const normalizedCode = targetCode.toUpperCase().trim();
    const fullPeerId = `vault_${normalizedCode}`;

    this.isHost = false;
    this.state = LobbyState.CONNECTING;

    const connection = this.peer.connect(fullPeerId, {
      reliable: true
    });

    this.setupConnection(connection);
  },

  setupConnection(connection) {
    this.conn = connection;

    this.conn.on('open', () => {
      this.state = LobbyState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      // Handshake
      this.sendMessage(NetMessageTypes.HELLO, { isHost: this.isHost });
      Bus.emit(Events.MP_CONNECTED, { isHost: this.isHost });
    });

    this.conn.on('data', (raw) => {
      this.handleIncomingMessage(raw);
    });

    this.conn.on('close', () => {
      this.handleDisconnect();
    });

    this.conn.on('error', (err) => {
      console.warn('Data connection error:', err.message);
      Bus.emit(Events.MP_ERROR, err.message);
    });
  },

  sendMessage(type, payload = {}) {
    if (!this.conn || !this.conn.open) return;

    this.sequence++;
    const message = {
      type,
      version: 1,
      sequence: this.sequence,
      timestamp: Date.now(),
      payload
    };

    try {
      this.conn.send(message);
    } catch (e) {
      console.warn('Error sending net message:', e.message);
    }
  },

  handleIncomingMessage(data) {
    if (!data || typeof data !== 'object') return;

    // Validate protocol envelope
    const { type, payload } = data;
    if (!type || !NetMessageTypes[type]) return;

    // Handle internal protocol messages
    if (type === NetMessageTypes.PING) {
      this.sendMessage(NetMessageTypes.PONG, { clientTime: data.timestamp });
      return;
    }

    if (type === NetMessageTypes.PONG) {
      if (payload && payload.clientTime) {
        this.latency = Math.max(1, Math.round((Date.now() - payload.clientTime) / 2));
        Bus.emit(Events.MP_LATENCY, this.latency);
      }
      return;
    }

    // Forward to game listeners (backward compatible payload unpacking)
    Bus.emit(Events.MP_DATA, {
      type: payload.type || type.toLowerCase(),
      ...payload
    });
  },

  startHeartbeat() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.lastPingTime = Date.now();
        this.sendMessage(NetMessageTypes.PING);
      }
    }, 2000);
  },

  stopHeartbeat() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  },

  handleDisconnect() {
    this.stopHeartbeat();
    this.state = LobbyState.DISCONNECTED;
    Bus.emit(Events.MP_DISCONNECTED);
    this.conn = null;
  },

  send(data) {
    // Backward compatibility helper for pong-vs.js
    if (data.type) {
      const type = data.type.toUpperCase();
      this.sendMessage(NetMessageTypes[type] || NetMessageTypes.INPUT, data);
    } else {
      this.sendMessage(NetMessageTypes.INPUT, data);
    }
  },

  close() {
    this.stopHeartbeat();
    if (this.conn) {
      this.sendMessage(NetMessageTypes.LEAVE);
      if (typeof this.conn.close === 'function') {
        this.conn.close();
      }
      this.conn = null;
    }
    this.state = LobbyState.DISCONNECTED;
    this.isHost = false;
  }
};