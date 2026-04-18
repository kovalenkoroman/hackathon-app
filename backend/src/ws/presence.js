// Tracks active connections per user per tab
// Maps: userId -> { tabId -> { ws, lastPing } }
const connections = new Map();

// Maps: userId -> { status: 'online'|'afk'|'offline', lastUpdate: timestamp }
const presence = new Map();

const AFK_TIMEOUT = 60000; // 60 seconds

export function addConnection(userId, tabId, ws) {
  if (!connections.has(userId)) {
    connections.set(userId, new Map());
  }
  connections.get(userId).set(tabId, {
    ws,
    lastPing: Date.now(),
  });

  updatePresence(userId, 'online');
}

export function removeConnection(userId, tabId) {
  if (connections.has(userId)) {
    const tabs = connections.get(userId);
    tabs.delete(tabId);

    if (tabs.size === 0) {
      connections.delete(userId);
      updatePresence(userId, 'offline');
    }
  }
}

export function updatePing(userId, tabId) {
  if (connections.has(userId)) {
    const tab = connections.get(userId).get(tabId);
    if (tab) {
      tab.lastPing = Date.now();
      const currentStatus = presence.get(userId)?.status || 'offline';
      if (currentStatus === 'afk') {
        updatePresence(userId, 'online');
      }
    }
  }
}

export function updatePresence(userId, status) {
  const old = presence.get(userId)?.status;
  presence.set(userId, { status, lastUpdate: Date.now() });

  if (old !== status) {
    return { userId, status, oldStatus: old };
  }
  return null;
}

export function getPresence(userId) {
  return presence.get(userId) || { status: 'offline', lastUpdate: Date.now() };
}

export function getConnections(userId) {
  return connections.get(userId) || new Map();
}

export function broadcastToUser(userId, event) {
  const tabs = connections.get(userId);
  if (!tabs) return;

  tabs.forEach((tab) => {
    if (tab.ws.readyState === 1) {
      // OPEN
      tab.ws.send(JSON.stringify(event));
    }
  });
}

export function broadcastToUserExcept(userId, tabId, event) {
  const tabs = connections.get(userId);
  if (!tabs) return;

  tabs.forEach((tab, currentTabId) => {
    if (currentTabId !== tabId && tab.ws.readyState === 1) {
      tab.ws.send(JSON.stringify(event));
    }
  });
}

// Check for AFK connections periodically
export function checkAFKStatus() {
  const now = Date.now();

  connections.forEach((tabs, userId) => {
    tabs.forEach((tab) => {
      if (now - tab.lastPing > AFK_TIMEOUT) {
        const currentStatus = presence.get(userId)?.status;
        if (currentStatus === 'online') {
          updatePresence(userId, 'afk');
          broadcastToUser(userId, {
            type: 'presence:update',
            payload: { userId, status: 'afk' },
          });
        }
      }
    });
  });
}

// Start AFK check interval
export function startAFKCheck(interval = 10000) {
  return setInterval(checkAFKStatus, interval);
}

export function getAllPresence() {
  const result = {};
  presence.forEach((data, userId) => {
    result[userId] = data.status;
  });
  return result;
}
