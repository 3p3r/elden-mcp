# Testing Better-Auth OIDC with Postman

This guide explains how to test the better-auth OIDC integration with Postman.

## Prerequisites

**Start all services**:
```bash
npm run dev
```

This single command will start both:
- **Keycloak Server** on `http://localhost:8080` (usually takes 30-60 seconds to fully start)
- **Next.js Server** on `http://localhost:3000`

Wait for both services to be ready. You should see logs indicating both servers are running.

## Test User Credentials

From `elden-realm.json`:
- **Username**: `user`
- **Password**: `user`
- **Email**: `user@example.com`

## Postman Testing Guide

### Method 1: Direct OAuth 2.0 Flow with Postman (Recommended)

Postman has built-in OAuth 2.0 support that handles the full flow automatically. This method connects directly to Keycloak.

#### Step 1: Create a New Request

1. Open Postman
2. Create a new request (any method, e.g., GET)
3. Set URL to any endpoint you want to test (e.g., `http://localhost:3000/api/auth/get-session`)

#### Step 2: Configure OAuth 2.0

1. Go to the **Authorization** tab
2. Select **OAuth 2.0** as the type
3. Click **Get New Access Token**
4. Configure the following:

   **Token Name**: `Keycloak OAuth Token`
   
   **Grant Type**: `Authorization Code`
   
   **Callback URL**: `http://localhost:3000/api/auth/oauth2/callback/keycloak`
   
   **Auth URL**: `http://localhost:8080/realms/elden/protocol/openid-connect/auth`
   
   **Access Token URL**: `http://localhost:8080/realms/elden/protocol/openid-connect/token`
   
   **Client ID**: `my-client`
   
   **Client Secret**: `elden-secret`
   
   **Scope**: `openid profile email`
   
   **State**: (leave empty or generate random)
   
   **Client Authentication**: `Send as Basic Auth header` (or `Send client credentials in body`)

5. Click **Get New Access Token**
6. Postman will open a browser window for authentication
7. Log in with:
   - Username: `user`
   - Password: `user`
8. After successful login, Postman will capture the token and automatically add it to your request

#### Step 3: Test Better-Auth Endpoints

Once you have the access token, you can test better-auth endpoints:

**Request**: `GET http://localhost:3000/api/auth/get-session`

**Headers**:
- `Authorization`: `Bearer <access_token>` (automatically added by Postman)

**Note**: Better-auth uses session cookies, not bearer tokens. To test with better-auth's session system, use Method 2 or 3 below.

### Method 2: Browser-Based Flow (Best for Better-Auth Session Testing)

This method uses a browser to complete the OAuth flow, then you can use Postman to test with the session cookies.

#### Step 1: Initiate OAuth Sign-In

**Option A: Using Postman to get redirect URL**

1. In Postman, create a POST request to: `http://localhost:3000/api/auth/sign-in/oauth2`
2. Set body to JSON:
   ```json
   {
     "providerId": "keycloak",
     "callbackURL": "/dashboard"
   }
   ```
3. Send the request
4. Check the response headers for `Location` header
5. Copy the `Location` URL

**Option B: Construct the URL manually**

The redirect URL will be something like:
```
http://localhost:8080/realms/elden/protocol/openid-connect/auth?client_id=my-client&redirect_uri=http://localhost:3000/api/auth/oauth2/callback/keycloak&response_type=code&scope=openid%20profile%20email&state=...
```

#### Step 2: Complete Authentication in Browser

1. Open the redirect URL (from Step 1) in your browser
2. You'll see the Keycloak login page
3. Log in with:
   - Username: `user`
   - Password: `user`
4. After successful login, you'll be redirected back to your callback URL (`/dashboard` or whatever you specified)
5. Check your browser's developer tools (Network tab) to see the session cookies

#### Step 3: Copy Session Cookies to Postman

1. In browser DevTools, go to Application/Storage → Cookies
2. Find cookies for `http://localhost:3000`
3. Look for cookies like `better-auth.session_token` or similar
4. Copy the cookie value

#### Step 4: Test with Postman

**Request**: `GET http://localhost:3000/api/auth/get-session`

**Headers**:
```
Cookie: better-auth.session_token=<cookie_value>
```

**Response**: Should return your session and user information.

### Method 3: Manual OAuth Flow Testing

#### Step 1: Initiate OAuth Sign-In

**Request**: `POST http://localhost:3000/api/auth/sign-in/oauth2`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "providerId": "keycloak",
  "callbackURL": "/dashboard"
}
```

**Response**: You'll get a redirect (302) with a `Location` header pointing to Keycloak's authorization endpoint.

**Note**: This will redirect to Keycloak. To test manually:
1. Copy the `Location` header value
2. Open it in a browser
3. Log in with `user`/`user`
4. You'll be redirected back with an authorization code

#### Step 2: Exchange Authorization Code for Tokens

After getting the authorization code from the callback, exchange it for tokens:

**Request**: `POST http://localhost:8080/realms/elden/protocol/openid-connect/token`

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body** (x-www-form-urlencoded):
```
grant_type: authorization_code
client_id: my-client
client_secret: elden-secret
code: <authorization_code_from_callback>
redirect_uri: http://localhost:3000/api/auth/oauth2/callback/keycloak
```

**Response**: You'll receive:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 300,
  "id_token": "..."
}
```

#### Step 3: Test Session Retrieval

**Request**: `GET http://localhost:3000/api/auth/get-session`

**Headers**:
```
Authorization: Bearer <access_token>
```

Or with cookies (if using browser flow):
```
Cookie: better-auth.session_token=<session_token>
```

### Method 3: Direct Password Grant (If Enabled)

**Note**: This requires "Direct Access Grants" to be enabled in Keycloak. It may not be enabled by default.

**Request**: `POST http://localhost:8080/realms/elden/protocol/openid-connect/token`

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body** (x-www-form-urlencoded):
```
grant_type: password
client_id: my-client
client_secret: elden-secret
username: user
password: user
scope: openid profile email
```

**Response**: Direct token response without browser flow.

### Method 4: Test Better-Auth API Endpoints

#### Get Session

**Request**: `GET http://localhost:3000/api/auth/get-session`

**Headers**: (none required, but cookies from browser session will work)

**Response** (when authenticated):
```json
{
  "session": {
    "id": "...",
    "userId": "...",
    "expiresAt": "..."
  },
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "..."
  }
}
```

**Response** (when not authenticated):
```json
null
```

#### Sign Out

**Request**: `POST http://localhost:3000/api/auth/sign-out`

**Headers**: (include session cookies)

#### Health Check

**Request**: `GET http://localhost:3000/api/health`

**Headers**: (include session cookies from authenticated session)

**Response** (when authenticated):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "..."
  },
  "hasAccessToken": true
}
```

**Response** (when not authenticated):
- Redirects (307) to Keycloak authorization endpoint for authentication
- Or returns 401 with error message if Keycloak is not available

## Testing Checklist

- [ ] Run `npm run dev` from the root directory
- [ ] Keycloak server is running on port 8080 (wait 30-60 seconds after starting)
- [ ] Next.js server is running on port 3000
- [ ] SQLite database file (`server/database.sqlite`) is created automatically
- [ ] Can access Keycloak discovery endpoint: `http://localhost:8080/realms/elden/.well-known/openid-configuration`
- [ ] Can initiate OAuth sign-in via better-auth
- [ ] Can complete OAuth flow and get tokens
- [ ] Can retrieve session with valid token
- [ ] Session returns null when not authenticated
- [ ] Health endpoint (`/api/health`) requires authentication and redirects to sign-in when not authenticated

## Troubleshooting

### Services Not Starting
- Make sure you're running `npm run dev` from the **root directory** (not the `server` directory)
- Check that Docker is running (required for Keycloak)
- Verify ports 8080 and 3000 are not already in use

### Keycloak Not Accessible
- Wait 30-60 seconds after starting - Keycloak takes time to fully initialize
- Check if Docker container is running: `docker ps`
- Check Keycloak logs in the `npm run dev` output
- Verify port 8080 is not in use: `lsof -i :8080` (Linux/Mac) or `netstat -ano | findstr :8080` (Windows)
- Test Keycloak directly: `curl http://localhost:8080/realms/elden/.well-known/openid-configuration`

### OAuth Redirect Issues
- Verify `redirectUris` in `elden-realm.json` includes `http://localhost:3000/*`
- Check that callback URL matches exactly: `http://localhost:3000/api/auth/oauth2/callback/keycloak`

### Invalid Client Credentials
- Verify `clientId` is `my-client`
- Verify `clientSecret` is `elden-secret`
- Check Keycloak admin console to verify client configuration

### Next.js Server Not Starting
- Check that port 3000 is not in use: `lsof -i :3000` (Linux/Mac) or `netstat -ano | findstr :3000` (Windows)
- Verify Node.js and npm are installed
- Check server logs in the `npm run dev` output
- Make sure you've run `npm install` in both root and `server` directories

### Session Not Working
- Ensure cookies are enabled in Postman settings
- Check that session cookies are being set in response headers
- Verify `BASE_URL` environment variable is set correctly

### Database Issues
- SQLite database file (`server/database.sqlite`) is created automatically on first run
- If you encounter database errors, you can delete the database file and it will be recreated
- The database file is gitignored and should not be committed
- Database schema is automatically created by better-auth on first use

### Running Tests
- Integration tests require Keycloak to be running - they will fail if Keycloak is not available
- Run `npm test` from the root directory to run all tests
- Run `npm run test:integration` to run only integration tests
- Ensure Keycloak is fully started (wait 30-60 seconds) before running tests

## Useful Endpoints

### Keycloak Endpoints
- Discovery: `http://localhost:8080/realms/elden/.well-known/openid-configuration`
- Authorization: `http://localhost:8080/realms/elden/protocol/openid-connect/auth`
- Token: `http://localhost:8080/realms/elden/protocol/openid-connect/token`
- UserInfo: `http://localhost:8080/realms/elden/protocol/openid-connect/userinfo`

### Better-Auth Endpoints
- Sign In: `POST http://localhost:3000/api/auth/sign-in/oauth2`
- Callback: `GET http://localhost:3000/api/auth/oauth2/callback/keycloak`
- Get Session: `GET http://localhost:3000/api/auth/get-session`
- Sign Out: `POST http://localhost:3000/api/auth/sign-out`
- Health Check: `GET http://localhost:3000/api/health` (requires authentication)

