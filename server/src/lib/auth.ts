import { betterAuth } from "better-auth";
import { genericOAuth, bearer } from "better-auth/plugins";
import { getOidcConfig } from "./realm-config";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get OIDC configuration from elden-realm.json with environment variable overrides
const { issuer, clientId, clientSecret, baseUrl } = getOidcConfig();

// Initialize SQLite database
// Path: server/src/lib/ -> server/database.sqlite
const dbPath = join(__dirname, "../../database.sqlite");
const db = new Database(dbPath);

export const auth = betterAuth({
  baseURL: baseUrl,
  database: db,
  secret: process.env.BETTER_AUTH_SECRET || "change-me-please",
  plugins: [
    bearer(),
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId,
          clientSecret,
          discoveryUrl: `${issuer}/.well-known/openid-configuration`,
          scopes: ["openid", "profile", "email"],
        },
      ],
    }),
  ],
});
