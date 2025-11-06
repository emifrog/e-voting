# Immutable Audit Logs & Signed Exports

## Overview

This document describes two complementary security features:
1. **Immutable Audit Logs** - Prevent admin tampering with logs
2. **Signed Exports** - Verify export integrity and authenticity

## Part 1: Immutable Audit Logs

### Problem Solved

**Original Issue**: Admin could modify or delete audit logs to cover tracks
```
Admin action → Audit log created
↓
Admin deletes log
↓
No evidence of action!
```

### Solution: Append-Only Logs with Hash Chain

```
Entry 1: hash(id + 'genesis' + timestamp + action)
  ↓ (hash stored)
Entry 2: hash(id + prevHash + timestamp + action)
  ↓ (hash stored)
Entry 3: hash(id + prevHash + timestamp + action)
  ...

Each entry references previous entry's hash
Modification detected: hash doesn't match chain
```

### How It Works

#### 1. **Hash Chain (Like Blockchain)**

Each audit log entry contains:
- `id`: Unique identifier
- `prev_hash`: Hash of previous entry
- `entry_hash`: SHA-256 of current entry
- `signature`: HMAC-SHA256 of entry (server-signed)
- `created_at`: Immutable timestamp

```
Entry creation:
1. Calculate hash from: id + prev_hash + timestamp + action + details
2. Generate HMAC signature (proves server created it)
3. Store in database
4. Cannot update (database trigger prevents it)
5. Cannot delete (database trigger prevents it)
```

#### 2. **Database-Level Immutability**

```sql
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit logs are immutable - updates not allowed');
END;

CREATE TRIGGER audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit logs are immutable - deletes not allowed');
END;
```

If someone tries to modify/delete → Database rejects with error!

#### 3. **Chain Verification**

Verify entire chain integrity:
```javascript
1. Read all entries (ordered by timestamp)
2. For each entry:
   - Check prevHash matches previous entry's hash
   - Recompute hash, verify it matches stored hash
   - Verify signature is valid
3. If any mismatch → Log tampering detected!
```

### API Endpoints

#### Get Audit Logs
```
GET /api/elections/:electionId/audit-logs
Query: ?action=vote_submitted&user_id=123&limit=100&offset=0

Response:
{
  "success": true,
  "count": 50,
  "logs": [
    {
      "id": "abc123...",
      "action": "vote_submitted",
      "details": {...},
      "user_id": "user-123",
      "ip_address": "192.168.1.1",
      "created_at": "2025-01-20T10:30:00Z",
      "entry_hash": "def456...",
      "prev_hash": "abc123..."
    }
  ]
}
```

#### Verify Chain Integrity
```
GET /api/elections/:electionId/audit-logs/verify-chain

Response:
{
  "success": true,
  "valid": true,
  "checked": 245,
  "errors": [],
  "chainIntegrity": true
}
```

#### Get Immutability Certificate
```
GET /api/elections/:electionId/audit-logs/certificate

Response:
{
  "electionId": "election-123",
  "logCount": 245,
  "lastLogId": "xyz789...",
  "lastLogHash": "def456...",
  "lastLogTimestamp": "2025-01-20T10:30:00Z",
  "chainValid": true,
  "chainIntegrity": true,
  "status": "immutable"
}
```

#### Export Audit Logs
```
GET /api/elections/:electionId/audit-logs/export?format=csv

Returns: CSV file with all audit logs
Format: ID,Action,User ID,IP Address,Timestamp,Entry Hash
```

### Usage Example

```javascript
import { createAuditLog, verifyAuditChain } from '../services/auditLog.js';

// Create audit log entry
const entry = await createAuditLog({
  election_id: 'election-123',
  user_id: 'user-456',
  action: 'voter_added',
  details: { voterEmail: 'voter@example.com' },
  ip_address: req.ip
});

console.log(entry);
// {
//   id: 'log-abc123...',
//   hash: 'def456...',
//   prevHash: 'xyz789...',
//   timestamp: '2025-01-20T10:30:00Z',
//   verified: true
// }

// Verify chain integrity
const verification = await verifyAuditChain('election-123');
console.log(verification);
// {
//   valid: true,
//   checked: 245,
//   errors: [],
//   chainIntegrity: true
// }
```

---

## Part 2: Signed Exports

### Problem Solved

**Original Issue**: No way to verify exports haven't been modified after creation
```
Admin: "These are the results"
User: "How do I know you didn't change them?"
Admin: "Trust me"
```

### Solution: SHA-256 Hash + HMAC Signature

```
1. Create export data
2. Calculate SHA-256 hash of data
3. Generate HMAC-SHA256 signature (proves server created it)
4. Include metadata (export_id, exported_by, timestamp)
5. Recipient can verify nothing was modified
```

### How It Works

#### 1. **Data Hashing**

```javascript
exportData = {
  election: {...},
  results: {...},
  voters: [...]
}

SHA-256(JSON.stringify(exportData))
= "a1b2c3d4e5f6..."
```

If recipient changes ANY byte of data → hash changes!

#### 2. **Metadata & Signature**

```javascript
metadata = {
  exportId: "export-abc123...",
  electionId: "election-123",
  exportedBy: "admin-456",
  exportedAt: "2025-01-20T10:30:00Z",
  dataHash: "a1b2c3d4e5f6..."
}

signature = HMAC-SHA256(
  secret_key,
  JSON.stringify(metadata + dataHash)
)
= "xyz789..."
```

Only server knows the secret! Proves server created it.

#### 3. **Verification**

```javascript
// Recipient verifies:
1. Recompute hash of received data
2. Check: recomputedHash === metadata.dataHash
   If no → Data was modified!

3. Recompute signature with received metadata
4. Check: recomputedSignature === signature
   If no → Signature was forged!
```

### API Endpoints

#### Export Election Results
```
GET /api/elections/:electionId/export/results?format=json

Response:
{
  "data": {
    "election": {...},
    "options": [...],
    "results": {...},
    "ballots": [...]
  },
  "metadata": {
    "exportId": "export-abc123...",
    "electionId": "election-123",
    "exportedBy": "admin-456",
    "exportedAt": "2025-01-20T10:30:00Z",
    "dataHash": "a1b2c3d4e5f6..."
  },
  "signature": "xyz789...",
  "verified": true
}
```

#### Export Voters List
```
GET /api/elections/:electionId/export/voters?format=csv

Returns: CSV file with voters + metadata header

# Export ID,export-abc123...
# Election ID,election-123
# Exported By,admin-456
# Exported At,2025-01-20T10:30:00Z
# Data Hash,a1b2c3d4e5f6...
# Signature,xyz789...

Email,Name,Weight,Has Voted,Voted At,Added At
"user1@example.com","User 1",1.0,true,"2025-01-20T10:15:00Z","2025-01-20T09:00:00Z"
"user2@example.com","User 2",1.5,false,,"2025-01-20T09:00:00Z"
```

#### Export Audit Logs
```
GET /api/elections/:electionId/export/audit?format=json

Returns: All audit logs with metadata and signatures
```

#### Verify Export
```
POST /api/elections/:electionId/export/verify

Request body:
{
  "exportPackage": {
    "data": {...},
    "metadata": {...},
    "signature": "xyz789..."
  }
}

Response:
{
  "success": true,
  "verification": {
    "valid": true,
    "exportId": "export-abc123...",
    "exportedAt": "2025-01-20T10:30:00Z",
    "exportedBy": "admin-456"
  }
}
```

#### Compliance Report
```
GET /api/elections/:electionId/export/compliance-report

Response:
{
  "report": {
    "reportId": "report-xyz...",
    "electionId": "election-123",
    "generatedAt": "2025-01-20T10:30:00Z",
    "generatedBy": "admin-456",
    "compliance": {
      "auditLogsCount": 245,
      "totalVoters": 1000,
      "votedCount": 850,
      "participationRate": "85.00%"
    },
    "checks": {
      "hasAuditLogs": true,
      "hasVoters": true,
      "hasVotes": true,
      "electionComplete": true
    }
  },
  "reportHash": "a1b2c3d4e5f6...",
  "signature": "xyz789..."
}
```

#### Full Export Package
```
GET /api/elections/:electionId/export/all

Returns: Combined JSON with results + voters + audit
```

### Usage Example

```javascript
import {
  exportElectionResults,
  verifyExportSignature,
  convertToCSV
} from '../services/exportService.js';

// Create export
const exportPackage = await exportElectionResults('election-123', 'admin-456');

// Get CSV version
const csv = convertToCSV(exportPackage);

// Verify signature (recipient side)
const verification = verifyExportSignature(exportPackage);
if (verification.valid) {
  console.log('✅ Export is authentic and unmodified');
  console.log(`Exported by: ${verification.exportedBy}`);
  console.log(`At: ${verification.exportedAt}`);
} else {
  console.log('❌ Export verification failed:', verification.reason);
}
```

---

## Configuration

### Environment Variables

```bash
# Audit Log Signature Secret
AUDIT_LOG_SECRET=your-secure-secret-64-chars-minimum

# Export Signature Secret
EXPORT_SIGNATURE_SECRET=your-secure-secret-64-chars-minimum

# Compliance Report Secret
COMPLIANCE_REPORT_SECRET=your-secure-secret-64-chars-minimum
```

### Database Schema

The schema automatically includes:
- `entry_hash TEXT UNIQUE` - Hash of entry
- `prev_hash TEXT` - Previous entry's hash
- `signature TEXT` - HMAC signature
- Database triggers to prevent updates/deletes

---

## Security Properties

### Immutable Audit Logs

✅ **Append-Only**: Can only add entries, never modify/delete
✅ **Tamper-Evident**: Hash chain breaks if any entry modified
✅ **Authenticated**: HMAC signature proves server created it
✅ **Verifiable**: Anyone can verify chain integrity
✅ **Timestamped**: Immutable timestamps prevent reordering

### Signed Exports

✅ **Integrity**: SHA-256 hash proves data unmodified
✅ **Authenticity**: HMAC signature proves server created it
✅ **Verifiable**: Recipient can independently verify signature
✅ **Metadata**: Export ID, creator, timestamp included
✅ **Non-Repudiation**: Server can't deny creating export

---

## Compliance Use Cases

### GDPR Compliance
- **Audit Trail**: Every data access logged and immutable
- **Right to be Forgotten**: Logs prove deletions occurred
- **Data Integrity**: Signed exports for data requests

### Election Auditing
- **Chain of Custody**: Immutable audit log of all actions
- **Verification**: Anyone can verify logs haven't been tampered
- **Compliance Reports**: Signed reports for regulators

### Regulatory Requirements
- **Non-Repudiation**: Admin can't deny their actions
- **Evidence**: Logs acceptable in legal proceedings
- **Certification**: Signed exports for certification bodies

---

## Testing

### Manual Verification

```bash
# 1. Get audit logs
curl https://api/elections/election-123/audit-logs

# 2. Verify chain integrity
curl https://api/elections/election-123/audit-logs/verify-chain

# 3. Get certificate
curl https://api/elections/election-123/audit-logs/certificate

# 4. Export with signature
curl https://api/elections/election-123/export/results > export.json

# 5. Verify export signature
curl -X POST https://api/elections/election-123/export/verify \
  -d @export.json
```

### Code Testing

```javascript
import { verifyAuditChain, verifyExportSignature } from '...';

// Verify audit chain
const chainOk = await verifyAuditChain('election-123');
assert.equal(chainOk.valid, true);

// Verify export
const exportOk = verifyExportSignature(exportPackage);
assert.equal(exportOk.valid, true);
```

---

## Troubleshooting

### Issue: "Audit logs are immutable - updates not allowed"

**Cause**: Trying to update existing audit log
**Solution**: This is correct behavior! Audit logs cannot be updated.

### Issue: "Signature verification failed"

**Cause**: Export data or metadata was modified after export
**Solution**: Obtain original export directly from server

### Issue: "Hash chain broken at entry"

**Cause**: An audit log entry's prevHash doesn't match previous entry
**Solution**: Investigation required - possible database corruption

---

## References

- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST: Audit Logging](https://nvlpubs.nist.gov/nistpubs/)
- [Hash Functions: SHA-256](https://en.wikipedia.org/wiki/SHA-2)
- [HMAC: Message Authentication](https://en.wikipedia.org/wiki/HMAC)

---

**Last Updated**: January 2025
**Status**: Production Ready
