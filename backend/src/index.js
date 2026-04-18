import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';
import * as presenceService from './ws/presence.js';
import { handleAuth, handlePing } from './ws/handlers/auth.js';

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

// WebSocket connection handler
wss.on('connection', (ws) => {
  const tabId = uuidv4();

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      if (type === 'auth' && !ws.userId) {
        await handleAuth(ws, payload, tabId);
      } else if (type === 'ping' && ws.userId) {
        handlePing(ws);
        ws.send(JSON.stringify({ type: 'pong' }));
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
      const presenceChange = presenceService.getPresence(ws.userId);
      if (presenceChange) {
        // Notify friends of status change
        const broadcast = (await import('./ws/broadcast.js')).default;
        // Not awaiting to avoid blocking
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

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server listening at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});
