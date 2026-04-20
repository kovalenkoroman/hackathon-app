import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import wsClient from '../ws/client';
import { useUnreads } from '../hooks/useUnreads';
import * as messagesApi from '../api/messages';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import styles from './DMChat.module.css';

export default function DMChat({ user }) {
  const { userId } = useParams();
  const { markDialogAsRead } = useUnreads();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [dialogId, setDialogId] = useState(null);
  const [canSend, setCanSend] = useState(true);
  const [frozenReason, setFrozenReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    loadMessages();
  }, [userId]);

  useEffect(() => {
    if (!dialogId) return;
    const getLastId = () => {
      const arr = messagesRef.current;
      return arr.length ? arr[arr.length - 1].id : 0;
    };
    return wsClient.subscribeDialog(dialogId, getLastId);
  }, [dialogId]);

  useEffect(() => {
    if (messages.length > 0 && dialogId) {
      const lastMessage = messages[messages.length - 1];
      markDialogAsRead(dialogId, lastMessage.id);
    }
  }, [messages, dialogId, markDialogAsRead]);

  useEffect(() => {
    const handleMessageNew = (payload) => {
      if (payload.dialog_id && payload.dialog_id === dialogId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    };
    const handleMessageEdit = (payload) => {
      setMessages((prev) => prev.map((m) => (m.id === payload.id ? { ...m, ...payload } : m)));
    };
    const handleMessageDelete = (payload) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.id));
    };
    const handleSyncDelta = (payload) => {
      if (payload.dialogId !== dialogId) return;
      if (payload.truncated) {
        loadMessages();
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
    wsClient.on('sync:delta', handleSyncDelta);

    return () => {
      wsClient.off('message:new', handleMessageNew);
      wsClient.off('message:edit', handleMessageEdit);
      wsClient.off('message:delete', handleMessageDelete);
      wsClient.off('sync:delta', handleSyncDelta);
    };
  }, [dialogId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const dialogRes = await fetch(`/api/v1/friends/dialogs/${userId}`, { credentials: 'include' });
      const dialogData = await dialogRes.json();
      if (dialogRes.ok) {
        setDialogId(dialogData.data.dialogId);
        setCanSend(dialogData.data.canSend !== false);
        setFrozenReason(dialogData.data.reason || null);
        setOtherUser(dialogData.data.otherUser || { id: userId, username: 'User' });
      }

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

  const handleLoadMore = async () => {
    if (messages.length === 0) return;
    try {
      const res = await fetch(
        `/api/v1/friends/dialogs/${userId}/messages?before=${messages[0].id}&limit=50`
      );
      const json = await res.json();
      if (json.data?.length) {
        setMessages((prev) => [...json.data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
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

      const res = await fetch(`/api/v1/friends/dialogs/${userId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: msgData.content,
          replyToId: msgData.replyToId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send message');
        return;
      }

      const json = await res.json();
      const newMessage = json.data;

      // Add locally so the sender sees it immediately. handleMessageNew
      // dedupes by id if the WS echo beats us to it.
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setReplyingTo(null);

      if (msgData.file) {
        const formData = new FormData();
        formData.append('file', msgData.file);
        formData.append('messageId', newMessage.id);
        try {
          const uploadRes = await fetch('/api/v1/files/upload', {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.data?.message) {
              const enriched = uploadJson.data.message;
              setMessages((prev) => prev.map((m) => (m.id === enriched.id ? { ...m, ...enriched } : m)));
            }
          }
        } catch (err) {
          console.error('File upload failed:', err);
          setError('Message sent, but file upload failed');
        }
      }
    } catch (err) {
      setError('Error sending message');
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messagesApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.loading}>Loading…</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{otherUser?.username || 'User'}</h2>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <MessageList
        messages={messages}
        loading={false}
        onLoadMore={handleLoadMore}
        onReply={canSend ? setReplyingTo : undefined}
        onEdit={canSend ? setEditingMessage : undefined}
        onDelete={handleDelete}
        currentUserId={user?.id}
        variant="dm"
      />

      {canSend ? (
        <MessageComposer
          onSend={handleSend}
          replyTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
          editing={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      ) : (
        <div className={styles.frozenBanner}>
          {frozenReason === 'you-blocked' && 'You blocked this user. Unblock them in Contacts to continue the conversation.'}
          {frozenReason === 'they-blocked' && 'You can no longer send messages to this user.'}
          {(frozenReason === 'not-friends' || !frozenReason) && 'This conversation is read-only. Send a friend request to continue.'}
        </div>
      )}
    </div>
  );
}
