const express = require('express');
const pool = require('../config/db');
const { isHoliday } = require('../config/holidays');
const router = express.Router();
const { uploadBase64ToMinio, deleteFromMinio } = require('../utils/minioHelper');
const verificationService = require('../services/verificationService');

// Helper to save base64 image (duplicated from authRoutes for safety)
const saveBase64Image = async (base64Data, userId, type) => {
    try {
        return await uploadBase64ToMinio(base64Data, userId, type);
    } catch (error) {
        console.error('Error uploading to MinIO:', error);
        return null;
    }
};

// Ensure class_students table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS class_students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        student_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
`).catch(err => console.error('Error creating class_students table:', err));

// Update Academic Data (COR & Course/Year)
router.post('/update-academic-data', async (req, res) => {
    const { userId, studentId, course, yearLevel, corFile } = req.body; // user_id (string) and PK/studentId

    try {
        if (!corFile) return res.status(400).json({ message: 'Certificate of Registration is required' });

        // 1. Get Active Academic Period
        const [periods] = await pool.query('SELECT id, school_year, semester FROM academic_periods WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        if (periods.length === 0) {
            return res.status(400).json({ message: 'No active academic period found. Please contact Admin.' });
        }
        const activePeriodId = periods[0].id;

        // 2. Fetch User Details for Verification
        const [users] = await pool.query('SELECT id, first_name, middle_name, last_name, user_id FROM users WHERE user_id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        // 3. Verify COR via OCR
        const verificationResult = await verificationService.verifyStudentDocuments({
            studentId: user.user_id,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            course: course, // Course Name or Code? Frontend should send name or code.
            yearLevel: yearLevel
        }, corFile);

        if (!verificationResult.valid) {
            return res.status(400).json({
                message: 'COR Verification Failed.',
                details: verificationResult.reason
            });
        }

        // 4. Save COR Image
        // Get old COR to delete it
        const [oldCor] = await pool.query('SELECT certificate_of_registration FROM users WHERE id = ?', [user.id]);
        if (oldCor.length > 0 && oldCor[0].certificate_of_registration) {
            await deleteFromMinio(oldCor[0].certificate_of_registration).catch(e => console.error('Delete old COR error:', e));
        }

        const corPath = await saveBase64Image(corFile, user.id, 'cor');

        // 5. Update Course ID logic (Find or Create)
        let courseId = null;
        // Search by code or name
        const [courses] = await pool.query('SELECT id FROM courses WHERE code = ? OR name = ?', [course, course]);
        if (courses.length > 0) {
            courseId = courses[0].id;
        } else {
            // Dynamic Create (Simplified from authRoutes)
            // Or return error? Let's try to find fuzzy or create.
            // For now, assume strict or simple create.
            try {
                const [insertRes] = await pool.query('INSERT INTO courses (code, name) VALUES (?, ?)', [course, course]);
                courseId = insertRes.insertId;
            } catch (e) {
                // If dupe
                const [existing] = await pool.query('SELECT id FROM courses WHERE code = ? OR name = ?', [course, course]);
                if (existing.length > 0) courseId = existing[0].id;
            }
        }

        // 6. Update Database
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update Users Table
            await connection.query(
                `UPDATE users SET 
                    certificate_of_registration = ?, 
                    last_verified_period_id = ?,
                    updated_at = NOW()
                WHERE id = ?`,
                [corPath, activePeriodId, user.id]
            );

            // Update Students Table
            if (courseId) {
                await connection.query(
                    `UPDATE students SET 
                        course_id = ?, 
                        year_level = ? 
                    WHERE user_id = ?`,
                    [courseId, yearLevel, user.id]
                );
            }

            await connection.commit();
            res.json({
                message: 'Academic information updated successfully.',
                verifiedPeriodId: activePeriodId
            });

        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Update Academic Data Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Enrolled Classes for Schedule
router.get('/classes/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const includeArchived = req.query.include_archived === 'true';

        let query = `
            SELECT 
                c.id, 
                c.subject_code, 
                c.subject_name, 
                c.section, 
                c.schedule_json, 
                c.is_archived,
                CONCAT(u.first_name, ' ', u.last_name) as professor_id
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE e.student_id = ?
        `;

        if (!includeArchived) {
            query += ` AND (c.is_archived = 0 OR c.is_archived IS NULL)`;
        }

        const [classes] = await pool.query(query, [studentId]);

        res.json(classes);
    } catch (err) {
        console.error('Get Classes Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Student Dashboard Data
router.get('/dashboard/:id', async (req, res) => {
    const studentId = req.params.id;

    try {
        // 1. Get User Details (to get string user_id for attendance logs)
        const [users] = await pool.query('SELECT user_id, first_name FROM users WHERE id = ?', [studentId]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found' });
        const user = users[0];
        const studentStringId = user.user_id;

        // 2. Get Enrolled Classes with Professor Names
        const [classes] = await pool.query(`
            SELECT c.*, u.first_name, u.last_name
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE e.student_id = ?
        `, [studentId]);


        // Helper function to format time with AM/PM
        const formatTime = (time) => {
            if (!time) return time;
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        };

        // 3. Calculate Next Class
        let nextClass = null;
        // Use Philippines Time (UTC+8) explicitly for calculations
        const now = new Date();
        const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const currentTime = phNow.getHours() * 60 + phNow.getMinutes();
        const todayIdx = phNow.getDay();

        // Helper to parse time string
        const parseTime = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            minutes = parseInt(minutes);
            if (hours === 12 && modifier === 'AM') hours = 0;
            if (hours !== 12 && modifier === 'PM') hours += 12;
            return hours * 60 + minutes;
        };

        const classIds = classes.map(c => c.id);
        let cancellations = [];
        let pendingSessions = [];

        if (classIds.length > 0) {
            // Fetch cancellations for today onwards
            const [cancellationsResult] = await pool.query(
                `SELECT * FROM class_cancellations 
                 WHERE class_id IN (?) AND session_date >= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))`,
                [classIds]
            );
            cancellations = cancellationsResult;

            // Fetch scheduled (pending) sessions (Make-up/Batch) for today onwards
            const [sessionsResult] = await pool.query(
                `SELECT * FROM sessions 
                 WHERE class_id IN (?) 
                 AND monitoring_started_at IS NULL 
                 AND date >= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))`,
                [classIds]
            );
            pendingSessions = sessionsResult;
        }

        const candidates = [];

        // A. Generate Candidates from Regular Schedule
        classes.forEach(cls => {
            let schedule = cls.schedule_json;
            if (typeof schedule === 'string') {
                try { schedule = JSON.parse(schedule); } catch (e) { return; }
            }

            if (Array.isArray(schedule)) {
                schedule.forEach(slot => {
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const slotDayIdx = days.indexOf(slot.day);
                    if (slotDayIdx === -1) return;

                    let dayDiff = slotDayIdx - todayIdx;
                    if (dayDiff < 0) dayDiff += 7; // Next week

                    const slotStartMinutes = parseTime(slot.startTime);

                    // If it's today but passed (starts in less than 5 mins or already started), move to next week
                    // We also allow a 5-minute buffer before skipping
                    if (dayDiff === 0 && slotStartMinutes < (currentTime - 5)) {
                        dayDiff = 7;
                    }

                    // Calculate Date
                    const classDate = new Date(phNow);
                    classDate.setDate(phNow.getDate() + dayDiff);
                    const dateStr = classDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

                    // Check if date is a holiday
                    const holidayName = isHoliday(dateStr);

                    // Check for manual cancellation
                    const cancelRecord = cancellations.find(c =>
                        c.class_id === cls.id && c.session_date === dateStr
                    );

                    // Add candidate
                    const candidate = {
                        classId: cls.id,
                        subject: cls.subject_name,
                        professor: cls.first_name && cls.last_name ? `Prof. ${cls.last_name}` : 'Prof. Unknown',
                        room: 'Lab 1',
                        time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
                        dateObj: classDate,
                        date: classDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                        status: holidayName ? 'Holiday' : (cancelRecord ? 'Cancelled' : 'Scheduled'),
                        reason: holidayName ? `Holiday: ${holidayName}` : (cancelRecord ? cancelRecord.reason : null),
                        minutesUntil: (dayDiff * 24 * 60) + (slotStartMinutes - currentTime),
                        type: 'regular'
                    };
                    candidates.push(candidate);
                });
            }
        });

        // B. Generate Candidates from Pending Sessions (Make-ups)
        pendingSessions.forEach(sess => {
            if (!sess.date || !sess.start_time) return;

            // Find class info
            const cls = classes.find(c => c.id === sess.class_id);
            if (!cls) return;

            const sessDate = new Date(sess.date); // This should be parsed correctly given it comes from DB date column
            // DB date might be UTC, need care. 
            // Assuming sess.date is YYYY-MM-DD string or Date object.
            // Let's create a date object relative to Manila.

            // Calculate time difference
            const sessStartMinutes = parseTime(sess.start_time); // Assuming stored as 'HH:mm' or 'HH:mm:ss' which parseTime handles? 
            // Wait, parseTime expects '1:00 PM'. DB usually stores '13:00:00'.
            // Need a new parser or handle DB format.
            // Let's assume DB returns '13:00:00'.

            let hours, minutes;
            if (sess.start_time.includes('M')) { // AM/PM format
                const parsed = parseTime(sess.start_time);
                hours = Math.floor(parsed / 60);
                minutes = parsed % 60;
            } else {
                [hours, minutes] = sess.start_time.split(':').map(Number);
            }
            const sessMinutesTotal = hours * 60 + minutes;

            // Calculate diff
            // Determine day difference
            // We need precise diff.
            // Construct target date
            const targetDate = new Date(sess.date);
            const sessDateStr = targetDate.toLocaleDateString('en-CA');
            const todayStr = phNow.toLocaleDateString('en-CA');

            // Diff in days
            const msDiff = new Date(sessDateStr).getTime() - new Date(todayStr).getTime();
            const dayDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

            if (dayDiff < 0) return; // Past session?

            // If today, check time
            if (dayDiff === 0 && sessMinutesTotal < currentTime) return; // Passed

            candidates.push({
                classId: cls.id,
                subject: cls.subject_name,
                professor: cls.first_name && cls.last_name ? `Prof. ${cls.last_name}` : 'Prof. Unknown',
                room: 'Lab 1', // Todo: fetch room
                time: formatTime(sess.start_time), // Format with AM/PM
                dateObj: targetDate,
                date: targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                status: 'Scheduled', // Pending sessions are by definition scheduled
                reason: sess.reason,
                minutesUntil: (dayDiff * 24 * 60) + (sessMinutesTotal - currentTime),
                type: sess.type
            });
        });

        // 4. Sort and Pick Best
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.minutesUntil - b.minutesUntil);

            // Filter out any candidates that are actually in the past (negative minutesUntil)
            // though dayDiff logic should mostly handle this
            const upcomingCandidates = candidates.filter(c => c.minutesUntil >= -5); // 5 min grace
            if (upcomingCandidates.length > 0) {
                nextClass = upcomingCandidates[0];
            } else {
                nextClass = candidates[0]; // Fallback
            }
        }

        // 4. Get Attendance Stats
        // We will derive overall stats from the per-class breakdown to ensure consistency.
        // This avoids mismatches where overall stats might include archived classes or orphaned logs.

        // 4a. Get Per-Class Breakdown (First)
        const [classStats] = await pool.query(`
            SELECT 
                c.id, 
                c.subject_name, 
                c.subject_code,
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN al.status IS NULL THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN al.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN sessions s ON c.id = s.class_id 
                AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
                AND s.monitoring_started_at IS NOT NULL
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = ?
            WHERE e.student_id = ?
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
            GROUP BY c.id
        `, [studentId, studentId]);

        // Transform class stats
        const classesSummary = classStats.map(cls => {
            const total = parseInt(cls.total_sessions) || 0;
            const present = parseInt(cls.present_count) || 0;
            const late = parseInt(cls.late_count) || 0;
            const excused = parseInt(cls.excused_count) || 0;

            // Absences = Total - (Present + Late + Excused)
            // Note: SQL 'absent_count' (status IS NULL) is good but manual calc is safer to ensure Total equality
            const absent = Math.max(0, total - (present + late + excused));

            const rate = total > 0
                ? Math.round(((present + late + excused) / total) * 100)
                : 0;

            return {
                id: cls.id,
                subjectName: cls.subject_name,
                subjectCode: cls.subject_code,
                attendanceRate: rate,
                present,
                late,
                excused,
                absent,
                totalSessions: total
            };
        });

        // 4b. Calculate Overall Stats by Aggregating Active Classes
        const overallStats = classesSummary.reduce((acc, cls) => {
            acc.present += cls.present;
            acc.late += cls.late;
            acc.excused += cls.excused;
            acc.absent += cls.absent;
            acc.total += cls.totalSessions;
            return acc;
        }, { present: 0, late: 0, excused: 0, absent: 0, total: 0 });

        const presentCount = overallStats.present;
        const lateCount = overallStats.late;
        const excusedCount = overallStats.excused;
        const absentCount = overallStats.absent;
        const totalPossibleSessions = overallStats.total;

        // Recalculate attendance rate (Present + Late + Excused) / Total
        const attendanceRate = totalPossibleSessions > 0
            ? Math.round(((presentCount + lateCount + excusedCount) / totalPossibleSessions) * 100)
            : 0;

        // 5. Get Recent Activity (last 5 sessions)
        const [recentActivities] = await pool.query(`
            SELECT 
                s.date,
                s.start_time,
                c.subject_name as className,
                c.subject_code,
                (SELECT status FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_status,
                (SELECT time_in FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_time_in
            FROM sessions s
            JOIN enrollments e ON s.class_id = e.class_id
            JOIN classes c ON s.class_id = c.id
            WHERE e.student_id = ?
            AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
            AND s.monitoring_started_at IS NOT NULL
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
            ORDER BY s.date DESC, s.start_time DESC
            LIMIT 5
        `, [studentId]);

        const recentActivity = recentActivities.map(act => {
            const status = act.log_status || 'Absent';
            let timestamp;
            if (act.log_time_in) {
                timestamp = new Date(act.log_time_in).toISOString();
            } else {
                const datePart = new Date(act.date).toISOString().split('T')[0];
                timestamp = new Date(`${datePart}T${act.start_time}`).toISOString();
            }

            return {
                subject: `${act.subject_code} - ${act.className}`,
                date: new Date(timestamp).toLocaleString('en-US', {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }),
                status: status,
                color: status.toLowerCase() === 'present' ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30' :
                    status.toLowerCase() === 'late' ? 'text-orange-400 bg-orange-500/20 border border-orange-500/30' : 'text-red-400 bg-red-500/20 border border-red-500/30'
            };
        });

        res.json({
            user: { ...user, studentId: studentStringId },
            nextClass,
            stats: {
                attendanceRate,
                present: presentCount,
                late: lateCount,
                excused: excusedCount,
                absences: absentCount
            },
            classesSummary, // Include per-class breakdown
            recentActivities: recentActivity
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Student Attendance Summary
router.get('/attendance-summary/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // Get user's string ID for attendance logs
        const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [studentId]);
        if (users.length === 0) return res.status(404).json({ message: 'Student not found' });

        // Get all attendance logs
        // Get Per-Class Breakdown (Same logic as dashboard to ensure consistency)
        const [classStats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN al.status IS NULL THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN al.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN sessions s ON c.id = s.class_id 
                AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
                AND s.monitoring_started_at IS NOT NULL
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = ?
            WHERE e.student_id = ?
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
        `, [studentId, studentId]);

        const stats = classStats[0] || {};
        const total = parseInt(stats.total_sessions) || 0;
        const present = parseInt(stats.present_count) || 0;
        const late = parseInt(stats.late_count) || 0;
        const excused = parseInt(stats.excused_count) || 0;

        // Manual calc for consistency
        const absent = Math.max(0, total - (present + late + excused));
        const attended = present + late + excused;

        const rate = total > 0
            ? ((attended / total) * 100).toFixed(1)
            : 0;

        res.json({
            presentCount: present,
            lateCount: late,
            excusedCount: excused,
            absentCount: absent,
            totalSessions: total,
            attendedSessions: attended,
            attendanceRate: parseFloat(rate)
        });

    } catch (err) {
        console.error("Attendance Summary Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Single Class Details & Attendance for Student
router.get('/classes/:classId/details', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ error: "Student ID required" });
        }

        // 1. Get Class Details
        const [classRows] = await pool.query(`
            SELECT c.*, u.first_name, u.last_name
            FROM classes c
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE c.id = ? AND (c.is_archived = 0 OR c.is_archived IS NULL)
        `, [classId]);

        if (classRows.length === 0) return res.status(404).json({ error: "Class not found or has been archived" });
        const classInfo = classRows[0];
        const professorName = classInfo.first_name && classInfo.last_name
            ? `Prof. ${classInfo.last_name}`
            : 'Prof. Unknown';

        // 2. Get Statistics for this class
        const [statsRows] = await pool.query(`
             SELECT 
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN al.status IS NULL THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN al.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN al.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM sessions s
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = ?
            WHERE s.class_id = ?
            AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
            AND s.monitoring_started_at IS NOT NULL
        `, [studentId, classId]);

        const stats = statsRows[0];
        const totalSessions = parseInt(stats.total_sessions) || 0;
        const present = parseInt(stats.present_count) || 0;
        const late = parseInt(stats.late_count) || 0;
        const excused = parseInt(stats.excused_count) || 0;

        // Manual absent calculation: Total - (P+L+E)
        const absent = Math.max(0, totalSessions - (present + late + excused));
        const rate = totalSessions > 0
            ? Math.round(((present + late + excused) / totalSessions) * 100)
            : 0;

        // 3. Get Attendance History Logs
        const [logs] = await pool.query(`
            SELECT 
                s.id as session_id,
                s.date,
                s.start_time,
                s.end_time,
                s.type,
                al.status,
                al.time_in,
                al.snapshot_url,
                al.recognition_method
            FROM sessions s
            LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = ?
            WHERE s.class_id = ?
            AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
            AND s.monitoring_started_at IS NOT NULL
            ORDER BY s.date DESC, s.start_time DESC
        `, [studentId, classId]);

        // DEBUG: Log raw data to investigate time inconsistency
        console.log('=== DEBUG: Class Details Query Results ===');
        console.log('All sessions for class 6:');
        logs.forEach(l => {
            console.log(`  Session ${l.session_id} [${l.type}] @ ${l.start_time} | Attendance: ${l.status || 'None'} @ ${l.time_in || 'N/A'}`);
        });
        console.log('==========================================');

        const history = logs.map(log => {
            // Determine status if null (Absent)
            const status = log.status || 'Absent';

            // Format date/time
            let timeIn = null;
            if (log.time_in) {
                timeIn = new Date(log.time_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            }

            return {
                date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                weekday: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }),
                status,
                timeIn,
                snapshotUrl: log.snapshot_url,
                recognitionMethod: log.recognition_method,
                startTime: log.start_time,
                type: log.type
            };
        });

        res.json({
            classInfo: {
                id: classInfo.id,
                subjectName: classInfo.subject_name,
                subjectCode: classInfo.subject_code,
                professor: professorName,
                schedule: classInfo.schedule_json
            },
            stats: {
                rate,
                present,
                late,
                excused,
                absent,
                total: totalSessions
            },
            history
        });

    } catch (err) {
        console.error("Class Details Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Student Recent Activity
router.get('/recent-activity/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const limit = parseInt(req.query.limit) || 10;

        const [activities] = await pool.query(`
            SELECT
                s.date,
                s.start_time,
                s.end_time,
                c.subject_name as className,
                c.subject_code,
                (SELECT status FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_status,
                (SELECT recognition_method FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_method,
                (SELECT time_in FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_time_in,
                (SELECT time_out FROM attendance_logs WHERE session_id = s.id AND student_id = e.student_id ORDER BY id DESC LIMIT 1) as log_time_out
            FROM sessions s
            JOIN enrollments e ON s.class_id = e.class_id
            JOIN classes c ON s.class_id = c.id
            WHERE e.student_id = ?
                AND s.date <= DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
                AND (c.is_archived = 0 OR c.is_archived IS NULL)
            ORDER BY s.date DESC, s.start_time DESC
            LIMIT ?
        `, [studentId, limit]);

        const formattedActivities = activities.map(act => {
            // Determine effective status
            const status = act.log_status || 'Absent';

            // Construct timestamp
            let timestamp;
            if (act.log_time_in) {
                timestamp = new Date(act.log_time_in).toISOString();
            } else {
                const datePart = new Date(act.date).toISOString().split('T')[0];
                timestamp = new Date(`${datePart}T${act.start_time}`).toISOString();
            }

            return {
                className: `${act.subject_code} - ${act.className}`,
                status: status,
                recognition_method: act.log_method,
                date: act.date,
                timeIn: act.log_time_in || timestamp,
                timeOut: act.log_time_out,
                timestamp: timestamp
            };
        });

        res.json(formattedActivities);
    } catch (err) {
        console.error('Recent activity error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
