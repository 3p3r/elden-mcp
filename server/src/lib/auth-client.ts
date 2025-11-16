import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient } from 'better-auth/client/plugins';

const hostname = process.env.NEXT_PUBLIC_HOSTNAME || "localhost";
const port = parseInt(process.env.NEXT_PUBLIC_PORT || "3000", 10);

export const authClient = createAuthClient({
  baseURL: `http://${hostname}:${port}`,
  plugins: [genericOAuthClient()],
});
