import crypto from 'crypto';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Génère un token sécurisé unique
 */
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Génère un hash sécurisé
 */
export const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Chiffre des données sensibles (pour votes secrets)
 */
export const encrypt = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

/**
 * Déchiffre des données
 */
export const decrypt = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

/**
 * Crée un hash de bulletin pour vérification d'intégrité
 */
export const createBallotHash = (electionId, voterToken, timestamp) => {
  const data = `${electionId}-${voterToken}-${timestamp}`;
  return generateHash(data);
};

/**
 * Vérifie l'intégrité d'un bulletin
 */
export const verifyBallotIntegrity = (ballot, electionId, voterToken) => {
  const computedHash = createBallotHash(electionId, voterToken, ballot.timestamp);
  return computedHash === ballot.hash;
};
