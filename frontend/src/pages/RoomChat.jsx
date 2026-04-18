import { useState, useEffect, useContext } from 'react';
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

  useEffect(() => {
    loadRoomAndMessages();
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
      setMessages(prev => [...prev, payload]);
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

    wsClient.on('message:new', handleMessageNew);
    wsClient.on('message:edit', handleMessageEdit);
    wsClient.on('message:delete', handleMessageDelete);
    wsClient.on('room:joined', handleRoomJoined);
    wsClient.on('room:left', handleRoomLeft);
    wsClient.on('room:member_banned', handleRoomMemberBanned);

    return () => {
      wsClient.off('message:new', handleMessageNew);
      wsClient.off('message:edit', handleMessageEdit);
      wsClient.off('message:delete', handleMessageDelete);
      wsClient.off('room:joined', handleRoomJoined);
      wsClient.off('room:left', handleRoomLeft);
      wsClient.off('room:member_banned', handleRoomMemberBanned);
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
      const newMessage = await messagesApi.sendMessage(roomId, msgData.content, msgData.replyToId);
      setMessages([...messages, newMessage]);
      setReplyingTo(null);

      // Upload file if provided
      if (msgData.file) {
        const formData = new FormData();
        formData.append('file', msgData.file);
        formData.append('messageId', newMessage.id);

        try {
          await fetch('/api/v1/files/upload', {
            method: 'POST',
            body: formData
          });
        } catch (err) {
          console.error('File upload failed:', err);
          // File upload failed but message was sent, so just show a warning
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

  // Reverse messages to show newer ones first
  const reversedMessages = [...messages].reverse();

  return (
    <div className={styles.container}>
      {/* Room Header */}
      <div className={styles.roomHeader}>
        <h2 className={styles.roomTitle}>{room.name}</h2>
        {room.description && <p className={styles.roomDescription}>{room.description}</p>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <MessageList
        messages={reversedMessages}
        loading={false}
        onLoadMore={handleLoadMore}
        onReply={setReplyingTo}
        onDelete={handleDelete}
        currentUserId={user?.id}
      />

      <MessageComposer
        onSend={handleSend}
        replyTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
      />

      {/* Pass room info to MainLayout via props */}
      <input type="hidden" id="room-info" data-room={JSON.stringify(room)} />
    </div>
  );
}
