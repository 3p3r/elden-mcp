import { z } from "zod";
import debug from "debug";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
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

// const authHandler = withMcpAuth(handler);

export { handler as GET, handler as POST };