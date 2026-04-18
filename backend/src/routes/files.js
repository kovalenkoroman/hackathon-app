import express from 'express';
import { readFile } from 'fs/promises';
import { upload, validateFileSize } from '../middleware/upload.js';
import * as filesService from '../services/files.js';
import * as attachmentQueries from '../db/queries/attachments.js';
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
    res.status(201).json({ data: attachment });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get file (download)
router.get('/:attachmentId', requireAuth, async (req, res) => {
  try {
    const attachment = await filesService.getAttachment(parseInt(req.params.attachmentId), req.user.id);

    // Read file from disk
    const fileData = await readFile(`/app/uploads/${attachment.filename}`);

    // Set response headers
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Length', attachment.size);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);

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
