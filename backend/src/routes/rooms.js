import express from 'express';
import crypto from 'crypto';
import * as roomsService from '../services/rooms.js';
import * as roomQueries from '../db/queries/rooms.js';
import * as messagesService from '../services/messages.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Create room
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, visibility } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });
    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility' });
    }

    const room = await roomsService.createRoom(name, description, visibility, req.user.id);
    res.status(201).json({ data: room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(400).json({ error: error.message });
  }
});

// List public rooms with search
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;
    const rooms = await roomQueries.listPublicRooms(search, parseInt(limit), parseInt(offset));
    res.json({ data: rooms });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rooms
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const rooms = await roomQueries.getUserRooms(req.user.id);
    res.json({ data: rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room detail with members
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const room = await roomQueries.findRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const members = await roomQueries.getRoomMembers(req.params.id);
    res.json({ data: { ...room, members } });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join public room
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const member = await roomsService.joinRoom(req.params.id, req.user.id);
    res.json({ data: member });
  } catch (error) {
    console.error('Join room error:', error);
    if (error.message.includes('Cannot join private room') || error.message.includes('You are banned')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Leave room
router.post('/:id/leave', requireAuth, async (req, res) => {
  try {
    await roomsService.leaveRoom(req.params.id, req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Leave room error:', error);
    if (error.message.includes('Room owner cannot leave')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Delete room (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await roomsService.deleteRoom(req.params.id, req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Delete room error:', error);
    if (error.message.includes('Only room owner can delete')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update room (owner/admin)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, visibility } = req.body;
    const room = await roomQueries.findRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const member = await roomQueries.getRoomMember(req.params.id, req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Only room admin or owner can update' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (visibility !== undefined) {
      if (!['public', 'private'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility' });
      }
      updates.visibility = visibility;
    }

    const updated = await roomQueries.updateRoom(req.params.id, updates);
    res.json({ data: updated });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban member
router.post('/:id/members/:userId/ban', requireAuth, async (req, res) => {
  try {
    await roomsService.banMember(req.params.id, parseInt(req.params.userId), req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Ban member error:', error);
    if (error.message.includes('Only room admin or owner can ban')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Unban member
router.delete('/:id/bans/:userId', requireAuth, async (req, res) => {
  try {
    await roomsService.unbanMember(req.params.id, parseInt(req.params.userId), req.user.id);
    res.json({ data: null });
  } catch (error) {
    console.error('Unban member error:', error);
    if (error.message.includes('Only room admin or owner can unban')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Promote to admin
router.post('/:id/admins/:userId', requireAuth, async (req, res) => {
  try {
    const member = await roomsService.promoteToAdmin(req.params.id, parseInt(req.params.userId), req.user.id);
    res.json({ data: member });
  } catch (error) {
    console.error('Promote admin error:', error);
    if (error.message.includes('Only room owner can promote')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Demote admin
router.delete('/:id/admins/:userId', requireAuth, async (req, res) => {
  try {
    const member = await roomsService.demoteFromAdmin(req.params.id, parseInt(req.params.userId), req.user.id);
    res.json({ data: member });
  } catch (error) {
    console.error('Demote admin error:', error);
    if (error.message.includes('Only room owner can demote')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Create invitation to private room
router.post('/:id/invitations', requireAuth, async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const invitation = await roomsService.createInvitation(req.params.id, req.user.id, token, expiresAt);
    res.status(201).json({ data: { token: invitation.token } });
  } catch (error) {
    console.error('Create invitation error:', error);
    if (error.message.includes('Only room owner or admin')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Accept invitation to join room
router.post('/invitations/:token/accept', requireAuth, async (req, res) => {
  try {
    const member = await roomsService.acceptInvitation(req.params.token, req.user.id);
    res.json({ data: member });
  } catch (error) {
    console.error('Accept invitation error:', error);
    if (error.message.includes('You are banned')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// List banned users
router.get('/:id/bans', requireAuth, async (req, res) => {
  try {
    const room = await roomQueries.findRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const bans = await roomQueries.getRoomBans(req.params.id);
    res.json({ data: bans });
  } catch (error) {
    console.error('Get bans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room messages (paginated)
router.get('/:roomId/messages', requireAuth, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const messages = await messagesService.getMessageHistory(
      req.params.roomId,
      req.user.id,
      before ? parseInt(before) : null,
      parseInt(limit)
    );
    res.json({ data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Send message
router.post('/:roomId/messages', requireAuth, async (req, res) => {
  try {
    const { content, replyToId } = req.body;
    const message = await messagesService.sendMessage(
      parseInt(req.params.roomId),
      req.user.id,
      content,
      replyToId ? parseInt(replyToId) : null
    );
    res.status(201).json({ data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
