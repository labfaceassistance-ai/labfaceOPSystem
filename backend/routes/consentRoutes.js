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
const resolveUser = async (idOrUserid) => {
    if (!idOrUserid || idOrUserid === 'undefined' || idOrUserid === 'null') return null;
    
    const input = idOrUserid.toString().trim();

    // Fetch the full user object to get both IDs
    const [rows] = await pool.query(
        `SELECT id, user_id, consent_status, privacy_policy_accepted 
         FROM users 
         WHERE id = ? OR user_id = ? OR REPLACE(REPLACE(user_id, '-', ''), ' ', '') = REPLACE(REPLACE(?, '-', ''), ' ', '')`, 
        [input, input, input]
    );

    if (rows.length > 0) return rows[0];

    // Fallback for non-existent users (e.g. during registration)
    return { id: null, user_id: input };
};

// Get Consent Status (Latest)
// GET /api/consent/status/:userId
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await resolveUser(userId);

        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const numericId = user.id;
        const stringId = user.user_id;

        // 1. Get ALL latest records for different consent types (Using stringId)
        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [stringId]
        );

        // 2. Find specific consent records
        const biometric = rows.find(r => r.consent_type === 'biometric' || r.consent_type === 'registration');
        const privacy = rows.find(r => r.consent_type === 'data_privacy' || r.consent_type === 'privacy_policy');

        // 3. Get face photos count for legacy biometric fallback (Using numericId)
        let hasPhotos = false;
        if (numericId) {
            const [photos] = await pool.query(
                'SELECT COUNT(*) as count FROM face_photos WHERE user_id = ?',
                [numericId]
            );
            hasPhotos = photos[0].count > 0;
        }

        // 4. For multi-role users or legacy users, derive consent from users table flags.
        //    The users table is the authoritative record — if consent_status = 'given' in the DB,
        //    the user has consented regardless of whether consent_records rows exist.
        const userTableSaysConsented = user?.consent_status === 'given' || user?.privacy_policy_accepted === 1;

        // Biometric: accepted if record exists, OR user table says given, OR they have face photos
        const isBiometricAccepted = biometric
            ? !!biometric.consent_given
            : (userTableSaysConsented || hasPhotos);

        // Privacy: accepted if record exists, OR user table has flag, OR user exists (registered = consented once)
        const isPrivacyAccepted = privacy
            ? !!privacy.consent_given
            : (user?.privacy_policy_accepted === 1 || userTableSaysConsented || !!numericId);

        // Overall: given if any positive signal exists
        const overallStatus = (isBiometricAccepted || isPrivacyAccepted) ? 'given' : 'pending';

        res.json({
            consent_status: overallStatus,
            biometricAccepted: isBiometricAccepted,
            privacyPolicyAccepted: isPrivacyAccepted,

            // Dates
            lastUpdated: rows.length > 0 ? rows[0].timestamp : (user?.privacy_policy_accepted_at || null),

            // Legacy/Detail fields
            biometricDate: biometric?.timestamp || null,
            privacyDate: privacy?.timestamp || user?.privacy_policy_accepted_at || null,

            // User info
            userId: stringId,
            numericId: numericId,
            role: user?.Role || user?.role || 'user'
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
        const user = await resolveUser(userId);

        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stringId = user.user_id;

        // Get latest consent record
        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
            [stringId]
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
        const user = await resolveUser(userId);

        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stringId = user.user_id;

        const [rows] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [stringId]
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

        const user = await resolveUser(userId);

        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: `User not found for provided ID: ${userId}` });
        }

        const numericId = user.id;
        const stringId = user.user_id;

        await pool.query(
            `INSERT INTO consent_records 
            (user_id, consent_type, consent_given, consent_text, consent_version, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [stringId, consentType, consentGiven ? 1 : 0, consentText || null, consentVersion || '1.0', ipAddress, userAgent]
        );

        // Also update users table for profile page compatibility
        if (consentGiven && numericId) {
            await pool.query(
                `UPDATE users 
                SET privacy_policy_accepted = 1,
                privacy_policy_version = ?,
                privacy_policy_accepted_at = NOW(),
                consent_status = 'given'
                WHERE id = ?`,
                [consentVersion || '1.0', numericId]
            );
        }

        console.log(`[Consent] Recorded for user ${stringId} (Numeric: ${numericId}): ${consentType} = ${consentGiven}`);
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

        const user = await resolveUser(userId);

        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stringId = user.user_id;

        await pool.query(
            `INSERT INTO consent_records 
            (user_id, consent_type, consent_given, consent_text, timestamp) 
            VALUES (?, ?, 0, ?, NOW())`,
            [stringId, consentType, reason ? `Withdrawn: ${reason}` : 'Consent withdrawn']
        );

        console.log(`[Consent] Withdrawn for user ${stringId}: ${consentType}`);
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
        const user = await resolveUser(userId);
        if (!user || (!user.id && !user.user_id)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stringId = user.user_id;

        await pool.query(
            'INSERT INTO consent_records (user_id, consent_type, consent_given, timestamp) VALUES (?, ?, 0, NOW())',
            [stringId, type || 'revocation']
        );
        res.json({ message: 'Consent revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
