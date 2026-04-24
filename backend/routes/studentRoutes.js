const express = require('express');
const pool = require('../config/db');
const { isHoliday } = require('../config/holidays');
const router = express.Router();
const { uploadBase64ToMinio, deleteFromMinio, standardizeImageUrl, SNAPSHOT_BUCKET } = require('../utils/minioHelper');
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

// ===================================================
// CONFIRM ENROLLMENT (Lightweight — no COR required if already current)
// ===================================================
// Called by the Academic Update Banner "Update Now" button.
// If the student is already on the current period → just acknowledge.
// If they're on an old period → return requiresCOR: true so frontend redirects.
const { authenticateToken } = require('../middleware/auth');

router.post('/confirm-enrollment', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get current active academic period
        const [periods] = await pool.query(
            "SELECT id, school_year, semester FROM academic_periods WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1"
        );
        if (periods.length === 0) {
            return res.status(400).json({ message: 'No active academic period found. Contact admin.' });
        }
        const currentPeriodId = periods[0].id;

        // 2. Get student's current verified period
        const [users] = await pool.query(
            'SELECT last_verified_period_id FROM users WHERE id = ?', [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const studentPeriodId = users[0].last_verified_period_id;

        if (Number(studentPeriodId) === Number(currentPeriodId)) {
            // Already fully up to date — just touch updated_at to confirm activity
            await pool.query('UPDATE users SET updated_at = NOW() WHERE id = ?', [userId]);
            return res.json({
                message: 'Enrollment confirmed. You are up to date for this semester.',
                alreadyCurrent: true
            });
        }

        // --- NEW: AUTO-RE-VERIFY ATTEMPT ---
        console.log(`[Auto-Confirm] User ${userId} is on old period ${studentPeriodId}. Attempting background re-verify...`);
        
        const [userData] = await pool.query(
            'SELECT user_id, first_name, middle_name, last_name, certificate_of_registration FROM users WHERE id = ?', 
            [userId]
        );
        const user = userData[0];

        if (user && user.certificate_of_registration) {
            try {
                const corBase64 = await getObjectAsBase64(user.certificate_of_registration);
                if (corBase64) {
                    const [studentInfo] = await pool.query(
                        'SELECT c.name as course_name, s.year_level FROM students s JOIN courses c ON s.course_id = c.id WHERE s.user_id = ?',
                        [userId]
                    );

                    const verificationResult = await verificationService.verifyStudentDocuments({
                        userId: userId,
                        studentId: user.user_id,
                        firstName: user.first_name,
                        middleName: user.middle_name,
                        lastName: user.last_name,
                        course: studentInfo[0]?.course_name || '',
                        yearLevel: studentInfo[0]?.year_level || ''
                    }, corBase64, `confirm_${Date.now()}`);

                    if (verificationResult.valid && verificationResult.corPeriodId && Number(verificationResult.corPeriodId) === Number(currentPeriodId)) {
                        await pool.query(
                            'UPDATE users SET last_verified_period_id = ?, updated_at = NOW() WHERE id = ?',
                            [verificationResult.corPeriodId, userId]
                        );
                        console.log(`[Auto-Confirm] SUCCESS: User ${userId} auto-updated to ${verificationResult.corPeriodId}`);
                        return res.json({
                            message: 'Academic status automatically updated from your records!',
                            alreadyCurrent: true,
                            autoFixed: true
                        });
                    }
                }
            } catch (autoErr) {
                console.error('[Auto-Confirm] Background check failed:', autoErr);
            }
        }
        // --- END AUTO-RE-VERIFY ATTEMPT ---

        // If auto-verify failed or no COR, return 202 to signal manual update needed
        return res.status(202).json({
            message: 'COR re-verification required for the current semester.',
            alreadyCurrent: false,
            requiresCOR: true,
            currentPeriod: `${periods[0].school_year} - ${periods[0].semester}`
        });

    } catch (error) {
        console.error('Confirm Enrollment Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update Academic Data (COR & Course/Year)
router.post('/update-academic-data', async (req, res) => {
    const { userId, studentId, course, yearLevel, corFile } = req.body; // user_id (string) and PK/studentId

    try {
        if (!corFile) return res.status(400).json({ message: 'Certificate of Registration is required' });

        // 1. Get Active Academic Period
        const [periods] = await pool.query(`
            SELECT id, school_year, semester 
            FROM academic_periods 
            WHERE effective_date <= NOW()
            ORDER BY effective_date DESC 
            LIMIT 1
        `);
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
            const finalPeriodId = verificationResult.corPeriodId || activePeriodId;
            await connection.query(
                `UPDATE users SET 
                    certificate_of_registration = ?, 
                    last_verified_period_id = ?,
                    updated_at = NOW()
                WHERE id = ?`,
                [corPath, finalPeriodId, user.id]
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

/**
 * Background Re-verification of stored COR
 * Automatically attempts to update academic period using existing image
 */
const { getObjectAsBase64 } = require('../utils/minioHelper');
router.post('/re-verify-cor', authenticateToken, async (req, res) => {
    const studentId = req.user.id;
    const requestId = `auto_${Date.now()}`;

    try {
        console.log(`[Auto-Verify] Starting background re-verification for user ${studentId}`);

        // 1. Get student and their current COR path
        const [users] = await pool.query(
            'SELECT user_id, first_name, middle_name, last_name, certificate_of_registration FROM users WHERE id = ?', 
            [studentId]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = users[0];

        if (!user.certificate_of_registration) {
            return res.status(400).json({ message: 'No COR on file for re-verification' });
        }

        // 2. Conver MinIO path to Base64
        const corBase64 = await getObjectAsBase64(user.certificate_of_registration);
        if (!corBase64) {
            return res.status(500).json({ message: 'Failed to retrieve stored COR for processing' });
        }

        // 3. Run verification with current student data (extract latest course/year from students table)
        const [studentInfo] = await pool.query(
            'SELECT c.name as course_name, s.year_level FROM students s JOIN courses c ON s.course_id = c.id WHERE s.user_id = ?',
            [studentId]
        );
        
        const verificationResult = await verificationService.verifyStudentDocuments({
            userId: studentId,
            studentId: user.user_id,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            course: studentInfo[0]?.course_name || '',
            yearLevel: studentInfo[0]?.year_level || ''
        }, corBase64, requestId);

        if (!verificationResult.valid) {
            console.log(`[Auto-Verify] Automatic verification failed for ${studentId}: ${verificationResult.reason}`);
            return res.status(202).json({ 
                message: 'Automatic verification could not confirm current status.',
                reason: verificationResult.reason 
            });
        }

        if (!verificationResult.corPeriodId) {
            return res.status(202).json({ message: 'Could not resolve academic period from document.' });
        }

        // 4. Update the user's last_verified_period_id
        await pool.query(
            'UPDATE users SET last_verified_period_id = ?, updated_at = NOW() WHERE id = ?',
            [verificationResult.corPeriodId, studentId]
        );

        console.log(`[Auto-Verify] SUCCESS: User ${studentId} updated to period ${verificationResult.corPeriodId}`);
        
        res.json({
            message: 'Academic status automatically updated.',
            verifiedPeriodId: verificationResult.corPeriodId
        });

    } catch (error) {
        console.error('[Auto-Verify] Critical Error:', error);
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
            JOIN users u_student ON u_student.id = ?
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE (e.student_id = u_student.id OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u_student.user_id), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
        `;

        if (!includeArchived) {
            query += ` AND (c.is_archived = 0 OR c.is_archived IS NULL)`;
        }

        const [classes] = await pool.query(query, [studentId, studentId]);

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

        // 2. Get Enrolled Active Classes with Professor Names
        //    Exclude archived classes — they must not appear in Next Class or attendance stats
        const [classes] = await pool.query(`
            SELECT c.*, u.first_name, u.last_name
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE (e.student_id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
        `, [studentId, studentStringId]);


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
                 WHERE class_id IN (?) AND session_date >= DATE(NOW())`,
                [classIds]
            );
            cancellations = cancellationsResult;

            // Fetch scheduled (pending) sessions (Make-up/Batch) for today onwards
            const [sessionsResult] = await pool.query(
                `SELECT * FROM sessions 
                 WHERE class_id IN (?) 
                 AND monitoring_started_at IS NULL 
                 AND date >= DATE(NOW())`,
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
        // Fetches all valid enrollment IDs to ensure resilient log matching
        const [eRows] = await pool.query(`
            SELECT id FROM enrollments 
            WHERE student_id = ? 
            OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(student_number), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
               = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
        `, [studentId, studentStringId]);
        const enrollmentIds = eRows.length > 0 ? eRows.map(r => r.id) : [-1];

        const [classStats] = await pool.query(`
            SELECT 
                c.id, 
                c.subject_name, 
                c.subject_code,
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN best_log.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN best_log.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN best_log.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN sessions s ON c.id = s.class_id 
                AND s.date <= DATE(NOW())
                AND s.monitoring_started_at IS NOT NULL
            LEFT JOIN (
                SELECT session_id, status
                FROM attendance_logs
                WHERE (student_id = ? OR enrollment_id IN (?))
                AND id IN (
                    SELECT MAX(id) FROM attendance_logs 
                    WHERE (student_id = ? OR enrollment_id IN (?))
                    GROUP BY session_id
                )
            ) best_log ON s.id = best_log.session_id
            WHERE (e.student_id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
            GROUP BY c.id
        `, [studentId, enrollmentIds, studentId, enrollmentIds, studentId, studentStringId]);

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
            WHERE (e.student_id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
            AND s.date <= DATE(NOW())
            AND s.monitoring_started_at IS NOT NULL
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
            ORDER BY s.date DESC, s.start_time DESC
            LIMIT 5
        `, [studentId, studentStringId]);

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

        // Get user's string ID first — needed in the class stats query below
        const [u_info] = await pool.query('SELECT user_id FROM users WHERE id = ?', [studentId]);
        if (u_info.length === 0) return res.status(404).json({ message: 'Student not found' });
        const studentStringId = u_info[0]?.user_id;

        // Get Per-Class Breakdown (Same logic as dashboard to ensure consistency)
        const [eRows] = await pool.query(`
            SELECT id FROM enrollments 
            WHERE student_id = ? 
            OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(student_number), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
               = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
        `, [studentId, studentStringId]);
        const enrollmentIds = eRows.length > 0 ? eRows.map(r => r.id) : [-1];

        const [classStats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN best_log.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN best_log.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN best_log.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN sessions s ON c.id = s.class_id 
                AND s.date <= DATE(NOW())
                AND s.monitoring_started_at IS NOT NULL
            LEFT JOIN (
                SELECT session_id, status
                FROM attendance_logs
                WHERE (student_id = ? OR enrollment_id IN (?))
                AND id IN (
                    SELECT MAX(id) FROM attendance_logs 
                    WHERE (student_id = ? OR enrollment_id IN (?))
                    GROUP BY session_id
                )
            ) best_log ON s.id = best_log.session_id
            WHERE (e.student_id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
        `, [studentId, enrollmentIds, studentId, enrollmentIds, studentId, studentStringId]);

        const stats = classStats[0] || {};

        const total = parseInt(stats.total_sessions) || 0;
        const present = parseInt(stats.present_count) || 0;
        const late = parseInt(stats.late_count) || 0;
        const excused = parseInt(stats.excused_count) || 0;

        // Manual calc for consistency
        const absent = Math.max(0, total - (present + late + excused));
        const attended = present + late + excused;

        const rate = total > 0
            ? Math.round(((attended / total) * 100))
            : 0;

        res.json({
            presentCount: present,
            lateCount: late,
            excusedCount: excused,
            absentCount: absent,
            totalSessions: total,
            attendedSessions: attended,
            attendanceRate: rate
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

        // 1. Get Class Details — no archived filter; students can always view history
        const [classRows] = await pool.query(`
            SELECT c.*, u.first_name, u.last_name
            FROM classes c
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE c.id = ?
        `, [classId]);

        if (classRows.length === 0) return res.status(404).json({ error: "Class not found" });
        const classInfo = classRows[0];
        const professorName = classInfo.first_name && classInfo.last_name
            ? `Prof. ${classInfo.last_name}`
            : 'Prof. Unknown';

        // 2b. Fetch valid enrollment IDs for this student
        const [eRows] = await pool.query(`
            SELECT id FROM enrollments 
            WHERE student_id = ? 
            OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(student_number), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
               = (SELECT REPLACE(REPLACE(REPLACE(REPLACE(TRIM(user_id), '-',''),' ',''), CHAR(13),''), CHAR(10),'') FROM users WHERE id = ?)
        `, [studentId, studentId]);
        const enrollmentIds = eRows.length > 0 ? eRows.map(r => r.id) : [-1];

        // 2. Get Statistics for this class
        const [statsRows] = await pool.query(`
             SELECT 
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN best_log.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN best_log.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN best_log.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM sessions s
            LEFT JOIN (
                SELECT session_id, status FROM attendance_logs 
                WHERE (student_id = ? OR enrollment_id IN (?))
            ) best_log ON s.id = best_log.session_id
            WHERE s.class_id = ?
            AND s.date <= DATE(NOW())
            AND s.monitoring_started_at IS NOT NULL
        `, [studentId, enrollmentIds, classId]);

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
                (
                    SELECT status FROM attendance_logs 
                    WHERE session_id = s.id 
                    AND (student_id = ? OR enrollment_id IN (?))
                    ORDER BY 
                        CASE 
                            WHEN status = 'Present' THEN 1 
                            WHEN status = 'Late' THEN 2 
                            WHEN status = 'Excused' THEN 3 
                            WHEN status = 'Absent' THEN 4 
                            ELSE 5 
                        END ASC,
                        id DESC
                    LIMIT 1
                ) AS status,
                (
                    SELECT time_in FROM attendance_logs 
                    WHERE session_id = s.id 
                    AND (student_id = ? OR enrollment_id IN (?))
                    ORDER BY id DESC LIMIT 1
                ) AS time_in,
                (
                    SELECT snapshot_url FROM attendance_logs 
                    WHERE session_id = s.id 
                    AND (student_id = ? OR enrollment_id IN (?))
                    ORDER BY id DESC LIMIT 1
                ) AS snapshot_url,
                (
                    SELECT recognition_method FROM attendance_logs 
                    WHERE session_id = s.id 
                    AND (student_id = ? OR enrollment_id IN (?))
                    ORDER BY id DESC LIMIT 1
                ) AS recognition_method
            FROM sessions s
            WHERE s.class_id = ?
            AND s.date <= DATE(NOW())
            AND s.monitoring_started_at IS NOT NULL
            ORDER BY s.date DESC, s.start_time DESC
        `, [studentId, enrollmentIds, studentId, enrollmentIds, studentId, enrollmentIds, studentId, enrollmentIds, classId]);

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
                snapshotUrl: standardizeImageUrl(log.snapshot_url, SNAPSHOT_BUCKET),
                recognitionMethod: log.recognition_method,
                startTime: log.start_time,
                type: log.type
            };
        });

        // 4. Get Current Batch for this student
        const [currentBatchRows] = await pool.query(`
            SELECT sg.* 
            FROM student_groups sg
            JOIN group_members gm ON sg.id = gm.group_id
            WHERE sg.class_id = ? AND (gm.student_id = ? OR gm.enrollment_id IN (?))
        `, [classId, studentId, enrollmentIds]);
        const currentBatch = currentBatchRows.length > 0 ? currentBatchRows[0] : null;

        // 5. Get All Batches for this class with occupancy
        const [availableBatches] = await pool.query(`
            SELECT 
                sg.*,
                (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as student_count
            FROM student_groups sg
            WHERE sg.class_id = ?
        `, [classId]);

        // 6. Get Pending Requests for this student
        const [pendingRequests] = await pool.query(`
            SELECT * FROM batch_requests 
            WHERE requester_id = ? AND class_id = ? AND status IN ('pending_peer', 'pending_professor')
        `, [studentId, classId]);

        res.json({
            classInfo: {
                id: classInfo.id,
                subjectName: classInfo.subject_name,
                subjectCode: classInfo.subject_code,
                professor: professorName,
                schedule: classInfo.schedule_json,
                isArchived: !!classInfo.is_archived
            },
            currentBatch,
            availableBatches,
            pendingRequests,
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
                (SELECT status FROM attendance_logs WHERE session_id = s.id AND (student_id = e.student_id OR enrollment_id = e.id) ORDER BY id DESC LIMIT 1) as log_status,
                (SELECT recognition_method FROM attendance_logs WHERE session_id = s.id AND (student_id = e.student_id OR enrollment_id = e.id) ORDER BY id DESC LIMIT 1) as log_method,
                (SELECT time_in FROM attendance_logs WHERE session_id = s.id AND (student_id = e.student_id OR enrollment_id = e.id) ORDER BY id DESC LIMIT 1) as log_time_in,
                (SELECT time_out FROM attendance_logs WHERE session_id = s.id AND (student_id = e.student_id OR enrollment_id = e.id) ORDER BY id DESC LIMIT 1) as log_time_out
            FROM sessions s
            JOIN enrollments e ON s.class_id = e.class_id
            JOIN classes c ON s.class_id = c.id
            CROSS JOIN (SELECT user_id FROM users WHERE id = ?) u_info
            WHERE (e.student_id = ? OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u_info.user_id), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), ''))
                AND s.date <= DATE(NOW())
                AND (c.is_archived = 0 OR c.is_archived IS NULL)
            ORDER BY s.date DESC, s.start_time DESC
            LIMIT ?
        `, [studentId, studentId, limit]);

        const formattedActivities = activities.map(act => {
            // Determine effective status
            const status = act.log_status || 'Absent';

            // Construct timestamp
            let timestamp;
            if (act.log_time_in) {
                // Ensure act.log_time_in is a Date object and convert to ISO
                timestamp = new Date(act.log_time_in).toISOString();
            } else {
                // Fallback for sessions without logs
                const datePart = new Date(act.date).toISOString().split('T')[0];
                timestamp = new Date(`${datePart}T${act.start_time}`).toISOString();
            }

            return {
                className: `${act.subject_code} - ${act.className}`,
                status: status,
                recognition_method: act.log_method,
                date: act.date,
                timeIn: timestamp, // Use the ISO timestamp consistently
                timeOut: act.log_time_out ? new Date(act.log_time_out).toISOString() : null,
                timestamp: timestamp
            };
        });

        res.json(formattedActivities);
    } catch (err) {
        console.error('Recent activity error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/analytics/:id
// Returns per-subject analytics: streak, session-by-session trend, class avg
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_COLOURS = [
    '#5CB4E4', '#4ade80', '#a78bfa', '#fb923c', '#f472b6', '#34d399'
];

router.get('/analytics/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // 1. Resolve the student's string user_id (used in some enrollment rows)
        const [uRows] = await pool.query('SELECT user_id FROM users WHERE id = ?', [studentId]);
        if (uRows.length === 0) return res.status(404).json({ message: 'Student not found' });
        const studentStringId = uRows[0].user_id;

        // 2. Fetch all active enrolled classes for the student
        const [classes] = await pool.query(`
            SELECT
                c.id,
                c.subject_name,
                c.subject_code,
                c.schedule_json,
                CONCAT(u.first_name, ' ', u.last_name) AS professor_name
            FROM classes c
            JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN users u ON c.professor_id = u.id
            WHERE (
                e.student_id = ?
                OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
                    = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
            )
            AND (c.is_archived = 0 OR c.is_archived IS NULL)
        `, [studentId, studentStringId]);

        if (classes.length === 0) return res.json([]);

        const classIds = classes.map(c => c.id);

        // 2b. Fetch all valid enrollment IDs for this student (handles multi-link cases)
        const [eRows] = await pool.query(`
            SELECT id FROM enrollments 
            WHERE student_id = ? 
            OR REPLACE(REPLACE(REPLACE(REPLACE(TRIM(student_number), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
               = REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-',''),' ',''), CHAR(13),''), CHAR(10),'')
        `, [studentId, studentStringId]);
        const enrollmentIds = eRows.length > 0 ? eRows.map(r => r.id) : [-1];

        // 3. Fetch all completed sessions for these classes (chronological)
        //    Uses a subquery to select the "best" status if multiple logs exist (e.g. Present > Late)
        const [sessions] = await pool.query(`
            SELECT
                s.id AS session_id,
                s.class_id,
                s.date,
                s.start_time,
                (
                    SELECT status FROM attendance_logs 
                    WHERE session_id = s.id 
                    AND (student_id = ? OR enrollment_id IN (?))
                    ORDER BY 
                        CASE 
                            WHEN status = 'Present' THEN 1 
                            WHEN status = 'Late' THEN 2 
                            WHEN status = 'Excused' THEN 3 
                            WHEN status = 'Absent' THEN 4 
                            ELSE 5 
                        END ASC,
                        id DESC
                    LIMIT 1
                ) AS attendance_status
            FROM sessions s
            WHERE s.class_id IN (?)
                AND s.date <= DATE(NOW())
                AND s.monitoring_started_at IS NOT NULL
            ORDER BY s.class_id, s.date ASC, s.start_time ASC
        `, [studentId, enrollmentIds, classIds]);

        // 4. Compute class-average rate per class (all enrolled students)
        //    One query — aggregate across all students per class.
        const [classAvgRows] = await pool.query(`
            SELECT
                s.class_id,
                COUNT(DISTINCT s.id) AS total_sessions,
                COUNT(DISTINCT e.student_id) AS enrolled_count,
                SUM(CASE WHEN al.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attended_count
            FROM sessions s
            JOIN enrollments e ON s.class_id = e.class_id
            LEFT JOIN attendance_logs al
                ON s.id = al.session_id AND al.student_id = e.student_id
            WHERE s.class_id IN (?)
                AND s.date <= DATE(NOW())
                AND s.monitoring_started_at IS NOT NULL
            GROUP BY s.class_id
        `, [classIds]);

        const classAvgMap = {};
        classAvgRows.forEach(row => {
            const totalPossible = (parseInt(row.total_sessions) || 0) * (parseInt(row.enrolled_count) || 1);
            classAvgMap[row.class_id] = totalPossible > 0
                ? Math.round((parseInt(row.attended_count) / totalPossible) * 100)
                : 0;
        });

        // 5. Group sessions by class and compute analytics
        const sessionsByClass = {};
        sessions.forEach(s => {
            if (!sessionsByClass[s.class_id]) sessionsByClass[s.class_id] = [];
            sessionsByClass[s.class_id].push(s);
        });

        // Helper: format schedule_json into a readable string
        const formatSchedule = (scheduleJson) => {
            try {
                const parsed = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson;
                if (!Array.isArray(parsed) || parsed.length === 0) return '';
                return parsed.map(slot => {
                    const day = slot.day ? slot.day.substring(0, 3) : '';
                    return `${day} ${slot.startTime || ''}`;
                }).join(', ');
            } catch {
                return '';
            }
        };

        const result = classes.map((cls, idx) => {
            const classSessions = sessionsByClass[cls.id] || [];
            const color = SUBJECT_COLOURS[idx % SUBJECT_COLOURS.length];

            // Per-session streak string and running-rate trend
            let present = 0, late = 0, excused = 0, absent = 0;
            let streak = '';
            const trend = [];

            classSessions.forEach((sess, i) => {
                const status = sess.attendance_status || 'Absent';
                if (status === 'Present') { present++; streak += 'P'; }
                else if (status === 'Late') { late++; streak += 'L'; }
                else if (status === 'Excused') { excused++; streak += 'E'; }
                else { absent++; streak += 'A'; }

                // Running rate up to this session (Present+Late+Excused out of sessions so far)
                const sessionsCount = i + 1;
                const attended = present + late + excused;
                trend.push(Math.round((attended / sessionsCount) * 100));
            });

            const totalSessions = classSessions.length;
            const attendanceRate = totalSessions > 0
                ? Math.round(((present + late + excused) / totalSessions) * 100)
                : 0;

            // Effective absences = raw absences + floor(lates / 3)
            const effectiveAbsences = absent;

            return {
                id: cls.id,
                subjectName: cls.subject_name,
                subjectCode: cls.subject_code,
                schedule: formatSchedule(cls.schedule_json),
                color,
                totalSessions,
                present,
                late,
                excused,
                absent,
                effectiveAbsences,
                attendanceRate,
                classAverageRate: classAvgMap[cls.id] || 0,
                streak,
                trend,
                classTrend: [], // not used on frontend currently
                missedTopics: [], // no topic data in schema
            };
        });

        res.json(result);

    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Batch Join/Swap Request
router.post('/batch-request', authenticateToken, async (req, res) => {
    const { classId, type, targetGroupId, targetStudentId } = req.body;
    const studentId = req.user.id;

    try {
        // 1. Basic Validation
        if (!classId || !type || !targetGroupId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 2. Check if student is already in a batch for this class
        const [currentBatch] = await pool.query(`
            SELECT sg.id FROM student_groups sg
            JOIN group_members gm ON sg.id = gm.group_id
            WHERE sg.class_id = ? AND gm.student_id = ?
        `, [classId, studentId]);

        if (type === 'join' && currentBatch.length > 0 && currentBatch[0].id === targetGroupId) {
            return res.status(400).json({ error: "You are already in this batch" });
        }

        // 3. Resolve Target Student (for swaps)
        let resolvedTargetId = null;
        if (type === 'swap') {
            if (!targetStudentId) {
                return res.status(400).json({ error: "Target Student ID is required for swaps" });
            }

            // Find the user ID for the given student number
            const [targetUsers] = await pool.query('SELECT id FROM users WHERE user_id = ?', [targetStudentId]);
            if (targetUsers.length === 0) {
                return res.status(404).json({ error: "Target student not found" });
            }
            resolvedTargetId = targetUsers[0].id;

            // Verify they are in the class
            const [isEnrolled] = await pool.query('SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?', [classId, resolvedTargetId]);
            if (isEnrolled.length === 0) {
                return res.status(400).json({ error: "Target student is not enrolled in this class" });
            }
        }

        // 4. Create the request
        const status = type === 'join' ? 'pending_professor' : 'pending_peer';

        await pool.query(`
            INSERT INTO batch_requests 
            (requester_id, target_student_id, target_group_id, class_id, request_type, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [studentId, resolvedTargetId, targetGroupId, classId, type, status]);

        res.json({ 
            message: type === 'join' ? "Join request sent to professor" : "Swap request sent to peer",
            status 
        });

    } catch (err) {
        console.error("Batch Request Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Pending Peer Requests for current student
router.get('/pending-swaps', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const [requests] = await pool.query(`
            SELECT 
                br.*,
                CONCAT(u.first_name, ' ', u.last_name) as requester_name,
                c.subject_name,
                sg.name as target_group_name
            FROM batch_requests br
            JOIN users u ON br.requester_id = u.id
            JOIN classes c ON br.class_id = c.id
            JOIN student_groups sg ON br.target_group_id = sg.id
            WHERE br.target_student_id = ? AND br.status = 'pending_peer'
        `, [studentId]);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Action a Peer Request (Accept/Decline)
router.post('/batch-request/:requestId/:action', authenticateToken, async (req, res) => {
    const { requestId, action } = req.params;
    const studentId = req.user.id;

    try {
        if (action === 'accept') {
            await pool.query('UPDATE batch_requests SET status = "pending_professor" WHERE id = ? AND target_student_id = ?', [requestId, studentId]);
        } else {
            await pool.query('UPDATE batch_requests SET status = "rejected" WHERE id = ? AND target_student_id = ?', [requestId, studentId]);
        }
        res.json({ message: `Swap request ${action}ed` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
