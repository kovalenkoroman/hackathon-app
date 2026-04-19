import { useState, useRef } from 'react';
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
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    // Content is required; file is optional
    if (!content.trim()) return;

    const msg = {
      content: content.trim(),
      replyToId: replyTo?.id || null,
      file: selectedFile
    };

    onSend(msg);
    setContent('');
    setSelectedFile(null);
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSend} className={styles.composer}>
      {/* Reply indicator */}
      {replyTo && (
        <div className={styles.replyContainer}>
          <div className={styles.replyLabel}>↪ Replying to {replyTo.username}</div>
          <div className={styles.replyPreview}>"{replyTo.content}"</div>
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

      {/* File attachment indicator */}
      {selectedFile && (
        <div className={styles.fileTag}>
          📎 {selectedFile.name}
          <button
            type="button"
            onClick={clearFile}
            className={styles.fileClear}
            title="Remove file"
          >
            ×
          </button>
        </div>
      )}

      {/* Multiline textarea with tools */}
      <div className={styles.inputRow}>
        {/* Tools column */}
        <div className={styles.toolsColumn}>
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
            onClick={handleAttachClick}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type your message... (Ctrl+Enter to send)"
          className={styles.textarea}
          disabled={disabled}
          rows="4"
        />
      </div>

      {/* Send button */}
      <button
        type="submit"
        className={styles.sendBtn}
        disabled={disabled || !content.trim()}
      >
        Send
      </button>
    </form>
  );
}
