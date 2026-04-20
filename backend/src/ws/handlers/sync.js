import * as messageQueries from '../../db/queries/messages.js';
import * as roomQueries from '../../db/queries/rooms.js';
import * as friendQueries from '../../db/queries/friends.js';

const MAX_DELTA = 200;

// `payload`: { roomId?, dialogId?, afterId }
// Responds with `sync:delta` carrying messages strictly after `afterId`.
// `truncated: true` tells the client the gap exceeded MAX_DELTA and it should
// fall back to a full history reload for that room.
export async function handleSync(ws, payload) {
  const { roomId, dialogId, afterId } = payload || {};
  const userId = ws.userId;

  if (!Number.isInteger(afterId) || afterId < 0) {
    ws.send(JSON.stringify({ type: 'sync:error', payload: { error: 'Invalid afterId' } }));
    return;
  }
  if (!roomId && !dialogId) {
    ws.send(JSON.stringify({ type: 'sync:error', payload: { error: 'roomId or dialogId required' } }));
    return;
  }

  if (roomId) {
    const member = await roomQueries.getRoomMember(roomId, userId);
    if (!member) {
      ws.send(JSON.stringify({ type: 'sync:error', payload: { error: 'Not a room member' } }));
      return;
    }
    const messages = await messageQueries.getMessagesAfter(roomId, afterId, MAX_DELTA + 1, false);
    const truncated = messages.length > MAX_DELTA;
    ws.send(JSON.stringify({
      type: 'sync:delta',
      payload: {
        roomId,
        afterId,
        messages: truncated ? messages.slice(0, MAX_DELTA) : messages,
        truncated,
      },
    }));
    return;
  }

  const allowed = await friendQueries.isDialogParticipant(dialogId, userId);
  if (!allowed) {
    ws.send(JSON.stringify({ type: 'sync:error', payload: { error: 'Not a dialog participant' } }));
    return;
  }
  const messages = await messageQueries.getMessagesAfter(dialogId, afterId, MAX_DELTA + 1, true);
  const truncated = messages.length > MAX_DELTA;
  ws.send(JSON.stringify({
    type: 'sync:delta',
    payload: {
      dialogId,
      afterId,
      messages: truncated ? messages.slice(0, MAX_DELTA) : messages,
      truncated,
    },
  }));
}
