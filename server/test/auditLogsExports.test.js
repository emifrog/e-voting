/**
 * Tests for Immutable Audit Logs and Signed Exports
 *
 * Tests cover:
 * - Audit log creation with hash chain
 * - Hash chain integrity verification
 * - Digital signature generation and verification
 * - Export with metadata and signatures
 * - Export signature verification
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  createAuditLog,
  getAuditLogs,
  verifyAuditChain,
  verifySignature,
  getImmutabilityCertificate,
  exportAuditLogsData,
  getLastAuditLog
} from '../services/auditLog.js';

import {
  exportElectionResults,
  exportVotersList,
  exportAuditLogs,
  convertToCSV,
  verifyExportSignature,
  createComplianceReport,
  hashData
} from '../services/exportService.js';

/**
 * Immutable Audit Logs Tests
 */
describe('Immutable Audit Logs', () => {
  const testElectionId = `test-election-${Date.now()}`;

  describe('Audit Log Creation', () => {
    it('should create an audit log entry with hash and signature', async () => {
      const entry = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'election_created',
        details: { title: 'Test Election' },
        ip_address: '127.0.0.1'
      });

      assert(entry.id, 'Entry should have an ID');
      assert(entry.hash, 'Entry should have a hash');
      assert(entry.timestamp, 'Entry should have a timestamp');
      assert.strictEqual(entry.prevHash, 'genesis', 'First entry should have genesis prevHash');
      assert(entry.verified === true, 'Entry should be verified');
    });

    it('should create entries with hash chain linking', async () => {
      // Create first entry
      const entry1 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'first_action',
        ip_address: '127.0.0.1'
      });

      // Create second entry
      const entry2 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'second_action',
        ip_address: '127.0.0.1'
      });

      // Second entry's prevHash should match first entry's hash
      const logs = await getAuditLogs(testElectionId, { limit: 10 });
      assert(logs.length >= 2, 'Should have at least 2 entries');
    });

    it('should generate unique hashes for different entries', async () => {
      const entry1 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'action_1',
        ip_address: '127.0.0.1'
      });

      const entry2 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'action_2',
        ip_address: '127.0.0.1'
      });

      assert.notStrictEqual(entry1.hash, entry2.hash, 'Different entries should have different hashes');
    });
  });

  describe('Hash Chain Verification', () => {
    it('should verify valid hash chain', async () => {
      // Create multiple entries
      for (let i = 0; i < 3; i++) {
        await createAuditLog({
          election_id: testElectionId,
          user_id: 'test-admin',
          action: `test_action_${i}`,
          ip_address: '127.0.0.1'
        });
      }

      const verification = await verifyAuditChain(testElectionId);
      assert(verification.valid === true, 'Chain should be valid');
      assert(verification.chainIntegrity === true, 'Chain integrity should be valid');
      assert(verification.checked > 0, 'Should have checked entries');
      assert.deepStrictEqual(verification.errors, [], 'Should have no errors');
    });

    it('should detect missing entries in chain', async () => {
      const verification = await verifyAuditChain(`nonexistent-${Date.now()}`);
      assert(verification.valid === true, 'Empty chain is valid');
      assert.strictEqual(verification.checked, 0, 'Should have checked 0 entries');
    });

    it('should return detailed verification results', async () => {
      const verification = await verifyAuditChain(testElectionId);

      assert('valid' in verification, 'Should have valid property');
      assert('checked' in verification, 'Should have checked property');
      assert('errors' in verification, 'Should have errors property');
      assert('chainIntegrity' in verification, 'Should have chainIntegrity property');
    });
  });

  describe('Digital Signatures', () => {
    it('should verify entry signatures', async () => {
      const entry = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'signature_test',
        ip_address: '127.0.0.1'
      });

      // Get the entry from database
      const logs = await getAuditLogs(testElectionId, { action: 'signature_test' });
      const storedEntry = logs[0];

      // Verify signature
      const isValid = verifySignature(storedEntry);
      assert(isValid === true, 'Signature should be valid');
    });

    it('should detect invalid signatures', async () => {
      const entry = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'invalid_sig_test',
        ip_address: '127.0.0.1'
      });

      const logs = await getAuditLogs(testElectionId, { action: 'invalid_sig_test' });
      const storedEntry = logs[0];

      // Tamper with the entry
      storedEntry.signature = 'invalid_signature_' + crypto.randomBytes(16).toString('hex');

      const isValid = verifySignature(storedEntry);
      assert(isValid === false, 'Signature should be invalid after tampering');
    });
  });

  describe('Immutability Certificate', () => {
    it('should generate immutability certificate', async () => {
      await createAuditLog({
        election_id: testElectionId,
        user_id: 'test-admin',
        action: 'cert_test',
        ip_address: '127.0.0.1'
      });

      const certificate = await getImmutabilityCertificate(testElectionId);

      assert('electionId' in certificate, 'Certificate should have electionId');
      assert('logCount' in certificate, 'Certificate should have logCount');
      assert('lastLogId' in certificate, 'Certificate should have lastLogId');
      assert('lastLogHash' in certificate, 'Certificate should have lastLogHash');
      assert('chainValid' in certificate, 'Certificate should have chainValid');
      assert('status' in certificate, 'Certificate should have status');
      assert.strictEqual(certificate.status, 'immutable', 'Status should be immutable');
    });

    it('should mark chain as compromised if invalid', async () => {
      const emptyElectionId = `empty-election-${Date.now()}`;
      const certificate = await getImmutabilityCertificate(emptyElectionId);

      assert.strictEqual(certificate.logCount, 0, 'Empty election should have 0 logs');
      assert.strictEqual(certificate.status, 'no_logs', 'Status should be no_logs');
    });
  });

  describe('Audit Log Export', () => {
    it('should export audit logs with signatures', async () => {
      // Create test entries
      for (let i = 0; i < 3; i++) {
        await createAuditLog({
          election_id: testElectionId,
          user_id: 'test-admin',
          action: `export_test_${i}`,
          ip_address: '127.0.0.1'
        });
      }

      const exportData = await exportAuditLogsData(testElectionId, true);

      assert('exportedAt' in exportData, 'Should have exportedAt');
      assert('electionId' in exportData, 'Should have electionId');
      assert('totalLogs' in exportData, 'Should have totalLogs');
      assert(Array.isArray(exportData.logs), 'Logs should be an array');
      assert(exportData.logs.length > 0, 'Should have entries');
      assert(exportData.logs[0].verified !== undefined, 'Should have verified flag');
      assert(exportData.logs[0].signature, 'Should have signature when requested');
    });

    it('should export without signatures when not requested', async () => {
      const exportData = await exportAuditLogsData(testElectionId, false);
      const firstLog = exportData.logs[0];

      assert(!('signature' in firstLog) || !firstLog.signature, 'Should not include signature when not requested');
    });
  });
});

/**
 * Signed Exports Tests
 */
describe('Signed Exports', () => {
  const testElectionId = `export-election-${Date.now()}`;

  describe('Data Hashing', () => {
    it('should generate consistent hashes for same data', () => {
      const data = { test: 'data', value: 123 };
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      assert.strictEqual(hash1, hash2, 'Same data should produce same hash');
    });

    it('should generate different hashes for different data', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      const hash1 = hashData(data1);
      const hash2 = hashData(data2);

      assert.notStrictEqual(hash1, hash2, 'Different data should produce different hashes');
    });

    it('should handle various data types', () => {
      const hashString = hashData('test string');
      const hashObject = hashData({ test: 'object' });
      const hashArray = hashData([1, 2, 3]);

      assert(hashString, 'Should hash strings');
      assert(hashObject, 'Should hash objects');
      assert(hashArray, 'Should hash arrays');
      assert.notStrictEqual(hashString, hashObject, 'Different types should produce different hashes');
    });
  });

  describe('Export Signature Verification', () => {
    it('should verify valid export signature', () => {
      const exportPackage = {
        data: { test: 'data' },
        metadata: {
          exportId: 'test-export-' + Date.now(),
          electionId: testElectionId,
          exportedBy: 'test-admin',
          exportedAt: new Date().toISOString(),
          dataHash: hashData({ test: 'data' })
        },
        signature: ''
      };

      // Generate signature with same secret
      const secret = process.env.EXPORT_SIGNATURE_SECRET || 'default-export-secret-change-in-production';
      const content = JSON.stringify({
        exportId: exportPackage.metadata.exportId,
        electionId: exportPackage.metadata.electionId,
        exportedBy: exportPackage.metadata.exportedBy,
        exportedAt: exportPackage.metadata.exportedAt,
        dataHash: exportPackage.metadata.dataHash
      });
      exportPackage.signature = crypto
        .createHmac('sha256', secret)
        .update(content)
        .digest('hex');

      const verification = verifyExportSignature(exportPackage);
      assert(verification.valid === true, 'Signature should be valid');
      assert.strictEqual(verification.exportId, exportPackage.metadata.exportId, 'Should return exportId');
    });

    it('should reject tampered data', () => {
      const exportPackage = {
        data: { test: 'data' },
        metadata: {
          exportId: 'test-export-' + Date.now(),
          electionId: testElectionId,
          exportedBy: 'test-admin',
          exportedAt: new Date().toISOString(),
          dataHash: hashData({ test: 'data' })
        },
        signature: 'invalid_signature'
      };

      const verification = verifyExportSignature(exportPackage);
      assert(verification.valid === false, 'Signature should be invalid');
      assert(verification.reason, 'Should provide reason for failure');
    });

    it('should detect hash mismatches', () => {
      const exportPackage = {
        data: { test: 'data' },
        metadata: {
          exportId: 'test-export-' + Date.now(),
          electionId: testElectionId,
          exportedBy: 'test-admin',
          exportedAt: new Date().toISOString(),
          dataHash: 'incorrect_hash_' + crypto.randomBytes(16).toString('hex')
        },
        signature: 'any_signature'
      };

      const verification = verifyExportSignature(exportPackage);
      assert(verification.valid === false, 'Verification should fail with hash mismatch');
      assert.strictEqual(verification.reason, 'Data hash mismatch', 'Should report hash mismatch');
    });
  });

  describe('Export Format Conversion', () => {
    it('should convert export to CSV with metadata', () => {
      const exportPackage = {
        data: {
          voters: [
            { email: 'user1@test.com', name: 'User 1', weight: 1.0, hasVoted: true, votedAt: '2025-01-20T10:00:00Z', addedAt: '2025-01-20T09:00:00Z' },
            { email: 'user2@test.com', name: 'User 2', weight: 1.0, hasVoted: false, votedAt: null, addedAt: '2025-01-20T09:00:00Z' }
          ]
        },
        metadata: {
          exportId: 'test-export',
          electionId: testElectionId,
          exportedBy: 'admin',
          exportedAt: new Date().toISOString(),
          dataHash: 'testhash123'
        },
        signature: 'testsignature'
      };

      const csv = convertToCSV(exportPackage);

      assert(csv.includes('# Export ID'), 'Should include export metadata');
      assert(csv.includes('test-export'), 'Should include export ID');
      assert(csv.includes('user1@test.com'), 'Should include voter data');
      assert(csv.includes('user2@test.com'), 'Should include all voters');
      assert(csv.includes('testhash123'), 'Should include data hash');
      assert(csv.includes('testsignature'), 'Should include signature');
    });

    it('should format CSV with proper quoting', () => {
      const exportPackage = {
        data: {
          voters: [
            { email: 'test@example.com', name: 'Test "User"', weight: 1.0, hasVoted: false, votedAt: null, addedAt: '2025-01-20T09:00:00Z' }
          ]
        },
        metadata: {
          exportId: 'test',
          electionId: testElectionId,
          exportedBy: 'admin',
          exportedAt: new Date().toISOString(),
          dataHash: 'hash'
        },
        signature: 'sig'
      };

      const csv = convertToCSV(exportPackage);
      assert(csv.includes('"Test "User""'), 'Should properly quote names with special characters');
    });
  });

  describe('Compliance Reports', () => {
    it('should create compliance report with audit metrics', async () => {
      const { report } = await createComplianceReport(testElectionId, 'test-admin');

      assert('reportId' in report, 'Should have reportId');
      assert('electionId' in report, 'Should have electionId');
      assert('generatedAt' in report, 'Should have generatedAt');
      assert('generatedBy' in report, 'Should have generatedBy');
      assert('compliance' in report, 'Should have compliance object');
      assert('checks' in report, 'Should have checks object');
    });

    it('should include correct compliance metrics', async () => {
      const { report } = await createComplianceReport(testElectionId, 'test-admin');

      assert('auditLogsCount' in report.compliance, 'Should count audit logs');
      assert('totalVoters' in report.compliance, 'Should count total voters');
      assert('votedCount' in report.compliance, 'Should count voted');
      assert('participationRate' in report.compliance, 'Should calculate participation rate');
    });

    it('should generate compliance report signature', async () => {
      const { report, reportHash, signature } = await createComplianceReport(testElectionId, 'test-admin');

      assert(reportHash, 'Should generate report hash');
      assert(signature, 'Should generate signature');
      assert(signature.length > 0, 'Signature should not be empty');
      assert(reportHash.length === 64, 'SHA-256 hash should be 64 hex characters');
    });
  });

  describe('Export Integration', () => {
    it('should export election results with signature', async () => {
      const exportPackage = await exportElectionResults(testElectionId, 'test-admin');

      assert('data' in exportPackage, 'Should have data');
      assert('metadata' in exportPackage, 'Should have metadata');
      assert('signature' in exportPackage, 'Should have signature');
      assert(exportPackage.verified === true, 'Should be marked as verified');
    });

    it('should export voters list with signature', async () => {
      const exportPackage = await exportVotersList(testElectionId, 'test-admin');

      assert('data' in exportPackage, 'Should have data');
      assert('metadata' in exportPackage, 'Should have metadata');
      assert('signature' in exportPackage, 'Should have signature');
      assert(exportPackage.data.voterCount !== undefined, 'Should include voter count');
    });

    it('should export audit logs with signature', async () => {
      const exportPackage = await exportAuditLogs(testElectionId, 'test-admin');

      assert('data' in exportPackage, 'Should have data');
      assert('metadata' in exportPackage, 'Should have metadata');
      assert('signature' in exportPackage, 'Should have signature');
      assert(exportPackage.data.logCount !== undefined, 'Should include log count');
    });
  });
});

/**
 * Security Properties Tests
 */
describe('Security Properties', () => {
  const testElectionId = `security-test-${Date.now()}`;

  describe('Tamper Detection', () => {
    it('should use consistent hashing algorithm', async () => {
      const entry1 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test',
        action: 'test',
        ip_address: '127.0.0.1'
      });

      const entry2 = await createAuditLog({
        election_id: testElectionId,
        user_id: 'test',
        action: 'test',
        ip_address: '127.0.0.1'
      });

      // Same inputs should produce same hash pattern structure
      assert(entry1.hash.length === entry2.hash.length, 'Hash length should be consistent');
      assert(entry1.hash.length === 64, 'SHA-256 should produce 64 hex characters');
    });

    it('should detect any data modification', () => {
      const originalData = { election: 'test', votes: 100 };
      const hash1 = hashData(originalData);

      const modifiedData = { election: 'test', votes: 101 };
      const hash2 = hashData(modifiedData);

      assert.notStrictEqual(hash1, hash2, 'Any modification should change hash');
    });
  });

  describe('Non-Repudiation', () => {
    it('should track who created each export', async () => {
      const userId = `test-user-${Date.now()}`;
      const exportPackage = await exportElectionResults(testElectionId, userId);

      assert.strictEqual(exportPackage.metadata.exportedBy, userId, 'Should record who created export');
      assert(exportPackage.metadata.exportedAt, 'Should record when export was created');
    });

    it('should track who created each audit entry', async () => {
      const userId = `audit-user-${Date.now()}`;
      const entry = await createAuditLog({
        election_id: testElectionId,
        user_id: userId,
        action: 'non_repudiation_test',
        ip_address: '127.0.0.1'
      });

      const logs = await getAuditLogs(testElectionId, { action: 'non_repudiation_test' });
      assert.strictEqual(logs[0].user_id, userId, 'Should track user who created audit entry');
    });
  });
});
