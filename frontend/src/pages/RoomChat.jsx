import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as messagesApi from '../api/messages';
import * as roomsApi from '../api/rooms';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import RoomPanel from '../components/RoomPanel';
import styles from './RoomChat.module.css';

export default function RoomChat({ user }) {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    loadRoomAndMessages();
  }, [roomId]);

  const loadRoomAndMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const roomData = await roomsApi.getRoomDetail(roomId);
      setRoom(roomData);
      setMembers(roomData.members || []);

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
      {error && <div className={styles.error}>{error}</div>}

      <MessageList
        messages={messages}
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

      {/* Render room info in right sidebar */}
      <div style={{ display: 'none' }} id="room-info">
        <RoomPanel
          room={room}
          members={members}
          user={user}
          onInvite={() => {}}
          onManage={() => {}}
          onBan={handleBan}
          onRemove={handleRemove}
          onPromote={handlePromote}
          onDemote={handleDemote}
        />
      </div>
    </div>
  );
}
