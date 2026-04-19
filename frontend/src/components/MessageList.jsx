import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MessageList.module.css';

export default function MessageList({ messages, loading, onLoadMore, onReply, onDelete, currentUserId }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesStartRef = useRef(null);
  const containerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Check if scrolled to top
      if (container.scrollTop < 100 && !loading) {
        onLoadMore?.();
      }

      // Disable auto-scroll if user scrolls up
      setAutoScroll(container.scrollHeight - container.scrollTop - container.clientHeight < 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loading, onLoadMore]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className={styles.messageList} ref={containerRef}>
      {loading && (
        <div className={styles.loadingIndicator}>
          <span>Loading older messages...</span>
        </div>
      )}

      <div ref={messagesStartRef} />

      {messages.map((msg, idx) => {
        const isOwn = msg.user_id === currentUserId;
        const repliedToMessage = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
        return (
          <div
            key={msg.id}
            className={`${styles.messageWrapper} ${isOwn ? styles.own : ''}`}
          >
            <div className={styles.message}>
              <div className={styles.header}>
                <strong className={styles.username}>{msg.username}</strong>
                <span className={styles.timestamp}>{formatTime(msg.created_at)}</span>
                {msg.edited && <span className={styles.edited}>edited</span>}
              </div>

              {repliedToMessage && (
                <div className={styles.reply}>
                  <div className={styles.replyAuthor}>↪ Reply to {repliedToMessage.username}</div>
                  <div className={styles.replyContent}>{repliedToMessage.content}</div>
                </div>
              )}

              <div className={styles.content}>{msg.content}</div>

              {msg.attachments && msg.attachments.length > 0 && (
                <div className={styles.attachments}>
                  {msg.attachments.map((att) => {
                    const isImage = att.mime_type?.startsWith('image/');
                    return (
                      <div key={att.id} className={styles.attachment}>
                        {isImage ? (
                          <a href={`/api/v1/files/${att.id}`} target="_blank" rel="noopener noreferrer">
                            <img src={`/api/v1/files/${att.id}`} alt={att.original_name} className={styles.thumbnail} />
                          </a>
                        ) : (
                          <a href={`/api/v1/files/${att.id}`} download={att.original_name} className={styles.fileLink}>
                            📄 {att.original_name} ({Math.round(att.size / 1024)} KB)
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  onClick={() => onReply?.(msg)}
                  className={styles.actionBtn}
                  title="Reply"
                >
                  ↩️ Reply
                </button>
                {isOwn && (
                  <button
                    onClick={() => onDelete?.(msg.id)}
                    className={styles.actionBtn}
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollToBottom();
          }}
          className={styles.scrollDownBtn}
        >
          ⬇️ New messages
        </button>
      )}
    </div>
  );
}
