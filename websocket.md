# Skill: WebSocket Handler

Use this pattern whenever adding a new WebSocket event type.

## Server-side (Node.js + ws library)

```js
// backend/src/ws/index.js
const { WebSocketServer } = require('ws');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('Client connected');

    ws.on('message', async (raw) => {
      try {
        const { type, payload } = JSON.parse(raw);
        await handleMessage(ws, wss, type, payload);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: err.message } }));
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

  return wss;
}

async function handleMessage(ws, wss, type, payload) {
  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', payload: {} }));
      break;
    // ADD NEW CASES HERE
    default:
      ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown event: ${type}` } }));
  }
}

// Broadcast to all connected clients
function broadcast(wss, type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

module.exports = { setupWebSocket, broadcast };
```

## Client-side (frontend/src/ws.js)

```js
class WSClient {
  constructor(url) {
    this.url = url;
    this.handlers = {};
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (e) => {
      const { type, payload } = JSON.parse(e.data);
      if (this.handlers[type]) this.handlers[type](payload);
    };
    this.ws.onclose = () => setTimeout(() => this.connect(), 2000); // auto-reconnect
  }

  on(type, fn) { this.handlers[type] = fn; }

  send(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

export default new WSClient(`ws://${location.host}/ws`);
```

## Adding a New Event

To add a new event (e.g. `chat_message`):
1. Add a case to `handleMessage` switch in `ws/index.js`
2. Call `broadcast(wss, 'chat_message', data)` to push to all clients
3. On frontend: `ws.on('chat_message', (payload) => { /* update UI */ })`
4. To send from frontend: `ws.send('chat_message', { text: '...' })`
