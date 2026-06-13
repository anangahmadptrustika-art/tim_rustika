// Custom Next.js server that hosts Socket.IO on the same HTTP server.
// Used in production (`npm start`) so realtime events share the Next port.
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    path: '/api/socket',
    cors: { origin: process.env.NEXTAUTH_URL || '*' },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) socket.join(`user:${userId}`);

    socket.on('join:department', (departmentId) => {
      if (departmentId) socket.join(`department:${departmentId}`);
    });
  });

  // Expose the io instance to the app services. In production the bundled
  // server imports the compiled emitter; here we attach to globalThis so the
  // Next runtime (same process) can pick it up.
  globalThis.__rustikaIO = io;

  server.listen(port, hostname, () => {
    console.log(`> Rustika PMS ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO listening on path /api/socket`);
  });
});
