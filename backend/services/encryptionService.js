const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Lazy initialization to avoid Buffer.from() error at module load
let _key = null;
const getKey = () => {
    if (!_key && process.env.ENCRYPTION_KEY) {
        _key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    return _key;
};

/**
 * Encryption Service for Philippine Data Privacy Act Compliance
 * Uses AES-256-GCM for encrypting sensitive biometric data at rest
 */
class EncryptionService {
    /**
     * Encrypt data using AES-256-GCM
     * @param {any} data - Data to encrypt (will be JSON stringified)
     * @returns {string} Encrypted data as hex string (IV + AuthTag + Ciphertext)
     */
    encrypt(data) {
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY not set in environment variables');
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Return: IV (32 chars) + AuthTag (32 chars) + Encrypted data
        return iv.toString('hex') + authTag.toString('hex') + encrypted;
    }

    /**
     * Decrypt data using AES-256-GCM
     * @param {string} encryptedData - Encrypted hex string
     * @returns {any} Decrypted and parsed data
     */
    decrypt(encryptedData) {
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY not set in environment variables');
        }

        if (!encryptedData || encryptedData.length < (IV_LENGTH + AUTH_TAG_LENGTH) * 2) {
            throw new Error('Invalid encrypted data');
        }

        const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
        const authTag = Buffer.from(
            encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
            'hex'
        );
        const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * Check if encryption is properly configured
     * @returns {boolean} True if encryption key is set
     */
    isConfigured() {
        return !!process.env.ENCRYPTION_KEY;
    }
}

module.exports = new EncryptionService();
