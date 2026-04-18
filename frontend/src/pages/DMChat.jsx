import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './DMChat.module.css';

export default function DMChat({ user }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Get other user info
      const userRes = await fetch(`/api/v1/friends`);
      const friendsList = await userRes.json();
      const friend = friendsList.data?.find((f) => f.id === parseInt(userId));
      setOtherUser(friend || { id: userId, username: 'User' });

      // Get messages
      const msgRes = await fetch(`/api/v1/friends/dialogs/${userId}/messages`);
      const json = await msgRes.json();
      setMessages(json.data || []);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await fetch(`/api/v1/friends/dialogs/${userId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      });

      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.data]);
        setContent('');
      } else {
        setError('Failed to send message');
      }
    } catch (err) {
      setError('Error sending message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend(e);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/friends')} className={styles.backButton}>
          ← Back
        </button>
        <h1>Chat with {otherUser?.username || 'User'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.messageList}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>No messages yet. Start a conversation!</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={styles.message}>
              <div className={styles.sender}>{msg.username}</div>
              <div className={styles.content}>{msg.content}</div>
              <div className={styles.timestamp}>
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={styles.form}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Ctrl+Enter to send)"
          className={styles.input}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
}
