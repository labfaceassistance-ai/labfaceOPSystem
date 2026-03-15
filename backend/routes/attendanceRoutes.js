const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const warningService = require('../services/attendanceWarningService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure Uploads
const uploadDir = 'uploads/excuses';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ============================================
// SCHEMA INITIALIZATION
// ============================================
(async () => {
    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                student_id INT,
                enrollment_id INT,
                time_in DATETIME,
                time_out DATETIME,
                status VARCHAR(50),
                snapshot_url TEXT,
                recognition_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                INDEX (session_id),
                INDEX (student_id),
                INDEX (enrollment_id),
                INDEX (status),
                INDEX (created_at)
            )
        `);

        // Check availability of enrollment_id column
        const [columns] = await pool.query("SHOW COLUMNS FROM attendance_logs LIKE 'enrollment_id'");
        if (columns.length === 0) {
            console.log('[MIGRATION] Adding enrollment_id to attendance_logs');
            await pool.query('ALTER TABLE attendance_logs ADD COLUMN enrollment_id INT AFTER student_id');
        }

        // Check availability of recognition_method column
        const [recognitionCols] = await pool.query("SHOW COLUMNS FROM attendance_logs LIKE 'recognition_method'");
        if (recognitionCols.length === 0) {
            console.log('[MIGRATION] Adding recognition_method to attendance_logs');
            await pool.query('ALTER TABLE attendance_logs ADD COLUMN recognition_method VARCHAR(50) AFTER snapshot_url');
        }

        // Check availability of created_at column (renamed from date_created)
        const [createdAtCols] = await pool.query("SHOW COLUMNS FROM attendance_logs LIKE 'created_at'");
        if (createdAtCols.length === 0) {
            const [dateCreatedCols] = await pool.query("SHOW COLUMNS FROM attendance_logs LIKE 'date_created'");
            if (dateCreatedCols.length > 0) {
                console.log('[MIGRATION] Renaming date_created to created_at in attendance_logs');
                await pool.query('ALTER TABLE attendance_logs CHANGE date_created created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            } else {
                console.log('[MIGRATION] Adding created_at to attendance_logs');
                await pool.query('ALTER TABLE attendance_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            }
        }
        // Check availability of monitoring_started_at column in sessions
        const [sessionCols] = await pool.query("SHOW COLUMNS FROM sessions LIKE 'monitoring_started_at'");
        if (sessionCols.length === 0) {
            console.log('[MIGRATION] Adding monitoring_started_at to sessions');
            await pool.query('ALTER TABLE sessions ADD COLUMN monitoring_started_at DATETIME');
        }

        // Fix for missing columns causing 500 Error
        const missingSessionCols = ['reason', 'batch_students', 'session_name', 'monitoring_ended_at'];
        for (const col of missingSessionCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM sessions LIKE '${col}'`);
            if (cols.length === 0) {
                console.log(`[MIGRATION] Adding ${col} to sessions`);
                let type = 'TEXT';
                if (col === 'batch_students') type = 'JSON';
                if (col === 'session_name') type = 'VARCHAR(150)';
                if (col === 'monitoring_ended_at') type = 'DATETIME';
                if (col === 'monitoring_ended_at') type = 'DATETIME';
                await pool.query(`ALTER TABLE sessions ADD COLUMN ${col} ${type}`);
            }
        }

        // Check availability of late_threshold_minutes column in sessions
        const [lateThresholdCol] = await pool.query("SHOW COLUMNS FROM sessions LIKE 'late_threshold_minutes'");
        if (lateThresholdCol.length === 0) {
            console.log('[MIGRATION] Adding late_threshold_minutes to sessions');
            await pool.query('ALTER TABLE sessions ADD COLUMN late_threshold_minutes INT DEFAULT 15');
        }
    } catch (err) {
        console.error('Error initializing tables:', err);
    }
})();

// ============================================
// SESSION MANAGEMENT
// ============================================

// Start Session (Regular, Make-up, or Batch)
router.post('/sessions', async (req, res) => {
    const { classId, date, startTime, endTime, type, batchStudents, sessionName, reason, isScheduled } = req.body;

    try {
        // Validate required fields
        if (!classId || !date || !startTime) {
            return res.status(400).json({ error: 'Missing required fields: classId, date, startTime' });
        }

        // Validate session type
        const validTypes = ['regular', 'makeup', 'batch'];
        const sessionType = type || 'regular';

        if (!validTypes.includes(sessionType)) {
            return res.status(400).json({
                error: 'Invalid session type',
                validTypes: validTypes
            });
        }

        const now = new Date();

        // ---------------------------------------------------------
        // CASE A: Scheduling for Future (Advance Notice)
        // ---------------------------------------------------------
        if (isScheduled) {
            // Ensure no duplicate pending session for this date
            const [existingPending] = await pool.query(
                'SELECT id FROM sessions WHERE class_id = ? AND date = ? AND monitoring_started_at IS NULL',
                [classId, date]
            );

            if (existingPending.length > 0) {
                return res.status(400).json({ error: 'A session is already scheduled for this date.' });
            }

            const [result] = await pool.query(
                `INSERT INTO sessions 
                (class_id, date, start_time, end_time, type, batch_students, session_name, reason, late_threshold_minutes, monitoring_started_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
                [
                    classId,
                    date, // Use provided future date
                    startTime,
                    endTime || null,
                    sessionType,
                    batchStudents ? JSON.stringify(batchStudents) : null,
                    sessionName || null,
                    reason || null,
                    req.body.lateThreshold || 15
                ]
            );

            // Notify Students about Scheduled Make-up
            try {
                const [enrollments] = await pool.query('SELECT student_id FROM enrollments WHERE class_id = ?', [classId]);
                const [classInfo] = await pool.query('SELECT subject_code FROM classes WHERE id = ?', [classId]);
                const subject = classInfo[0]?.subject_code || 'Class';

                for (const student of enrollments) {
                    if (student.student_id) {
                        await pool.query(`
                            INSERT INTO notifications (user_id, title, message, type, category)
                            VALUES (?, 'Make-up Class Scheduled', ?, 'info', 'attendance')
                        `, [student.student_id, `Make-up class for ${subject} is scheduled on ${date} at ${startTime}.`]);
                    }
                }
            } catch (notifyErr) {
                console.error('[Notification Error]', notifyErr);
            }

            return res.status(201).json({
                success: true,
                message: 'Session scheduled successfully (Advance Notice sent). Monitoring not started.',
                sessionId: result.insertId,
                isScheduled: true
            });
        }

        // ---------------------------------------------------------
        // CASE B: Starting a Session (Now)
        // ---------------------------------------------------------

        // 1. Check for Active Session (Prevent Double Start)
        const [activeSessions] = await pool.query(
            `SELECT id FROM sessions 
             WHERE class_id = ? 
             AND monitoring_started_at IS NOT NULL 
             AND monitoring_ended_at IS NULL`,
            [classId]
        );

        if (activeSessions.length > 0) {
            return res.status(400).json({
                error: 'A monitoring session is already active for this class. Please stop it before starting a new one.',
                activeSessionId: activeSessions[0].id
            });
        }

        // 2. Check for PENDING Scheduled Session for TODAY (to Activate)
        // We trust the frontend to pass the correct 'date' if checking specific schedule, 
        // but generally "Start" implies NOW.
        // If it's a makeup, we check if there is a pending makeup for TODAY.

        const phDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

        const [pendingSessions] = await pool.query(
            `SELECT id FROM sessions 
             WHERE class_id = ? 
             AND date = ? 
             AND monitoring_started_at IS NULL
             AND type = ?
             LIMIT 1`,
            [classId, phDate, sessionType]
        );

        if (pendingSessions.length > 0) {
            // ACTIVATE the existing pending session
            const pendingId = pendingSessions[0].id;
            await pool.query(
                `UPDATE sessions 
                 SET monitoring_started_at = NOW() 
                 WHERE id = ?`,
                [pendingId]
            );

            return res.json({
                success: true,
                message: `Scheduled ${sessionType} session activated! Monitoring started.`,
                sessionId: pendingId,
                type: sessionType,
                date: phDate,
                startTime: startTime // or keep original?
            });
        }

        // 3. Normal Start (No existing pending session)

        // Validate batch students if batch session
        if (sessionType === 'batch') {
            if (!batchStudents || !Array.isArray(batchStudents) || batchStudents.length === 0) {
                return res.status(400).json({
                    error: 'Batch sessions require at least one student',
                    hint: 'Provide batchStudents as an array of student IDs'
                });
            }

            // Verify all students are enrolled in this class
            const [enrolled] = await pool.query(
                'SELECT id FROM enrollments WHERE class_id = ?',
                [classId]
            );

            if (enrolled.length === 0) {
                return res.status(400).json({ error: 'No students enrolled in this class' });
            }

            const enrolledIds = enrolled.map(e => e.id);
            const invalidStudents = batchStudents.filter(id => !enrolledIds.includes(id));

            if (invalidStudents.length > 0) {
                return res.status(400).json({
                    error: 'Some students are not enrolled in this class',
                    invalidStudents,
                    enrolledCount: enrolledIds.length
                });
            }
        }

        // Convert to Philippine timezone for accurate time storage
        const phTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);

        // Use Philippine date/time for regular sessions, ignore frontend input usually
        // But for consistency with "Activated" sessions, we use phDate.
        // For Makeup, we use provided date if it matches? 
        // Actually, if we are STARTING now, the date MUST be today.

        const sessionDate = phDate; // Immediate start always uses today's date for record consistency
        const sessionStartTime = (sessionType === 'regular') ? phTime : (startTime || phTime);

        // Note: We ignore the `date` passed from frontend for Regular/Makeup START 
        // because "Start" means NOW. 
        // Except if creating a makeup record for the past? Rare. 
        // We will assume "Start Session" = NOW = phDate.

        const [result] = await pool.query(
            `INSERT INTO sessions 
            (class_id, date, start_time, end_time, type, batch_students, session_name, reason, late_threshold_minutes, monitoring_started_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                classId,
                sessionDate,
                sessionStartTime,
                endTime || null,
                sessionType,
                batchStudents ? JSON.stringify(batchStudents) : null,
                sessionName || null,
                reason || null,
                req.body.lateThreshold || 15, // Use provided threshold or default
                now // Set actual monitoring start time
            ]
        );

        res.status(201).json({
            success: true,
            message: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} session started`,
            sessionId: result.insertId,
            type: sessionType,
            date: sessionDate,
            startTime: sessionStartTime,
            endTime,
            studentCount: sessionType === 'batch' ? batchStudents.length : null,
            sessionName: sessionName || null
        });
    } catch (err) {
        console.error('Session creation error:', err);
        res.status(500).json({ error: 'Failed to create session', details: err.message });
    }
});

// Stop monitoring session
router.post('/sessions/:sessionId/stop', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const now = new Date();

        // Update session with end_time and monitoring_ended_at
        await pool.query(
            `UPDATE sessions 
             SET end_time = NOW(),
                 monitoring_ended_at = ?
             WHERE id = ?`,
            [now, sessionId]
        );

        res.json({
            success: true,
            message: 'Monitoring stopped',
            endTime: now
        });
    } catch (err) {
        console.error('Stop session error:', err);
        res.status(500).json({ error: 'Failed to stop session', details: err.message });
    }
});

// Log Unknown Person
router.post('/log-unknown', async (req, res) => {
    const { sessionId, snapshotUrl, detectionTime } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    try {
        const now = detectionTime ? new Date(detectionTime) : new Date();

        // Insert log for unknown person
        const [result] = await pool.query(
            `INSERT INTO attendance_logs 
            (session_id, time_in, status, snapshot_url, recognition_method) 
            VALUES (?, ?, ?, ?, ?)`,
            [sessionId, now, 'Unknown', snapshotUrl || null, 'CCTV']
        );

        res.status(201).json({
            success: true,
            message: 'Unknown person logged',
            logId: result.insertId
        });
    } catch (err) {
        console.error('Log unknown error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get session activity log for real-time monitoring
router.get('/sessions/:sessionId/activity', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const limit = req.query.limit || 50;

        // Fetch recent attendance logs for this session
        const [activity] = await pool.query(
            `SELECT 
                al.id,
                al.time_in,
                al.status,
                al.recognition_method,
                al.created_at,
                COALESCE(u.first_name, e.student_name, 'Unknown') as student_name,
                COALESCE(u.last_name, '') as student_last_name,
                COALESCE(u.user_id, e.student_number, 'N/A') as student_id,
                COALESCE(u.id_photo, al.snapshot_url) as id_photo
            FROM attendance_logs al
            LEFT JOIN enrollments e ON al.enrollment_id = e.id
            LEFT JOIN users u ON al.student_id = u.id
            WHERE al.session_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?`,
            [sessionId, parseInt(limit)]
        );

        res.json(activity);
    } catch (error) {
        console.error('Error fetching session activity:', error);
        res.status(500).json({ error: error.message });
    }
});


// Get Active Session for Logged-in Professor
router.get('/sessions/active/me', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching active session for user:', req.user.id);
        const [sessions] = await pool.query(
            `SELECT s.*, c.subject_code, c.subject_name, c.section
             FROM sessions s
             JOIN classes c ON s.class_id = c.id
             WHERE c.professor_id = ?
             AND s.monitoring_started_at IS NOT NULL
             AND s.monitoring_ended_at IS NULL
             ORDER BY s.monitoring_started_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (sessions.length === 0) {
            return res.json(null);
        }

        const session = sessions[0];
        if (session.batch_students) {
            try {
                session.batch_students = JSON.parse(session.batch_students);
            } catch (e) {
                session.batch_students = null;
            }
        }

        res.json(session);
    } catch (error) {
        console.error('Error fetching active session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Session Details
router.get('/sessions/:id', async (req, res) => {
    try {
        const [sessions] = await pool.query(
            `SELECT s.*, c.subject_code, c.subject_name, c.section
            FROM sessions s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?`,
            [req.params.id]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];

        // Parse batch_students if it exists
        if (session.batch_students) {
            try {
                session.batch_students = JSON.parse(session.batch_students);
            } catch (e) {
                session.batch_students = null;
            }
        }

        res.json(session);
    } catch (err) {
        console.error('Get session error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Eligible Students for Session (respects batch restrictions)
router.get('/sessions/:id/students', async (req, res) => {
    try {
        // Get session details
        const [sessions] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];
        let studentIds = null;

        // If batch session, only return assigned students
        if (session.type === 'batch' && session.batch_students) {
            try {
                studentIds = JSON.parse(session.batch_students);
            } catch (e) {
                return res.status(500).json({ error: 'Invalid batch_students data' });
            }
        }

        // Build query
        let query = `
            SELECT u.id, u.student_id as user_id, u.first_name, u.last_name, 
                   u.profile_picture, u.course, u.year_level
            FROM users u
            JOIN enrollments ce ON u.id = ce.student_id
            WHERE ce.class_id = ?
        `;

        const params = [session.class_id];

        if (studentIds && studentIds.length > 0) {
            query += ` AND u.id IN (${studentIds.map(() => '?').join(',')})`;
            params.push(...studentIds);
        }

        query += ` ORDER BY u.last_name, u.first_name`;

        const [students] = await pool.query(query, params);

        res.json({
            sessionId: session.id,
            sessionType: session.type,
            totalStudents: students.length,
            students
        });
    } catch (err) {
        console.error('Get session students error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ATTENDANCE MARKING
// ============================================

// Mark Attendance (called by AI Service or Manual)
router.post('/mark', async (req, res) => {
    const { sessionId, studentId, direction, snapshotUrl, detectionTime } = req.body;

    if (!sessionId || !studentId) {
        return res.status(400).json({ error: 'Missing sessionId or studentId' });
    }

    try {
        // Get session details to check batch restrictions
        const [sessions] = await pool.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];

        // Check if student is enrolled in the class
        const [enrollment] = await pool.query(
            'SELECT * FROM enrollments WHERE class_id = ? AND student_id = ?',
            [session.class_id, studentId]
        );

        if (enrollment.length === 0) {
            return res.status(403).json({ error: 'Student not enrolled in this class' });
        }

        // Check if student is allowed in this session (batch restriction)
        if (session.type === 'batch' && session.batch_students) {
            const batchStudents = JSON.parse(session.batch_students);
            // batchStudents contains Enrollment IDs. Check if this student's enrollment ID is in the list.
            if (!batchStudents.includes(enrollment[0].id)) {
                return res.status(403).json({
                    error: 'Student not assigned to this batch session',
                    sessionType: 'batch'
                });
            }
        }

        // Check if a "Present" or "Late" record already exists for this session
        const [existing] = await pool.query(
            "SELECT * FROM attendance_logs WHERE session_id = ? AND student_id = ? AND status IN ('Present', 'Late', 'Absent')",
            [sessionId, studentId]
        );

        // Use detectionTime from AI service if available, otherwise server time
        const now = detectionTime ? new Date(detectionTime) : new Date();

        // ---------------------------------------------------------
        // LOGIC: EXIT
        // ---------------------------------------------------------
        if (direction === 'EXIT') {
            // Update the MAIN attendance record's time_out (if it exists)
            // Update the MAIN attendance record's time_out (if it exists)
            if (existing.length > 0) {
                await pool.query(
                    'UPDATE attendance_logs SET time_out = ? WHERE id = ?',
                    [now, existing[0].id]
                );
            } else {
                // REDUNDANCY CHECK:
                // If Cam 2 (Exit) sees them but we missed the Entry (Cam 1),
                // we should still mark them PRESENT because they are obviously here.

                // Determine status based on time (Late check)
                let status = 'Present';
                const actualStartTime = session.monitoring_started_at || `${session.date}T${session.start_time}`;
                const sessionStart = new Date(actualStartTime);
                const diffMins = (now.getTime() - sessionStart.getTime()) / 60000;

                const lateThreshold = session.late_threshold_minutes || 15;

                if (diffMins > 60) status = 'Absent';
                else if (diffMins > lateThreshold) status = 'Late';

                // Insert attendance log (Implicit Entry via Exit Camera)
                const [result] = await pool.query(
                    `INSERT INTO attendance_logs 
                    (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [sessionId, studentId, enrollment[0].id, now, status, snapshotUrl || null, 'CCTV (Redundant)']
                );

                // Trigger warning check in background
                warningService.checkAndNotify(studentId, session.class_id).catch(err => console.error('Warning check failed:', err));

                return res.json({
                    success: true,
                    message: 'Attendance marked (Recovered from Exit Cam)',
                    type: 'ENTRY',
                    status,
                    logId: result.insertId,
                    timeIn: now
                });
            }

            // ALWAYS create a "Log" entry for the feed
            await pool.query(
                `INSERT INTO attendance_logs 
                (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, studentId, enrollment[0].id, now, 'Log - Exit', snapshotUrl || null, 'CCTV']
            );

            return res.json({
                success: true,
                message: 'Exit recorded',
                type: 'EXIT'
            });
        }

        // ---------------------------------------------------------
        // LOGIC: ENTRY
        // ---------------------------------------------------------

        // 1. If already marked Present/Late, just log this as a movement
        if (existing.length > 0) {
            await pool.query(
                `INSERT INTO attendance_logs 
                (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, studentId, enrollment[0].id, now, 'Log - Entry', snapshotUrl || null, 'CCTV']
            );

            return res.json({
                success: true,
                message: 'Movement logged (Already Present)',
                status: 'Log',
                timeIn: now
            });
        }

        // 2. If NOT marked yet, this is the FIRST Attendance
        // Determine status (Present vs Late vs Absent)
        let status = 'Present';
        const actualStartTime = session.monitoring_started_at || `${session.date}T${session.start_time}`;
        const sessionStart = new Date(actualStartTime);
        const diffMins = (now.getTime() - sessionStart.getTime()) / 60000;

        const lateThreshold = session.late_threshold_minutes || 15;

        if (diffMins < -15) {
            return res.status(400).json({
                error: 'Too early to mark attendance',
                message: 'You can check in 15 minutes before the session starts.'
            });
        }

        if (diffMins > 30) status = 'Absent';
        else if (diffMins > lateThreshold) status = 'Late';

        // Insert MAIN attendance log
        const [result] = await pool.query(
            `INSERT INTO attendance_logs 
            (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, studentId, enrollment[0].id, now, status, snapshotUrl || null, 'CCTV']
        );

        // Trigger warning check
        await warningService.checkAndNotify(studentId, session.class_id);

        res.status(201).json({
            success: true,
            message: 'Attendance marked',
            type: 'ENTRY',
            status,
            logId: result.insertId,
            timeIn: now
        });

    } catch (err) {
        console.error('Mark attendance error:', err);
        res.status(500).json({ error: 'Failed to mark attendance', details: err.message });
    }
});

// Get Live Attendance for Session
router.get('/session/:id/live', async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT 
                a.id,
                a.session_id,
                a.student_id,
                a.time_in,
                a.time_out,
                a.status,
                a.snapshot_url,
                u.student_id as user_id,
                u.first_name,
                u.last_name,
                u.profile_picture,
                u.course,
                u.year_level
            FROM attendance_logs a
            JOIN users u ON a.student_id = u.id
            WHERE a.session_id = ?
            ORDER BY a.time_in DESC
        `, [req.params.id]);

        res.json({
            sessionId: parseInt(req.params.id),
            totalPresent: logs.length,
            attendanceLogs: logs
        });
    } catch (err) {
        console.error('Get live attendance error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Attendance Summary for Session
router.get('/session/:id/summary', async (req, res) => {
    try {
        // Get session details
        const [sessions] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];

        // Get total enrolled students (or batch students)
        let totalStudents = 0;
        if (session.type === 'batch' && session.batch_students) {
            const batchStudents = JSON.parse(session.batch_students);
            totalStudents = batchStudents.length;
        } else {
            const [enrolled] = await pool.query(
                'SELECT COUNT(*) as count FROM enrollments WHERE class_id = ?',
                [session.class_id]
            );
            totalStudents = enrolled[0].count;
        }

        // Get attendance counts
        const [counts] = await pool.query(`
            SELECT 
                COUNT(*) as total_present,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late
            FROM attendance_logs
            WHERE session_id = ?
        `, [req.params.id]);

        const summary = counts[0];
        const absent = totalStudents - summary.total_present;

        res.json({
            sessionId: session.id,
            sessionType: session.type,
            date: session.date,
            startTime: session.start_time,
            totalStudents,
            present: summary.total_present || 0,
            onTime: summary.on_time || 0,
            late: summary.late || 0,
            absent,
            attendanceRate: totalStudents > 0 ? ((summary.total_present / totalStudents) * 100).toFixed(1) : 0
        });
    } catch (err) {
        console.error('Get attendance summary error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Manual Attendance Update (Professor Correction)
router.put('/manual-update', async (req, res) => {
    console.log('[DEBUG] Manual Update Request:', req.body);
    const { sessionId, studentId, enrollmentId, status } = req.body;

    if (!sessionId || (!studentId && !enrollmentId) || !status) {
        console.log('[DEBUG] Missing fields:', { sessionId, studentId, enrollmentId, status });
        return res.status(400).json({ error: 'Session ID, and Student ID or Enrollment ID, and Status are required' });
    }

    try {
        // Robust check: Find all enrollment IDs for this student (across potential duplicates)
        let allEnrollmentIds = [enrollmentId];
        const [studentNumResult] = await pool.query('SELECT student_number FROM enrollments WHERE id = ?', [enrollmentId]);
        if (studentNumResult.length > 0 && studentNumResult[0].student_number) {
            const [relatedResult] = await pool.query('SELECT id FROM enrollments WHERE student_number = ?', [studentNumResult[0].student_number]);
            allEnrollmentIds = relatedResult.map(r => r.id);
        }

        let existing = [];
        // Check by all related enrollmentIds OR studentId to find any matching record
        let checkQuery = `SELECT id FROM attendance_logs WHERE session_id = ? AND (enrollment_id IN (${allEnrollmentIds.map(() => '?').join(',')})`;
        const checkParams = [sessionId, ...allEnrollmentIds];

        if (studentId !== null && studentId !== undefined) {
            checkQuery += ' OR student_id = ?';
            checkParams.push(studentId);
        }
        checkQuery += ')';

        console.log('[DEBUG] Checking existing log:', checkQuery, checkParams);
        [existing] = await pool.query(checkQuery, checkParams);

        const now = new Date();

        let logId;
        if (existing.length > 0) {
            logId = existing[0].id;
            console.log('[DEBUG] Updating existing log:', logId);
            // Ensure proper capitalization for consistency
            const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
            // Update existing log - also ensure student_id/enrollment_id are set if they were null
            // We use COALESCE to keep existing non-null values, or update if we have better info
            const [updateRes] = await pool.query(
                `UPDATE attendance_logs 
                 SET status = ?, 
                     time_in = COALESCE(time_in, ?),
                     student_id = COALESCE(student_id, ?),
                     enrollment_id = COALESCE(enrollment_id, ?),
                     recognition_method = 'Manual'
                 WHERE id = ?`,
                [capitalizedStatus, now, studentId, enrollmentId, logId]
            );
            console.log('[DEBUG] Update Result:', updateRes);
        } else {
            console.log('[DEBUG] Creating new log');
            // Create new log
            if (status !== 'Absent') {
                // Ensure proper capitalization for consistency
                const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                const [result] = await pool.query(
                    'INSERT INTO attendance_logs (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [sessionId, studentId || null, enrollmentId || null, now, capitalizedStatus, null, 'Manual']
                );
                logId = result.insertId;
                console.log('[DEBUG] Inserted log with ID:', logId);
            } else {
                console.log('[DEBUG] Status is Absent and no existing log - creating manual Absent record');
                // Create manual Absent record
                const capitalizedStatus = 'Absent';
                const [result] = await pool.query(
                    'INSERT INTO attendance_logs (session_id, student_id, enrollment_id, time_in, status, snapshot_url, recognition_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [sessionId, studentId || null, enrollmentId || null, now, capitalizedStatus, null, 'Manual']
                );
                logId = result.insertId;
                console.log('[DEBUG] Inserted manual Absent log with ID:', logId);
            }
        }

        res.json({ success: true, message: 'Attendance updated successfully', id: logId });
    } catch (err) {
        console.error('[DEBUG] Manual update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// EXCUSE MANAGEMENT
// ============================================

// Upload Excuse Letter
router.post('/upload-excuse', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/excuses/${req.file.filename}` });
});

// Mark attendance as Excused (Professor only)
router.post('/excuse', authenticateToken, async (req, res) => {
    try {
        const { attendanceLogId, reason, letterUrl } = req.body;
        const professorId = req.user.id;

        // Verify professor owns this class and get details
        const [log] = await pool.query(`
            SELECT al.*, s.class_id, c.professor_id, e.student_id
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            JOIN classes c ON s.class_id = c.id
            JOIN enrollments e ON al.enrollment_id = e.id
            WHERE al.id = ?
        `, [attendanceLogId]);

        if (!log[0]) return res.status(404).json({ error: 'Attendance log not found' });

        // Ensure user is the professor
        if (log[0].professor_id !== professorId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Update status to Excused
        await pool.query(`
            UPDATE attendance_logs 
            SET status = 'Excused',
                excuse_reason = ?,
                excuse_approved_by = ?,
                excuse_approved_at = NOW(),
                excuse_letter_url = ?
            WHERE id = ?
        `, [reason, professorId, letterUrl, attendanceLogId]);

        // Recalculate warnings
        await warningService.recalculateWarnings(log[0].student_id, log[0].class_id);

        // Notify student
        const { templates } = require('../utils/notificationHelper');
        const [studentContext] = await pool.query(`
            SELECT u.first_name, c.subject_code 
            FROM users u, classes c 
            WHERE u.id = ? AND c.id = ?
        `, [log[0].student_id, log[0].class_id]);

        if (studentContext[0] && templates.excuse_approved) {
            const template = templates.excuse_approved.student;
            const msg = template.message(studentContext[0].subject_code, reason);
            await pool.query(`
                INSERT INTO notifications (user_id, title, message, type, category)
                VALUES (?, ?, ?, ?, ?)
             `, [log[0].student_id, template.title, msg, template.type, template.category]);
        }

        res.json({ message: 'Attendance marked as excused' });
    } catch (err) {
        console.error('Error excusing attendance:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get excuse details
router.get('/excuse/:logId', authenticateToken, async (req, res) => {
    try {
        const [excuse] = await pool.query(`
            SELECT 
                al.excuse_reason,
                al.excuse_approved_at,
                al.excuse_letter_url,
                u.first_name,
                u.last_name
            FROM attendance_logs al
            LEFT JOIN users u ON al.excuse_approved_by = u.id
            WHERE al.id = ? AND al.status = 'Excused'
        `, [req.params.logId]);

        res.json(excuse[0] || null);
    } catch (err) {
        console.error('Error fetching excuse:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
