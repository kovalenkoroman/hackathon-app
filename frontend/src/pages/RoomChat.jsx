import { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { RoomContext } from '../RoomContext';
import * as messagesApi from '../api/messages';
import * as roomsApi from '../api/rooms';
import wsClient from '../ws/client';
import { useUnreads } from '../hooks/useUnreads';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import RoomPanel from '../components/RoomPanel';
import styles from './RoomChat.module.css';

export default function RoomChat({ user }) {
  const { roomId } = useParams();
  const { roomInfo, setRoomInfo, setRoomMembers } = useContext(RoomContext);
  const { markRoomAsRead } = useUnreads();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Kept current so the WS reconnect-sync callback always reads the latest
  // highest message id without being re-registered on every render.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    loadRoomAndMessages();
  }, [roomId]);

  // Register/unregister the gap-sync subscription for this room. On WS
  // reconnect the client will send `{ type: 'sync', payload: { roomId, afterId } }`
  // with the latest id we've seen so the server can stream back any dropped
  // `message:new` events.
  useEffect(() => {
    const getLastId = () => {
      const arr = messagesRef.current;
      return arr.length ? arr[arr.length - 1].id : 0;
    };
    return wsClient.subscribeRoom(parseInt(roomId), getLastId);
  }, [roomId]);

  useEffect(() => {
    if (roomInfo && roomInfo.id === parseInt(roomId)) {
      setRoom(roomInfo);
      setMembers(roomInfo.members || []);
    }
  }, [roomInfo, roomId]);

  // Mark room as read when messages load
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markRoomAsRead(parseInt(roomId), lastMessage.id);
    }
  }, [messages, roomId, markRoomAsRead]);

  useEffect(() => {
    const handleMessageNew = (payload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
    };

    const handleMessageEdit = (payload) => {
      setMessages(prev =>
        prev.map(m => m.id === payload.id ? payload : m)
      );
    };

    const handleMessageDelete = (payload) => {
      setMessages(prev =>
        prev.filter(m => m.id !== payload.id)
      );
    };

    const handleRoomJoined = (payload) => {
      if (parseInt(payload.roomId) === parseInt(roomId)) {
        loadRoomAndMessages();
      }
    };

    const handleRoomLeft = (payload) => {
      if (parseInt(payload.roomId) === parseInt(roomId)) {
        loadRoomAndMessages();
      }
    };

    const handleRoomMemberBanned = (payload) => {
      if (parseInt(payload.roomId) === parseInt(roomId)) {
        setMembers(prev =>
          prev.filter(m => m.user_id !== payload.userId)
        );
      }
    };

    const handleSyncDelta = (payload) => {
      if (parseInt(payload.roomId) !== parseInt(roomId)) return;
      // Gap larger than server cap — reload the window from scratch rather
      // than splice in a partial range.
      if (payload.truncated) {
        loadRoomAndMessages();
        return;
      }
      if (!payload.messages?.length) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const additions = payload.messages.filter((m) => !seen.has(m.id));
        if (additions.length === 0) return prev;
        return [...prev, ...additions];
      });
    };

    wsClient.on('message:new', handleMessageNew);
    wsClient.on('message:edit', handleMessageEdit);
    wsClient.on('message:delete', handleMessageDelete);
    wsClient.on('room:joined', handleRoomJoined);
    wsClient.on('room:left', handleRoomLeft);
    wsClient.on('room:member_banned', handleRoomMemberBanned);
    wsClient.on('sync:delta', handleSyncDelta);

    return () => {
      wsClient.off('message:new', handleMessageNew);
      wsClient.off('message:edit', handleMessageEdit);
      wsClient.off('message:delete', handleMessageDelete);
      wsClient.off('room:joined', handleRoomJoined);
      wsClient.off('room:left', handleRoomLeft);
      wsClient.off('room:member_banned', handleRoomMemberBanned);
      wsClient.off('sync:delta', handleSyncDelta);
    };
  }, [roomId]);

  const loadRoomAndMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const roomData = await roomsApi.getRoomDetail(roomId);
      setRoom(roomData);
      setMembers(roomData.members || []);
      setRoomInfo(roomData);
      setRoomMembers(roomData.members || []);

      const messagesData = await messagesApi.getMessages(roomId, null, 50);
      setMessages(messagesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (msgData) => {
    setError('');
    try {
      if (msgData.editingId) {
        const updated = await messagesApi.editMessage(msgData.editingId, msgData.content);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        setEditingMessage(null);
        return;
      }

      const newMessage = await messagesApi.sendMessage(roomId, msgData.content, msgData.replyToId);
      setMessages([...messages, newMessage]);
      setReplyingTo(null);

      // Upload file if provided
      if (msgData.file) {
        const formData = new FormData();
        formData.append('file', msgData.file);
        formData.append('messageId', newMessage.id);

        try {
          const res = await fetch('/api/v1/files/upload', {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.message) {
              const enriched = json.data.message;
              setMessages((prev) => prev.map((m) => (m.id === enriched.id ? { ...m, ...enriched } : m)));
            }
          }
        } catch (err) {
          console.error('File upload failed:', err);
          setError('Message sent, but file upload failed');
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoadMore = async () => {
    if (messages.length === 0) return;
    try {
      const olderMessages = await messagesApi.getMessages(roomId, messages[0].id, 50);
      setMessages([...olderMessages, ...messages]);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messagesApi.deleteMessage(messageId);
      setMessages(messages.filter((m) => m.id !== messageId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this member from the room?')) return;
    try {
      await fetch(`/api/v1/rooms/${roomId}/members/${userId}/ban`, { method: 'POST' });
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (err) {
      setError('Failed to ban member');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await fetch(`/api/v1/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handlePromote = async (userId) => {
    try {
      await fetch(`/api/v1/rooms/${roomId}/admins/${userId}`, { method: 'POST' });
      const updatedMembers = members.map(m =>
        m.user_id === userId ? { ...m, role: 'admin' } : m
      );
      setMembers(updatedMembers);
    } catch (err) {
      setError('Failed to promote member');
    }
  };

  const handleDemote = async (userId) => {
    try {
      await fetch(`/api/v1/rooms/${roomId}/admins/${userId}`, { method: 'DELETE' });
      const updatedMembers = members.map(m =>
        m.user_id === userId ? { ...m, role: 'member' } : m
      );
      setMembers(updatedMembers);
    } catch (err) {
      setError('Failed to demote member');
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!room) return <div className={styles.container}><p>Room not found</p></div>;

  return (
    <div className={styles.container}>
      {/* Room Header */}
      <div className={styles.roomHeader}>
        <h2 className={styles.roomTitle}>{room.name}</h2>
        {room.description && <p className={styles.roomDescription}>{room.description}</p>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <MessageList
        messages={messages}
        loading={false}
        onLoadMore={handleLoadMore}
        onReply={setReplyingTo}
        onEdit={setEditingMessage}
        onDelete={handleDelete}
        currentUserId={user?.id}
        currentUserRole={members.find((m) => m.user_id === user?.id)?.role}
      />

      <MessageComposer
        onSend={handleSend}
        replyTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        editing={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {/* Pass room info to MainLayout via props */}
      <input type="hidden" id="room-info" data-room={JSON.stringify(room)} />
    </div>
  );
}
