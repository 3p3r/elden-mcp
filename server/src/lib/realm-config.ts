import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read configuration from elden-realm.json
// Path from server/src/lib/ to root elden-realm.json
const realmConfigPath = join(__dirname, "../../../elden-realm.json");
const realmConfig = JSON.parse(readFileSync(realmConfigPath, "utf-8"));

// Extract configuration values
export const REALM_NAME = realmConfig.realm || "elden";
export const CLIENT_ID = realmConfig.clients?.[0]?.clientId || "";
export const CLIENT_SECRET = realmConfig.clients?.[0]?.secret || "";

// Build OIDC issuer URL
export const DEFAULT_OIDC_ISSUER = `http://localhost:8080/realms/${REALM_NAME}`;
export const DEFAULT_BASE_URL = "http://localhost:3000";

// Get OIDC configuration with environment variable overrides
export function getOidcConfig() {
  return {
    issuer: process.env.OIDC_ISSUER || DEFAULT_OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID || CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET || CLIENT_SECRET,
    baseUrl:
      process.env.BASE_URL && process.env.BASE_URL !== "/"
        ? process.env.BASE_URL
        : DEFAULT_BASE_URL,
  };
}

// Export realm config for tests
export { realmConfig };
