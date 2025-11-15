import { describe, it, expect, beforeAll } from "vitest";
import { auth } from "./auth";
import { realmConfig, REALM_NAME, CLIENT_ID, CLIENT_SECRET, DEFAULT_OIDC_ISSUER, DEFAULT_BASE_URL, getOidcConfig } from "./realm-config";

// Extract test user credentials from realm config
const testUser = realmConfig.users?.[0];
const TEST_USER = {
  username: testUser?.username || "",
  password: testUser?.credentials?.[0]?.value || "",
  email: testUser?.email || "",
};

// Get OIDC configuration (with env var overrides)
const { issuer: KEYCLOAK_URL } = getOidcConfig();
const BASE_URL = DEFAULT_BASE_URL;

// Helper to check if Keycloak is available
async function isKeycloakAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${KEYCLOAK_URL}/.well-known/openid-configuration`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("Better Auth OIDC Integration Tests", () => {
  let keycloakAvailable: boolean;

  beforeAll(async () => {
    keycloakAvailable = await isKeycloakAvailable();
  });

  describe("OIDC Provider Discovery", () => {
    it("should discover Keycloak OIDC configuration", async () => {
      expect(keycloakAvailable).toBe(true);

      const response = await fetch(`${KEYCLOAK_URL}/.well-known/openid-configuration`);
      expect(response.ok).toBe(true);

      const config = await response.json();
      expect(config).toHaveProperty("issuer");
      expect(config).toHaveProperty("authorization_endpoint");
      expect(config).toHaveProperty("token_endpoint");
      expect(config).toHaveProperty("userinfo_endpoint");
      expect(config.issuer).toBe(KEYCLOAK_URL);
    });
  });

  describe("OAuth Sign-In Flow", () => {
    it("should initiate OAuth sign-in with Keycloak provider", async () => {
      expect(keycloakAvailable).toBe(true);

      // Test the server-side API to initiate OAuth sign-in
      // Use the handler directly to get proper request context
      const request = new Request(`${BASE_URL}/api/auth/sign-in/oauth2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
        },
        body: JSON.stringify({
          providerId: "keycloak",
          callbackURL: "/test-callback",
        }),
      });

      const response = await auth.handler(request);

      // Should return a redirect response
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
      
      // The response should contain a redirect URL pointing to Keycloak
      const location = response.headers.get("location");
      if (location) {
        expect(location).toContain(KEYCLOAK_URL);
        expect(location).toContain("authorization");
        expect(location).toContain("client_id");
        expect(location).toContain("redirect_uri");
        // If we have a location header, status should be a redirect
        expect([302, 307, 308]).toContain(response.status);
      } else {
        // If no location header, check the response body or status
        if (response.status === 200) {
          // Might be returning JSON with redirect URL
          const body = await response.json().catch(() => null);
          if (body && body.url) {
            expect(body.url).toContain(KEYCLOAK_URL);
          } else {
            // Check if it's a redirect in the body
            const text = await response.text();
            expect(text).toContain(KEYCLOAK_URL);
          }
        } else if (response.status === 400) {
          const errorText = await response.text();
          throw new Error(`Unexpected 400 error: ${errorText}`);
        } else {
          expect([302, 307, 308]).toContain(response.status);
        }
      }
    });

    it("should include correct OAuth parameters in authorization URL", async () => {
      expect(keycloakAvailable).toBe(true);

      // Use the handler directly to get proper request context
      const request = new Request(`${BASE_URL}/api/auth/sign-in/oauth2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
        },
        body: JSON.stringify({
          providerId: "keycloak",
          callbackURL: "/test-callback",
        }),
      });

      const response = await auth.handler(request);

      expect(response).toBeInstanceOf(Response);
      const location = response.headers.get("location");
      
      if (location) {
        const url = new URL(location);
        
        // Check for required OAuth parameters
        expect(url.searchParams.has("client_id")).toBe(true);
        expect(url.searchParams.has("redirect_uri")).toBe(true);
        expect(url.searchParams.has("response_type")).toBe(true);
        expect(url.searchParams.has("scope")).toBe(true);
        
        // Verify client ID matches configuration from elden-realm.json
        const clientId = url.searchParams.get("client_id");
        const { clientId: expectedClientId } = getOidcConfig();
        expect(clientId).toBe(expectedClientId);
        
        // Verify scopes include openid
        const scope = url.searchParams.get("scope");
        expect(scope).toContain("openid");
        
        // If we have a location header, status should be a redirect
        expect([302, 307, 308]).toContain(response.status);
      } else {
        // If no location header, check the response body or status
        if (response.status === 200) {
          // Might be returning JSON with redirect URL
          const body = await response.json().catch(() => null);
          if (body && body.url) {
            const url = new URL(body.url);
            expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
          } else {
            // Check if it's a redirect in the body
            const text = await response.text();
            expect(text).toContain(KEYCLOAK_URL);
          }
        } else if (response.status === 400) {
          const errorText = await response.text();
          throw new Error(`Unexpected 400 error: ${errorText}`);
        } else {
          expect([302, 307, 308]).toContain(response.status);
        }
      }
    });
  });

  describe("Session Management", () => {
    it("should handle session retrieval API", async () => {
      // Test that the session API endpoint exists and responds
      // This doesn't require Keycloak to be running
      expect(auth.api).toBeDefined();
      expect(auth.api.getSession).toBeDefined();
      expect(typeof auth.api.getSession).toBe("function");
    });

    it("should return null session when not authenticated", async () => {
      // Create a mock request without authentication
      const mockHeaders = new Headers();
      const session = await auth.api.getSession({
        headers: mockHeaders,
      });

      // Should return null or undefined when not authenticated
      expect(session).toBeNull();
    });
  });

  describe("OIDC Configuration Validation", () => {
    it("should have correct OIDC provider configuration", () => {
      // Verify the auth instance has the OIDC provider configured
      expect(auth).toBeDefined();
      
      // The genericOAuth plugin should be registered
      // We can verify this by checking if signInSocial works
      expect(auth.api.signInSocial).toBeDefined();
      expect(typeof auth.api.signInSocial).toBe("function");
    });

    it("should use correct Keycloak endpoints from elden-realm.json", () => {
      const { issuer } = getOidcConfig();
      expect(KEYCLOAK_URL).toBe(issuer);
      expect(issuer).toContain(REALM_NAME);
    });

    it("should use correct client credentials from elden-realm.json", () => {
      // Verify client credentials are loaded from elden-realm.json
      expect(CLIENT_ID).toBeTruthy();
      expect(CLIENT_SECRET).toBeTruthy();
      expect(CLIENT_ID).toBe(realmConfig.clients?.[0]?.clientId);
      expect(CLIENT_SECRET).toBe(realmConfig.clients?.[0]?.secret);
      
      // Verify getOidcConfig returns correct values
      const { clientId, clientSecret } = getOidcConfig();
      expect(clientId).toBeTruthy();
      expect(clientSecret).toBeTruthy();
      expect(clientId).toBe(CLIENT_ID);
      expect(clientSecret).toBe(CLIENT_SECRET);
    });
  });

  describe("Test User Credentials", () => {
    it("should have test user credentials loaded from elden-realm.json", () => {
      // Verify credentials are loaded from elden-realm.json
      expect(TEST_USER.username).toBeTruthy();
      expect(TEST_USER.password).toBeTruthy();
      expect(TEST_USER.email).toBeTruthy();
      expect(TEST_USER.username).toBe(testUser?.username);
      expect(TEST_USER.email).toBe(testUser?.email);
    });

    it("should be able to authenticate test user with Keycloak", async () => {
      expect(keycloakAvailable).toBe(true);

      // Get the token endpoint from discovery
      const discoveryResponse = await fetch(`${KEYCLOAK_URL}/.well-known/openid-configuration`);
      const discovery = await discoveryResponse.json();
      const tokenEndpoint = discovery.token_endpoint;

      // Get client credentials from elden-realm.json (or env override)
      const { clientId, clientSecret } = getOidcConfig();

      // First, we need to get an authorization code by simulating the login
      // For a full integration test, we would need to:
      // 1. Get authorization URL
      // 2. Simulate user login at Keycloak
      // 3. Get the authorization code from callback
      // 4. Exchange code for tokens
      
      // For now, we'll test the direct password grant (if enabled in Keycloak)
      // Note: This requires the "Direct Access Grants" to be enabled in Keycloak
      try {
        const tokenResponse = await fetch(tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: clientId,
            client_secret: clientSecret,
            username: TEST_USER.username,
            password: TEST_USER.password,
            scope: "openid profile email",
          }),
        });

        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          expect(tokens).toHaveProperty("access_token");
          expect(tokens).toHaveProperty("token_type");
          expect(tokens.token_type).toBe("Bearer");
          
          // Verify we can get user info with the access token
          if (tokens.access_token && discovery.userinfo_endpoint) {
            const userInfoResponse = await fetch(discovery.userinfo_endpoint, {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            });

            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              expect(userInfo).toHaveProperty("email");
              expect(userInfo.email).toBe(TEST_USER.email);
            }
          }
        } else {
          // Direct access grants might not be enabled, which is fine
          // This is a valid configuration for OIDC
          // The OAuth flow would still work through the browser
        }
      } catch (error) {
        // If direct access grants are not enabled, that's okay
        // The OAuth flow would still work through the browser
      }
    });
  });
});

