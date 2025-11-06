# Secure Encryption Key Management System

## Overview

The e-voting platform implements a comprehensive encryption key management system with support for key rotation, versioning, and historical key tracking. This ensures sensitive data (encrypted votes) remains secure and accessible even after key rotation.

## Architecture

### Key Components

#### 1. **KeyManager** (`server/utils/keyManager.js`)
Centralizes all key management operations:
- **Key Versioning**: Tracks multiple key versions with timestamps
- **Historical Keys**: Maintains old keys for decrypting previously encrypted data
- **Metadata Storage**: Stores key lifecycle information (creation date, expiration, status)
- **Key Validation**: Ensures keys meet security requirements (32 bytes for AES-256)

#### 2. **Crypto Utilities** (`server/utils/crypto.js`)
Enhanced encryption/decryption with version support:
- **Versioned Encryption**: Prepends key version to encrypted data (format: `VERSION:encryptedData`)
- **Automatic Decryption**: Automatically selects correct key version for decryption
- **Backward Compatibility**: Handles both versioned and legacy unversioned data
- **Integrity Checking**: Detects decryption failures and key mismatches

#### 3. **Key Rotation Service** (`server/services/keyRotationService.js`)
Handles scheduled and manual key rotations:
- **Scheduled Rotation**: Weekly rotation by default (configurable via cron)
- **Manual Rotation**: Admin-triggered rotation with audit logging
- **Graceful Handling**: Preserves old keys during transition period
- **Health Checks**: Verifies encryption system integrity

#### 4. **Key Management Routes** (`server/routes/keyManagement.js`)
Admin API endpoints for key management:
- Status monitoring
- Manual rotation
- Audit logging
- Health checks

## Security Features

### ✅ Defense in Depth
```
┌─────────────────────────────────────────┐
│  Application Layer (Versioned Encryption) │
│  - Version prefix in encrypted data     │
│  - Automatic key selection              │
└────────────────┬────────────────────────┘
                 │
┌─────────────────▼────────────────────────┐
│  Key Manager (Multiple Key Versions)     │
│  - Key rotation                         │
│  - Historical key tracking              │
│  - Expiration management                │
└────────────────┬────────────────────────┘
                 │
┌─────────────────▼────────────────────────┐
│  Environment & Secrets Management        │
│  - .env variables                       │
│  - Secure file permissions              │
│  - No hardcoded keys                    │
└─────────────────────────────────────────┘
```

### 🔐 Key Rotation Lifecycle

```
Current Key (Active)
    │
    │ After 90 days or admin trigger
    │
    ▼
New Key (Active)
Old Key (Archived) ─────────────────────┐
    │                                   │
    │ Can decrypt old data for 90 days  │
    │                                   │
    └───────────────────────────────────┘
```

### 🛡️ Protection Mechanisms

**Key Versioning**: Every encrypted piece of data knows which key version encrypted it
```javascript
// Encrypted data format
"1:U2FsdGVkX1...encrypted...data"
 ^
 └─ Key version 1
```

**Automatic Decryption**: System automatically uses the correct key
```javascript
const encrypted = "2:U2FsdGVkX1..."; // Encrypted with key v2
const decrypted = decrypt(encrypted);   // Automatically uses key v2
```

**Backward Compatibility**: Legacy data without version works with current key
```javascript
const legacy = "U2FsdGVkX1...";       // Old format, no version
const decrypted = decrypt(legacy);     // Uses current key
```

**Expiration Handling**: Old keys are eventually removed
- Archived keys: Kept for 90 days by default (configurable)
- Cleaned up automatically via `cleanupExpiredKeys()`
- Audit logs preserve rotation history

## Setup & Configuration

### Initial Setup

#### 1. Generate Secure Keys
```bash
# Generate encryption key and other security keys
node server/scripts/generate-keys.js
```

Output example:
```
🔐 Encryption Key (exactement 32 bytes pour AES-256):
────────────────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=o5wjzr56VPy1BJueDo5sGaQcOkTlR77Z
────────────────────────────────────────────────────────────────────────────
```

#### 2. Configure Environment
Copy the generated `ENCRYPTION_KEY` to your `.env`:
```bash
# .env
ENCRYPTION_KEY=o5wjzr56VPy1BJueDo5sGaQcOkTlR77Z
JWT_SECRET=XyhBAtjQGGwUCpRALtSy9nJj9uRbuY3WnQQVvEKx7uWfk037XUK/nZYzrrwe1BKn/f0Fuf/BY/4MC7GdeCQhHA==
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

#### 3. Validation
The server validates encryption key on startup:
```javascript
// server/index.js
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY manquante');
}

const keyLength = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length;
if (keyLength !== 32) {
  throw new Error(`ENCRYPTION_KEY doit faire exactement 32 bytes (actuellement: ${keyLength})`);
}
```

### Key Rotation Schedule

Default: **Weekly on Sundays at 00:00 UTC**

Configure in `server/index.js`:
```javascript
// Custom rotation schedule (cron format)
initKeyRotationScheduler('0 0 * * 0');  // Weekly
initKeyRotationScheduler('0 0 1 * *');  // Monthly
initKeyRotationScheduler('0 0 * * *');  // Daily
```

Disable rotation:
```javascript
// Don't call initKeyRotationScheduler()
// Keys will still be versioned for manual rotation
```

## API Reference

### Admin Endpoints

All endpoints require `authenticateAdmin` middleware.

#### GET `/api/admin/key-rotation/status`
Returns current key rotation status and recommendations.

**Response:**
```json
{
  "success": true,
  "status": {
    "currentVersion": 2,
    "rotationStatus": {
      "currentVersion": 2,
      "createdAt": "2025-01-15T10:30:00Z",
      "ageInDays": 7.5,
      "recommendedRotationInDays": 82.5,
      "archivedKeys": [
        {
          "version": 1,
          "rotatedAt": "2025-01-15T10:30:00Z",
          "expiresAt": "2025-04-15T10:30:00Z"
        }
      ]
    },
    "allVersions": [
      {
        "version": 2,
        "metadata": {
          "version": 2,
          "createdAt": "2025-01-15T10:30:00Z",
          "algorithm": "aes-256-cbc",
          "status": "active",
          "rotatedAt": null,
          "expiresAt": null
        }
      },
      {
        "version": 1,
        "metadata": {
          "version": 1,
          "createdAt": "2025-01-08T10:30:00Z",
          "algorithm": "aes-256-cbc",
          "status": "archived",
          "rotatedAt": "2025-01-15T10:30:00Z",
          "expiresAt": "2025-04-15T10:30:00Z"
        }
      }
    ],
    "encryptionAlgorithm": "AES-256-CBC",
    "keyLength": 32
  }
}
```

#### POST `/api/admin/key-rotation/rotate`
Manually trigger immediate key rotation.

**Request:**
```json
{
  "reason": "Scheduled maintenance rotation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Key rotation completed successfully",
  "result": {
    "oldVersion": 2,
    "newVersion": 3,
    "rotatedAt": "2025-01-20T15:45:00Z"
  }
}
```

#### GET `/api/admin/key-rotation/audit`
Retrieve key rotation audit log.

**Query Parameters:**
- `limit` (optional): Number of audit entries (default: 50, max: 500)

**Response:**
```json
{
  "success": true,
  "audit": {
    "currentVersion": 3,
    "allVersions": [
      {
        "version": 3,
        "metadata": { ... }
      },
      {
        "version": 2,
        "metadata": { ... }
      }
    ],
    "status": {
      "currentVersion": 3,
      "createdAt": "2025-01-20T15:45:00Z",
      "ageInDays": 0.1,
      "recommendedRotationInDays": 89.9,
      "archivedKeys": [...]
    }
  }
}
```

#### GET `/api/admin/key-rotation/health`
Verify encryption system health.

**Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "currentVersion": 3,
    "testPassed": true
  }
}
```

Or if unhealthy:
```json
{
  "success": false,
  "health": {
    "status": "unhealthy",
    "error": "Failed to decrypt data",
    "testPassed": false
  }
}
```

## Usage Examples

### Encrypt Data (Automatic Versioning)

```javascript
import { encrypt, decrypt } from '../utils/crypto.js';

// Encrypt - automatically includes current version
const vote = { optionId: '123', weight: 1.5 };
const encrypted = encrypt(vote);
// Result: "2:U2FsdGVkX1...encrypted...data"

// Decrypt - automatically uses correct version
const decrypted = decrypt(encrypted);
// Result: { optionId: '123', weight: 1.5 }
```

### Check Encryption Metadata

```javascript
import { getEncryptionMetadata } from '../utils/crypto.js';

const encrypted = "2:U2FsdGVkX1...";
const metadata = getEncryptionMetadata(encrypted);

console.log(metadata);
// {
//   version: 2,
//   keyMetadata: {
//     version: 2,
//     createdAt: "2025-01-15T10:30:00Z",
//     status: "active"
//   },
//   encrypted: true
// }
```

### Manual Key Rotation (Admin)

```javascript
import { rotateKeyManually } from '../services/keyRotationService.js';

const adminId = 'admin-user-id';
const reason = 'Quarterly security rotation';

const result = await rotateKeyManually(adminId, reason);
console.log(result);
// {
//   oldVersion: 2,
//   newVersion: 3,
//   rotatedAt: "2025-01-20T15:45:00Z"
// }
```

### Check Rotation Status

```javascript
import { getKeyRotationStatus } from '../services/keyRotationService.js';

const status = getKeyRotationStatus();
console.log(status.recommendedRotationInDays);
// 82.5 (days until recommended rotation)
```

## Monitoring & Maintenance

### Health Checks

Perform regular encryption health checks:
```bash
# Run health check
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/admin/key-rotation/health
```

### Audit Logs

Monitor key rotation audit logs:
```bash
# Get recent rotations (limit 20)
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3000/api/admin/key-rotation/audit?limit=20"
```

### Recommended Rotation Times
- **Never during elections**: Rotate only when no voting is active
- **Low traffic periods**: Schedule rotations during off-hours
- **Documented**: Always log reason for manual rotations
- **Monitored**: Check health after rotation completes

## Disaster Recovery

### Key Loss Scenarios

**Scenario 1: Current key compromised**
```bash
# Immediately rotate to new key
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"SECURITY INCIDENT: Key compromise"}' \
  http://localhost:3000/api/admin/key-rotation/rotate
```

**Scenario 2: Need to decrypt old data after key cleanup**
- Keep database backups with encrypted data
- Maintain key backup (secure, offline storage)
- Restore key to KeyManager before decryption

**Scenario 3: Key rotation failed**
- Old key remains active automatically
- System continues working
- Retry rotation or investigate error
- Don't proceed with new elections until resolved

## Production Checklist

- [ ] Generated unique encryption key (not default)
- [ ] ENCRYPTION_KEY stored in secure environment variables
- [ ] .keys directory has correct permissions (700)
- [ ] Regular key rotation scheduled (weekly recommended)
- [ ] Monitoring/alerts for rotation failures
- [ ] Audit logs persisted to database
- [ ] Tested key rotation in staging environment
- [ ] Tested encryption health checks
- [ ] Documented key backup/recovery procedure
- [ ] Restricted admin key management endpoint access

## Advanced Topics

### Custom Key Rotation Schedule

```javascript
// Monthly rotation at 2 AM on the 1st
initKeyRotationScheduler('0 2 1 * *');

// Every 6 hours
initKeyRotationScheduler('0 */6 * * *');

// Never (manual only)
// Don't call initKeyRotationScheduler()
```

### Extending Key Manager

```javascript
import { getKeyManager } from '../utils/keyManager.js';

const keyManager = getKeyManager();

// Get all versions
const versions = keyManager.getAllKeyVersions();

// Get specific version
const v2Key = keyManager.getKeyByVersion(2);

// Get current key
const currentKey = keyManager.getCurrentKey();

// Get rotation status
const status = keyManager.getRotationStatus();
```

### Database Schema for Audit Logs

Future enhancement - store audit logs in database:

```sql
CREATE TABLE key_rotation_audit (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50), -- ROTATION_COMPLETED, ROTATION_FAILED, MANUAL_ROTATION
  old_version INT,
  new_version INT,
  requested_by VARCHAR(36),
  reason TEXT,
  status VARCHAR(20), -- SUCCESS, FAILED
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES users(id)
);
```

## Troubleshooting

### Issue: "Encryption key version N not found"
**Cause**: Trying to decrypt data encrypted with a key that was cleaned up
**Solution**:
1. Check if data is recent
2. Restore backup if necessary
3. Increase key expiration period in rotation

### Issue: "Key must be exactly 32 bytes"
**Cause**: Invalid ENCRYPTION_KEY in .env
**Solution**:
```bash
# Regenerate valid key
node server/scripts/generate-keys.js
```

### Issue: "Decryption resulted in empty string"
**Cause**: Wrong key used for decryption
**Solution**:
1. Verify version prefix in encrypted data
2. Check key history in audit log
3. Confirm database backup integrity

## References

- [OWASP: Cryptographic Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Key_Management_Cheat_Sheet.html)
- [Node.js Crypto Module](https://nodejs.org/en/docs/guides/security/)
- [CryptoJS Documentation](https://cryptojs.gitbook.io/docs/)

---

**Last Updated**: January 2025
**Status**: Production Ready
