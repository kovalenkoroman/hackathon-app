import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { readdir, copyFile, mkdir, access } from 'fs/promises';
import path from 'path';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import roomsRoutes from './routes/rooms.js';
import messagesRoutes from './routes/messages.js';
import friendsRoutes from './routes/friends.js';
import filesRoutes from './routes/files.js';
import { authMiddleware } from './middleware/auth.js';
import * as presenceService from './ws/presence.js';
import { handleAuth, handlePing } from './ws/handlers/auth.js';
import { handleSync } from './ws/handlers/sync.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

// Rooms routes
app.use('/api/v1/rooms', roomsRoutes);

// Messages routes
app.use('/api/v1', messagesRoutes);

// Friends routes
app.use('/api/v1/friends', friendsRoutes);

// Files routes
app.use('/api/v1/files', filesRoutes);

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const tabId = uuidv4();

  // The session cookie is httpOnly (not JS-readable), so we parse it from
  // the WebSocket upgrade request and stash it on the ws for handleAuth to
  // fall back on when the auth message doesn't carry an explicit token.
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/sessionToken=([^;]+)/);
  ws.cookieSessionToken = match ? match[1] : null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      if (type === 'auth' && !ws.userId) {
        await handleAuth(ws, payload, tabId);
      } else if (type === 'ping' && ws.userId) {
        await handlePing(ws);
        ws.send(JSON.stringify({ type: 'pong' }));
      } else if (type === 'sync' && ws.userId) {
        await handleSync(ws, payload);
      } else if (!ws.userId) {
        ws.send(JSON.stringify({ type: 'error', payload: { error: 'Not authenticated' } }));
      }
    } catch (error) {
      console.error('Message handler error:', error);
      ws.send(JSON.stringify({ type: 'error', payload: { error: 'Message error' } }));
    }
  });

  ws.on('close', async () => {
    if (ws.userId) {
      presenceService.removeConnection(ws.userId, ws.tabId);
      const currentPresence = presenceService.getPresence(ws.userId);
      // If user is now offline (no tabs left), notify friends and room members
      if (currentPresence.status === 'offline') {
        const broadcast = await import('./ws/broadcast.js');
        await broadcast.broadcastPresenceToFriends(ws.userId);
        await broadcast.broadcastPresenceToRoomMembers(ws.userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start AFK check
presenceService.startAFKCheck(10000);

// Copy bundled seed-upload files into UPLOAD_DIR on startup so that
// seeded attachment rows resolve to real files on disk. Idempotent:
// files already present in UPLOAD_DIR (including real user uploads) are skipped.
async function seedUploads() {
  const seedDir = path.resolve('seed-uploads');
  const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
  try {
    await access(seedDir);
  } catch {
    return;
  }
  await mkdir(uploadDir, { recursive: true });
  const files = await readdir(seedDir);
  for (const name of files) {
    const dest = path.join(uploadDir, name);
    try {
      await access(dest);
    } catch {
      await copyFile(path.join(seedDir, name), dest);
    }
  }
}

// Start server
seedUploads().catch((err) => console.error('seedUploads failed:', err)).finally(() => {
  server.listen(PORT);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});
