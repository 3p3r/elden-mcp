import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getOidcConfig } from "@/lib/realm-config";

export async function GET() {
  // Get session to check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to sign-in if not authenticated
  if (!session) {
    // Construct Keycloak authorization URL directly
    // Better-auth will handle the callback and state management
    const { issuer, clientId, baseUrl } = getOidcConfig();
    
    try {
      // Get discovery document to get the authorization endpoint
      const discoveryResponse = await fetch(`${issuer}/.well-known/openid-configuration`);
      if (discoveryResponse.ok) {
        const discovery = await discoveryResponse.json();
        const authUrl = new URL(discovery.authorization_endpoint);
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/oauth2/callback/keycloak`);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid profile email");
        // Store callback URL in state so we can redirect back after auth
        const state = Buffer.from(JSON.stringify({ callbackURL: "/api/health" })).toString("base64url");
        authUrl.searchParams.set("state", state);
        
        return NextResponse.redirect(authUrl);
      }
    } catch (error) {
      // Only log unexpected errors (not connection refused, which is expected when Keycloak is not running)
      const isConnectionRefused = error instanceof Error && (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed") ||
        (error.cause instanceof Error && error.cause.message.includes("ECONNREFUSED"))
      );
      
      if (!isConnectionRefused) {
        console.error("[Health Check] Failed to get OIDC discovery:", error);
      }
    }
    
    // Fallback: return 401 with redirect information
    return NextResponse.json(
      { 
        error: "Authentication required",
        message: "Please authenticate to access the health endpoint",
        redirectTo: "/api/auth/sign-in/oauth2"
      },
      { status: 401 }
    );
  }

  // Get access token for the OAuth provider
  let accessToken: string | null = null;
  try {
    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "keycloak",
      },
      headers: await headers(),
    });

    // Extract access token from response
    if (tokenResponse && typeof tokenResponse === "object" && "accessToken" in tokenResponse) {
      accessToken = tokenResponse.accessToken as string;
    } else if (typeof tokenResponse === "string") {
      accessToken = tokenResponse;
    }
  } catch (error) {
    // Token retrieval failed, but we'll still return health status
    console.error("Failed to retrieve access token:", error);
  }

  // Log the access token server-side
  if (accessToken) {
    console.log("[Health Check] Access Token:", accessToken);
  } else {
    console.log("[Health Check] No access token available");
  }

  // Return health status JSON payload
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    hasAccessToken: !!accessToken,
  });
}

