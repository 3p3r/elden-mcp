import memoize from 'lodash/memoize';

const getSocketToSessionMap = memoize(() => new Map<string, string>());
const getSessionToSocketMap = memoize(() => new Map<string, string>());

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
