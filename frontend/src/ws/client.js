class WSClient {
  constructor() {
    this.ws = null;
    this.authenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.listeners = {};
    this.messageQueue = [];
  }

  connect(token, onStateChange) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.onStateChange = onStateChange;

        this.ws.onopen = () => {
          console.log('WebSocket connected, authenticating...');
          this.onStateChange('connecting');
          this.send({
            type: 'auth',
            payload: { token },
          });
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          if (type === 'auth:ok') {
            this.authenticated = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.onStateChange('connected');
            this.startPing();
            this.flushQueue();
            console.log('WebSocket authenticated');
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
          console.log('WebSocket disconnected');
          this.authenticated = false;
          this.stopPing();
          this.onStateChange('disconnected');

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(
              this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
              30000
            );
            console.log(`Reconnecting in ${delay}ms...`);
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

  startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
  }
}

const client = new WSClient();
export default client;
