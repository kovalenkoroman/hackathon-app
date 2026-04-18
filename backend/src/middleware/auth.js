import * as authService from '../services/auth.js';

export async function authMiddleware(req, res, next) {
  const token = req.cookies.sessionToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await authService.getSessionUser(token);
  if (!result) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = result.user;
  req.session = result.session;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
