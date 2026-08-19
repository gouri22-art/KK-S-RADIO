import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory real-time presence tracker
interface ActiveSession {
  lastSeen: number;
  isPlaying: boolean;
  station: 'kk' | 'kishore';
}

const activeSessions = new Map<string, ActiveSession>();

// Cleanup stale sessions older than 25 seconds
function cleanupStaleSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 25000) {
      activeSessions.delete(sessionId);
    }
  }
}

// Presence Heartbeat Endpoint
app.post('/api/presence/heartbeat', (req, res) => {
  const { sessionId, isPlaying, station } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId' });
    return;
  }

  activeSessions.set(sessionId, {
    lastSeen: Date.now(),
    isPlaying: Boolean(isPlaying),
    station: station === 'kishore' ? 'kishore' : 'kk',
  });

  cleanupStaleSessions();

  const totalOnline = Math.max(1, activeSessions.size);
  let listeningCount = 0;
  for (const session of activeSessions.values()) {
    if (session.isPlaying) listeningCount++;
  }

  res.json({
    onlineCount: totalOnline,
    listeningCount: Math.max(listeningCount, isPlaying ? 1 : 0),
  });
});

// Presence Leave Beacon
app.post('/api/presence/leave', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.json({ status: 'ok' });
});

// Presence Count Endpoint
app.get('/api/presence/count', (req, res) => {
  cleanupStaleSessions();
  const totalOnline = Math.max(1, activeSessions.size);
  let listeningCount = 0;
  for (const session of activeSessions.values()) {
    if (session.isPlaying) listeningCount++;
  }
  res.json({
    onlineCount: totalOnline,
    listeningCount,
  });
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
