class WSClient {
  constructor() {
    this.ws = null;
    this.authenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.listeners = {};
    this.messageQueue = [];
    this.lastActivityPing = 0;
    this.activityHandler = null;
    this.visibilityHandler = null;

    // Active chat subscriptions so we can fire gap-sync requests after a
    // reconnect. Key: `room:<id>` or `dialog:<id>`. Value: `{ kind, id, getLastId }`
    // where `getLastId()` returns the highest message id the component has
    // locally, or 0 if none yet.
    this.subscriptions = new Map();
    // Flip to true after the first successful auth so we can distinguish
    // fresh connect (no sync needed, history fetch handles it) from
    // reconnect (must sync to close message gaps).
    this.hasConnectedBefore = false;
  }

  subscribeRoom(roomId, getLastId) {
    const key = `room:${roomId}`;
    this.subscriptions.set(key, { kind: 'room', id: roomId, getLastId });
    return () => this.subscriptions.delete(key);
  }

  subscribeDialog(dialogId, getLastId) {
    const key = `dialog:${dialogId}`;
    this.subscriptions.set(key, { kind: 'dialog', id: dialogId, getLastId });
    return () => this.subscriptions.delete(key);
  }

  requestSyncForAllSubscriptions() {
    for (const sub of this.subscriptions.values()) {
      const afterId = Number(sub.getLastId?.() || 0);
      const payload = sub.kind === 'room'
        ? { roomId: sub.id, afterId }
        : { dialogId: sub.id, afterId };
      this.send({ type: 'sync', payload });
    }
  }

  connect(token, onStateChange) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.onStateChange = onStateChange;

        this.ws.onopen = () => {
          this.onStateChange('connecting');
          // Bypass the authenticated-only gate in send(): the auth message
          // itself must go through before authenticated is ever true.
          this.ws.send(JSON.stringify({
            type: 'auth',
            payload: { token },
          }));
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          if (type === 'auth:ok') {
            const wasReconnect = this.hasConnectedBefore;
            this.authenticated = true;
            this.hasConnectedBefore = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.onStateChange('connected');
            this.startActivityTracking();
            this.flushQueue();
            if (wasReconnect) {
              this.requestSyncForAllSubscriptions();
            }
            resolve();
          } else if (type === 'auth:error') {
            this.onStateChange('disconnected');
            reject(new Error(payload.error));
          } else if (type === 'pong') {
            // Ignore pongs
          } else {
            this.emit(type, payload);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onStateChange('disconnected');
        };

        this.ws.onclose = () => {
          this.authenticated = false;
          this.stopActivityTracking();
          this.onStateChange('disconnected');

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(
              this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
              30000
            );
            setTimeout(() => {
              this.connect(token, onStateChange).catch((err) => {
                console.error('Reconnection failed:', err);
              });
            }, delay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message) {
    if (this.authenticated && this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    } else if (this.authenticated) {
      this.messageQueue.push(message);
    }
  }

  flushQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // User-activity-driven "I'm still here" signal.
  // Sends a ping only when the user actually interacts with the page,
  // debounced to at most once per ACTIVITY_DEBOUNCE_MS so we don't spam.
  startActivityTracking() {
    this.stopActivityTracking();

    const ACTIVITY_DEBOUNCE_MS = 5000;
    const sendActivity = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - this.lastActivityPing < ACTIVITY_DEBOUNCE_MS) return;
      this.lastActivityPing = now;
      this.send({ type: 'ping' });
    };

    this.activityHandler = sendActivity;
    this.visibilityHandler = () => {
      if (!document.hidden) sendActivity();
    };

    // Seed an initial ping so we mark online immediately on connect.
    sendActivity();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    for (const ev of events) {
      window.addEventListener(ev, this.activityHandler, { passive: true });
    }
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  stopActivityTracking() {
    if (this.activityHandler) {
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      for (const ev of events) {
        window.removeEventListener(ev, this.activityHandler);
      }
      this.activityHandler = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  off(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
    }
  }

  emit(type, payload) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((callback) => {
        callback(payload);
      });
    }
  }

  disconnect() {
    this.stopActivityTracking();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
  }
}

const client = new WSClient();

// Debug / integration-test hook: the singleton holds no sensitive state
// (auth is cookie-based and already page-scoped) but it's the only way
// for Playwright tests to simulate a transient WS drop and verify the
// reconnect gap-sync behaviour.
if (typeof window !== 'undefined') {
  window.__wsClient = client;
}

export default client;
