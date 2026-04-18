# Skill: File Upload & Access Control

Use this skill for all file/image attachment handling — upload, serving, access control, and cascade delete.

---

## Multer middleware (`backend/src/middleware/upload.js`)

```js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_FILE = parseInt(process.env.MAX_FILE_SIZE_BYTES) || 20971520;  // 20 MB
const MAX_IMAGE = parseInt(process.env.MAX_IMAGE_SIZE_BYTES) || 3145728; // 3 MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileSizeLimit(req, file, cb) {
  const limit = IMAGE_TYPES.includes(file.mimetype) ? MAX_IMAGE : MAX_FILE;
  req._fileSizeLimit = limit;
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: fileSizeLimit,
  limits: { fileSize: MAX_FILE }, // outer cap; image cap enforced below
});

// After upload, enforce image-specific size limit
function enforceImageLimit(req, res, next) {
  if (!req.file) return next();
  if (IMAGE_TYPES.includes(req.file.mimetype) && req.file.size > MAX_IMAGE) {
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ data: null, error: 'Image exceeds 3 MB limit' });
  }
  next();
}

module.exports = { upload, enforceImageLimit };
```

---

## Upload route (`backend/src/routes/files.js`)

```js
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { upload, enforceImageLimit } = require('../middleware/upload');
const { canAccessFile } = require('../services/fileAccess');

// Upload — attached to a message
router.post('/upload', authMiddleware, upload.single('file'), enforceImageLimit, async (req, res) => {
  try {
    const { messageId, comment } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ data: null, error: 'No file provided' });

    const { rows } = await db.query(
      `INSERT INTO attachments (message_id, filename, original_name, size, mime_type, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [messageId, file.filename, file.originalname, file.size, file.mimetype, comment || '']
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// Serve file — enforces access control
router.get('/:filename', authMiddleware, async (req, res) => {
  const { filename } = req.params;

  const allowed = await canAccessFile(req.user.id, filename);
  if (!allowed) return res.status(403).json({ data: null, error: 'Access denied' });

  const filePath = path.join(process.env.UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ data: null, error: 'File not found' });

  res.sendFile(filePath);
});

module.exports = router;
```

---

## Access control service (`backend/src/services/fileAccess.js`)

```js
const db = require('../db');

// A user can access a file if they are a current member of the room
// (or participant in the dialog) that contains the message the file is attached to.
async function canAccessFile(userId, filename) {
  const { rows } = await db.query(
    `SELECT a.id
     FROM attachments a
     JOIN messages m ON a.message_id = m.id
     WHERE a.filename = $1
       AND (
         -- room message: user must be a current member
         (m.room_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM room_members rm
           WHERE rm.room_id = m.room_id AND rm.user_id = $2
         ))
         OR
         -- dialog message: user must be a participant
         (m.dialog_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM personal_dialogs pd
           WHERE pd.id = m.dialog_id
             AND (pd.user_a_id = $2 OR pd.user_b_id = $2)
         ))
       )`,
    [filename, userId]
  );
  return rows.length > 0;
}

module.exports = { canAccessFile };
```

---

## Cascade delete (room deletion)

When a room is deleted, physically remove files from disk. DB rows are cleaned up by `ON DELETE CASCADE`.

```js
// backend/src/services/rooms.js
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function deleteRoom(roomId, requestingUserId) {
  // Verify requester is owner
  const { rows } = await db.query(
    'SELECT owner_id FROM rooms WHERE id=$1', [roomId]
  );
  if (!rows[0] || rows[0].owner_id !== requestingUserId)
    throw new Error('Only the owner can delete a room');

  // Collect filenames before cascade deletes them
  const files = await db.query(
    `SELECT a.filename FROM attachments a
     JOIN messages m ON a.message_id = m.id
     WHERE m.room_id = $1`,
    [roomId]
  );

  // Delete room — cascades to room_members, room_bans, messages, attachments
  await db.query('DELETE FROM rooms WHERE id=$1', [roomId]);

  // Remove physical files
  files.rows.forEach(({ filename }) => {
    const p = path.join(process.env.UPLOAD_DIR, filename);
    try { fs.unlinkSync(p); } catch (_) { /* already gone, ignore */ }
  });
}
```

---

## Frontend: attach via button or paste

```js
// Paste handler — add to message input component
function handlePaste(e) {
  const items = Array.from(e.clipboardData.items);
  const fileItem = items.find(i => i.kind === 'file');
  if (!fileItem) return;
  const file = fileItem.getAsFile();
  if (file) attachFile(file);
}

async function attachFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('messageId', pendingMessageId); // attach after message is created
  const res = await fetch('/api/v1/files/upload', { method: 'POST', body: formData });
  const { data } = await res.json();
  setAttachments(prev => [...prev, data]);
}
```

---

## Key rules

- Never trust `file.mimetype` from the client for security decisions — it can be spoofed. Use it only for UX (thumbnail vs file icon). Size limits are the real guard.
- Always use the uuid filename on disk — never the original name (path traversal risk)
- Always call `canAccessFile` before `res.sendFile` — no exceptions
- Attach files to messages in two steps: (1) create message, (2) upload file with `messageId`. This keeps the upload route simple.
- Files are never deleted when a user loses room access — only when the room itself is deleted
