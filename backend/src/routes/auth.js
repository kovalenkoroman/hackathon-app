import express from 'express';
import * as authService from '../services/auth.js';
import * as sessionQueries from '../db/queries/sessions.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await authService.register(email, username, password);
    res.json({ data: user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await authService.login(
      email,
      password,
      req.ip,
      req.get('user-agent')
    );

    res.cookie('sessionToken', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ data: result.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/logout', authMiddleware, requireAuth, async (req, res) => {
  try {
    await authService.logout(req.session.id);
    res.clearCookie('sessionToken');
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ data: req.user });
});

router.post('/password/change', authMiddleware, requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ data: { message: 'Password changed successfully' } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/password/reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // In a real app, you'd send an email with a reset link.
    // For now, just log it and return success.
    console.log(`[PASSWORD RESET] Reset token requested for: ${email}`);

    res.json({ data: { message: 'If an account exists, a reset email will be sent' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/account', authMiddleware, requireAuth, async (req, res) => {
  try {
    await authService.deleteAccount(req.user.id);
    res.clearCookie('sessionToken');
    res.json({ data: { message: 'Account deleted successfully' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', authMiddleware, requireAuth, async (req, res) => {
  try {
    const sessions = await sessionQueries.listSessionsByUserId(req.user.id);
    const data = sessions.map(s => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', authMiddleware, requireAuth, async (req, res) => {
  try {
    const session = await sessionQueries.findSessionById(parseInt(req.params.id));

    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await sessionQueries.deleteSessionById(parseInt(req.params.id));
    res.json({ data: { message: 'Session deleted' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
