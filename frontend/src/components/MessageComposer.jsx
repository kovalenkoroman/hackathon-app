import { useState } from 'react';
import styles from './MessageComposer.module.css';

const EMOJIS = [
  '😀', '😂', '❤️', '👍', '👏', '🎉', '🚀', '💯',
  '🔥', '👀', '😍', '🤔', '😎', '✨', '🎨', '🎭',
  '🌟', '⭐', '🎁', '🎪', '🎬', '🎤', '🎸', '📱',
  '💻', '⚽', '🏀', '🎯', '🍕', '🍔', '🌮', '☕'
];

export default function MessageComposer({ onSend, replyTo, onClearReply, disabled = false }) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const msg = {
      content: content.trim(),
      replyToId: replyTo?.id || null
    };

    onSend(msg);
    setContent('');
    onClearReply?.();
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setContent(content + emoji);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend(e);
    }
  };

  return (
    <form onSubmit={handleSend} className={styles.composer}>
      {replyTo && (
        <div className={styles.replyIndicator}>
          <div className={styles.replyContent}>
            <strong>Replying to {replyTo.username}:</strong>
            <p>{replyTo.content?.substring(0, 100)}...</p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className={styles.clearReply}
            title="Clear reply"
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.inputGroup}>
        <div className={styles.buttonGroup}>
          <div className={styles.emojiPickerWrapper}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={styles.toolBtn}
              title="Emoji picker"
              disabled={disabled}
            >
              😀
            </button>
            {showEmojiPicker && (
              <div className={styles.emojiPicker}>
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleEmojiClick(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={styles.emojiBtn}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.toolBtn}
            title="Attach file"
            disabled={disabled}
          >
            📎
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Ctrl+Enter to send)"
          className={styles.input}
          disabled={disabled}
          rows="3"
        />

        <button
          type="submit"
          className={styles.sendBtn}
          disabled={disabled || !content.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
