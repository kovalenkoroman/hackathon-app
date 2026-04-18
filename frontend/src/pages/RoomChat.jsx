import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import * as messagesApi from '../api/messages';
import * as roomsApi from '../api/rooms';
import styles from './RoomChat.module.css';

export default function RoomChat({ user }) {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadRoomAndMessages();
  }, [roomId]);

  const loadRoomAndMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const roomData = await roomsApi.getRoomDetail(roomId);
      setRoom(roomData);

      const messagesData = await messagesApi.getMessages(roomId, null, 50);
      setMessages(messagesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError('');
    try {
      const newMessage = await messagesApi.sendMessage(roomId, content, replyingTo?.id);
      setMessages([...messages, newMessage]);
      setContent('');
      setReplyingTo(null);
    } catch (err) {
      setError(err.message);
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

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!room) return <div className={styles.container}><p>Room not found</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{room.name}</h1>
        <p className={styles.meta}>{room.members?.length || 0} members</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.messageList}>
        {messages.length === 0 ? (
          <p className={styles.empty}>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={styles.messageItem}>
              <div className={styles.messageHeader}>
                <span className={styles.username}>{msg.username}</span>
                <span className={styles.timestamp}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className={styles.messageContent}>{msg.content}</p>
              {msg.edited && <span className={styles.edited}>(edited)</span>}
              {msg.user_id === user?.id && (
                <div className={styles.actions}>
                  <button
                    className={styles.replyBtn}
                    onClick={() => setReplyingTo(msg)}
                  >
                    Reply
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(msg.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.composeArea} onSubmit={handleSend}>
        {replyingTo && (
          <div className={styles.replyContext}>
            <p>Replying to {replyingTo.username}: {replyingTo.content}</p>
            <button
              type="button"
              className={styles.cancelReply}
              onClick={() => setReplyingTo(null)}
            >
              ×
            </button>
          </div>
        )}
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleSend(e);
            }}
            className={styles.input}
          />
          <button type="submit" className={styles.sendBtn}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
