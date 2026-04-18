# Skill: WebSocket — Chat Server

This skill covers the full WebSocket setup for the Online Chat Server. Use it whenever adding or modifying real-time features.

---

## Server setup (`backend/src/ws/index.js`)

```js
const { WebSocketServer } = require('ws');
const { validateSession } = require('../services/auth');
const presenceManager = require('./presence');
const messageHandlers = require('./handlers/messages');
const roomHandlers = require('./handlers/rooms');
const friendHandlers = require('./handlers/friends');

const clients = new Map(); // userId -> Set of ws connections

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws) => {
    ws.isAlive = true;
    ws.userId = null;

    ws.on('message', async (raw) => {
      try {
        const { type, payload } = JSON.parse(raw);

        if (type === 'auth') {
          const user = await validateSession(payload.token);
          if (!user) return ws.close(4001, 'Unauthorized');
          ws.userId = user.id;
          if (!clients.has(user.id)) clients.set(user.id, new Set());
          clients.get(user.id).add(ws);
          presenceManager.setOnline(user.id, clients);
          return;
        }

        if (!ws.userId) return ws.close(4001, 'Not authenticated');

        await dispatch(ws, wss, clients, type, payload);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: err.message } }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        clients.get(ws.userId)?.delete(ws);
        if (clients.get(ws.userId)?.size === 0) {
          clients.delete(ws.userId);
          presenceManager.setOffline(ws.userId, clients);
        }
      }
    });

    // AFK ping: client sends afk:ping every 30s; no ping for 60s → AFK
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Heartbeat check every 30s
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return { wss, clients };
}

async function dispatch(ws, wss, clients, type, payload) {
  switch (type) {
    case 'afk:ping':       return presenceManager.resetAfkTimer(ws.userId, clients);
    case 'message:send':   return messageHandlers.send(ws, clients, payload);
    case 'message:edit':   return messageHandlers.edit(ws, clients, payload);
    case 'message:delete': return messageHandlers.delete(ws, clients, payload);
    case 'typing:start':   return broadcastToRoom(clients, payload.roomId, 'typing:start', { userId: ws.userId });
    case 'typing:stop':    return broadcastToRoom(clients, payload.roomId, 'typing:stop', { userId: ws.userId });
    default:
      ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown event: ${type}` } }));
  }
}

module.exports = { setupWebSocket };
```

---

## Presence manager (`backend/src/ws/presence.js`)

```js
const db = require('../db');

const afkTimers = new Map(); // userId -> timeout

function setOnline(userId, clients) {
  clearTimeout(afkTimers.get(userId));
  broadcastPresence(userId, 'online', clients);
}

function setOffline(userId, clients) {
  clearTimeout(afkTimers.get(userId));
  broadcastPresence(userId, 'offline', clients);
}

function resetAfkTimer(userId, clients) {
  clearTimeout(afkTimers.get(userId));
  broadcastPresence(userId, 'online', clients);
  const timer = setTimeout(() => {
    broadcastPresence(userId, 'afk', clients);
  }, 60000);
  afkTimers.set(userId, timer);
}

async function broadcastPresence(userId, status, clients) {
  // Broadcast to all friends + room-mates of this user
  const peers = await db.query(
    `SELECT DISTINCT peer_id FROM (
       SELECT addressee_id AS peer_id FROM friendships WHERE requester_id=$1 AND status='accepted'
       UNION
       SELECT requester_id AS peer_id FROM friendships WHERE addressee_id=$1 AND status='accepted'
       UNION
       SELECT rm2.user_id AS peer_id FROM room_members rm1
       JOIN room_members rm2 ON rm1.room_id = rm2.room_id WHERE rm1.user_id=$1
     ) peers WHERE peer_id != $1`,
    [userId]
  );
  const msg = JSON.stringify({ type: 'presence:update', payload: { userId, status } });
  peers.rows.forEach(({ peer_id }) => {
    clients.get(peer_id)?.forEach(ws => ws.send(msg));
  });
}

module.exports = { setOnline, setOffline, resetAfkTimer };
```

---

## Broadcast helpers

```js
// Broadcast to all connections of all members of a room
async function broadcastToRoom(clients, roomId, type, payload) {
  const members = await db.query('SELECT user_id FROM room_members WHERE room_id=$1', [roomId]);
  const msg = JSON.stringify({ type, payload });
  members.rows.forEach(({ user_id }) => {
    clients.get(user_id)?.forEach(ws => ws.send(msg));
  });
}

// Send to a specific user (all their tabs)
function broadcastToUser(clients, userId, type, payload) {
  const msg = JSON.stringify({ type, payload });
  clients.get(userId)?.forEach(ws => ws.send(msg));
}
```

---

## Frontend client (`frontend/src/ws/client.js`)

```js
class ChatWS {
  constructor() {
    this.handlers = {};
    this.reconnectDelay = 1000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`ws://${location.host}/ws`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      const token = localStorage.getItem('session_token');
      this.send('auth', { token });
      this._startAfkPing();
    };

    this.ws.onmessage = (e) => {
      const { type, payload } = JSON.parse(e.data);
      this.handlers[type]?.(payload);
    };

    this.ws.onclose = () => {
      clearInterval(this._afkInterval);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
  }

  on(type, fn) { this.handlers[type] = fn; }

  send(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  _startAfkPing() {
    clearInterval(this._afkInterval);
    const resetAfk = () => this.send('afk:ping', {});
    document.addEventListener('mousemove', resetAfk, { passive: true });
    document.addEventListener('keydown', resetAfk, { passive: true });
    this._afkInterval = setInterval(resetAfk, 30000);
  }
}

export default new ChatWS();
```

---

## Adding a new real-time event

1. Add a case to the `dispatch` switch in `ws/index.js`
2. Implement handler in the appropriate `ws/handlers/` file
3. Use `broadcastToRoom` or `broadcastToUser` to push to clients
4. On the frontend: `ws.on('event:name', (payload) => { /* update React state */ })`
5. To send from frontend: `ws.send('event:name', { ...data })`

## Key event reference

| Event | Direction | Payload |
|-------|-----------|---------|
| `auth` | client→server | `{ token }` |
| `afk:ping` | client→server | `{}` |
| `message:send` | client→server | `{ roomId, content, replyToId? }` |
| `message:edit` | client→server | `{ messageId, content }` |
| `message:delete` | client→server | `{ messageId }` |
| `message:new` | server→client | `{ message, roomId }` |
| `message:edit` | server→client | `{ messageId, content, roomId }` |
| `message:delete` | server→client | `{ messageId, roomId }` |
| `presence:update` | server→client | `{ userId, status }` |
| `room:joined` | server→client | `{ roomId, userId }` |
| `room:left` | server→client | `{ roomId, userId }` |
| `room:member_banned` | server→client | `{ roomId, userId }` |
| `friend:request` | server→client | `{ fromUserId, message? }` |
| `friend:accepted` | server→client | `{ userId }` |
| `typing:start` | both | `{ roomId, userId }` |
| `typing:stop` | both | `{ roomId, userId }` |
