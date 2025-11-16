import { z } from "zod";
import debug from "debug";
import { auth } from "@/lib/auth";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { type AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
// import { ensureOneSocket } from "@/lib/memory";

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
    // todo: protect this route
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
  },
);

const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const sessionData = await auth.api.getSession({
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
  });

  if (!sessionData) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:messages", "write:messages"],
    clientId: "elden-mcp-client",
    extra: {
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
