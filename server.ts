
import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        console.log('[WS] Terminating inactive client');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Store room states in memory (for production, use a database)
  const rooms: Record<string, any> = {};
  const clients = new Map<WebSocket, string>();

  app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('URL parameter is required.');
    }

    try {
      const targetUrl = new URL(url);
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': targetUrl.origin
        },
        maxRedirects: 10
      });

      const contentType = response.headers['content-type'] || 'audio/mpeg';
      res.set('Content-Type', contentType);
      res.set('Content-Length', response.data.length);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error('Proxy error for URL:', url, error.message);
      const status = error.response?.status || 500;
      const message = error.response?.data?.toString() || error.message;
      res.status(status).send(`Error fetching the requested URL: ${message}`);
    }
  });

  wss.on('connection', (ws: any, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] New connection from ${ip} to ${req.url}`);
    
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`[WS] Message from ${ip}:`, data.type, data.roomId || '');
        
        if (data.type === 'join') {
          const roomId = data.roomId;
          if (!roomId) return;
          
          clients.set(ws, roomId);
          console.log(`[WS] Client ${ip} joined room: ${roomId}`);
          
          ws.send(JSON.stringify({ 
            type: 'sync', 
            state: rooms[roomId] || {} 
          }));
        } else if (data.type === 'update') {
          const roomId = clients.get(ws);
          if (roomId) {
            rooms[roomId] = {
              ...(rooms[roomId] || {}),
              ...data.payload
            };

            let count = 0;
            wss.clients.forEach((client) => {
              if (client !== ws && clients.get(client) === roomId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'update',
                  payload: data.payload
                }));
                count++;
              }
            });
            console.log(`[WS] Broadcasted update in ${roomId} to ${count} clients`);
          }
        } else if (data.type === 'command') {
          const roomId = clients.get(ws);
          if (roomId) {
            let count = 0;
            wss.clients.forEach((client) => {
              if (client !== ws && clients.get(client) === roomId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'command',
                  command: data.command,
                  payload: data.payload
                }));
                count++;
              }
            });
            console.log(`[WS] Broadcasted command ${data.command} in ${roomId} to ${count} clients`);
          }
        }
      } catch (e) {
        console.error('[WS] Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Connection closed from ${ip}`);
      clients.delete(ws);
    });

    ws.on('error', (err: any) => {
      console.error(`[WS] Connection error from ${ip}:`, err);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
  });
}

startServer().catch(err => {
  console.error('Critical failure during server startup:', err);
  process.exit(1);
});
