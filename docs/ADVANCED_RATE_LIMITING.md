# Advanced Rate Limiting System

## Overview

This document describes the comprehensive rate limiting system that protects the e-voting platform against:

- **Brute Force Attacks**: Multiple failed login attempts
- **Distributed Attacks**: Coordinated attempts from multiple IPs
- **Double Voting**: Users voting multiple times
- **API Abuse**: Excessive API requests
- **Automated Attacks**: Bots and automated tools

## Key Features

### 1. **Multi-Identifier Rate Limiting**
```
IP Address + Device Fingerprint + User ID
↓
Harder to spoof than IP-only limiting
```

### 2. **Device Fingerprinting**
```
User-Agent + Accept-Language + Encoding + IP
↓
SHA-256 Hash (64 chars)
↓
Unique device identifier (spoofable but harder)
```

### 3. **Exponential Backoff**
```
Failed Attempt 1: 15 seconds
Failed Attempt 2: 30 seconds
Failed Attempt 3: 60 seconds
Failed Attempt 4: 300 seconds (5 minutes)
Failed Attempt 5+: 3600 seconds (1 hour)
```

### 4. **Multiple Rate Limit Tiers**

| Tier | Type | Limit | Window | Use Case |
|------|------|-------|--------|----------|
| **General** | Per IP | 100 req | 15 min | All API requests |
| **Login** | IP + Fingerprint | 5 attempts | 15 min | Login endpoint |
| **Vote** | Voter Token | 1 vote | Lifetime | Vote submission |
| **API** | User ID | 50 req | 5 min | Authenticated requests |

### 5. **Production-Ready Storage**

**Development**: In-memory storage (single-server)
**Production**: Redis backend (multi-server, cluster)

## Architecture

```
Request
  ↓
Extract Identifier (IP + Device Fingerprint)
  ↓
Check Spoofing (VPN, Bot detection)
  ↓
Check Block Status
  ├─ If Blocked → Return 429 (Too Many Requests)
  └─ If Not Blocked → Continue
  ↓
Process Request
  ↓
On Failure → Record Attempt
  ├─ Check if should Block
  └─ Return appropriate response
  ↓
On Success → Clear Attempts
```

## Device Fingerprinting

### Components

```javascript
{
  userAgent: "Mozilla/5.0...",
  acceptLanguage: "en-US,en;q=0.9",
  ip: "192.168.1.100",
  acceptEncoding: "gzip, deflate",
  accept: "application/json"
}
```

### Hash Formula
```
SHA-256(UA | Accept-Language | IP | Accept-Encoding | Accept)
```

### Spoofing Detection

```javascript
// Detects:
- Headless browsers (Phantom, Selenium)
- Automated tools (curl, wget, Postman)
- Bot/crawler user agents
- VPN/Proxy services
- Missing/invalid user agents
```

## Implementation Guide

### Server-Side Setup

#### 1. Existing Rate Limiting (Already Integrated)

```javascript
// server/middleware/advancedRateLimit.js
- generalLimiter (100 req/15min per IP)
- loginLimiter (5 attempts/15min per IP)
- voteRateLimiter (1 vote per token)
```

#### 2. Enhanced Rate Limiting (New)

```javascript
// server/middleware/enhancedRateLimit.js
- enhancedLoginLimiter (IP + fingerprint)
- enhancedVoteRateLimiter (Token + fingerprint)
- enhancedGeneralLimiter (IP + fingerprint)
```

**To Use Enhanced Version:**

```javascript
import { enhancedLoginLimiter } from './middleware/enhancedRateLimit.js';

app.post('/api/auth/login', enhancedLoginLimiter, async (req, res) => {
  // Handle login
  // On success, rate limit is automatically cleared
});
```

#### 3. Device Fingerprinting

```javascript
import {
  createServerFingerprint,
  detectSpoofing,
  getCompositeIdentifier
} from './utils/deviceFingerprint.js';

const fingerprint = createServerFingerprint(req);
const spoofing = detectSpoofing(getCompositeIdentifier(req).components);

if (spoofing.isSuspicious) {
  console.warn(`Suspicious request: ${spoofing.reason}`);
}
```

#### 4. Redis Backend (Production)

```javascript
import redis from 'redis';
import { createRateLimitStore } from './utils/rateLimitStore.js';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const store = createRateLimitStore(redisClient);

// Now rate limits are shared across all servers
```

### Client-Side Handling

#### Display Remaining Attempts

```javascript
import api from '@utils/api';

try {
  const response = await api.post('/auth/login', credentials);
} catch (error) {
  if (error.response?.status === 429) {
    const remaining = error.response.data.attemptsRemaining;
    const retryAfter = error.response.data.retryAfter;

    alert(`Too many attempts. Try again in ${retryAfter}s`);
  }
}
```

#### Handle Rate Limit Headers

```javascript
// Response headers available:
// X-RateLimit-Limit: 5
// X-RateLimit-Remaining: 2
// X-RateLimit-Reset: 2025-01-20T15:45:00Z
// Retry-After: 60

const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');

console.log(`${remaining} attempts remaining out of ${limit}`);
```

## Response Examples

### Successful Request

```
200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2025-01-20T15:50:00Z

{
  "success": true,
  "data": {...}
}
```

### Rate Limited (Temporary)

```
429 Too Many Requests
Retry-After: 60
X-RateLimit-Remaining: 0

{
  "error": true,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts (5/5). Try again later.",
  "retryAfter": 60,
  "requiresCaptcha": true
}
```

### Rate Limited (Blocked)

```
429 Too Many Requests
Retry-After: 300
X-RateLimit-Remaining: 0

{
  "error": true,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts. Try again in 300s.",
  "retryAfter": 300,
  "requiresCaptcha": true
}
```

### Spoofed Request (High Risk)

```
429 Too Many Requests

{
  "error": true,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Suspicious activity detected",
  "requiresCaptcha": true
}
```

## Protection Matrix

### Login Endpoint
```
Attacker Scenario              | Detection | Protection
─────────────────────────────────────────────────────
Same IP, same device           | ✅ IP + FP| Block after 5 attempts
Same IP, different device      | ✅ FP    | Different block counter
Different IP, same fingerprint | ✅ FP    | Detect fingerprint spoofing
Different IP, different device | ✅ GZIP  | General rate limit applies
```

### Vote Endpoint
```
Attacker Scenario              | Detection | Protection
─────────────────────────────────────────────────────
Same voter token, same device  | ✅ Token | Block immediately (1 vote)
Stolen voter token             | ✅ IP+FP | Block after suspicious pattern
Multiple devices, same token   | ✅ FP    | Alert + block
```

### General API
```
Attacker Scenario              | Detection | Protection
─────────────────────────────────────────────────────
Flood same IP                  | ✅ IP+FP | 100 requests per 15min
Distributed IPs (same FP)      | ✅ FP    | Device fingerprint blocks
Botnet (different FP)          | ✅ UA    | Botnet detection blocks
```

## Metrics & Monitoring

### Available Metrics

```javascript
// Get rate limit store stats
const store = getRateLimitStore();
const stats = await store.stats();

console.log(stats);
// {
//   totalAttempts: 45,
//   totalBlocks: 12,
//   storeType: 'redis'
// }
```

### Prometheus Metrics

```javascript
// server/config/prometheus.js
rateLimitCounter.inc({ type: 'login', route: '/api/auth/login' });
```

### Logging

```javascript
// All rate limit events logged
logger.warn(`[RateLimit] Blocked request: login`, {
  ip: '192.168.1.100',
  fingerprint: 'a1b2c3d4...',
  attempts: 5,
  remaining: 0
});
```

## Configuration

### Environment Variables

```bash
# Rate Limiting
RATELIMIT_GENERAL_MAX=100
RATELIMIT_GENERAL_WINDOW=900000
RATELIMIT_LOGIN_MAX=5
RATELIMIT_LOGIN_WINDOW=900000
RATELIMIT_VOTE_MAX=1
RATELIMIT_VOTE_WINDOW=86400000

# Redis Backend
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

### Customization

```javascript
import { createEnhancedRateLimiter } from './middleware/enhancedRateLimit.js';

// Custom limiter
const customLimiter = createEnhancedRateLimiter({
  type: 'custom',
  maxAttempts: 10,
  windowMs: 60000, // 1 minute
  blockDuration: (attempt) => {
    // Custom backoff function
    return 30000 * Math.pow(1.5, attempt);
  },
  onBlock: async (req, identifier, attempts) => {
    // Custom block handler
    console.log(`Blocked ${identifier.id}`);
  }
});

app.post('/api/custom', customLimiter, handler);
```

## Testing

### Unit Tests

```javascript
import {
  createServerFingerprint,
  detectSpoofing
} from '../utils/deviceFingerprint.js';

describe('Device Fingerprinting', () => {
  it('should detect bot-like user agents', () => {
    const req = { headers: { 'user-agent': 'Phantom/2.0' } };
    const components = { userAgent: req.headers['user-agent'] };
    const spoofing = detectSpoofing(components);

    expect(spoofing.isSuspicious).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Login: 5 attempts blocked
- [ ] Login: Different device not blocked
- [ ] Vote: Single vote allowed
- [ ] Vote: Second vote blocked
- [ ] Bot detection: curl requests blocked
- [ ] VPN detection: VPN user agents detected
- [ ] Exponential backoff: Delays increase
- [ ] Redis: Multi-server sharing works
- [ ] Headers: X-RateLimit headers present
- [ ] Metrics: Events logged and counted

## Production Deployment

### Checklist

- [ ] **Redis Configured**: Multi-server deployments
- [ ] **Environment Variables**: Rate limits configured
- [ ] **Monitoring**: Prometheus metrics active
- [ ] **Logging**: Rate limit events logged
- [ ] **Testing**: All endpoints rate limited
- [ ] **Client Handling**: 429 responses handled
- [ ] **Alerts**: Rate limit spikes trigger alerts
- [ ] **Scaling**: Load tested with concurrent requests
- [ ] **Documentation**: Team trained on system

### Performance Tuning

```javascript
// Development (in-memory, single-server)
const store = createRateLimitStore();

// Production (Redis, multi-server)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  retryStrategy: (options) => {
    return Math.min(options.attempt * 100, 3000);
  }
});
const store = createRateLimitStore(redisClient);
```

### Scaling Considerations

```
Single Server:
┌──────────┐
│ Limiter  │ (In-memory)
│ Store    │
└──────────┘

Multiple Servers:
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Limiter  │   │ Limiter  │   │ Limiter  │
│ (Redis)  │←→ │ (Redis)  │←→ │ (Redis)  │
└──────────┘   └──────────┘   └──────────┘
       ↓              ↓              ↓
    ┌─────────────────────────────────────┐
    │     Redis Cluster               │
    │  Shared Rate Limit State        │
    └─────────────────────────────────────┘
```

## Troubleshooting

### Issue: Rate Limit Too Strict

**Solution**: Adjust limits in environment variables or code
```javascript
maxAttempts: 10  // Increase from 5
blockDuration: (attempt) => attempt * 30000  // Shorter blocks
```

### Issue: Rate Limit Not Applying

**Cause**: Middleware not registered correctly
**Solution**: Verify middleware order in index.js
```javascript
// CORRECT ORDER:
app.use(cookieParser());
app.use(generalLimiter);     // General first
app.post('/api/auth/login', loginLimiter, authHandler); // Specific
```

### Issue: Redis Connection Failed

**Cause**: Redis unavailable, fallback to in-memory
**Solution**: Check Redis status
```bash
redis-cli ping  # Should return PONG
```

### Issue: Different Limits Across Servers

**Cause**: In-memory storage, not using Redis
**Solution**: Configure Redis backend
```javascript
const store = createRateLimitStore(redisClient);  // Shared storage
```

## References

- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Rate Limiting Patterns](https://en.wikipedia.org/wiki/Rate_limiting)
- [Device Fingerprinting](https://en.wikipedia.org/wiki/Device_fingerprint)

---

**Last Updated**: January 2025
**Status**: Production Ready
