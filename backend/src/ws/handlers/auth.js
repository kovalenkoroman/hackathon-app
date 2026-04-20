import * as authService from '../../services/auth.js';
import * as presenceService from '../presence.js';
import * as broadcast from '../broadcast.js';

export async function handleAuth(ws, data, tabId) {
  try {
    const token = data?.token || ws.cookieSessionToken;
    if (!token) {
      ws.send(JSON.stringify({ type: 'auth:error', payload: { error: 'Token required' } }));
      ws.close();
      return;
    }

    const result = await authService.getSessionUser(token);
    if (!result) {
      ws.send(JSON.stringify({ type: 'auth:error', payload: { error: 'Invalid token' } }));
      ws.close();
      return;
    }

    const userId = result.user.id;
    ws.userId = userId;
    ws.tabId = tabId;

    presenceService.addConnection(userId, tabId, ws);

    ws.send(JSON.stringify({ type: 'auth:ok', payload: { user: result.user } }));

    // Push current presence of the user's friends and room-mates so the
    // sidebar can render initial online/AFK dots without waiting for a change.
    await broadcast.sendPresenceSnapshot(userId, ws);

    // Notify friends and room members of user coming online
    await broadcast.broadcastPresenceToFriends(userId);
    await broadcast.broadcastPresenceToRoomMembers(userId);
  } catch (error) {
    console.error('Auth error:', error);
    ws.send(JSON.stringify({ type: 'auth:error', payload: { error: error.message } }));
    ws.close();
  }
}

export async function handlePing(ws) {
  if (ws.userId && ws.tabId) {
    await presenceService.updatePing(ws.userId, ws.tabId);
  }
}
