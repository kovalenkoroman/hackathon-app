import { useState, useEffect } from 'react';
import wsClient from '../ws/client.js';

export function useUnreads() {
  const [unreads, setUnreads] = useState({ rooms: [], dialogs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial unread counts
    const fetchUnreads = async () => {
      try {
        const res = await fetch('/api/v1/unreads', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setUnreads(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch unreads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreads();

    // Subscribe to unread updates via WebSocket
    const handleUnreadUpdate = (payload) => {
      setUnreads(payload);
    };

    wsClient.on('unread:update', handleUnreadUpdate);

    return () => {
      wsClient.off('unread:update', handleUnreadUpdate);
    };
  }, []);

  const getUnreadCount = (roomId, type = 'room') => {
    if (type === 'room') {
      const unread = unreads.rooms.find(r => r.room_id === roomId);
      return unread?.unread_count || 0;
    } else if (type === 'dialog') {
      const unread = unreads.dialogs.find(d => d.dialog_id === roomId);
      return unread?.unread_count || 0;
    }
    return 0;
  };

  const markRoomAsRead = async (roomId, lastMessageId) => {
    try {
      await fetch(`/api/v1/rooms/${roomId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lastMessageId })
      });
    } catch (err) {
      console.error('Failed to mark room as read:', err);
    }
  };

  const markDialogAsRead = async (dialogId, lastMessageId) => {
    try {
      await fetch(`/api/v1/dialogs/${dialogId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lastMessageId })
      });
    } catch (err) {
      console.error('Failed to mark dialog as read:', err);
    }
  };

  return {
    unreads,
    loading,
    getUnreadCount,
    markRoomAsRead,
    markDialogAsRead
  };
}
