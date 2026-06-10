/**
 * Custom Next.js Server with Socket.IO
 *
 * Run with: npx tsx server.ts
 * Or in Docker: node server.js (after build)
 *
 * This wraps the Next.js standalone server with Socket.IO for real-time events.
 */
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './src/lib/realtime/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO on the same HTTP server
  const io = initSocketServer(server);
  console.log('[Server] Socket.IO initialized');

  server.listen(port, () => {
    console.log(`[Server] Galent SalesPilot running on http://${hostname}:${port}`);
    console.log(`[Server] Socket.IO available at ws://${hostname}:${port}/api/socketio`);
  });
});
