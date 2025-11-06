/**
 * Device Fingerprinting Utility
 * Creates a unique identifier for a device/browser combination
 *
 * Combines multiple signals:
 * - User-Agent
 * - Accept-Language
 * - Accept-Encoding
 * - IP Address
 * - TLS/SSL cipher suites
 * - Canvas fingerprinting (client-side)
 * - WebGL fingerprinting (client-side)
 *
 * NOT intended for perfect identification (spoofable)
 * Used for rate limiting and abuse detection - makes spoofing harder
 */

import crypto from 'crypto';

/**
 * Create a device fingerprint from request headers
 * Server-side fingerprinting (headers + IP)
 *
 * @param {Object} req - Express request object
 * @returns {string} - SHA-256 hash of fingerprint
 */
export function createServerFingerprint(req) {
  const components = [
    req.headers['user-agent'] || 'unknown',
    req.headers['accept-language'] || 'unknown',
    req.headers['accept-encoding'] || 'unknown',
    req.ip || req.connection.remoteAddress || 'unknown',
    req.headers['accept'] || 'unknown'
  ];

  const fingerprint = components.join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Create a combined fingerprint from multiple sources
 * Uses server fingerprint + client fingerprint for better accuracy
 *
 * @param {Object} req - Express request object
 * @param {string} clientFingerprint - Optional client-side fingerprint
 * @returns {string} - Combined SHA-256 hash
 */
export function createCombinedFingerprint(req, clientFingerprint = null) {
  const serverFp = createServerFingerprint(req);

  if (clientFingerprint) {
    const combined = `${serverFp}:${clientFingerprint}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  return serverFp;
}

/**
 * Extract identifiable headers for rate limiting decisions
 *
 * @param {Object} req - Express request object
 * @returns {Object} - Fingerprint components
 */
export function getFingerprintComponents(req) {
  return {
    userAgent: req.headers['user-agent'],
    acceptLanguage: req.headers['accept-language'],
    ip: req.ip || req.connection.remoteAddress,
    acceptEncoding: req.headers['accept-encoding'],
    accept: req.headers['accept'],
    timestamp: Date.now()
  };
}

/**
 * Check if fingerprints match closely
 * Allows for minor variations (browser updates, etc.)
 *
 * @param {string} fp1 - First fingerprint
 * @param {string} fp2 - Second fingerprint
 * @returns {boolean} - True if fingerprints likely from same device
 */
export function fingerprintsMatch(fp1, fp2) {
  // Exact match
  if (fp1 === fp2) {
    return true;
  }

  // Allow for minor variations
  // In production, might want more sophisticated matching
  return false;
}

/**
 * Detect spoofed fingerprints
 * Checks for known VPN/Proxy user agents or suspicious patterns
 *
 * @param {Object} components - Fingerprint components from getFingerprintComponents
 * @returns {Object} - {isSuspicious, reason, risk: 'low'|'medium'|'high'}
 */
export function detectSpoofing(components) {
  const { userAgent = '', ip = '' } = components;

  const suspiciousPatterns = [
    /headless/i,
    /phantom/i,
    /selenium/i,
    /webdriver/i,
    /bot/i,
    /crawler/i,
    /curl/i,
    /wget/i,
    /postman/i,
    /insomnia/i,
  ];

  const vpnPatterns = [
    /vpn/i,
    /proxy/i,
    /tor/i,
    /mullvad/i,
    /expressvpn/i,
    /protonvpn/i,
  ];

  const isBotLike = suspiciousPatterns.some(pattern =>
    pattern.test(userAgent)
  );

  const isVpnLike = vpnPatterns.some(pattern =>
    pattern.test(userAgent)
  );

  if (isBotLike) {
    return {
      isSuspicious: true,
      reason: 'Bot-like user agent detected',
      risk: 'high'
    };
  }

  if (isVpnLike) {
    return {
      isSuspicious: true,
      reason: 'VPN/Proxy user agent detected',
      risk: 'medium'
    };
  }

  // Check for empty user agent (suspicious)
  if (!userAgent || userAgent.length < 5) {
    return {
      isSuspicious: true,
      reason: 'Missing or invalid user agent',
      risk: 'high'
    };
  }

  // Check for IPv6 loopback (not from internet)
  if (ip === '::1' || ip === '127.0.0.1') {
    return {
      isSuspicious: false,
      reason: 'Localhost',
      risk: 'low'
    };
  }

  return {
    isSuspicious: false,
    reason: 'Normal fingerprint',
    risk: 'low'
  };
}

/**
 * Calculate fingerprint entropy (uniqueness score)
 * Higher = more unique, less likely to collide with others
 *
 * @param {Object} components - Fingerprint components
 * @returns {number} - Entropy score 0-100
 */
export function calculateEntropy(components) {
  let entropy = 0;

  // User-Agent uniqueness (most important)
  if (components.userAgent) {
    entropy += Math.min(40, components.userAgent.length / 2);
  }

  // Language diversity
  if (components.acceptLanguage) {
    const languages = components.acceptLanguage.split(',').length;
    entropy += Math.min(20, languages * 5);
  }

  // IP address (external users more unique)
  if (components.ip && !components.ip.includes('192.168')) {
    entropy += 20;
  }

  // Accept-Encoding diversity
  if (components.acceptEncoding) {
    entropy += 10;
  }

  // Accept header diversity
  if (components.accept) {
    entropy += 10;
  }

  return Math.min(100, entropy);
}

/**
 * Format fingerprint info for logging
 *
 * @param {Object} components - Fingerprint components
 * @param {string} fingerprint - The SHA-256 hash
 * @returns {string} - Formatted string for logging
 */
export function formatFingerprintInfo(components, fingerprint) {
  return [
    `Fingerprint: ${fingerprint.substring(0, 16)}...`,
    `UA: ${components.userAgent?.substring(0, 30) || 'unknown'}...`,
    `IP: ${components.ip || 'unknown'}`,
    `Lang: ${components.acceptLanguage || 'unknown'}`
  ].join(' | ');
}

export default {
  createServerFingerprint,
  createCombinedFingerprint,
  getFingerprintComponents,
  fingerprintsMatch,
  detectSpoofing,
  calculateEntropy,
  formatFingerprintInfo
};
