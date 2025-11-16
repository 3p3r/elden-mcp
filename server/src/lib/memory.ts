import memoize from "lodash/memoize";
import { type Socket } from "socket.io";

const ensureGlobal = <T>(name: string, initialValue: T) => {
  if (!(name in globalThis)) {
    (globalThis as any)[name] = initialValue;
  }
  return (globalThis as any)[name] as T;
};

export const getSocketToSessionMap = memoize(() => {
  const name = "__SOCKET_TO_SESSION_MAP__";
  const map = new Map<string, string>();
  return ensureGlobal<Map<string, string>>(name, map);
});

export const getSessionToSocketMap = memoize(() => {
  const name = "__SESSION_TO_SOCKET_MAP__";
  const map = new Map<string, string>();
  return ensureGlobal<Map<string, string>>(name, map);
});

export const getSocketStorage = memoize(() => {
  const name = "__SOCKET_STORAGE__";
  const map = new Map<string, Socket>();
  return ensureGlobal<Map<string, Socket>>(name, map);
});

export const addSocketSessionMapping = (socketId: string, sessionId: string) => {
  getSocketToSessionMap().set(socketId, sessionId);
  getSessionToSocketMap().set(sessionId, socketId);
};

export const getSessionIdBySocketId = (socketId: string): string | undefined => {
  return getSocketToSessionMap().get(socketId);
};

export const getSocketIdBySessionId = (sessionId: string): string | undefined => {
  return getSessionToSocketMap().get(sessionId);
};

export const removeSocketSessionMappingBySocketId = (socketId: string) => {
  const sessionId = getSessionIdBySocketId(socketId);
  if (sessionId) {
    getSocketToSessionMap().delete(socketId);
    getSessionToSocketMap().delete(sessionId);
  } else {
    for (const [sessId, sockId] of getSessionToSocketMap().entries()) {
      if (sockId === socketId) {
        getSessionToSocketMap().delete(sessId);
        getSocketToSessionMap().delete(socketId);
        break;
      }
    }
  }
};

export const removeSocketSessionMappingBySessionId = (sessionId: string) => {
  const socketId = getSocketIdBySessionId(sessionId);
  if (socketId) {
    getSessionToSocketMap().delete(sessionId);
    getSocketToSessionMap().delete(socketId);
  } else {
    for (const [sockId, sessId] of getSocketToSessionMap().entries()) {
      if (sessId === sessionId) {
        getSocketToSessionMap().delete(sockId);
        getSessionToSocketMap().delete(sessionId);
        break;
      }
    }
  }
};

export const storeSocket = (socket: Socket) => {
  getSocketStorage().set(socket.id, socket);
};

export const getSocketById = (socketId: string): Socket | undefined => {
  return getSocketStorage().get(socketId);
};

export const removeSocketById = (socketId: string) => {
  getSocketStorage().delete(socketId);
};
