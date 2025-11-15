import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync } from "fs";

// Read configuration from elden-realm.json
const realmConfigPath = path.join(__dirname, "../elden-realm.json");
const realmConfig = JSON.parse(readFileSync(realmConfigPath, "utf-8"));

const REALM_NAME = realmConfig.realm || "elden";
const CLIENT_ID = realmConfig.clients?.[0]?.clientId || "";
const CLIENT_SECRET = realmConfig.clients?.[0]?.secret || "";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      BASE_URL: "http://localhost:3000",
      OIDC_ISSUER: `http://localhost:8080/realms/${REALM_NAME}`,
      OIDC_CLIENT_ID: CLIENT_ID,
      OIDC_CLIENT_SECRET: CLIENT_SECRET,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

