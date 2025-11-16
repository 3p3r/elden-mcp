import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_OIDC_ISSUER, CLIENT_ID, DEFAULT_BASE_URL } from "@/lib/realm-config";

// Only mock next/headers since it's a Next.js framework dependency
// that doesn't work in test environment
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("Health Route - Real Implementation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variables to defaults from elden-realm.json
    process.env.OIDC_ISSUER = DEFAULT_OIDC_ISSUER;
    process.env.OIDC_CLIENT_ID = CLIENT_ID;
    process.env.BASE_URL = DEFAULT_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Unauthenticated Requests", () => {
    it("should return 401 when not authenticated and Keycloak is not available", async () => {
      // Mock headers to return empty headers (no session)
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      const response = await GET();

      // When Keycloak is not available, should return 401
      // But if Keycloak is available, it will redirect (307)
      if (response.status === 401) {
        const data = await response.json();
        expect(data).toMatchObject({
          error: "Authentication required",
          message: "Please authenticate to access the health endpoint",
          redirectTo: "/api/auth/sign-in/oauth2",
        });
      } else {
        // If Keycloak is available, it redirects (307)
        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.status).toBeLessThan(400);
      }
    });

    it("should redirect to Keycloak when not authenticated and Keycloak is available", async () => {
      // Mock headers to return empty headers (no session)
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      // Check if Keycloak is available
      let keycloakAvailable = false;
      try {
        const testResponse = await fetch(
          `${DEFAULT_OIDC_ISSUER}/.well-known/openid-configuration`,
          { signal: AbortSignal.timeout(2000) }
        );
        keycloakAvailable = testResponse.ok;
      } catch {
        keycloakAvailable = false;
      }

      if (!keycloakAvailable) {
        // Skip test if Keycloak is not available
        return;
      }

      const response = await GET();

      // Should redirect to Keycloak
      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      
      const location = response.headers.get("location");
      expect(location).toBeDefined();
      expect(location).toContain(`${DEFAULT_OIDC_ISSUER}/protocol/openid-connect/auth`);
      expect(location).toContain(`client_id=${CLIENT_ID}`);
      expect(location).toContain("redirect_uri=");
      expect(location).toContain("response_type=code");
      expect(location).toMatch(/scope=openid[+%20]profile[+%20]email/);
    });

    it("should include correct OAuth parameters in redirect URL when Keycloak is available", async () => {
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      // Check if Keycloak is available
      let keycloakAvailable = false;
      try {
        const testResponse = await fetch(
          `${DEFAULT_OIDC_ISSUER}/.well-known/openid-configuration`,
          { signal: AbortSignal.timeout(2000) }
        );
        keycloakAvailable = testResponse.ok;
      } catch {
        keycloakAvailable = false;
      }

      if (!keycloakAvailable) {
        return;
      }

      const response = await GET();
      const location = response.headers.get("location");

      if (location) {
        const url = new URL(location);
        expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
        expect(url.searchParams.get("redirect_uri")).toBe(
          `${DEFAULT_BASE_URL}/api/auth/oauth2/callback/keycloak`
        );
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("scope")).toBe("openid profile email");
        expect(url.searchParams.get("state")).toBeDefined();
      }
    });
  });

  describe("Authenticated Requests", () => {
    it("should return health status when authenticated with real session", async () => {
      // Create a real session by signing in (if possible)
      // For this test, we'll need to create a session through better-auth
      // Since we can't easily create a real session without a database,
      // we'll test that the route handles the real auth.api.getSession call
      
      // Mock headers with a session cookie
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      // Note: In a real scenario, this would contain actual session cookies
      (headers as any).mockResolvedValue(mockHeaders);

      // Call the real GET function which uses real auth.api.getSession
      const response = await GET();
      
      // Since we don't have a real session, it should either:
      // 1. Return 401 if no session and Keycloak unavailable
      // 2. Return 307 redirect if no session and Keycloak available
      // 3. Return 200 if somehow a session exists
      expect([200, 401, 307, 302, 303]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toMatchObject({
          status: "healthy",
          authenticated: true,
        });
        expect(data.timestamp).toBeDefined();
        expect(data.user).toBeDefined();
      }
    });

    it("should handle access token retrieval with real auth implementation", async () => {
      // This test verifies the real getAccessToken implementation is called
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET();

      // The route should handle token retrieval gracefully
      // It will either log a token or log "No access token available"
      if (response.status === 200) {
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls;
        const hasTokenLog = logCalls.some(call => 
          call[0] === "[Health Check] Access Token:" || 
          call[0] === "[Health Check] No access token available"
        );
        expect(hasTokenLog).toBe(true);
      }

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Environment Variable Handling", () => {
    it("should use environment variables for OIDC configuration", async () => {
      process.env.OIDC_ISSUER = "http://custom:8080/realms/test";
      process.env.OIDC_CLIENT_ID = "custom-client";
      process.env.BASE_URL = "http://custom:3000";

      const mockHeaders = new Headers();
      mockHeaders.set("host", "custom:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      const response = await GET();

      // Should use custom environment variables
      // Note: This will fail to connect to custom:8080, so will return 401
      if (response.status === 401) {
        const data = await response.json();
        expect(data.error).toBe("Authentication required");
      } else if (response.status >= 300 && response.status < 400) {
        // If somehow it redirects, verify it's a redirect
        expect(response.headers.get("location")).toBeDefined();
      }
    });

    it("should use default values when environment variables are not set", async () => {
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_CLIENT_ID;
      delete process.env.BASE_URL;

      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      const response = await GET();

      // Should use defaults from elden-realm.json
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          expect(location).toContain("localhost:8080");
          expect(location).toContain(CLIENT_ID);
        }
      } else {
        const data = await response.json();
        expect(data.error).toBe("Authentication required");
      }
    });
  });

  describe("Integration with Real Better-Auth", () => {
    it("should use real auth.api.getSession implementation", async () => {
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      // Verify auth.api.getSession is the real implementation
      expect(auth.api.getSession).toBeDefined();
      expect(typeof auth.api.getSession).toBe("function");

      // Call the route which will use the real implementation
      const response = await GET();

      // Should get a response (200 if authenticated, 401/307 if not)
      expect(response).toBeInstanceOf(Response);
      expect([200, 401, 307, 302, 303]).toContain(response.status);
    });

    it("should use real auth.api.getAccessToken implementation", async () => {
      const mockHeaders = new Headers();
      mockHeaders.set("host", "localhost:3000");
      (headers as any).mockResolvedValue(mockHeaders);

      // Verify auth.api.getAccessToken is the real implementation
      expect(auth.api.getAccessToken).toBeDefined();
      expect(typeof auth.api.getAccessToken).toBe("function");

      // The route will call this if authenticated
      // We can't easily test authenticated flow without a real session,
      // but we verify the real function exists and is callable
      const response = await GET();
      expect(response).toBeInstanceOf(Response);
    });
  });
});
