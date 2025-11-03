# CSRF Protection Guide

## Overview

**CSRF (Cross-Site Request Forgery)** protection prevents attackers from making unauthorized requests on behalf of authenticated users.

The implementation uses:
- **Double-Submit Cookie Pattern**: Token in both cookie and header/body
- **Token Rotation**: New token after each request
- **Time-based Expiration**: Tokens expire after 1 hour
- **HTTP-Only Cookies**: Secure against XSS attacks

---

## How It Works

### 1. User Logs In
1. Server generates CSRF token
2. Token stored in HTTP-only cookie `XSRF-TOKEN`
3. Token sent in response headers for frontend

### 2. Frontend Makes Request
1. Frontend reads token from headers or cookie
2. Includes token in request header: `X-CSRF-Token`
3. Server validates token matches

### 3. Server Validates
1. Extracts token from header/body/query
2. Verifies token exists in store
3. Verifies token hasn't expired
4. Generates new token for next request

---

## Integration in Server

### Step 1: Add CSRF Middleware to Server

```javascript
// server/index.js

import {
  csrfTokenGeneration,
  csrfTokenVerification
} from './middleware/csrf.js';
import cookieParser from 'cookie-parser';

// Must be before routes
app.use(cookieParser());

// Generate token on login/session start
app.use('/api/auth/login', csrfTokenGeneration, authRoutes);

// Verify token on state-changing requests
app.use('/api/', csrfTokenVerification);
```

### Step 2: Update Login Route

```javascript
// server/routes/auth.js

router.post('/login', async (req, res) => {
  try {
    // Existing login logic...

    // Generate CSRF token on successful login
    csrfTokenGeneration(req, res, () => {
      res.json({
        message: 'Connexion réussie',
        accessToken,
        csrfToken: res.csrfToken, // Include in response
        user: { ... }
      });
    });
  } catch (error) {
    // ...
  }
});
```

### Step 3: Add Logout Clear

```javascript
// server/routes/auth.js

import { clearUserTokens } from '../middleware/csrf.js';

router.post('/logout', verifyTokenMiddleware, (req, res) => {
  const userId = req.user.id;

  // Clear all CSRF tokens for this user
  clearUserTokens(userId);

  res.json({ message: 'Déconnexion réussie' });
});
```

---

## Integration in Frontend

### Step 1: Store Token After Login

```javascript
// src/pages/Login.jsx

const saveTokensAndNavigate = (data) => {
  // Save access/refresh tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  // NEW: Save CSRF token
  localStorage.setItem('csrfToken', data.csrfToken);

  // Update API default headers
  api.defaults.headers.common['X-CSRF-Token'] = data.csrfToken;

  navigate('/dashboard');
};
```

### Step 2: Include Token in Requests

```javascript
// src/utils/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
});

// Interceptor to add CSRF token to all requests
api.interceptors.request.use((config) => {
  // Add CSRF token to state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

// Interceptor to handle new CSRF tokens in responses
api.interceptors.response.use(
  (response) => {
    // Extract new CSRF token from response headers
    const newToken = response.headers['x-new-csrf-token'];
    if (newToken) {
      localStorage.setItem('csrfToken', newToken);
      api.defaults.headers.common['X-CSRF-Token'] = newToken;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      // Token expired, redirect to login
      localStorage.removeItem('csrfToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 3: Update Logout

```javascript
// src/pages/Login.jsx or useTokenManagement.js

const handleLogout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear all tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('user');

    // Clear API defaults
    delete api.defaults.headers.common['X-CSRF-Token'];

    navigate('/login');
  }
};
```

---

## Usage Examples

### Example 1: Create Election with CSRF

```javascript
// Frontend
const createElection = async (electionData) => {
  try {
    const response = await api.post('/elections', {
      ...electionData,
      csrfToken: localStorage.getItem('csrfToken') // Also in body as backup
    });

    // Server validates token and responds
    console.log('Election created:', response.data);
  } catch (error) {
    if (error.response?.data?.code === 'CSRF_TOKEN_MISSING') {
      // Redirect to login for new token
      navigate('/login');
    }
  }
};
```

### Example 2: Multiple Token Sources

Server accepts CSRF token from multiple sources:

```javascript
// Option 1: Header (recommended)
headers: {
  'X-CSRF-Token': csrfToken
}

// Option 2: Request body
data: {
  ...payload,
  csrfToken: csrfToken
}

// Option 3: Query string (for GET forms)
params: {
  csrfToken: csrfToken
}

// Option 4: Cookie (automatically sent)
// XSRF-TOKEN cookie automatically included
```

---

## Security Best Practices

### ✅ DO

1. **Always include token on state-changing requests**
   ```javascript
   await api.post('/elections', data); // Token auto-included
   ```

2. **Update token after each request**
   - Server sends new token in `X-New-CSRF-Token` header
   - Frontend automatically updates localStorage

3. **Use HTTP-only cookies**
   - Protects against XSS attacks
   - Token only readable by server

4. **Set SameSite=Strict**
   - Prevents cross-site cookie sending
   - Most restrictive setting

### ❌ DON'T

1. **Don't store token in localStorage only**
   - Use HTTP-only cookies + header
   - localStorage can be accessed by XSS

2. **Don't skip CSRF protection**
   ```javascript
   // ❌ Bad
   axios.post('/delete-election', data); // No token!

   // ✅ Good
   api.post('/delete-election', data); // Token auto-included
   ```

3. **Don't use GET for state-changing operations**
   ```javascript
   // ❌ Bad - GET should be safe
   await api.get('/elections/123/delete');

   // ✅ Good - Use POST for changes
   await api.post(`/elections/123/delete`);
   ```

---

## Testing CSRF Protection

### Test 1: Valid Token

```bash
# Get CSRF token
curl http://localhost:3000/api/csrf-token

# Response
{
  "token": "abc123...",
  "message": "CSRF token generated"
}

# Use token in request
curl -X POST http://localhost:3000/api/elections \
  -H "X-CSRF-Token: abc123..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","options":[...]}'

# Response: 200 OK
```

### Test 2: Missing Token

```bash
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","options":[...]}'

# Response: 403 Forbidden
{
  "error": true,
  "code": "CSRF_TOKEN_MISSING",
  "message": "CSRF token manquant. Veuillez recharger la page."
}
```

### Test 3: Invalid Token

```bash
curl -X POST http://localhost:3000/api/elections \
  -H "X-CSRF-Token: invalid-token" \
  -d '{"title":"Test","options":[...]}'

# Response: 403 Forbidden
{
  "error": true,
  "code": "CSRF_TOKEN_INVALID",
  "message": "CSRF token invalide ou expiré."
}
```

---

## Monitoring

### Get Token Stats

```javascript
import { getTokenStats } from './middleware/csrf.js';

// In admin endpoint
app.get('/admin/csrf-stats', (req, res) => {
  const stats = getTokenStats();
  res.json({
    totalTokens: stats.totalTokens,
    memoryUsage: stats.memoryUsage
  });
});
```

### Logs

```
[CSRF] Cleaned 150 expired tokens  // Hourly cleanup
[CSRF] Token verification error: ...
[CSRF] Token generation error: ...
```

---

## Migration from No CSRF Protection

### Before

```javascript
// No protection
router.post('/elections', async (req, res) => {
  // Anyone can POST to this endpoint
  // ...
});
```

### After

```javascript
// With CSRF protection
import { csrfTokenVerification } from '../middleware/csrf.js';

router.post('/elections',
  csrfTokenVerification, // Add this
  async (req, res) => {
    // Now protected
    // ...
  }
);
```

---

## Troubleshooting

### Issue: "CSRF token missing"

**Solution:**
1. Ensure token is saved after login: `localStorage.getItem('csrfToken')`
2. Check API interceptor includes header: `X-CSRF-Token`
3. Verify server is generating tokens

### Issue: "CSRF token invalid"

**Solution:**
1. Token expired (> 1 hour): Re-login
2. Token already used: Check if you're reusing old token
3. Multiple browser tabs: Each tab has different token, use fresh one

### Issue: "Token mismatch" (multi-user)

**Solution:**
- Each user has separate token in store
- Token tied to userId
- Verify correct user is logged in

---

## Performance Considerations

- **Token Storage**: In-memory (max ~10,000 tokens)
- **Cleanup**: Runs hourly, removes expired tokens
- **Memory**: ~500 bytes per token

For production with 100+ concurrent users:
- Consider Redis for token store
- Implement distributed session management
- Use database for persistent tokens

---

## OWASP Compliance

This implementation follows OWASP recommendations:

✅ **Double-Submit Cookie Pattern**
- Token in cookie + header
- Harder to forge across domains

✅ **Token Randomness**
- Cryptographically random tokens
- 32 bytes (256 bits)

✅ **Token Expiration**
- Tokens expire after 1 hour
- Reduces attack window

✅ **Token Rotation**
- New token after each request
- Limits token reuse

✅ **SameSite Cookies**
- `SameSite=Strict` prevents cross-site cookie
- Most restrictive setting

---

## Additional Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN CSRF Documentation](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

