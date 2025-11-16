import debug from "debug";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getOidcConfig } from "@/lib/realm-config";

const d = debug("mcp");

export async function GET() {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to sign-in if not authenticated
  if (!sessionData) {
    try {
      const requestHeaders = await headers();
      const { baseUrl } = getOidcConfig();
      const signInUrl = new URL(`${baseUrl}/api/auth/sign-in/oauth2`);

      // Get host from headers for proper request context
      const host = requestHeaders.get("host") || new URL(baseUrl).host;

      // Create a request to better-auth's OAuth sign-in endpoint
      const oauthRequest = new Request(signInUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: host,
          // Forward relevant headers from the original request
          cookie: requestHeaders.get("cookie") || "",
        },
        body: JSON.stringify({
          providerId: "keycloak",
          callbackURL: "/api/health", // Redirect back to health endpoint after auth
        }),
      });

      // Let better-auth handle the OAuth flow
      const response = await auth.handler(oauthRequest);

      if (response.status >= 500) {
        // Keycloak is likely unavailable, return 401 instead
        return NextResponse.json(
          {
            error: "Authentication required",
            message: "Please authenticate to access the health endpoint",
            redirectTo: "/api/auth/sign-in/oauth2",
          },
          { status: 401 }
        );
      }

      // Better-auth may return a redirect response (302/307) or a JSON response with redirect info
      if (response.status >= 300 && response.status < 400) {
        // It's already a redirect response, return it directly
        return response;
      }

      // If it's a JSON response with redirect info, extract the URL and redirect
      if (response.status === 200) {
        try {
          const data = await response.json();
          if (data.redirect && data.url) {
            return NextResponse.redirect(data.url);
          }
        } catch (e) {
          d("Failed to parse JSON from OAuth response: %O", e);
        }
      }

      // If we get here, something unexpected happened
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Please authenticate to access the health endpoint",
          redirectTo: "/api/auth/sign-in/oauth2",
        },
        { status: 401 }
      );
    } catch (error) {
      // Log unexpected errors (connection refused is expected when Keycloak is not running)
      const isConnectionRefused =
        error instanceof Error &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed") ||
          (error.cause instanceof Error && error.cause.message.includes("ECONNREFUSED")));

      if (!isConnectionRefused) {
        d("[Health Check] Failed to initiate OAuth sign-in: %O", error);
      }

      // Fallback: return 401 with redirect information
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Please authenticate to access the health endpoint",
          redirectTo: "/api/auth/sign-in/oauth2",
        },
        { status: 401 }
      );
    }
  }

  // Return health status JSON payload
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    authenticated: true,
    user: {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.name,
    },
  });
}
