import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import wsClient from '../ws/client';
import { useUnreads } from '../hooks/useUnreads';
import MessageComposer from '../components/MessageComposer';
import styles from './DMChat.module.css';

export default function DMChat({ user }) {
  const { userId } = useParams();
  const { markDialogAsRead } = useUnreads();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [dialogId, setDialogId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const hasInitialScrolled = useRef(false);

  useEffect(() => {
    loadMessages();
  }, [userId]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list || messages.length === 0) return;

    if (!hasInitialScrolled.current) {
      list.scrollTop = list.scrollHeight;
      hasInitialScrolled.current = true;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && dialogId) {
      const lastMessage = messages[messages.length - 1];
      markDialogAsRead(dialogId, lastMessage.id);
    }
  }, [messages, dialogId, markDialogAsRead]);

  useEffect(() => {
    const handleMessageNew = (payload) => {
      if ((payload.room_id === null || payload.room_id === undefined)) {
        setMessages(prev => [...prev, payload]);
      }
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

    wsClient.on('message:new', handleMessageNew);
    wsClient.on('message:edit', handleMessageEdit);
    wsClient.on('message:delete', handleMessageDelete);

    return () => {
      wsClient.off('message:new', handleMessageNew);
      wsClient.off('message:edit', handleMessageEdit);
      wsClient.off('message:delete', handleMessageDelete);
    };
  }, [userId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const userRes = await fetch(`/api/v1/friends`);
      const friendsList = await userRes.json();
      const friend = friendsList.data?.find((f) => f.friend_id === parseInt(userId) || f.id === parseInt(userId));
      setOtherUser(friend || { id: userId, username: 'User' });

      const actualUserId = friend?.friend_id || friend?.id || userId;

      const dialogRes = await fetch(`/api/v1/friends/dialogs/${actualUserId}`, { credentials: 'include' });
      const dialogData = await dialogRes.json();
      if (dialogRes.ok) {
        setDialogId(dialogData.data.dialogId);
      }

      const msgRes = await fetch(`/api/v1/friends/dialogs/${actualUserId}/messages`);
      const json = await msgRes.json();
      setMessages(json.data || []);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (msgData) => {
    setError('');
    try {
      const friendsRes = await fetch(`/api/v1/friends`);
      const friendsData = await friendsRes.json();
      const friend = friendsData.data?.find((f) => f.friend_id === parseInt(userId) || f.id === parseInt(userId));
      const actualUserId = friend?.friend_id || friend?.id || userId;

      const res = await fetch(`/api/v1/friends/dialogs/${actualUserId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: msgData.content })
      });

      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.data]);
      } else {
        setError('Failed to send message');
      }
    } catch (err) {
      setError('Error sending message');
    }
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{otherUser?.username || 'User'}</h2>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.messageList} ref={messageListRef}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>No messages yet. Start a conversation!</div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`${styles.message} ${isOwn ? styles.own : ''}`}
              >
                <div className={styles.content}>{msg.content}</div>
                <div className={styles.timestamp}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  );
}
