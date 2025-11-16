import { authClient } from "@/lib/auth-client";
import { io, type Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<string>("disconnected");

  useEffect(() => {
    if (sessionData && !socket) {
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const port = typeof window !== "undefined" ? window.location.port || "3000" : "3000";

      setSocketStatus("connecting");

      const newSocket: Socket = io({ withCredentials: true });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        setSocketStatus(`connected. Bearer: ${sessionData.session.token}`);
      });

      newSocket.on("error", (msg: string) => {
        setSocketStatus(`error: ${msg}`);
      });

      newSocket.on("connect_error", (error) => {
        setSocketStatus(`connection error: ${error.message}`);
      });

      newSocket.on("disconnect", (reason) => {
        setSocketStatus(`disconnected: ${reason}`);
      });

      return () => {
        setSocketStatus("disconnected");
      };
    } else if (!sessionData && socket) {
      socket.disconnect();
      setSocket(null);
      setSocketStatus("disconnected");
    }
  }, [sessionData, socket]);

  if (isPending) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Elden MCP Socket.IO Test</h1>
      {sessionData ? (
        <>
          <p>Signed in as {sessionData.user.email}</p>
          <p>
            Socket Status: <strong>{socketStatus}</strong>
          </p>
          {socket && socket.connected && <p style={{ color: "green" }}>✓ Socket is connected!</p>}
          <button onClick={() => authClient.signOut()}>Sign out</button>
        </>
      ) : (
        <>
          <p>Please sign in to test socket connection</p>
          <button
            onClick={async () => {
              await authClient.signIn.oauth2({
                providerId: "keycloak",
                callbackURL: "/", // Redirect after success
                errorCallbackURL: "/error",
                scopes: ["openid", "profile", "email"],
              });
            }}
          >
            Sign in with OIDC
          </button>
        </>
      )}
    </div>
  );
}
