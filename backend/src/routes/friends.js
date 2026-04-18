import express from 'express';
import * as friendsService from '../services/friends.js';
import * as friendQueries from '../db/queries/friends.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Send friend request by username
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const request = await friendsService.sendFriendRequest(req.user.id, username);
    res.status(201).json({ data: request });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Accept friend request
router.post('/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const friendship = await friendsService.acceptRequest(parseInt(req.params.id), req.user.id);
    res.json({ data: friendship });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reject friend request
router.post('/requests/:id/reject', requireAuth, async (req, res) => {
  try {
    await friendsService.removeFriend(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove friend
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await friendsService.removeFriend(parseInt(req.params.id), req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(400).json({ error: error.message });
  }
});

// List friends with presence
router.get('/', requireAuth, async (req, res) => {
  try {
    const friends = await friendsService.getFriendsWithPresence(req.user.id);
    res.json({ data: friends });
  } catch (error) {
    console.error('List friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List pending friend requests
router.get('/requests/pending', requireAuth, async (req, res) => {
  try {
    const requests = await friendQueries.listPendingRequests(req.user.id);
    res.json({ data: requests });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban user
router.post('/users/:userId/ban', requireAuth, async (req, res) => {
  try {
    const ban = await friendsService.banUser(req.user.id, parseInt(req.params.userId));
    res.status(201).json({ data: ban });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Unban user
router.delete('/users/:userId/ban', requireAuth, async (req, res) => {
  try {
    await friendsService.unbanUser(req.user.id, parseInt(req.params.userId));
    res.json({ data: null });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get dialog ID for user pair
router.get('/dialogs/:userId', requireAuth, async (req, res) => {
  try {
    const dialog = await friendQueries.getOrCreateDialog(req.user.id, parseInt(req.params.userId));
    res.json({ data: { dialogId: dialog.id } });
  } catch (error) {
    console.error('Get dialog error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get DM history with user
router.get('/dialogs/:userId/messages', requireAuth, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const messages = await friendsService.getDMHistory(
      req.user.id,
      parseInt(req.params.userId),
      before ? parseInt(before) : null,
      parseInt(limit)
    );
    res.json({ data: messages });
  } catch (error) {
    console.error('Get DM history error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Send DM
router.post('/dialogs/:userId/messages', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await friendsService.sendDM(req.user.id, parseInt(req.params.userId), content);
    res.status(201).json({ data: message });
  } catch (error) {
    console.error('Send DM error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
