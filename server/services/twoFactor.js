import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Service d'authentification à deux facteurs (2FA)
 */

/**
 * Génère un secret 2FA pour un utilisateur
 */
export const generateSecret = async (userEmail, userName) => {
  const secret = speakeasy.generateSecret({
    name: `E-Voting (${userEmail})`,
    issuer: 'E-Voting Platform',
    length: 32
  });

  // Générer le QR code
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeDataUrl,
    otpauth_url: secret.otpauth_url
  };
};

/**
 * Vérifie un code TOTP
 */
export const verifyToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Accepte les codes ±60 secondes
  });
};

/**
 * Génère des codes de secours
 */
export const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Génère un code à 8 chiffres
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
};

/**
 * Hash les codes de secours pour stockage sécurisé
 */
export const hashBackupCodes = (codes) => {
  return codes.map(code => {
    return crypto.createHash('sha256').update(code).digest('hex');
  });
};

/**
 * Vérifie un code de secours
 */
export const verifyBackupCode = (code, hashedCodes) => {
  const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
  return hashedCodes.includes(hashedInput);
};

/**
 * Supprime un code de secours utilisé
 */
export const removeUsedBackupCode = (code, hashedCodes) => {
  const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
  return hashedCodes.filter(hash => hash !== hashedInput);
};

export default {
  generateSecret,
  verifyToken,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  removeUsedBackupCode
};
