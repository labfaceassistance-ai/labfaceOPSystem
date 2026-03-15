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

// Get Consent Status (Latest)
// GET /api/consent/status/:userId
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Resolve userId if it's an integer
        let targetUserId = userId;
        if (/^\d+$/.test(userId)) {
            const [u] = await pool.query('SELECT user_id FROM users WHERE id = ?', [userId]);
            if (u.length > 0) targetUserId = u[0].user_id;
        }

        // Get latest consent record from consent_records table
        const [consentRecords] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
            [targetUserId]
        );

        // Get privacy policy fields from users table
        const [users] = await pool.query(
            `SELECT privacy_policy_accepted, privacy_policy_version, privacy_policy_accepted_at, consent_status
            FROM users WHERE user_id = ?`,
            [targetUserId]
        );

        const user = users.length > 0 ? users[0] : null;

        // Determine consent status from consent_records
        let recordStatus = 'pending';
        let recordConsentGiven = false;
        let recordType = null;
        let recordVersion = null;
        let recordTimestamp = null;

        if (consentRecords.length > 0) {
            const record = consentRecords[0];
            recordStatus = record.consent_given ? 'given' : 'revoked';
            recordConsentGiven = !!record.consent_given;
            recordType = record.consent_type;
            recordVersion = record.consent_version;
            recordTimestamp = record.timestamp;
        }

        // Return combined data
        res.json({
            // From consent_records table
            status: recordStatus,
            consentGiven: recordConsentGiven,
            type: recordType,
            version: recordVersion,
            lastUpdated: recordTimestamp,

            // From users table (for profile page compatibility)
            consent_status: recordStatus,
            privacy_policy_accepted: user?.privacy_policy_accepted || false,
            privacy_policy_version: user?.privacy_policy_version || null,
            privacy_policy_accepted_at: user?.privacy_policy_accepted_at || null
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

        // Resolve userId
        let targetUserId = userId;
        if (/^\d+$/.test(userId)) {
            const [u] = await pool.query('SELECT user_id FROM users WHERE id = ?', [userId]);
            if (u.length > 0) targetUserId = u[0].user_id;
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

        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [userId]
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

        // FIX: Check if userId is an internal integer ID, and if so, fetch the string user_id
        // The consent_records table links to users.user_id (varchar), not users.id (int)
        // If userId resembles an integer (e.g., 15), look it up.
        // If it resembles a school ID (e.g., 2022-00322-LQ-0), use it directly.

        let targetUserId = userId;
        const isIntegerId = /^\d+$/.test(userId.toString());

        if (isIntegerId) {
            const [userRows] = await pool.query('SELECT user_id FROM users WHERE id = ?', [userId]);
            if (userRows.length > 0) {
                targetUserId = userRows[0].user_id;
            } else {
                // Fallback: check if it exists as user_id string (unlikely for short integers but possible)
                const [stringRows] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
                if (stringRows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
            }
        }

        // Final check to ensure targetUserId exists in users table (to satisfy Foreign Key)
        const [checkUser] = await pool.query('SELECT id FROM users WHERE user_id = ?', [targetUserId]);
        if (checkUser.length === 0) {
            console.error(`[Consent] Foreign Key Check Failed: ${targetUserId} not found in users.user_id`);
            // Try to see if we can find it by ID one last time
            const [lastResort] = await pool.query('SELECT user_id FROM users WHERE id = ?', [userId]);
            if (lastResort.length > 0) {
                targetUserId = lastResort[0].user_id;
            } else {
                return res.status(400).json({ error: `Invalid User ID: ${userId}` });
            }
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

        await pool.query(
            `INSERT INTO consent_records 
            (user_id, consent_type, consent_given, consent_text, timestamp) 
            VALUES (?, ?, 0, ?, NOW())`,
            [userId, consentType, reason ? `Withdrawn: ${reason}` : 'Consent withdrawn']
        );

        console.log(`[Consent] Withdrawn for user ${userId}: ${consentType}`);
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
        await pool.query(
            'INSERT INTO consent_records (user_id, consent_type, consent_given, timestamp) VALUES (?, ?, 0, NOW())',
            [userId, type || 'revocation']
        );
        res.json({ message: 'Consent revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
