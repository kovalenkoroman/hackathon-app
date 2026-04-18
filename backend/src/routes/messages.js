import express from 'express';
import * as messagesService from '../services/messages.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

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
