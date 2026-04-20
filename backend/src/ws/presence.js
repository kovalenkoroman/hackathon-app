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
  const now = Date.now();
  connections.get(userId).set(tabId, {
    ws,
    lastPing: now,
    lastAcceptedPing: now,
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

const PING_DEBOUNCE_MS = 5000; // Only process one ping per 5 seconds per tab

export async function updatePing(userId, tabId) {
  if (connections.has(userId)) {
    const tab = connections.get(userId).get(tabId);
    if (tab) {
      const now = Date.now();
      // Debounce: skip if less than 5s since last accepted ping
      if (now - tab.lastAcceptedPing < PING_DEBOUNCE_MS) {
        return;
      }

      tab.lastPing = now;
      tab.lastAcceptedPing = now;

      const currentStatus = presence.get(userId)?.status || 'offline';
      if (currentStatus === 'afk') {
        const change = updatePresence(userId, 'online');
        if (change) {
          broadcastToUser(userId, {
            type: 'presence:update',
            payload: { userId, status: 'online' },
          });
          // Notify friends and room members of recovery from AFK
          const broadcast = await import('./broadcast.js');
          await broadcast.broadcastPresenceToFriends(userId);
          await broadcast.broadcastPresenceToRoomMembers(userId);
        }
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

// Check for AFK connections periodically.
// A user is AFK only when ALL of their tabs have been idle > AFK_TIMEOUT,
// so we compare against the most-recently-active tab.
export async function checkAFKStatus() {
  const now = Date.now();

  for (const [userId, tabs] of connections) {
    if (tabs.size === 0) continue;

    let maxLastPing = 0;
    for (const tab of tabs.values()) {
      if (tab.lastPing > maxLastPing) maxLastPing = tab.lastPing;
    }

    const idleMs = now - maxLastPing;
    const currentStatus = presence.get(userId)?.status;

    if (idleMs > AFK_TIMEOUT && currentStatus === 'online') {
      const change = updatePresence(userId, 'afk');
      if (change) {
        broadcastToUser(userId, {
          type: 'presence:update',
          payload: { userId, status: 'afk' },
        });
        const broadcast = await import('./broadcast.js');
        await broadcast.broadcastPresenceToFriends(userId);
        await broadcast.broadcastPresenceToRoomMembers(userId);
      }
    }
  }
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
