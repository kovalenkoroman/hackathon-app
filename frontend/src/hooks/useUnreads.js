import { useState, useEffect, useCallback } from 'react';
import wsClient from '../ws/client.js';

export function useUnreads() {
  const [unreads, setUnreads] = useState({ rooms: [], dialogs: [] });
  const [loading, setLoading] = useState(true);

  const fetchUnreads = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchUnreads();

    const handleUnreadUpdate = (payload) => {
      setUnreads(payload);
    };
    // When a new message lands for any room/dialog the user is part of,
    // unread counts may have moved — refetch once so badges reflect it.
    // Self-authored messages are fine too: the chat view will immediately
    // call markAsRead and re-broadcast unread:update to zero the badge.
    const handleMessageNew = () => {
      fetchUnreads();
    };

    wsClient.on('unread:update', handleUnreadUpdate);
    wsClient.on('message:new', handleMessageNew);

    return () => {
      wsClient.off('unread:update', handleUnreadUpdate);
      wsClient.off('message:new', handleMessageNew);
    };
  }, [fetchUnreads]);

  const getUnreadCount = (id, type = 'room') => {
    if (type === 'room') {
      const unread = unreads.rooms.find((r) => r.room_id === id);
      return unread?.unread_count || 0;
    } else if (type === 'dialog') {
      // Callers pass the other user's id (that's what the sidebar knows about),
      // so we match dialog entries by other_user_id rather than dialog_id.
      const unread = unreads.dialogs.find((d) => d.other_user_id === id);
      return unread?.unread_count || 0;
    }
    return 0;
  };

  // Memoise so callers can safely depend on them in useEffect without
  // triggering a render loop (the caller's effect re-fires on every render
  // otherwise, spamming mark-read and re-broadcasting unread:update).
  const markRoomAsRead = useCallback(async (roomId, lastMessageId) => {
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
  }, []);

  const markDialogAsRead = useCallback(async (dialogId, lastMessageId) => {
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
  }, []);

  return {
    unreads,
    loading,
    getUnreadCount,
    markRoomAsRead,
    markDialogAsRead
  };
}
