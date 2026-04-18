import express from 'express';
import * as messagesService from '../services/messages.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Get unread counts
router.get('/unreads', requireAuth, async (req, res) => {
  try {
    const counts = await messagesService.getUnreadCounts(req.user.id);
    res.json({ data: counts });
  } catch (error) {
    console.error('Get unreads error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark room as read
router.post('/rooms/:id/mark-read', requireAuth, async (req, res) => {
  try {
    const { lastMessageId } = req.body;
    if (!lastMessageId) {
      return res.status(400).json({ error: 'lastMessageId is required' });
    }
    await messagesService.markRoomAsRead(parseInt(req.params.id), req.user.id, lastMessageId);
    res.json({ data: null });
  } catch (error) {
    console.error('Mark room as read error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mark dialog as read
router.post('/dialogs/:id/mark-read', requireAuth, async (req, res) => {
  try {
    const { lastMessageId } = req.body;
    if (!lastMessageId) {
      return res.status(400).json({ error: 'lastMessageId is required' });
    }
    await messagesService.markDialogAsRead(parseInt(req.params.id), req.user.id, lastMessageId);
    res.json({ data: null });
  } catch (error) {
    console.error('Mark dialog as read error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Edit message
router.patch('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await messagesService.editMessage(
      parseInt(req.params.id),
      req.user.id,
      content
    );
    res.json({ data: message });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete message
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    await messagesService.deleteMessage(parseInt(req.params.id), req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Delete message error:', error);
    if (error.message.includes('You can only delete')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Message not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
