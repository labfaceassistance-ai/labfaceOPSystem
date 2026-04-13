const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/analytics/professor/:userId/trends
 * Returns 7-day attendance trends across all classes for a professor
 */
router.get('/professor/:userId/trends', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // 1. Resolve professor PK
        const [profUsers] = await pool.query('SELECT id FROM users WHERE user_id = ?', [userId]);
        if (profUsers.length === 0) return res.status(404).json({ message: 'Professor not found' });
        const professorPk = profUsers[0].id;

        // 2. Get active class IDs
        const [classes] = await pool.query(
            'SELECT id FROM classes WHERE professor_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
            [professorPk]
        );
        
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        // 3. Get last 7 days of attendance counts
        // We use PHT (Philippines) for grouping
        const [trends] = await pool.query(`
            SELECT 
                DATE_FORMAT(CONVERT_TZ(al.time_in, '+00:00', '+08:00'), '%a') as period,
                DATE(CONVERT_TZ(al.time_in, '+00:00', '+08:00')) as full_date,
                COUNT(al.id) as attendance_count,
                COUNT(DISTINCT al.student_id) as unique_students
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${classIds.map(() => '?').join(',')})
            AND al.time_in >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND (al.status = 'Present' OR al.status = 'Late')
            GROUP BY full_date
            ORDER BY full_date ASC
        `, classIds);

        // Fill in missing days with zeros to ensure a smooth chart
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const existing = trends.find(t => t.full_date.toISOString().split('T')[0] === dateStr);
            last7Days.push({
                period: dayName,
                attendance_count: existing ? existing.attendance_count : 0,
                unique_students: existing ? existing.unique_students : 0
            });
        }

        res.json(last7Days);
    } catch (err) {
        console.error('Trend Analytics Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/analytics/student-insights
 * Fetches at-risk students across all professor's classes
 */
router.get('/student-insights', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id; // From token
        const limit = parseInt(req.query.limit) || 10;
        const classId = req.query.classId;

        // 1. Resolve professor PK
        const [profUsers] = await pool.query('SELECT id FROM users WHERE user_id = ?', [userId]);
        if (profUsers.length === 0) return res.status(404).json({ message: 'Professor not found' });
        const professorPk = profUsers[0].id;

        // 2. Get active class IDs to filter by
        let targetClassIds = [];
        if (classId) {
            targetClassIds = [classId];
        } else {
            const [classes] = await pool.query(
                'SELECT id FROM classes WHERE professor_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
                [professorPk]
            );
            if (classes.length === 0) return res.json({ atRiskStudents: [] });
            targetClassIds = classes.map(c => c.id);
        }

        // 3. Aggregate student attendance rates
        // We calculate rate based on PAST sessions only
        const [atRisk] = await pool.query(`
            SELECT 
                u.id, 
                u.user_id as student_id, 
                CONCAT(u.first_name, ' ', u.last_name) as name,
                c.subject_code,
                (
                    SELECT COUNT(*) 
                    FROM attendance_logs al 
                    JOIN sessions s_past ON al.session_id = s_past.id 
                    WHERE al.student_id = u.id 
                    AND s_past.class_id = c.id
                    AND (al.status = 'Present' OR al.status = 'Late')
                ) as attended_count,
                (
                    SELECT COUNT(*) 
                    FROM sessions s_all 
                    WHERE s_all.class_id = c.id 
                    AND (s_all.monitoring_ended_at IS NOT NULL OR s_all.date < CURDATE())
                ) as total_past_sessions
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            JOIN classes c ON e.class_id = c.id
            WHERE c.id IN (${targetClassIds.map(() => '?').join(',')})
            GROUP BY u.id, c.id
            HAVING total_past_sessions > 0
               AND (attended_count / total_past_sessions) < 0.75
            ORDER BY (attended_count / total_past_sessions) ASC
            LIMIT ?
        `, [...targetClassIds, limit]);

        const formatted = atRisk.map(s => ({
            ...s,
            attendance_rate: Math.round((s.attended_count / s.total_past_sessions) * 100)
        }));

        res.json({ atRiskStudents: formatted });
    } catch (err) {
        console.error('Student Insights Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
