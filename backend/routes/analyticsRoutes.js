const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ============================================================
// SCHEMA: auto-create interventions table on startup
// ============================================================
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interventions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                professor_id INT NOT NULL,
                student_id INT NOT NULL,
                class_id INT,
                date_contacted DATE,
                method VARCHAR(100),
                response VARCHAR(255),
                outcome VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_prof_student (professor_id, student_id)
            )
        `);
        console.log('[Analytics] Interventions table ready');

        // Migration: Add emergency contact columns if missing
        const [nameCol] = await pool.query('SHOW COLUMNS FROM users LIKE "emergency_contact_name"');
        if (nameCol.length === 0) {
            await pool.query('ALTER TABLE users ADD COLUMN emergency_contact_name VARCHAR(255)');
            console.log('[Analytics] Added emergency_contact_name column');
        }

        const [emailCol] = await pool.query('SHOW COLUMNS FROM users LIKE "emergency_contact_email"');
        if (emailCol.length === 0) {
            await pool.query('ALTER TABLE users ADD COLUMN emergency_contact_email VARCHAR(255)');
            console.log('[Analytics] Added emergency_contact_email column');
        }
    } catch (err) {
        console.error('[Analytics] Migration error:', err.message);
    }
})();

// ============================================================
// HELPERS
// ============================================================
async function resolveProfessorPk(userId) {
    const [rows] = await pool.query(
        'SELECT id FROM users WHERE user_id = ? OR REPLACE(user_id, "-", "") = ? OR id = ?',
        [userId, userId.toString().replace(/-/g, ''), isNaN(userId) ? -1 : Number(userId)]
    );
    return rows.length > 0 ? rows[0].id : null;
}

async function getProfessorClasses(professorPk) {
    const [classes] = await pool.query(
        `SELECT c.id, c.section, c.subject_code, c.subject_name, c.academic_period_id, c.schedule_json
         FROM classes c
         WHERE c.professor_id = ? AND (c.is_archived = 0 OR c.is_archived IS NULL)`,
        [professorPk]
    );
    return classes;
}

// Safely build IN(...) clause
function inClause(arr) {
    return arr.map(() => '?').join(',');
}

// ============================================================
// EXISTING: 7-day attendance trends
// ============================================================
router.get('/professor/:userId/trends', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const userId = req.params.userId;
        const [profUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR REPLACE(user_id, "-", "") = ? OR id = ?',
            [userId, userId.toString().replace(/-/g, ''), isNaN(userId) ? -1 : userId]
        );
        if (profUsers.length === 0) return res.status(404).json({ message: 'Professor not found' });
        const professorPk = profUsers[0].id;

        const [classes] = await pool.query(
            'SELECT id FROM classes WHERE professor_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
            [professorPk]
        );
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        const [trends] = await pool.query(`
            SELECT
                DATE_FORMAT(al.time_in, '%a') as period,
                DATE(al.time_in) as full_date,
                COUNT(al.id) as attendance_count,
                COUNT(DISTINCT al.student_id) as unique_students
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)})
            AND al.time_in >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND (al.status = 'Present' OR al.status = 'Late')
            GROUP BY full_date
            ORDER BY full_date ASC
        `, classIds);

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const existing = trends.find(t => t.full_date && t.full_date.toISOString().split('T')[0] === dateStr);
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

// ============================================================
// EXISTING: Student insights
// ============================================================
router.get('/student-insights', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const classId = req.query.classId;

        const [profUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR REPLACE(user_id, "-", "") = ? OR id = ?',
            [userId, userId.toString().replace(/-/g, ''), isNaN(userId) ? -1 : userId]
        );
        if (profUsers.length === 0) return res.status(404).json({ message: 'Professor not found' });
        const professorPk = profUsers[0].id;

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

        const [atRisk] = await pool.query(`
            SELECT
                u.id,
                u.user_id as student_id,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                c.subject_code,
                (SELECT COUNT(*) FROM attendance_logs al JOIN sessions s_past ON al.session_id = s_past.id
                 WHERE al.student_id = u.id AND s_past.class_id = c.id AND (al.status = 'Present' OR al.status = 'Late')) as attended_count,
                (SELECT COUNT(*) FROM sessions s_all WHERE s_all.class_id = c.id
                 AND (s_all.monitoring_ended_at IS NOT NULL OR s_all.date < CURDATE())) as total_past_sessions
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            JOIN classes c ON e.class_id = c.id
            WHERE c.id IN (${inClause(targetClassIds)})
            GROUP BY u.id, c.id
            HAVING total_past_sessions > 0 AND (attended_count / total_past_sessions) < 0.75
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

// ============================================================
// NEW: Dashboard KPIs
// ============================================================
router.get('/professor/:userId/dashboard', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json({ avgAttendance: 0, absentToday: 0, atRisk: 0, dropoutTriggered: 0 });
        const classIds = classes.map(c => c.id);

        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());

        // 1. Calculate Average of Averages (to match class card health scores)
        const [classStats] = await pool.query(`
            SELECT 
                s.class_id,
                SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN al.status IN ('Present','Late','Absent') THEN 1 ELSE 0 END) as total_count
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)})
            AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            GROUP BY s.class_id
        `, classIds);

        const classRates = classStats.map(stat => 
            stat.total_count > 0 ? (stat.present_count / stat.total_count) : 0
        );

        const avgAttendance = classRates.length > 0
            ? Math.round((classRates.reduce((a, b) => a + b, 0) / classRates.length) * 100)
            : 0;

        // 2. Absent today
        const [absentRows] = await pool.query(`
            SELECT COUNT(DISTINCT al.student_id) as cnt
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)})
            AND s.date = ? AND al.status = 'Absent'
            AND al.status NOT LIKE 'Log%'
        `, [...classIds, today]);

        const absentToday = Number(absentRows[0].cnt) || 0;

        // 3. Per-student eff_abs for at-risk / dropout
        const [studentStats] = await pool.query(`
            SELECT
                e.student_id,
                SUM(CASE WHEN al.status = 'Absent' THEN 1 ELSE 0 END) as abs_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN al.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) as attended
            FROM (SELECT DISTINCT student_id, class_id FROM enrollments) e
            LEFT JOIN sessions s ON e.class_id = s.class_id
                AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e.student_id
                AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            WHERE e.class_id IN (${inClause(classIds)}) AND e.student_id IS NOT NULL
            GROUP BY e.student_id
            HAVING total_sessions > 0
        `, classIds);

        let atRisk = 0;
        let dropoutTriggered = 0;
        for (const s of studentStats) {
            const effAbs = (s.abs_count || 0);
            const rate = s.total_sessions > 0 ? (s.attended / s.total_sessions) * 100 : 100;
            if (effAbs >= 3) dropoutTriggered++;
            else if (effAbs >= 2 || rate < 75) atRisk++;
        }

        res.json({ avgAttendance, absentToday, atRisk, dropoutTriggered });
    } catch (err) {
        console.error('[Dashboard KPIs] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Attendance by session (multi-line chart)
// ============================================================
router.get('/professor/:userId/attendance-by-session', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json({ sessions: [], sections: [] });

        const sectionResults = [];
        for (const cls of classes) {
            const [sessions] = await pool.query(`
                SELECT
                    s.id, s.date, s.start_time,
                    (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = ?) as enrolled,
                    (SELECT COUNT(*) FROM attendance_logs al
                     WHERE al.session_id = s.id AND al.status IN ('Present','Late','Excused')
                     AND al.status NOT LIKE 'Log%') as attended
                FROM sessions s
                WHERE s.class_id = ?
                AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
                ORDER BY s.date ASC, s.start_time ASC
                LIMIT 10
            `, [cls.id, cls.id]);

            sectionResults.push({
                section: cls.section || cls.subject_code,
                classId: cls.id,
                sessions: sessions.map((s, i) => ({
                    label: `S${i + 1}`,
                    rate: s.enrolled > 0 ? Math.round((s.attended / s.enrolled) * 100) : 0
                }))
            });
        }

        const maxLen = Math.max(...sectionResults.map(r => r.sessions.length), 1);
        const sessionLabels = Array.from({ length: maxLen }, (_, i) => `S${i + 1}`);
        const sections = sectionResults.map(r => ({
            section: r.section,
            classId: r.classId,
            rates: sessionLabels.map((_, i) => r.sessions[i]?.rate ?? null)
        }));

        res.json({ sessions: sessionLabels, sections });
    } catch (err) {
        console.error('[Attendance By Session] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Status breakdown (doughnut)
// ============================================================
router.get('/professor/:userId/status-breakdown', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json({ present: 0, late: 0, absent: 0, total: 0 });
        const classIds = classes.map(c => c.id);

        const [rows] = await pool.query(`
            SELECT
                SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN al.status IN ('Absent','Excused') THEN 1 ELSE 0 END) as absent_count
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)})
            AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
        `, classIds);

        const present = Number(rows[0].present_count) || 0;
        const late = Number(rows[0].late_count) || 0;
        const absent = Number(rows[0].absent_count) || 0;
        res.json({ present, late, absent, total: present + late + absent });
    } catch (err) {
        console.error('[Status Breakdown] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: By section grouped bar
// ============================================================
router.get('/professor/:userId/by-section', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);

        const result = [];
        for (const cls of classes) {
            const [rows] = await pool.query(`
                SELECT
                    SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                    SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                    SUM(CASE WHEN al.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
                    COUNT(DISTINCT s.id) as session_count
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.class_id = ?
                AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            `, [cls.id]);

            result.push({
                section: cls.section || cls.subject_code,
                subjectName: cls.subject_name,
                classId: cls.id,
                present: Number(rows[0].present_count) || 0,
                late: Number(rows[0].late_count) || 0,
                absent: Number(rows[0].absent_count) || 0,
                sessionCount: Number(rows[0].session_count) || 0,
                schedule_json: cls.schedule_json
            });
        }
        res.json(result);
    } catch (err) {
        console.error('[By Section] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Absence heatmap (time slot × day of week)
// ============================================================
router.get('/professor/:userId/absence-heatmap', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json({ slots: [], days: [], data: [] });
        const classIds = classes.map(c => c.id);

        const [rows] = await pool.query(`
            SELECT
                CASE 
                    WHEN DAYOFWEEK(s.date) = 2 THEN 0 -- Mon
                    WHEN DAYOFWEEK(s.date) = 3 THEN 1 -- Tue
                    WHEN DAYOFWEEK(s.date) = 4 THEN 2 -- Wed
                    WHEN DAYOFWEEK(s.date) = 5 THEN 3 -- Thu
                    WHEN DAYOFWEEK(s.date) = 6 THEN 4 -- Fri
                    ELSE -1
                END as weekday_val,
                HOUR(s.start_time) as hour_val,
                COUNT(al.id) as absent_count
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)})
            AND al.status = 'Absent'
            GROUP BY weekday_val, hour_val
            HAVING weekday_val >= 0
        `, classIds);

        const DAYS = [0, 1, 2, 3, 4]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
        const SLOTS = [
            { label: '8AM', hours: [7, 8, 9] },
            { label: '10AM', hours: [10, 11] },
            { label: '1PM', hours: [12, 13, 14] },
            { label: '3PM', hours: [15, 16, 17] },
        ];

        const data = SLOTS.map(slot =>
            DAYS.map(dayVal => {
                const matches = rows.filter(r => Number(r.weekday_val) === dayVal && slot.hours.includes(Number(r.hour_val)));
                return matches.reduce((sum, r) => sum + Number(r.absent_count), 0);
            })
        );

        res.json({ slots: SLOTS.map(s => s.label), days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], data });
    } catch (err) {
        console.error('[Heatmap] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Absence by day of week (bar chart)
// ============================================================
router.get('/professor/:userId/absence-by-day', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        const [rows] = await pool.query(`
            SELECT DAYNAME(s.date) as day_name, COUNT(al.id) as cnt
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${inClause(classIds)}) AND al.status = 'Absent'
            GROUP BY day_name
        `, classIds);

        const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const result = DAY_ORDER.map((d, i) => ({
            day: d,
            shortDay: SHORT[i],
            count: Number(rows.find(r => r.day_name === d)?.cnt) || 0
        }));
        res.json(result);
    } catch (err) {
        console.error('[Absence By Day] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Full students at-risk list (OPTIMIZED)
// ============================================================
router.get('/professor/:userId/students-at-risk', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        // Fetch basic stats and intervention status in one query
        const [students] = await pool.query(`
            SELECT
                u.id,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.user_id as student_number,
                u.email,
                c.section,
                c.id as class_id,
                c.subject_code,
                SUM(CASE WHEN al.status = 'Absent' OR al.id IS NULL THEN 1 ELSE 0 END) as abs_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN al.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) as attended,
                COUNT(DISTINCT s.id) as total_sessions,
                (SELECT outcome FROM interventions i WHERE i.professor_id = ? AND i.student_id = u.id ORDER BY i.created_at DESC LIMIT 1) as latest_intervention,
                GROUP_CONCAT(COALESCE(al.status, 'Absent') ORDER BY s.date DESC, s.start_time DESC) as streak_raw,
                GROUP_CONCAT(DISTINCT CASE WHEN al.status = 'Absent' OR al.id IS NULL THEN COALESCE(s.session_name, DATE_FORMAT(s.date, '%b %d')) END ORDER BY s.date DESC) as missed_topics_raw
            FROM (SELECT DISTINCT student_id, class_id FROM enrollments) e
            JOIN users u ON e.student_id = u.id
            JOIN classes c ON e.class_id = c.id
            JOIN sessions s ON e.class_id = s.class_id
                AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = u.id
                AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            WHERE e.class_id IN (${inClause(classIds)})
            GROUP BY u.id, c.id
        `, [professorPk, ...classIds]);

        const result = students.map(s => {
            const absCount = Number(s.abs_count) || 0;
            const lateCount = Number(s.late_count) || 0;
            const attended = Number(s.attended) || 0;
            const totalSessions = Number(s.total_sessions) || 0;

            const effAbs = absCount;
            const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

            let status = 'Good';
            let riskScore = 12;

            if (effAbs >= 3) { status = 'Dropout'; riskScore = 95; }
            else if (effAbs === 2) { status = 'Critical'; riskScore = 78; }
            else if (rate < 75) { status = 'High Risk'; riskScore = 62; }
            else if (rate < 85) { riskScore = 38; }

            const streak = s.streak_raw ? s.streak_raw.split(',').slice(0, 8) : [];
            let consecutiveAbs = 0;
            for (const st of streak) {
                if (st === 'Absent') consecutiveAbs++;
                else break;
            }

            const missedTopics = s.missed_topics_raw ? s.missed_topics_raw.split(',').slice(0, 5) : [];

            return {
                id: s.id,
                name: s.name,
                studentNumber: s.student_number,
                section: s.section,
                classId: s.class_id,
                absences: absCount,
                lates: lateCount,
                attended: attended,
                effAbs,
                attendanceRate: rate,
                streak,
                consecutiveAbs,
                riskScore,
                status,
                interventionStatus: s.latest_intervention || (status !== 'Good' ? 'Pending' : 'None'),
                missedTopics,
                pattern: consecutiveAbs >= 2 ? 'Consecutive' : 'Scattered',
                email: s.email
            };
        });

        res.json(result.sort((a, b) => b.riskScore - a.riskScore));
    } catch (err) {
        console.error('[Students At Risk] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Semester comparison (last sem vs this sem)
// ============================================================
router.get('/professor/:userId/semester-comparison', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);

        const [activePeriods] = await pool.query('SELECT id FROM academic_periods WHERE is_active = 1 LIMIT 1');
        const activePeriodId = activePeriods.length > 0 ? activePeriods[0].id : -1;

        const result = [];
        for (const cls of classes) {
            const [thisSemRows] = await pool.query(`
                SELECT
                    SUM(CASE WHEN al.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) as attended,
                    COUNT(al.id) as total
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.class_id = ? AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            `, [cls.id]);

            const thisSemRate = thisSemRows[0].total > 0
                ? Math.round((thisSemRows[0].attended / thisSemRows[0].total) * 100) : 0;

            // Find archived class with same section+subject from a prior period
            const [lastSemClasses] = await pool.query(`
                SELECT c.id FROM classes c
                WHERE c.professor_id = ? AND c.section = ? AND c.subject_code = ?
                AND (c.is_archived = 1 OR c.academic_period_id != ?) AND c.id != ?
                LIMIT 1
            `, [professorPk, cls.section, cls.subject_code, activePeriodId, cls.id]);

            let lastSemRate = 0;
            if (lastSemClasses.length > 0) {
                const [lastRows] = await pool.query(`
                    SELECT
                        SUM(CASE WHEN al.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) as attended,
                        COUNT(al.id) as total
                    FROM attendance_logs al
                    JOIN sessions s ON al.session_id = s.id
                    WHERE s.class_id = ? AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
                `, [lastSemClasses[0].id]);
                lastSemRate = lastRows[0].total > 0
                    ? Math.round((lastRows[0].attended / lastRows[0].total) * 100) : 0;
            }

            result.push({ section: cls.section || cls.subject_code, classId: cls.id, lastSem: lastSemRate, thisSem: thisSemRate });
        }
        res.json(result);
    } catch (err) {
        console.error('[Semester Comparison] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Consecutive absence list (OPTIMIZED)
// ============================================================
router.get('/professor/:userId/consecutive-absences', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        const [rows] = await pool.query(`
            SELECT 
                e.student_id, 
                CONCAT(u.first_name, ' ', u.last_name) as name, 
                c.section,
                GROUP_CONCAT(COALESCE(al.status, 'Absent') ORDER BY s.date DESC, s.start_time DESC) as streak_raw
            FROM (SELECT DISTINCT student_id, class_id FROM enrollments) e
            JOIN users u ON e.student_id = u.id
            JOIN classes c ON e.class_id = c.id
            JOIN sessions s ON e.class_id = s.class_id
                AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e.student_id
                AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            WHERE e.class_id IN (${inClause(classIds)})
            GROUP BY e.student_id, c.id
        `, classIds);

        const results = rows.map(row => {
            const streak = row.streak_raw ? row.streak_raw.split(',').slice(0, 8) : [];
            let consecutiveAbs = 0;
            for (const st of streak) {
                if (st && st.toLowerCase() === 'absent') consecutiveAbs++;
                else break;
            }
            return {
                studentId: row.student_id,
                name: row.name,
                section: row.section,
                streak,
                consecutiveAbs
            };
        }).filter(r => r.consecutiveAbs >= 2)
          .sort((a, b) => b.consecutiveAbs - a.consecutiveAbs)
          .slice(0, 10);

        res.json(results);
    } catch (err) {
        console.error('[Consecutive Absences] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Peer group clustering
// ============================================================
router.get('/professor/:userId/peer-groups', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const classes = await getProfessorClasses(professorPk);
        if (classes.length === 0) return res.json([]);
        const classIds = classes.map(c => c.id);

        const [absentLogs] = await pool.query(`
            SELECT s.id as session_id, al.student_id, CONCAT(u.first_name, ' ', u.last_name) as name
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            JOIN users u ON al.student_id = u.id
            WHERE s.class_id IN (${inClause(classIds)}) AND al.status = 'Absent' AND al.student_id IS NOT NULL
            ORDER BY s.date DESC LIMIT 500
        `, classIds);

        // Group by session
        const sessionMap = {};
        for (const log of absentLogs) {
            if (!sessionMap[log.session_id]) sessionMap[log.session_id] = [];
            sessionMap[log.session_id].push({ id: log.student_id, name: log.name });
        }

        // Count co-absence pairs
        const pairCounts = {};
        for (const students of Object.values(sessionMap)) {
            if (students.length < 2) continue;
            for (let i = 0; i < students.length; i++) {
                for (let j = i + 1; j < students.length; j++) {
                    const key = [students[i].id, students[j].id].sort().join('-');
                    if (!pairCounts[key]) pairCounts[key] = { students: [students[i].name, students[j].name], count: 0 };
                    pairCounts[key].count++;
                }
            }
        }

        const groups = Object.values(pairCounts)
            .filter(p => p.count >= 2)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
            .map(p => ({ students: [...new Set(p.students)], count: p.count }));

        res.json(groups);
    } catch (err) {
        console.error('[Peer Groups] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Interventions CRUD
// ============================================================
router.get('/professor/:userId/interventions/:studentId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const [rows] = await pool.query(`
            SELECT i.* FROM interventions i
            WHERE i.professor_id = ? AND i.student_id = ?
            ORDER BY i.created_at DESC
        `, [professorPk, req.params.studentId]);
        res.json(rows);
    } catch (err) {
        console.error('[Interventions GET] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/professor/:userId/interventions/:studentId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });
        const { date_contacted, method, response, outcome, notes, class_id } = req.body;
        const [result] = await pool.query(`
            INSERT INTO interventions (professor_id, student_id, class_id, date_contacted, method, response, outcome, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [professorPk, req.params.studentId, class_id || null, date_contacted, method, response, outcome, notes]);
        res.status(201).json({ id: result.insertId, message: 'Intervention recorded' });
    } catch (err) {
        console.error('[Interventions POST] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// NEW: Student History & Audit Endpoints
// ============================================================

// Get full history for a student in a class
router.get('/professor/:userId/student-history/:studentId/:classId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });

        const [rows] = await pool.query(`
            SELECT 
                s.id as session_id,
                s.date,
                s.start_time,
                al.id as log_id,
                COALESCE(al.status, 'Absent') as status,
                al.time_in,
                al.recognition_method
            FROM sessions s
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = ?
                AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
            WHERE s.class_id = ? AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
            ORDER BY s.date DESC, s.start_time DESC
        `, [req.params.studentId, req.params.classId]);

        res.json(rows);
    } catch (err) {
        console.error('[Student History] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update an attendance record
router.put('/professor/:userId/attendance/:logId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        if (!professorPk) return res.status(404).json({ message: 'Professor not found' });
        
        const { status } = req.body;
        if (!['present', 'late', 'absent', 'excused'].includes(status.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await pool.query(`
            UPDATE attendance_logs SET status = ? WHERE id = ?
        `, [status, req.params.logId]);

        res.json({ message: 'Attendance record updated' });
    } catch (err) {
        console.error('[Attendance Update] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create an attendance record if it didn't exist (e.g. converting an implicit absence to excused)
router.post('/professor/:userId/attendance-manual', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const professorPk = await resolveProfessorPk(req.params.userId);
        const { session_id, student_id, status } = req.body;

        // Find enrollment_id
        const [enroll] = await pool.query(`
            SELECT e.id FROM enrollments e
            JOIN sessions s ON e.class_id = s.class_id
            WHERE s.id = ? AND e.student_id = ?
        `, [session_id, student_id]);

        if (enroll.length === 0) return res.status(404).json({ message: 'Enrollment not found' });

        const [result] = await pool.query(`
            INSERT INTO attendance_logs (session_id, student_id, enrollment_id, status, recognition_method)
            VALUES (?, ?, ?, ?, 'manual')
        `, [session_id, student_id, enroll[0].id, status]);

        res.status(201).json({ id: result.insertId, message: 'Record created' });
    } catch (err) {
        console.error('[Manual Attendance] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get/Update Emergency Contact
router.get('/professor/:userId/student-contact/:studentId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        // Try selecting both, but handle case where email column might be missing during migration
        const [rows] = await pool.query(`
            SELECT emergency_contact_name, 
                   (SELECT CASE WHEN COUNT(*) > 0 THEN emergency_contact_email ELSE NULL END 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'emergency_contact_email') as dummy,
                    emergency_contact_email
            FROM users WHERE id = ?
        `, [req.params.studentId]).catch(async () => {
            // Fallback if the whole query fails due to missing column
            return pool.query('SELECT emergency_contact_name, NULL as emergency_contact_email FROM users WHERE id = ?', [req.params.studentId]);
        });
        res.json(rows[0] || { emergency_contact_name: '', emergency_contact_email: '' });
    } catch (err) {
        console.error('[Contact Get] Error:', err);
        res.json({ emergency_contact_name: '', emergency_contact_email: '' }); // Return empty rather than 500
    }
});

router.put('/professor/:userId/student-contact/:studentId', authenticateToken, requireRole(['professor', 'admin']), async (req, res) => {
    try {
        const { name, email } = req.body;
        await pool.query(`
            UPDATE users SET emergency_contact_name = ?, emergency_contact_email = ? WHERE id = ?
        `, [name, email, req.params.studentId]);
        res.json({ message: 'Contact updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
