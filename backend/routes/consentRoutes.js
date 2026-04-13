const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ensure consent_records table exists
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS consent_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                consent_type VARCHAR(50) NOT NULL, -- 'registration', 'cookie', 'marketing'
                consent_given BOOLEAN DEFAULT FALSE,
                consent_text TEXT,
                consent_version VARCHAR(20),
                ip_address VARCHAR(45),
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        // Ignore error if table exists or foreign key fails (soft fail)
        console.error('Consent table check warning:', err.message);
    }
})();

// Helper to resolve any ID (PK or string-based user_id) to the string-based user_id
const resolveUserId = async (idOrUserid) => {
    if (!idOrUserid || idOrUserid === 'undefined' || idOrUserid === 'null') return null;
    
    // Convert to string and trim
    const input = idOrUserid.toString().trim();

    // 1. Check if it already exists as user_id string (e.g. "2022-00330-LQ-0" or "admin")
    // Support fuzzy matching (ignore dashes/spaces)
    const [rows] = await pool.query(
        "SELECT user_id FROM users WHERE REPLACE(REPLACE(user_id, '-', ''), ' ', '') = REPLACE(REPLACE(?, '-', ''), ' ', '')", 
        [input]
    );
    if (rows.length > 0) return rows[0].user_id;

    // 2. If not found as user_id, check if it's an internal numeric PK (id)
    if (/^\d+$/.test(input)) {
        const [u] = await pool.query('SELECT user_id FROM users WHERE id = ?', [input]);
        if (u.length > 0) {
            console.log(`[Consent] Resolved internal ID ${input} to string ID ${u[0].user_id}`);
            return u[0].user_id;
        }
    }
    
    // 3. Last fallback: Check if input is a valid user_id format even if user record doesn't exist yet
    if (input.length > 3) {
        return input;
    }

    console.warn(`[Consent] Could not resolve user ID for: ${input}`);
    return null;
};

// Get Consent Status (Latest)
// GET /api/consent/status/:userId
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = await resolveUserId(userId);

        if (!targetUserId) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 1. Get ALL latest records for different consent types
        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [targetUserId]
        );

        // 2. Get status from users table
        const [users] = await pool.query(
            `SELECT privacy_policy_accepted, privacy_policy_version, privacy_policy_accepted_at, consent_status, role
            FROM users WHERE user_id = ?`,
            [targetUserId]
        );

        const user = users.length > 0 ? users[0] : null;

        // Find binary consent types
        // 'registration' or 'biometric' counted for biometric status
        const biometric = rows.find(r => r.consent_type === 'biometric' || r.consent_type === 'registration');
        // 'data_privacy' or 'privacy_policy' counted for privacy status
        const privacy = rows.find(r => r.consent_type === 'data_privacy' || r.consent_type === 'privacy_policy');

        // Combined logic: 
        // 1. Biometric is accepted if record exists OR if user table says 'given'
        const isBiometricAccepted = biometric ? !!biometric.consent_given : (user?.consent_status === 'given');
        
        // 2. Privacy is accepted if record exists OR user table has flag OR (Legacy Fallback) biometric exists
        // Legacy accounts checked both boxes during registration but only saved one record.
        const isPrivacyAccepted = privacy ? !!privacy.consent_given : (user?.privacy_policy_accepted === 1 || isBiometricAccepted);

        // 3. Overall status is 'given' if either biometric or privacy was ever accepted
        const overallStatus = (isBiometricAccepted || isPrivacyAccepted || user?.consent_status === 'given') ? 'given' : 'pending';

        res.json({
            // Status icons logic
            consent_status: overallStatus,
            biometricAccepted: isBiometricAccepted,
            privacyPolicyAccepted: isPrivacyAccepted,
            
            // Dates
            lastUpdated: rows.length > 0 ? rows[0].timestamp : (user?.privacy_policy_accepted_at || null),
            
            // Legacy/Detail fields
            biometricDate: biometric?.timestamp || null,
            privacyDate: privacy?.timestamp || user?.privacy_policy_accepted_at || null,
            
            // User info
            userId: targetUserId,
            role: user?.role || 'user'
        });
    } catch (err) {
        console.error('Consent status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check if User Needs to Accept Consent
// GET /api/consent/check/:userId
// Returns: { needsConsent: true/false, reason: string }
router.get('/check/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = await resolveUserId(userId);

        if (!targetUserId) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get latest consent record
        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
            [targetUserId]
        );

        // No consent record = needs consent
        if (rows.length === 0) {
            return res.json({
                needsConsent: true,
                reason: 'no_record',
                message: 'User has no consent record'
            });
        }

        const record = rows[0];

        // Consent not given (pending or revoked) = needs consent
        if (!record.consent_given) {
            return res.json({
                needsConsent: true,
                reason: 'not_given',
                message: 'User has not accepted consent',
                consentType: record.consent_type
            });
        }

        // Consent given = no action needed
        res.json({
            needsConsent: false,
            reason: 'already_given',
            message: 'User has already accepted consent',
            consentDate: record.timestamp
        });
    } catch (err) {
        console.error('Consent check error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Consent History
// GET /api/consent/history/:userId
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = await resolveUserId(userId);

        if (!targetUserId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [targetUserId]
        );

        res.json({ history: rows });
    } catch (err) {
        console.error('Consent history error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Record Consent
// POST /api/consent/record
router.post('/record', async (req, res) => {
    let { userId, consentType, consentGiven, consentText, consentVersion } = req.body;

    // Capture IP address and user agent for audit trail
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        if (!userId || !consentType) {
            return res.status(400).json({ error: 'userId and consentType are required' });
        }

        const targetUserId = await resolveUserId(userId);

        if (!targetUserId) {
            return res.status(404).json({ error: `User not found for provided ID: ${userId}` });
        }

        await pool.query(
            `INSERT INTO consent_records 
            (user_id, consent_type, consent_given, consent_text, consent_version, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [targetUserId, consentType, consentGiven ? 1 : 0, consentText || null, consentVersion || '1.0', ipAddress, userAgent]
        );

        // Also update users table for profile page compatibility
        if (consentGiven) {
            await pool.query(
                `UPDATE users 
                SET privacy_policy_accepted = 1,
                privacy_policy_version = ?,
                privacy_policy_accepted_at = NOW(),
                consent_status = 'given'
                WHERE user_id = ?`,
                [consentVersion || '1.0', targetUserId]
            );
        }

        console.log(`[Consent] Recorded for user ${targetUserId} (Original: ${userId}): ${consentType} = ${consentGiven}`);
        res.json({ message: 'Consent recorded successfully' });
    } catch (err) {
        console.error('Consent record error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Withdraw Consent
// POST /api/consent/withdraw
router.post('/withdraw', async (req, res) => {
    const { userId, consentType, reason } = req.body;

    try {
        if (!userId || !consentType) {
            return res.status(400).json({ error: 'userId and consentType are required' });
        }

        const targetUserId = await resolveUserId(userId);

        if (!targetUserId) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query(
            `INSERT INTO consent_records 
            (user_id, consent_type, consent_given, consent_text, timestamp) 
            VALUES (?, ?, 0, ?, NOW())`,
            [targetUserId, consentType, reason ? `Withdrawn: ${reason}` : 'Consent withdrawn']
        );

        console.log(`[Consent] Withdrawn for user ${targetUserId}: ${consentType}`);
        res.json({ message: 'Consent withdrawn successfully' });
    } catch (err) {
        console.error('Consent withdraw error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Revoke Consent (for testing/future use)
router.post('/revoke', async (req, res) => {
    const { userId, type } = req.body;
    try {
        const targetUserId = await resolveUserId(userId);
        if (!targetUserId) {
            return res.status(404).json({ error: 'User not found' });
        }

        await pool.query(
            'INSERT INTO consent_records (user_id, consent_type, consent_given, timestamp) VALUES (?, ?, 0, NOW())',
            [targetUserId, type || 'revocation']
        );
        res.json({ message: 'Consent revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
