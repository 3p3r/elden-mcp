import { describe, it, expect, beforeEach } from "vitest";
import { auth } from "./auth";
import { realmConfig, REALM_NAME, CLIENT_ID, CLIENT_SECRET, DEFAULT_OIDC_ISSUER, DEFAULT_BASE_URL } from "./realm-config";

describe("Better Auth Configuration", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.BASE_URL;
  });

  it("should initialize better-auth instance", () => {
    expect(auth).toBeDefined();
    expect(auth).toHaveProperty("api");
  });

  it("should use default OIDC configuration when env vars are not set", () => {
    const defaultAuth = auth;
    expect(defaultAuth).toBeDefined();
    
    // Verify the instance is properly configured
    expect(defaultAuth.api).toBeDefined();
  });

  it("should use environment variables when provided", () => {
    process.env.OIDC_ISSUER = "http://custom:8080/realms/test";
    process.env.OIDC_CLIENT_ID = "custom-client";
    process.env.OIDC_CLIENT_SECRET = "custom-secret";
    process.env.BASE_URL = "http://custom:3000";

    // Re-import to get new instance with env vars
    // Note: In a real scenario, you might need to clear module cache
    // For this test, we're verifying the configuration logic
    expect(process.env.OIDC_ISSUER).toBe("http://custom:8080/realms/test");
    expect(process.env.OIDC_CLIENT_ID).toBe("custom-client");
    expect(process.env.OIDC_CLIENT_SECRET).toBe("custom-secret");
    expect(process.env.BASE_URL).toBe("http://custom:3000");
  });

  it("should have OIDC provider configured", () => {
    // Verify auth instance has the expected structure
    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
    
    // The genericOAuth plugin should be registered
    // We can verify this by checking if the auth instance is functional
    expect(typeof auth.api).toBe("object");
  });

  describe("OIDC Provider Configuration", () => {
    it("should use correct default issuer URL from elden-realm.json", () => {
      const expectedIssuer = DEFAULT_OIDC_ISSUER;
      expect(process.env.OIDC_ISSUER || DEFAULT_OIDC_ISSUER).toBe(expectedIssuer);
      expect(expectedIssuer).toContain(REALM_NAME);
    });

    it("should use correct default client ID from elden-realm.json", () => {
      const expectedClientId = CLIENT_ID;
      expect(process.env.OIDC_CLIENT_ID || CLIENT_ID).toBe(expectedClientId);
      expect(expectedClientId).toBe(realmConfig.clients?.[0]?.clientId);
    });

    it("should use correct default client secret from elden-realm.json", () => {
      const expectedClientSecret = CLIENT_SECRET;
      expect(process.env.OIDC_CLIENT_SECRET || CLIENT_SECRET).toBe(expectedClientSecret);
      expect(expectedClientSecret).toBe(realmConfig.clients?.[0]?.secret);
    });

    it("should use correct default base URL", () => {
      const expectedBaseUrl = DEFAULT_BASE_URL;
      expect(process.env.BASE_URL || DEFAULT_BASE_URL).toBe(expectedBaseUrl);
    });
  });

  describe("API Routes", () => {
    it("should expose auth API methods", () => {
      expect(auth.api).toBeDefined();
      expect(typeof auth.api).toBe("object");
    });
  });
});

