const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const warningService = require('../services/attendanceWarningService');

(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_warnings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                warning_type VARCHAR(50) NOT NULL, -- 'absence_warning', 'dropout_warning'
                absent_count INT DEFAULT 0,
                late_count INT DEFAULT 0,
                equivalent_absences FLOAT DEFAULT 0,
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_resolved BOOLEAN DEFAULT FALSE,
                resolved_at DATETIME,
                notes TEXT,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        console.error('Error initializing warnings table:', err);
    }
})();

// Get all active warnings for a student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify access (own data or professor/admin)
        if (req.user.role === 'student' && req.user.id != studentId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [warnings] = await pool.query(`
            SELECT aw.*, c.subject_code, c.subject_name 
            FROM attendance_warnings aw
            JOIN classes c ON aw.class_id = c.id
            WHERE aw.student_id = ? AND aw.is_resolved = FALSE
            ORDER BY aw.triggered_at DESC
        `, [studentId]);

        res.json(warnings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get warnings for a specific class (Professor View)
router.get('/class/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;

        // Check if professor owns class
        const [cls] = await pool.query('SELECT professor_id FROM classes WHERE id = ?', [classId]);
        if (!cls[0]) return res.status(404).json({ error: 'Class not found' });

        if (req.user.role !== 'admin' && cls[0].professor_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [warnings] = await pool.query(`
            SELECT aw.*, u.first_name, u.last_name, u.student_id as student_number
            FROM attendance_warnings aw
            JOIN users u ON aw.student_id = u.id
            WHERE aw.class_id = ? AND aw.is_resolved = FALSE
            ORDER BY aw.equivalent_absences DESC, aw.triggered_at DESC
        `, [classId]);

        res.json(warnings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get warnings for specific student in specific class
router.get('/student/:studentId/class/:classId', authenticateToken, async (req, res) => {
    const { studentId, classId } = req.params;
    try {
        const warnings = await warningService.getActiveWarnings(studentId, classId);
        res.json(warnings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manually resolve a warning
router.patch('/:id/resolve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        // Check permissions (Professor of the class)
        const [warning] = await pool.query(`
            SELECT aw.*, c.professor_id 
            FROM attendance_warnings aw
            JOIN classes c ON aw.class_id = c.id
            WHERE aw.id = ?
        `, [id]);

        if (!warning[0]) return res.status(404).json({ error: 'Warning not found' });

        if (req.user.role !== 'admin' && warning[0].professor_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query(`
            UPDATE attendance_warnings 
            SET is_resolved = TRUE, resolved_at = NOW(), notes = ?
            WHERE id = ?
        `, [notes || 'Manually resolved', id]);

        res.json({ message: 'Warning resolved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
