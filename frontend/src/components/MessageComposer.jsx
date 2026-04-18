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
      {/* Wireframe-style single row: [buttons] [reply indicator] [input] [send] */}
      <div className={styles.inputRow}>
        {/* Emoji picker */}
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

        {/* Attach button */}
        <button
          type="button"
          className={styles.toolBtn}
          title="Attach file"
          disabled={disabled}
        >
          📎
        </button>

        {/* Reply indicator inline */}
        {replyTo && (
          <div className={styles.replyTag}>
            Replying to: {replyTo.username}
            <button
              type="button"
              onClick={onClearReply}
              className={styles.replyClose}
              title="Clear reply"
            >
              ×
            </button>
          </div>
        )}

        {/* Input field */}
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="message input"
          className={styles.input}
          disabled={disabled}
        />

        {/* Send button */}
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={disabled || !content.trim()}
        >
          Send
        </button>
      </div>

      {/* Multiline mode - show if user starts typing long text */}
      {content.length > 100 && (
        <div className={styles.expandedInput}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Ctrl+Enter to send)"
            className={styles.textarea}
            disabled={disabled}
            rows="3"
          />
        </div>
      )}
    </form>
  );
}
