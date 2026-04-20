import express from 'express';
import { readFile } from 'fs/promises';
import { upload, validateFileSize } from '../middleware/upload.js';
import * as filesService from '../services/files.js';
import * as attachmentQueries from '../db/queries/attachments.js';
import * as messageQueries from '../db/queries/messages.js';
import * as broadcast from '../ws/broadcast.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Upload file
router.post('/upload', requireAuth, upload.single('file'), validateFileSize, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const attachment = await filesService.saveAttachment(parseInt(messageId), req.file);

    // Re-fetch the enriched message (with all its attachments) and broadcast
    // a message:edit so other participants update their view.
    const message = await messageQueries.findMessageById(parseInt(messageId));
    let enrichedMessage = null;
    if (message) {
      const [hydrated] = await messageQueries.hydrateAttachments([message]);
      enrichedMessage = hydrated;
      if (message.room_id) {
        await broadcast.broadcastToRoom(message.room_id, { type: 'message:edit', payload: enrichedMessage });
      } else if (message.dialog_id) {
        await broadcast.broadcastToDialog(message.dialog_id, { type: 'message:edit', payload: enrichedMessage });
      }
    }

    // Return the enriched message alongside the attachment so the uploader
    // can update its local state without waiting on the WS round-trip.
    res.status(201).json({ data: { attachment, message: enrichedMessage } });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get file (download)
router.get('/:attachmentId', requireAuth, async (req, res) => {
  try {
    const attachment = await filesService.getAttachment(parseInt(req.params.attachmentId), req.user.id);

    const fileData = await readFile(`/app/uploads/${attachment.filename}`);

    // For images, render inline so <img> tags display them; for anything else,
    // send as a download so filenames with the original name are preserved.
    const isImage = attachment.mime_type?.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', attachment.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${attachment.original_name}"`);

    res.send(fileData);
  } catch (error) {
    console.error('File download error:', error);
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Attachment not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Delete attachment
router.delete('/:attachmentId', requireAuth, async (req, res) => {
  try {
    await filesService.deleteAttachment(parseInt(req.params.attachmentId), req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete attachment error:', error);
    if (error.message === 'Access denied' || error.message.includes('only delete')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
