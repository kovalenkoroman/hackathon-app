import { useState, useRef, useEffect } from 'react';
import styles from './MessageComposer.module.css';

const EMOJIS = [
  '😀', '😂', '❤️', '👍', '👏', '🎉', '🚀', '💯',
  '🔥', '👀', '😍', '🤔', '😎', '✨', '🎨', '🎭',
  '🌟', '⭐', '🎁', '🎪', '🎬', '🎤', '🎸', '📱',
  '💻', '⚽', '🏀', '🎯', '🍕', '🍔', '🌮', '☕'
];

export default function MessageComposer({ onSend, replyTo, onClearReply, editing, onCancelEdit, disabled = false }) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setContent(editing.content || '');
      setSelectedFile(null);
      textareaRef.current?.focus();
    } else {
      setContent('');
    }
  }, [editing]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (editing) {
      onSend({ content: content.trim(), editingId: editing.id });
      return;
    }

    onSend({
      content: content.trim(),
      replyToId: replyTo?.id || null,
      file: selectedFile,
    });
    setContent('');
    setSelectedFile(null);
    onClearReply?.();
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setContent(content + emoji);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend(e);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSend = !disabled && content.trim().length > 0;

  return (
    <form onSubmit={handleSend} className={styles.composer}>
      {editing && (
        <div className={styles.replyBanner}>
          <div className={styles.replyAccent} />
          <div className={styles.replyBody}>
            <div className={styles.replyLabel}>Editing message</div>
            <div className={styles.replyPreview}>Press Send to save your changes</div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className={styles.replyClose}
            title="Cancel edit"
          >
            ×
          </button>
        </div>
      )}
      {replyTo && !editing && (
        <div className={styles.replyBanner}>
          <div className={styles.replyAccent} />
          <div className={styles.replyBody}>
            <div className={styles.replyLabel}>Replying to {replyTo.username}</div>
            <div className={styles.replyPreview}>{replyTo.content}</div>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className={styles.replyClose}
            title="Cancel reply"
          >
            ×
          </button>
        </div>
      )}

      {selectedFile && (
        <div className={styles.fileChip}>
          <span className={styles.fileIcon}>📎</span>
          <span className={styles.fileName}>{selectedFile.name}</span>
          <button type="button" onClick={clearFile} className={styles.fileClear} title="Remove file">×</button>
        </div>
      )}

      <div className={styles.inputShell}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message…"
          className={styles.textarea}
          disabled={disabled}
          rows="2"
        />

        <div className={styles.toolbar}>
          <div className={styles.toolsLeft}>
            <div className={styles.emojiWrap}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={styles.toolBtn}
                title="Insert emoji"
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
              onClick={() => fileInputRef.current?.click()}
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

          <div className={styles.toolsRight}>
            <span className={styles.hint}>⌘↵ to send</span>
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!canSend}
            >
              {editing ? 'Save' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
