import { Bus } from './bus.js';

export const Multiplayer = {
  peer: null,
  conn: null,
  isHost: false,

  init() {
    if (this.peer) return;

    // Use a random 5-character ID for easier typing
    const myId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Fallback to PeerJS free cloud servers
    this.peer = new Peer(myId);

    this.peer.on('open', (id) => {
      Bus.emit('mp:ready', id);
    });

    this.peer.on('connection', (connection) => {
      // Someone joined my game! I am the host.
      this.isHost = true;
      this.setupConnection(connection);
    });

    this.peer.on('error', (err) => {
      console.error(err);
      Bus.emit('mp:error', err.message);
    });
  },

  join(hostId) {
    this.isHost = false;
    const connection = this.peer.connect(hostId.toUpperCase());
    this.setupConnection(connection);
  },

  setupConnection(connection) {
    this.conn = connection;
    this.conn.on('open', () => {
      Bus.emit('mp:connected');
    });

    this.conn.on('data', (data) => {
      Bus.emit('mp:data', data);
    });

    this.conn.on('close', () => {
      Bus.emit('mp:disconnected');
      this.conn = null;
    });
  },

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  },

  close() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    this.isHost = false;
  }
};