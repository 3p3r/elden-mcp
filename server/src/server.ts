import next from "next";
import debug from "debug";
import { parse } from 'cookie';
import { Server } from "socket.io";
import { createServer } from "node:http";

import { auth } from "@/lib/auth";
import { addSocketSessionMapping, removeSocketSessionMappingBySocketId } from "@/lib/memory";

const d = debug("server");
const ws = require('ws').Server;

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.NEXT_PUBLIC_HOSTNAME || "localhost";
const port = parseInt(process.env.NEXT_PUBLIC_PORT || "3000", 10);

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    serveClient: false,
    wsEngine: ws,
    cors: {
      origin: `http://${hostname}:${port}`,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, n) => {
    d("validating auth for socket: %s", socket.id);

    const cookie = socket.handshake.headers.cookie || '';

    if (!cookie) {
      d("no cookies found in handshake, disconnecting socket: %s", socket.id);
      socket.disconnect(true);
      return n(new Error("Authentication error: No cookies"));
    }

    const cookies = parse(cookie);
    const sessionCookie = cookies['better-auth.session_token'] || cookies['__Secure-better-auth.session_token'];

    if (!sessionCookie) {
      d("no session cookie found, disconnecting socket: %s", socket.id);
      socket.disconnect(true);
      return n(new Error("Authentication error: No session cookie"));
    }

    try {
      const sessionData = await auth.api.getSession({
        headers: { cookie: socket.handshake.headers.cookie || '' },
      });

      if (!sessionData) {
        d("invalid session, disconnecting socket: %s", socket.id);
        return n(new Error("Authentication error: Invalid session"));
      }

      // Associate user and session data with the socket
      socket.data.user = sessionData.user;
      socket.data.session = sessionData.session;

      addSocketSessionMapping(socket.id, sessionData.session.id);

      d("authenticated socket: %s for user id: %s", socket.id, sessionData.user.id);
      return n();
    } catch (error) {
      d("error validating session for socket: %s, error: %s, stack: %s", socket.id, error, error instanceof Error ? error.stack : 'no stack');
      return n(new Error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });

  io.on("connection", (socket) => {
    d("a user connected: %s", socket.id);

    socket.on("disconnect", (reason) => {
      d("user disconnected: %s, reason: %s", socket.id, reason);
      removeSocketSessionMappingBySocketId(socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });

  return httpServer;
});
