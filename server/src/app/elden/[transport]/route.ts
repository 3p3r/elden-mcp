// import { z } from "zod";
import debug from "debug";
import { auth } from "@/lib/auth";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { type AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getSocketById, getSocketIdBySessionId } from "@/lib/memory";

const d = debug("mcp");

const timedPromise = <T>(promise: Promise<T>, ms = 5000): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const handler = createMcpHandler(
  (server) => {
    // todo: tools go here
    server.registerTool(
      "is_socket_connected",
      {
        description: "Check if the current socket is connected",
        inputSchema: {},
      },
      async (_params, extra) => {
        const makeResult = (answer: string) =>
          ({
            content: [
              {
                type: "text",
                text: answer,
              },
            ],
          } as any); // todo: fix this type.

        const sessionId = extra.authInfo?.extra?.sessionId as string | undefined;

        if (typeof sessionId !== "string") {
          d("no sessionId in authInfo extra");
          return makeResult("no"); // can't be connected without a session
        }

        const socketId = getSocketIdBySessionId(sessionId);

        if (typeof socketId !== "string") {
          d("no socketId found for sessionId: %s", sessionId);
          return makeResult("no");
        }

        const socket = getSocketById(socketId);

        if (!socket) {
          d("no socket found for socketId: %s", socketId);
          return makeResult("no");
        }

        d("checking socket connection for socketId: %s", socketId);

        try {
          const isConnected = await timedPromise<boolean>(
            new Promise((resolve) => {
              resolve(socket.connected);
            }),
            3000
          );

          d("socketId: %s connected: %s", socketId, isConnected ? "yes" : "no");

          return makeResult(isConnected ? "yes" : "no");
        } catch (err) {
          d("error checking socket connection for socketId: %s, error: %O", socketId, err);
          return makeResult("no");
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
  },
  {
    disableSse: true,
    basePath: "/elden", // this needs to match where the [transport] is located.
    maxDuration: 60,
    verboseLogs: true,
  }
);

const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const sessionData = await auth.api.getSession({
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!sessionData) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:messages", "write:messages"],
    clientId: "elden-mcp-client",
    extra: {
      sessionId: sessionData.session.id,
      userId: sessionData.user.id,
      permissions: ["user"],
      timestamp: new Date().toISOString(),
    },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["read:messages"],
  // MCP docs says this route is a must, but it seems to work without it?
  // resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST };
