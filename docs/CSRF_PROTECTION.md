# CSRF Protection Implementation Guide

## Overview

This document describes the Complete Cross-Site Request Forgery (CSRF) protection system implemented in the e-voting platform. CSRF attacks attempt to make authenticated users perform unwanted actions without their knowledge.

## What is CSRF?

A CSRF attack works like this:

```
1. User logs into evoting.com
2. User visits malicious-site.com (without logging out)
3. Malicious site makes request to evoting.com:
   POST /api/elections/123/voters HTTP/1.1
   Host: evoting.com
   Cookie: session=user_session_cookie

   { "email": "attacker@evil.com" }

4. Browser automatically includes the user's session cookie
5. Request succeeds because browser can't distinguish legitimate from malicious requests
```

### CSRF Protection: Double-Submit Cookies

Our implementation uses the **Double-Submit Cookie** pattern:

```
1. User requests a form/page
2. Server generates a unique CSRF token
3. Token stored in HTTP-only cookie: XSRF-TOKEN
4. Token also sent to client in response
5. Client includes token in request header: X-CSRF-Token
6. Server verifies:
   - Token is in cookie
   - Token is in header/body
   - They match

7. On success, new token generated for next request
```

**Why this works:**
- Malicious site CAN'T read the token (HTTP-only cookie)
- Malicious site CAN'T include it in requests (same-origin policy)
- Only legitimate requests from our domain can succeed

---

## Architecture

### Server-Side Components

#### 1. **CSRF Middleware** (`server/middleware/csrf.js`)
```
Request Flow:
GET  → csrfTokenGeneration   → Generate & set cookie
POST → csrfTokenVerification → Verify token → Generate new token
```

**Key Functions:**
- `csrfTokenGeneration` - Generate token on any request
- `csrfTokenVerification` - Verify token on state-changing requests
- `csrfTokenProvider` - Endpoint to get CSRF token
- `clearUserTokens` - Clear tokens on logout

#### 2. **Token Store** (`server/utils/csrfTokenStore.js`)
Two implementations:

**In-Memory Store (Development):**
- Fast, no dependencies
- Tokens stored in JavaScript Map
- Automatic hourly cleanup
- Single-server only

**Redis Store (Production):**
- Distributed storage
- Automatic TTL expiration
- Multi-server support
- Better performance
- Requires Redis running

### Client-Side Components

#### 1. **useCsrfToken Hook** (`src/hooks/useCsrfToken.js`)
```javascript
const { token, updateToken, addTokenToHeaders } = useCsrfToken();
```

Functions:
- `updateToken(newToken)` - Update token from server
- `addTokenToHeaders(headers)` - Add token to request headers
- `addTokenToFormData(data)` - Add token to form data
- `clearToken()` - Clear on logout

#### 2. **API Client** (`src/utils/api.js`)
Enhanced with:
- Automatic CSRF token injection in request headers
- Automatic token update from response headers
- CSRF error handling with page reload
- Cookie inclusion (`withCredentials: true`)

---

## Setup & Integration

### Server Setup

#### Step 1: CSRF Middleware is Auto-Integrated
The middleware is already integrated in `server/index.js`:

```javascript
// Cookie parsing (needed for CSRF protection)
app.use(cookieParser());

// CSRF Protection - Generate tokens on all requests
app.use(csrfTokenGeneration);

// CSRF Protection - Verify tokens on state-changing requests
app.use(csrfTokenVerification);
```

#### Step 2: Configure Token Store (Optional)
By default, uses in-memory storage. For production with Redis:

```javascript
import { createTokenStore } from './utils/csrfTokenStore.js';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const tokenStore = createTokenStore(redisClient);
```

#### Step 3: Clear Tokens on Logout
In `server/routes/auth.js`:

```javascript
import { clearUserTokens } from '../middleware/csrf.js';

router.post('/logout', (req, res) => {
  const userId = req.user.id;

  // Clear CSRF tokens
  const cleared = clearUserTokens(userId);
  console.log(`Cleared ${cleared} CSRF tokens for user ${userId}`);

  // Continue with logout
  // ...
});
```

### Client Setup

#### Step 1: Use CSRF Hook in Components
```javascript
import { useCsrfToken } from '@hooks/useCsrfToken';

function MyForm() {
  const { token, addTokenToHeaders } = useCsrfToken();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const headers = addTokenToHeaders({
      'Content-Type': 'application/json'
    });

    const response = await fetch('/api/elections', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(formData)
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Step 2: API Calls Automatically Handle CSRF
The axios instance in `api.js` automatically:
- Includes CSRF token from sessionStorage
- Reads new token from response headers
- Handles CSRF errors

```javascript
import api from '@utils/api';

// CSRF token automatically added to headers
await api.post('/elections', {
  title: 'Election 2025',
  // ...
});
```

#### Step 3: Handle Token Updates
The API client automatically updates tokens:

```javascript
// Server sends: X-New-CSRF-Token header
// Client reads and stores in sessionStorage
// Next request uses new token
```

---

## How It Works - Request/Response Flow

### Successful Flow

```
1. User loads page
   GET /dashboard
   ↓
   Server: csrfTokenGeneration
   - Generates token: "abc123..."
   - Stores in tokenStore
   - Sets cookie: XSRF-TOKEN=abc123... (HTTP-only)
   Response includes token in body or header
   ↓
   Client: sessionStorage.setItem('CSRF_TOKEN', 'abc123...')

2. User submits form
   POST /api/elections
   Headers: {
     'X-CSRF-Token': 'abc123...',
     'Authorization': 'Bearer ...'
   }
   Cookies: { XSRF-TOKEN: abc123... }
   ↓
   Server: csrfTokenVerification
   - Gets token from headers: 'abc123...'
   - Looks up in tokenStore: Found ✓
   - Validates expiration: OK ✓
   - Deletes token (single-use): Done
   - Generates new token: 'def456...'
   - Stores new token
   - Sets new cookie
   Response header: X-New-CSRF-Token: def456...
   ↓
   Client: Updates sessionStorage with new token

3. Next request uses new token: def456...
```

### Error Cases

**Token Missing:**
```
POST /api/elections
Headers: { 'Authorization': 'Bearer ...' }
← Missing X-CSRF-Token header

403 Response:
{
  "error": true,
  "code": "CSRF_TOKEN_MISSING",
  "message": "CSRF token manquant"
}
```

**Token Expired:**
```
Headers: { 'X-CSRF-Token': 'old_token' }

403 Response:
{
  "error": true,
  "code": "CSRF_TOKEN_INVALID",
  "message": "CSRF token invalide ou expiré"
}
→ Client reloads page to get new token
```

**Token Mismatch:**
```
POST /elections
X-CSRF-Token: user_A_token (but logged in as user B)

403 Response:
{
  "error": true,
  "code": "CSRF_TOKEN_MISMATCH",
  "message": "Token ne correspond pas à l'utilisateur"
}
```

---

## API Reference

### Server Endpoints

#### GET Request (Token Generation)
```
GET /api/elections
Response Headers:
  Set-Cookie: XSRF-TOKEN=abc123...; HttpOnly; Secure; SameSite=Strict
Response Body:
  { "token": "abc123..." }
```

#### POST/PUT/DELETE Requests (Token Verification)
```
POST /api/elections
Headers:
  X-CSRF-Token: abc123...
  Authorization: Bearer ...

Response Headers:
  X-New-CSRF-Token: def456...
  Set-Cookie: XSRF-TOKEN=def456...; HttpOnly; Secure; SameSite=Strict

Response Body:
  { "success": true, ... }
```

### React Hook Usage

#### useCsrfToken()
```javascript
const {
  token,              // Current CSRF token
  loading,            // Still loading initial token?
  updateToken,        // Update token manually
  clearToken,         // Clear token (logout)
  addTokenToHeaders,  // Add to fetch/axios headers
  addTokenToFormData   // Add to form data
} = useCsrfToken();
```

**Example:**
```javascript
const { token, addTokenToHeaders } = useCsrfToken();

// Method 1: Using fetch
const response = await fetch('/api/elections', {
  method: 'POST',
  headers: addTokenToHeaders({
    'Content-Type': 'application/json'
  }),
  credentials: 'include',
  body: JSON.stringify(data)
});

// Method 2: Using axios (automatic via api.js)
import api from '@utils/api';
const response = await api.post('/elections', data);
// Token automatically included!
```

---

## Security Considerations

### ✅ What CSRF Protection Prevents

- **Malicious Form Submission**: Can't submit hidden forms without token
- **Unwanted API Calls**: Can't make POST/PUT/DELETE without token
- **Admin Impersonation**: Can't use admin features even if user is logged in
- **Cross-Site Requests**: Attacker site can't forge legitimate requests

### ✅ Additional Protections

1. **HTTP-Only Cookies**: Token in cookie can't be accessed by JavaScript
   ```javascript
   // Attacker can't do this:
   const token = document.cookie; // Can't read HTTP-only cookies!
   ```

2. **SameSite Attribute**: Cookie only sent same-site
   ```javascript
   // Even if attacker somehow had token, SameSite=Strict prevents sending
   // from malicious-site.com to evoting.com
   ```

3. **Single-Use Tokens**: Token deleted after use, new one required
   ```javascript
   // Replay attack won't work:
   POST /api/elections (token: abc123) ✓ Success, token deleted
   POST /api/elections (token: abc123) ✗ Fail, token not found
   ```

4. **User Validation**: Token validated against current user
   ```javascript
   // Token stealing won't work:
   User A creates token: abc123...
   Attacker gets token somehow
   Attacker logs in as User B
   POST /api/elections (token: abc123, User: B) ✗ Fail, token belongs to User A
   ```

5. **Expiration**: Tokens expire in 1 hour
   ```javascript
   // Old tokens become invalid:
   Token created: 10:00 AM
   Token valid until: 11:00 AM
   Request at: 11:30 AM ✗ Fail, token expired
   ```

### ⚠️ When CSRF Protection DOESN'T Apply

These request types are **NOT verified** (safe from CSRF):
- GET, HEAD, OPTIONS (read-only, no state change)
- Requests without session/authentication

These ARE protected (require valid CSRF token):
- POST, PUT, PATCH, DELETE
- Any state-changing operation

---

## Troubleshooting

### Issue: "CSRF token manquant" Error

**Cause**: Missing CSRF token in request
**Solution**:
1. Ensure using latest API client (`src/utils/api.js`)
2. Check sessionStorage has token: `sessionStorage.getItem('CSRF_TOKEN')`
3. Reload page to get new token

```bash
# Debug in browser console
console.log(sessionStorage.getItem('CSRF_TOKEN'));
```

### Issue: "CSRF token invalide ou expiré"

**Cause**: Token expired (1 hour) or doesn't exist
**Solution**:
1. Page automatically reloads to get new token
2. If still fails, clear storage and reload:
   ```javascript
   sessionStorage.clear();
   location.reload();
   ```

### Issue: "CSRF token ne correspond pas"

**Cause**: Token belongs to different user
**Solution**:
1. Logout and login again
2. Each user gets unique tokens
3. Tokens don't transfer between users

### Issue: Requests work in browser but fail in Postman

**Cause**: Postman doesn't handle cookies/tokens like a browser
**Solution**:
1. In Postman, manually add header:
   ```
   X-CSRF-Token: (paste token from response)
   ```
2. Or enable cookie jar in Postman settings

---

## Testing

### Unit Tests
```javascript
import { describe, it, expect } from 'vitest';
import { csrfTokenGeneration, csrfTokenVerification } from '../middleware/csrf';

describe('CSRF Protection', () => {
  it('should generate token on GET request', async () => {
    const req = { method: 'GET' };
    const res = { cookie: jest.fn() };

    csrfTokenGeneration(req, res, () => {
      expect(res.cookie).toHaveBeenCalled();
      expect(res.csrfToken).toBeDefined();
    });
  });

  it('should verify token on POST request', async () => {
    const token = 'test-token';
    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': token },
      user: { id: 'user-1' }
    };

    // Mock token store with valid token
    // Verify middleware accepts request
  });

  it('should reject POST without token', async () => {
    const req = { method: 'POST', headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    csrfTokenVerification(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Integration Tests
```javascript
// Test form submission with CSRF
describe('Form Submission', () => {
  it('should succeed with valid CSRF token', async () => {
    const response1 = await client.get('/dashboard');
    const token = extractTokenFromResponse(response1);

    const response2 = await client.post('/api/elections', {
      headers: { 'X-CSRF-Token': token },
      body: electionData
    });

    expect(response2.status).toBe(201);
  });
});
```

### Manual Testing Checklist
- [ ] GET request receives CSRF token in cookie
- [ ] POST request with valid token succeeds
- [ ] POST request without token returns 403
- [ ] POST with expired token returns 403
- [ ] Token updates after successful request
- [ ] New token can be used for next request
- [ ] Old token can't be reused
- [ ] Logout clears all tokens
- [ ] Different users have different tokens
- [ ] CSRF errors in console show helpful message

---

## Production Deployment

### Checklist

- [ ] **Use HTTPS**: All cookies marked Secure (only sent over HTTPS)
  ```javascript
  // In server/middleware/csrf.js
  secure: process.env.NODE_ENV === 'production'
  ```

- [ ] **Use Redis**: Production should use Redis token store
  ```javascript
  // Multiple servers need shared token storage
  const redisClient = redis.createClient({...});
  const tokenStore = createTokenStore(redisClient);
  ```

- [ ] **Monitor CSRF Errors**: Log all CSRF failures
  ```javascript
  // server/middleware/csrf.js already logs failures
  console.error('[CSRF] Token verification error:', error);
  ```

- [ ] **Set Secure Headers**:
  ```
  Set-Cookie: XSRF-TOKEN=...; Secure; HttpOnly; SameSite=Strict
  ```

- [ ] **HTTPS Redirect**: All HTTP requests redirect to HTTPS

- [ ] **Test with Production Domain**: CSRF protection is domain-specific

---

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
- [Double-Submit Cookie Pattern](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF))

---

**Last Updated**: January 2025
**Status**: Production Ready
