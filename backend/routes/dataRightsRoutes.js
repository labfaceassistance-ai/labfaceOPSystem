const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * Data Rights Routes - Philippine Data Privacy Act Compliance
 * Implements: Right to Access, Right to Erasure, Right to Rectification
 */

/**
 * Export user data (Right to Access)
 * POST /api/data-rights/export
 */
router.post('/export', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Fetch comprehensive user data including student details
        // Try looking up by user_id (string) first
        let [userData] = await pool.query(`
            SELECT 
                u.*,
                s.year_level,
                s.section,
                c.code as course,
                c.name as course_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE u.user_id = ?
        `, [userId]);

        // If not found, try looking up by id (primary key)
        if (!userData || userData.length === 0) {
            [userData] = await pool.query(`
                SELECT 
                    u.*,
                    s.year_level,
                    s.section,
                    c.code as course,
                    c.name as course_name
                FROM users u
                LEFT JOIN students s ON u.id = s.user_id
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE u.id = ?
            `, [userId]);
        }

        if (!userData || userData.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userRecord = userData[0];
        const numericId = userRecord.id;
        const stringId = userRecord.user_id;

        // Fetch attendance records (uses numeric student_id and created_at)
        let attendance = [];
        try {
            [attendance] = await pool.query(
                `SELECT al.*, s.date, s.start_time, s.type
                 FROM attendance_logs al
                 LEFT JOIN sessions s ON al.session_id = s.id
                 WHERE al.student_id = ?
                 ORDER BY al.created_at DESC`,
                [numericId]
            );
        } catch (err) {
            console.error('Error fetching attendance for export:', err.message);
            attendance = [];
        }

        // Fetch consent history (uses string user_id based on consentRoutes.js)
        const [consents] = await pool.query(
            'SELECT * FROM consent_records WHERE user_id = ? ORDER BY timestamp DESC',
            [stringId]
        );

        // Fetch face photos (uses numeric user_id)
        const [facePhotos] = await pool.query(
            'SELECT angle, photo_url FROM face_photos WHERE user_id = ?',
            [numericId]
        );

        // Remove sensitive fields from export
        const user = userData[0];
        delete user.password_hash;
        delete user.facenet_embedding;
        delete user.facenet_embedding_encrypted;

        const exportData = {
            export_info: {
                export_date: new Date().toISOString(),
                user_id: userId,
                compliance: 'Philippine Data Privacy Act of 2012',
                rights: 'Right to Access (Section 16)'
            },
            personal_information: user,
            attendance_records: attendance,
            consent_history: consents,
            face_photos: facePhotos.map(p => ({ angle: p.angle, url: p.photo_url })),
            statistics: {
                total_attendance: attendance.length,
                total_consents: consents.length,
                total_face_photos: facePhotos.length
            }
        };

        res.json(exportData);

    } catch (error) {
        console.error('Data export error:', error);
        res.status(500).json({ error: 'Failed to export data', details: error.message });
    }
});

/**
 * Request data deletion (Right to Erasure)
 * POST /api/data-rights/delete
 */
router.post('/delete', authenticateToken, async (req, res) => {
    try {
        const { userId, reason } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Check if user exists
        const [users] = await pool.query(
            'SELECT user_id, first_name, last_name FROM users WHERE user_id = ?',
            [userId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create deletion request table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deletion_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                user_name VARCHAR(255),
                reason TEXT,
                requested_at DATETIME NOT NULL,
                status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
                processed_at DATETIME DEFAULT NULL,
                processed_by VARCHAR(50) DEFAULT NULL,
                notes TEXT,
                INDEX idx_user (user_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Insert deletion request
        await pool.query(`
            INSERT INTO deletion_requests (user_id, user_name, reason, requested_at, status)
            VALUES (?, ?, ?, NOW(), 'pending')
        `, [
            userId,
            `${users[0].first_name} ${users[0].last_name}`,
            reason || 'User requested data deletion'
        ]);

        res.json({
            success: true,
            message: 'Data deletion request submitted successfully',
            details: {
                userId,
                status: 'pending',
                processing_time: '30 days maximum',
                compliance: 'Philippine Data Privacy Act Section 16(e)'
            }
        });

    } catch (error) {
        console.error('Deletion request error:', error);
        res.status(500).json({ error: 'Failed to submit deletion request', details: error.message });
    }
});

/**
 * Update user data (Right to Rectification)
 * POST /api/data-rights/rectify
 */
router.post('/rectify', authenticateToken, async (req, res) => {
    try {
        const { userId, updates } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        // Allowed fields for rectification
        const allowedFields = ['first_name', 'middle_name', 'last_name', 'email', 'section'];
        const updateFields = [];
        const updateValues = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateValues.push(userId);

        // Update user data
        const [result] = await pool.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User data updated successfully',
            updated_fields: Object.keys(updates).filter(k => allowedFields.includes(k)),
            compliance: 'Philippine Data Privacy Act Section 16(c)'
        });

    } catch (error) {
        console.error('Data rectification error:', error);
        res.status(500).json({ error: 'Failed to update data', details: error.message });
    }
});

/**
 * Get deletion requests (Admin only)
 * GET /api/data-rights/deletion-requests
 */
router.get('/deletion-requests', authenticateToken, async (req, res) => {
    try {
        // Only admin can view deletion requests
        const userRoles = req.user.role ? req.user.role.split(',').map(r => r.trim()) : [];
        if (!userRoles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        let requests = [];
        try {
            [requests] = await pool.query(`
                SELECT * FROM deletion_requests 
                ORDER BY requested_at DESC
            `);
        } catch (dbError) {
            // If table doesn't exist, return empty array
            if (dbError.code !== 'ER_NO_SUCH_TABLE') {
                throw dbError;
            }
        }

        res.json({ requests });

    } catch (error) {
        console.error('Fetch deletion requests error:', error);
        res.status(500).json({ error: 'Failed to fetch deletion requests' });
    }
});

/**
 * Process deletion request (Admin only)
 * POST /api/data-rights/process-deletion
 */
router.post('/process-deletion', authenticateToken, async (req, res) => {
    try {
        // Only admin can process deletion requests
        const userRoles = req.user.role ? req.user.role.split(',').map(r => r.trim()) : [];
        if (!userRoles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { requestId, action, adminId, notes } = req.body;

        if (!requestId || !action || !adminId) {
            return res.status(400).json({ error: 'requestId, action, and adminId are required' });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';

        await pool.query(`
            UPDATE deletion_requests 
            SET status = ?, processed_at = NOW(), processed_by = ?, notes = ?
            WHERE id = ?
        `, [status, adminId, notes, requestId]);

        res.json({
            success: true,
            message: `Deletion request ${status}`,
            requestId,
            action: status
        });

    } catch (error) {
        console.error('Process deletion error:', error);
        res.status(500).json({ error: 'Failed to process deletion request' });
    }
});

module.exports = router;
