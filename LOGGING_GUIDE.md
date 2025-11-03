# Structured Logging Guide

## Overview

The e-voting platform uses **Winston** for structured, production-grade logging with:
- ✅ Automatic sensitive data redaction
- ✅ Structured JSON logs
- ✅ Log rotation (5MB files, keep 10 files)
- ✅ Multiple log levels (debug, info, warn, error)
- ✅ File + Console transports
- ✅ Request/Response logging middleware

---

## Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **debug** | Detailed info for developers | Function entry/exit, variable values |
| **info** | Important events | User login, election created |
| **warn** | Potential problems | High failed login attempts, rate limit |
| **error** | Serious problems | Database connection failed, uncaught exception |

---

## Basic Usage

### Simple Logging

```javascript
import { log } from '../utils/logger.js';

// Error
log.error('Database connection failed', {
  database: 'postgres',
  error: 'Connection timeout'
});

// Warning
log.warn('High failed login rate', {
  ip: '192.168.1.1',
  attempts: 5
});

// Info
log.info('Election created', {
  electionId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Board Election 2024'
});

// Debug
log.debug('Processing vote', {
  voterId: 'abc123',
  electionId: 'def456'
});
```

### Output

**Console (Development):**
```
2024-11-02 14:30:45 [error]: Database connection failed
 {
  "metadata": {
    "database": "postgres",
    "error": "Connection timeout"
  },
  "service": "e-voting-api",
  "environment": "development",
  "timestamp": "2024-11-02 14:30:45"
}
```

**File (Production):**
```json
{
  "level": "error",
  "message": "Database connection failed",
  "metadata": {
    "database": "postgres",
    "error": "Connection timeout"
  },
  "service": "e-voting-api",
  "environment": "production",
  "timestamp": "2024-11-02 14:30:45"
}
```

---

## HTTP Logging Middleware

### Setup in Server

```javascript
// server/index.js

import { httpLogger, errorLogger } from './utils/logger.js';

// Add logging middleware early
app.use(httpLogger); // Log all HTTP requests

// ... your routes ...

// Add error logging at the end
app.use(errorLogger); // Log errors
```

### Automatic Logging

Every HTTP request is logged automatically:

```
2024-11-02 14:35:22 [info]: GET /api/elections/550e8400 200
 {
  "metadata": {
    "method": "GET",
    "path": "/api/elections/550e8400",
    "status": 200,
    "duration": "45ms",
    "userId": "user-123"
  }
}
```

---

## Specialized Logging Methods

### Authentication Logging

```javascript
import { log } from '../utils/logger.js';

// User login
log.auth('login', userId, true, {
  email: 'user@example.com',
  2fa: 'verified'
});

// User logout
log.auth('logout', userId, true, {
  session_duration: '1 hour'
});

// Login failure
log.auth('login', userId, false, {
  reason: 'invalid_password',
  attempt: 3
});
```

Output:
```json
{
  "level": "info",
  "message": "Auth login",
  "metadata": {
    "action": "login",
    "userId": "abc123",
    "success": true,
    "email": "user@example.com",
    "2fa": "verified",
    "timestamp": "2024-11-02T14:35:22.000Z"
  }
}
```

### Security Logging

```javascript
// Rate limit exceeded
log.security('rate_limit_exceeded', 'high', {
  ip: '192.168.1.1',
  endpoint: '/api/auth/login',
  attempts: 6
});

// Suspicious activity
log.security('multiple_failed_2fa', 'critical', {
  userId: 'abc123',
  attempts: 5,
  timeframe: '10 minutes'
});

// Access denied
log.security('unauthorized_access', 'high', {
  userId: 'abc123',
  resource: 'election-xyz',
  reason: 'insufficient_permissions'
});
```

### Database Logging

```javascript
const startTime = Date.now();

try {
  const voters = await db.query('SELECT * FROM voters WHERE election_id = $1', [electionId]);

  log.database('SELECT', 'voters', Date.now() - startTime, true, {
    election_id: electionId,
    rows_returned: voters.length
  });
} catch (error) {
  log.database('SELECT', 'voters', Date.now() - startTime, false, {
    election_id: electionId,
    error: error.message
  });
}
```

### Validation Logging

```javascript
import { log } from '../utils/logger.js';

try {
  const validated = validateData(req.body, schema);
} catch (error) {
  error.details.forEach(detail => {
    log.validation(detail.path[0], detail.message, {
      value: req.body[detail.path[0]],
      type: detail.type
    });
  });
}
```

---

## Sensitive Data Redaction

### Automatic Redaction

Sensitive fields are automatically redacted:

```javascript
// Before (what you write)
const userData = {
  email: 'user@example.com',
  password: 'MySecurePassword123!',
  token: 'eyJhbGciOiJIUzI1NiIs...',
  creditCard: '4532-1234-5678-9010'
};

log.info('User updated', userData);

// After (what gets logged)
{
  "message": "User updated",
  "metadata": {
    "email": "[REDACTED-EMAIL]",
    "password": "[REDACTED]",
    "token": "[REDACTED]",
    "creditCard": "[REDACTED-CC]"
  }
}
```

### Sensitive Fields List

These fields are automatically redacted:
- password
- token
- accessToken
- refreshToken
- csrfToken
- secret
- apiKey
- authorization
- x-csrf-token
- x-xsrf-token
- creditCard
- ssn
- pin
- otp
- code (2FA codes)

### Pattern Redaction

Also automatically redacted:
- Credit cards: `1234-5678-9012-3456`
- Emails: `user@example.com`
- Phone: `123-456-7890`

---

## Practical Examples

### Example 1: User Registration

```javascript
// server/routes/auth.js

import { log } from '../utils/logger.js';
import { validateData } from '../utils/validationSchemas.js';

router.post('/register', async (req, res) => {
  try {
    // Log registration attempt
    log.debug('Registration attempt', {
      email: req.body.email // Email is NOT sensitive for registration
    });

    // Validate
    const validated = validateData(req.body, authSchemas.register);

    // Create user
    const userId = uuidv4();
    await db.run('INSERT INTO users...', [userId, validated.email, hashedPassword, validated.name]);

    // Log successful registration
    log.auth('register', userId, true, {
      email: validated.email,
      name: validated.name
    });

    res.status(201).json({ ... });
  } catch (error) {
    log.error('Registration failed', {
      email: req.body.email,
      error: error.message,
      code: error.code
    });

    res.status(400).json({ error: error.message });
  }
});
```

### Example 2: Election Creation

```javascript
// server/routes/elections.js

import { log } from '../utils/logger.js';

router.post('/', validateBody(electionSchemas.create), async (req, res) => {
  const startTime = Date.now();

  try {
    log.debug('Creating election', {
      title: req.body.title,
      votingType: req.body.votingType,
      userId: req.user.id
    });

    const electionId = uuidv4();

    // Create election in database
    await db.run('INSERT INTO elections...', [
      electionId,
      req.user.id,
      req.body.title,
      req.body.votingType,
      ...
    ]);

    // Log database operation
    log.database('INSERT', 'elections', Date.now() - startTime, true, {
      election_id: electionId,
      created_by: req.user.id
    });

    // Log successful creation
    log.info('Election created', {
      election_id: electionId,
      title: req.body.title,
      voting_type: req.body.votingType,
      created_by: req.user.id,
      options_count: req.body.options.length
    });

    res.status(201).json({ id: electionId, ... });
  } catch (error) {
    log.error('Failed to create election', {
      title: req.body.title,
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });

    res.status(500).json({ error: 'Failed to create election' });
  }
});
```

### Example 3: Rate Limiting

```javascript
// server/middleware/advancedRateLimit.js

import { log } from '../utils/logger.js';

export const loginLimiter = rateLimit({
  // ...
  handler: (req, res) => {
    const ip = req.ip;
    const block = getBlockStatus(ip, 'login');

    // Log rate limit violation
    log.security('rate_limit_exceeded', 'high', {
      endpoint: '/api/auth/login',
      ip: ip,
      attempts: block?.attempts,
      remaining_wait: block?.remaining,
      blocked_until: new Date(block?.until)
    });

    res.status(429).json({
      error: true,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts',
      retryAfter: block?.remaining
    });
  }
});
```

---

## Log Rotation

Logs are automatically rotated:

### File Configuration
```
logs/
├── combined.log          # All logs
├── combined.log.1        # Archived (5MB)
├── combined.log.2
├── ...
├── combined.log.10
├── error.log             # Error logs only
├── error.log.1
├── ...
└── error.log.5
```

### Rotation Rules
- **Max File Size**: 5MB
- **Max Files**: Combined (10), Errors (5)
- **Format**: Numeric suffix (.1, .2, etc.)

---

## Environment Variables

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Environment (development, production)
NODE_ENV=production
```

### By Environment

**Development:**
- `LOG_LEVEL=debug`
- Logs to console + file
- Colorized output

**Production:**
- `LOG_LEVEL=info`
- Logs to file only
- JSON format

---

## Monitoring & Analysis

### Common Log Queries

```bash
# View recent errors
tail -f logs/error.log

# View specific error
grep "VALIDATION_ERROR" logs/combined.log

# Count login failures
grep "Auth login" logs/combined.log | grep "false" | wc -l

# View rate limit violations
grep "rate_limit_exceeded" logs/combined.log

# Find slow queries (> 1000ms)
grep "duration.*[1-9][0-9]{3,}" logs/combined.log
```

### Alerting Suggestions

Set up alerts for:
- Multiple authentication failures from same IP
- Database query duration > 5s
- More than 10 errors in 1 minute
- Rate limit violations
- Unhandled exceptions

---

## Best Practices

### ✅ DO

1. **Log at appropriate levels**
   ```javascript
   log.debug('Processing vote'); // Developer debugging
   log.info('Vote submitted'); // Important event
   log.warn('Unusual voting pattern'); // Potential issue
   log.error('Database connection lost'); // Serious error
   ```

2. **Include context**
   ```javascript
   // Good
   log.info('Vote submitted', {
     electionId: 'abc123',
     userId: 'user456',
     votingType: 'simple'
   });
   ```

3. **Log before making external calls**
   ```javascript
   log.info('Sending email notification', { userId: 'abc123' });
   await sendEmail(...);
   ```

### ❌ DON'T

1. **Don't log sensitive data**
   ```javascript
   // ❌ Bad - Password visible
   log.info('User login', { email, password });

   // ✅ Good - Auto-redacted
   log.auth('login', userId, true, { email });
   ```

2. **Don't use console.log in production**
   ```javascript
   // ❌ Bad
   console.log('Error:', error);

   // ✅ Good
   log.error('Error occurred', { error: error.message });
   ```

3. **Don't log entire request/response objects**
   ```javascript
   // ❌ Bad
   log.info('Request', req); // Too much data

   // ✅ Good
   log.http(req.method, req.path, res.statusCode, duration);
   ```

---

## Troubleshooting

### Issue: Logs not appearing

1. Check `LOG_LEVEL` environment variable
2. Verify `logs/` directory exists
3. Check file permissions
4. Look at console output in development

### Issue: Logs too large

1. Reduce `LOG_LEVEL` to 'warn' or 'error'
2. Check cleanup process is running
3. Monitor log file sizes

---

## Conclusion

Structured logging with Winston provides:
- ✅ Safe logging without secrets
- ✅ Easy searching and analysis
- ✅ Production-grade reliability
- ✅ Automatic log rotation
- ✅ Standardized format

Always use `log.*` instead of `console.log` in server code!

