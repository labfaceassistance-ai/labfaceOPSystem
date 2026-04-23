const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });
const { standardizeImageUrl, SNAPSHOT_BUCKET } = require('../utils/minioHelper');

// Helper to find header column name case-insensitively with variants
const getHeader = (row, variants) => {
    if (!row) return null;
    const keys = Object.keys(row);
    for (const variant of variants) {
        const match = keys.find(k => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanVar = variant.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanKey === cleanVar;
        });
        if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') return row[match];
    }
    return null;
};

// Advanced helper for names (concatenates split columns)
const STUDENT_ID_VARIANTS = ['Student Number', 'Student ID', 'student_number', 'Id Number', 'ID', 'Id', 'SN', 'USN', 'LRN', 'Reg No', 'Registration Number', 'Roll No', 'StudentCode', 'Student_No'];
const NAME_VARIANTS = ['Name', 'Student Name', 'student_name', 'Full Name', 'Complete Name', 'StudentName'];

const getStudentName = (row) => {
    // 1. Try single Full Name column
    const fullName = getHeader(row, NAME_VARIANTS);
    if (fullName) return String(fullName).trim();

    // 2. Try split columns (Concatenate Last, First, Middle)
    const last = getHeader(row, ['Last Name', 'Surname', 'family_name', 'Lastname', 'FamilyName', 'Last']);
    const first = getHeader(row, ['First Name', 'Given Name', 'first_name', 'Firstname', 'GivenName', 'First']);
    const middle = getHeader(row, ['Middle Name', 'm_name', 'Middle Initial', 'MI', 'MNAME']);

    if (last || first) {
        return `${last || ''}, ${first || ''} ${middle || ''}`.replace(/^, /, '').trim();
    }
    return null;
};

// Robust sheet parser that finds the header row automatically
const parseRosterSheet = (worksheet) => {
    // Get raw rows as array-of-arrays first to find the "Anchor Row"
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
    
    let headerRowIndex = -1;
    let fallbackIdCol = -1;
    
    // Scan first 20 rows for a row that contains an ID column header
    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        
        let foundIdHeaderAt = -1;
        const hasIdHeader = row.some((cell, colIndex) => {
            if (typeof cell !== 'string') return false;
            const clean = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isMatch = STUDENT_ID_VARIANTS.some(v => clean === v.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (isMatch) foundIdHeaderAt = colIndex;
            return isMatch;
        });
        
        if (hasIdHeader) {
            headerRowIndex = i;
            break;
        }

        // FALLBACK DETECTION: If no header text matches, check content for common ID patterns
        // Pattern: 20XX-XXXX (approx) or 7+ digits
        if (fallbackIdCol === -1) {
            const idPattern = /^(\d{2,4}-\d{3,7}|\d{7,15})$/;
            const idCol = row.findIndex(cell => idPattern.test(String(cell).trim()));
            if (idCol !== -1) {
                fallbackIdCol = idCol;
                // If we found a row where a column looks like an ID, and we still haven't found a header row,
                // we might consider the row ABOVE this as the header row even if it's named weirdly.
                if (i > 0) headerRowIndex = i - 1;
            }
        }
    }
    
    // If we detected a fallback column but no named header row index, try to use it
    const options = { range: headerRowIndex === -1 ? 0 : headerRowIndex };
    
    let jsonData = xlsx.utils.sheet_to_json(worksheet, options);

    // If still failing to find named headers in the JSON, but we have a fallbackIdCol,
    // we manually map the column if the auto-headers are things like "__EMPTY"
    if (jsonData.length > 0 && fallbackIdCol !== -1) {
        const firstRow = jsonData[0];
        const hasStandardId = STUDENT_ID_VARIANTS.some(v => getHeader(firstRow, [v]));
        if (!hasStandardId) {
            // Find the key name that xlsx assigned to our fallback column
            const keys = Object.keys(firstRow);
            // This is complex because sheet_to_json headers are determined by the range start.
            // If we started at range 0, keys[fallbackIdCol] is likely the header name.
            // For now, let's at least ensure getHeader will include "Id" as a result of our data mapping.
        }
    }

    return jsonData;
};

// Ensure enrollments table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        student_id INT, 
        student_number VARCHAR(20) NOT NULL,
        student_name VARCHAR(255),
        batch_group VARCHAR(50),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
`).catch(err => console.error('Error creating enrollments table:', err));

// Ensure is_archived column exists in classes table
pool.query(`SHOW COLUMNS FROM classes LIKE 'is_archived'`)
    .then(([columns]) => {
        if (columns.length === 0) {
            console.log('[SCHEMA] Adding is_archived column to classes table');
            return pool.query(`ALTER TABLE classes ADD COLUMN is_archived TINYINT(1) DEFAULT 0`);
        }
    })
    .catch(err => console.error('Error updating classes schema:', err));

// Ensure monitoring_ended_at column exists in sessions table
pool.query(`SHOW COLUMNS FROM sessions LIKE 'monitoring_ended_at'`)
    .then(([columns]) => {
        if (columns.length === 0) {
            console.log('[SCHEMA] Adding monitoring_ended_at column to sessions table');
            return pool.query(`ALTER TABLE sessions ADD COLUMN monitoring_ended_at DATETIME DEFAULT NULL`);
        }
    })
    .catch(err => console.error('Error updating sessions schema:', err));

// Ensure location column exists in classes table
pool.query(`SHOW COLUMNS FROM classes LIKE 'location'`)
    .then(([columns]) => {
        if (columns.length === 0) {
            console.log('[SCHEMA] Adding location column to classes table');
            return pool.query(`ALTER TABLE classes ADD COLUMN location VARCHAR(150) DEFAULT 'Lab 1'`);
        }
    })
    .catch(err => console.error('Error updating classes schema (location):', err));

// Helper: Normalize any time string to minutes since midnight
// Handles: "08:00", "8:00 am", "08:00 AM", "08:00:00" (HH:MM:SS from MySQL)
const normalizeTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim().toLowerCase();
    // Match HH:MM or HH:MM:SS, with optional am/pm
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
    if (!match) {
        console.warn('[validateSchedule] Unrecognized time format:', timeStr);
        return 0;
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3];
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

// Helper: Check schedule overlaps (format-agnostic)
const hasOverlap = (startA, endA, startB, endB) => {
    const sA = normalizeTimeToMinutes(startA);
    const eA = normalizeTimeToMinutes(endA);
    const sB = normalizeTimeToMinutes(startB);
    const eB = normalizeTimeToMinutes(endB);
    return (sA < eB) && (eA > sB);
};

const validateSchedule = async (professorPk, schedule, location, excludeClassId = null) => {
    // 1. Get all active classes that could conflict (same location OR same professor)
    // We fetch all because we need to parse schedule_json
    const [existingClasses] = await pool.query(
        `SELECT id, professor_id, location, schedule_json, subject_code, section 
         FROM classes 
         WHERE (is_archived = 0 OR is_archived IS NULL) 
         ${excludeClassId ? 'AND id != ' + pool.escape(excludeClassId) : ''}`
    );

    for (const otherClass of existingClasses) {
        let otherSchedule;
        try {
            otherSchedule = typeof otherClass.schedule_json === 'string' 
                ? JSON.parse(otherClass.schedule_json) 
                : otherClass.schedule_json;
        } catch (e) { continue; }

        if (!Array.isArray(otherSchedule) || !Array.isArray(schedule)) continue;

        for (const newSlot of schedule) {
            for (const otherSlot of otherSchedule) {
                // Same day?
                if (newSlot.day !== otherSlot.day) continue;

                // Time overlap?
                if (hasOverlap(newSlot.startTime, newSlot.endTime, otherSlot.startTime, otherSlot.endTime)) {
                    // Scenario A: Same Room conflict
                    if (location && otherClass.location && 
                        location.toLowerCase().trim() === otherClass.location.toLowerCase().trim()) {
                        return { 
                            conflict: true, 
                            message: `Room Conflict: ${otherClass.location} is occupied by ${otherClass.subject_code} (${otherClass.section}) during this time.` 
                        };
                    }

                    // Scenario B: Same Professor conflict (cannot be in two places)
                    if (professorPk === otherClass.professor_id) {
                        return { 
                            conflict: true, 
                            message: `Professor Conflict: You already have another class (${otherClass.subject_code}) scheduled during this time.` 
                        };
                    }
                }
            }
        }
    }
    return { conflict: false };
};

// Ensure class_cancellations table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS class_cancellations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        session_date DATE NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_class_date (class_id, session_date)
    )
`).catch(err => console.error('Error creating class_cancellations table:', err));

// ... existing code ...

// Create Cancellation
router.post('/:id/cancellations', async (req, res) => {
    const { date, reason } = req.body;
    if (!date || !reason) return res.status(400).json({ error: 'Date and reason are required' });

    try {
        // Check if already cancelled
        const [existing] = await pool.query(
            'SELECT id FROM class_cancellations WHERE class_id = ? AND session_date = ?',
            [req.params.id, date]
        );

        if (existing.length > 0) {
            return res.json({ message: 'Session already cancelled' });
        }

        await pool.query(
            'INSERT INTO class_cancellations (class_id, session_date, reason) VALUES (?, ?, ?)',
            [req.params.id, date, reason]
        );

        // Notify students
        const [enrollments] = await pool.query('SELECT student_id, student_number FROM enrollments WHERE class_id = ?', [req.params.id]);

        // Fetch class info for notification
        const [classes] = await pool.query('SELECT subject_code FROM classes WHERE id = ?', [req.params.id]);
        const subjectCode = classes[0]?.subject_code || 'Class';

        for (const student of enrollments) {
            if (student.student_id) { // Only notify linked users
                await pool.query(`
                    INSERT INTO notifications (user_id, title, message, type, category)
                    VALUES (?, 'Class Cancelled', ?, 'info', 'attendance')
                `, [student.student_id, `Your class ${subjectCode} on ${date} has been cancelled. Reason: ${reason}`]);
            }
        }

        res.json({ message: 'Cancellation created and notifications sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Cancellations
router.get('/cancellations', async (req, res) => {
    try {
        const [cancellations] = await pool.query(
            'SELECT * FROM class_cancellations ORDER BY session_date DESC'
        );
        res.json(cancellations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get Class Status for Today (Recurrence, Cancellation, Scheduled Makeups)
router.get('/:id/status-today', async (req, res) => {
    try {
        const classId = req.params.id;
        const now = new Date();
        const phDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const dayName = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }).format(now);

        // 1. Check Recurrence
        const [classes] = await pool.query('SELECT schedule_json FROM classes WHERE id = ?', [classId]);
        const schedule = classes[0]?.schedule_json ? JSON.parse(classes[0].schedule_json) : null;

        let isRecuringToday = false;
        let scheduleDetails = null;
        if (schedule) {
            // schedule is likely an array or object. Based on previous code, likely array of { day: 'Monday', start: '...', end: '...' }
            // Let's assume standard format
            if (Array.isArray(schedule)) {
                const todaySched = schedule.find(s => s.day === dayName);
                if (todaySched) {
                    isRecuringToday = true;
                    scheduleDetails = todaySched;
                }
            }
        }

        // 2. Check Cancellation
        const [cancellations] = await pool.query(
            'SELECT * FROM class_cancellations WHERE class_id = ? AND session_date = ?',
            [classId, phDate]
        );
        const isCancelled = cancellations.length > 0;

        // 3. Check Scheduled Makeup (Pending Session)
        const [makeups] = await pool.query(
            'SELECT * FROM sessions WHERE class_id = ? AND date = ? AND type = "makeup" AND monitoring_started_at IS NULL',
            [classId, phDate]
        );
        const isMakeupScheduled = makeups.length > 0;

        res.json({
            date: phDate,
            day: dayName,
            isRecuringToday,
            isCancelled,
            isMakeupScheduled,
            scheduleDetails,
            cancellationReason: isCancelled ? cancellations[0].reason : null
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// Get Professor Stats Overview (Deduplicated Stats)
router.get('/professor/:id/stats-overview', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Resolve professor PK (id) from user_id (school ID)
        // Correctly handle numeric IDs by looking up in user_id column first
        const [profUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR id = ?', 
            [userId, isNaN(userId) ? -1 : userId]
        );

        if (profUsers.length === 0) {
            console.error(`[Stats Overview] Professor not found for ID: ${userId}`);
            return res.status(404).json({ message: 'Professor not found' });
        }

        const professorPk = profUsers[0].id;
        console.log(`[Stats Overview] Resolved ID ${userId} to PK ${professorPk}`);

        const stats = await analyticsService.getProfessorStats(professorPk);
        res.json(stats);
    } catch (err) {
        console.error('Analytics Overview Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    console.log('[DEBUG] Create Class Request Body:', req.body);
    const { subjectCode, subjectName, professorId, schoolYear, semester, section, schedule, course, yearLevel } = req.body;
    try {
        // Get or create academic period
        let [periods] = await pool.query(
            'SELECT id FROM academic_periods WHERE school_year = ? AND semester = ?',
            [schoolYear, semester]
        );

        let periodId;
        if (periods.length === 0) {
            const [result] = await pool.query(
                'INSERT INTO academic_periods (school_year, semester, is_active) VALUES (?, ?, TRUE)',
                [schoolYear, semester]
            );
            periodId = result.insertId;
        } else {
            periodId = periods[0].id;
        }

        // Get course_id if course is provided
        let courseId = null;
        if (course) {
            const [courses] = await pool.query('SELECT id FROM courses WHERE code = ?', [course]);
            if (courses.length > 0) {
                courseId = courses[0].id;
            } else {
                console.log('[DEBUG] Course not found:', course);
            }
        }

        // Get Professor Primary Key (professorId is likely the user_id string)
        if (!professorId) {
            console.log('[DEBUG] Professor ID is missing in request');
            return res.status(400).json({ message: 'Professor ID is required' });
        }

        const [profUsers] = await pool.query('SELECT id FROM users WHERE user_id = ?', [professorId]);
        if (profUsers.length === 0) {
            console.log('[DEBUG] Professor not found for user_id:', professorId);
            return res.status(404).json({ message: 'Professor not found' });
        }
        const professorPk = profUsers[0].id;

        // 1. Uniqueness Check (Subject + Section for this professor in this period)
        const [duplicates] = await pool.query(
            'SELECT id FROM classes WHERE professor_id = ? AND subject_code = ? AND section = ? AND academic_period_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
            [professorPk, subjectCode, section, periodId]
        );
        if (duplicates.length > 0) {
            return res.status(400).json({ error: `You already have an active class for ${subjectCode} section ${section}.` });
        }

        // 2. Conflict Detection (Room & Professor Overlap)
        const location = req.body.location || 'Lab 1';
        const validation = await validateSchedule(professorPk, schedule, location);
        if (validation.conflict) {
            return res.status(400).json({ error: validation.message });
        }

        // 3. Insert class with academic_period_id, course_id and location
        console.log('[DEBUG] Inserting class with:', { subjectCode, subjectName, professorPk, periodId, section, schedule, courseId, yearLevel, location });
        const [result] = await pool.query(
            'INSERT INTO classes (subject_code, subject_name, professor_id, academic_period_id, section, schedule_json, course_id, year_level, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [subjectCode, subjectName, professorPk, periodId, section, JSON.stringify(schedule), courseId, yearLevel || null, location]
        );

        // AUTO-REPAIR: Update any existing enrollments for this subject/section
        await pool.query(
            `UPDATE enrollments e
             JOIN users u ON REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
             SET e.student_id = u.id
             WHERE e.student_id IS NULL`,
            []
        );

        res.status(201).json({ message: 'Class created successfully', classId: result.insertId });
    } catch (err) {
        console.error('[DEBUG] Create Class Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// List Classes for Professor
router.get('/professor/:id', async (req, res) => {
    const { archived } = req.query;
    try {
        // Resolve professor_id (school ID) to PK
        const [profUsers] = await pool.query(
            'SELECT id FROM users WHERE user_id = ? OR REPLACE(user_id, "-", "") = ? OR id = ?', 
            [req.params.id, req.params.id.toString().replace(/-/g, ''), isNaN(req.params.id) ? -1 : req.params.id]
        );

        if (profUsers.length === 0) return res.json([]);
        const professorPk = profUsers[0].id;

        let query = `
            SELECT c.*, 
                   COALESCE(c.is_archived, 0) as is_archived, 
                   COUNT(DISTINCT e.id) as student_count,
                   ap.school_year, ap.semester,
                   (SELECT id FROM sessions WHERE class_id = c.id AND monitoring_started_at IS NOT NULL AND monitoring_ended_at IS NULL ORDER BY monitoring_started_at DESC LIMIT 1) as active_session_id,
                   (SELECT type FROM sessions WHERE class_id = c.id AND monitoring_started_at IS NOT NULL AND monitoring_ended_at IS NULL ORDER BY monitoring_started_at DESC LIMIT 1) as active_session_type
            FROM classes c 
            LEFT JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN academic_periods ap ON c.academic_period_id = ap.id
            WHERE c.professor_id = ?
        `;
        const params = [professorPk];

        if (archived === 'true') {
            query += ' AND c.is_archived = 1';
        } else if (archived === 'false') {
            query += ' AND (c.is_archived = 0 OR c.is_archived IS NULL)';
        }

        query += ' GROUP BY c.id';

        const [classes] = await pool.query(query, params);
        console.log(`[DEBUG] Found ${classes.length} classes for professor ${professorPk} (archived filter: ${archived})`);
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Archive/Unarchive Class
router.put('/:id/archive', async (req, res) => {
    const { is_archived, isArchived } = req.body;
    const finalArchived = is_archived !== undefined ? is_archived : isArchived;

    try {
        await pool.query('UPDATE classes SET is_archived = ? WHERE id = ?', [finalArchived ? 1 : 0, req.params.id]);
        res.json({ message: `Class ${finalArchived ? 'archived' : 'unarchived'} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Class
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Class deleted successfully' });
    } catch (err) {
        console.error('Delete class error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Preview Roster Upload
router.post('/:id/preview-roster', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const buffer = req.file.buffer;
        let data = [];

        if (req.file.mimetype.includes('csv') || req.file.originalname.endsWith('.csv')) {
            const workbook = xlsx.read(buffer, { type: 'buffer', codepage: 65001 }); // Force UTF-8
            const sheetName = workbook.SheetNames[0];
            data = parseRosterSheet(workbook.Sheets[sheetName]);
        } else {
            const workbook = xlsx.read(buffer, { type: 'buffer', codepage: 65001 }); // Force UTF-8
            const sheetName = workbook.SheetNames[0];
            data = parseRosterSheet(workbook.Sheets[sheetName]);
        }

        // Clean Data
        const classId = req.params.id;
        const uploadedStudents = data.map(row => {
            const rawId = getHeader(row, STUDENT_ID_VARIANTS);
            const name = getStudentName(row);
            
            if (!rawId) return null;
            return {
                student_number: String(rawId).trim(),
                student_name: (name || 'Unknown').trim()
            };
        }).filter(Boolean);

        if (uploadedStudents.length === 0 && data.length > 0) {
            return res.status(400).json({ 
                error: 'No students detected in the roster file.',
                details: 'Please ensure your file has a column for "Student Number" and "Name".',
                rowCount: data.length
            });
        }

        // Fetch Current Roster
        const [currentEnrollments] = await pool.query('SELECT student_number, student_name FROM enrollments WHERE class_id = ?', [classId]);

        const currentMap = new Set(currentEnrollments.map(e => e.student_number));
        const uploadedMap = new Set(uploadedStudents.map(s => s.student_number));

        const toAdd = uploadedStudents.filter(s => !currentMap.has(s.student_number));
        const toRemove = currentEnrollments.filter(e => !uploadedMap.has(e.student_number));
        const unchanged = uploadedStudents.filter(s => currentMap.has(s.student_number));

        res.json({
            summary: {
                total_uploaded: uploadedStudents.length,
                to_add: toAdd.length,
                to_remove: toRemove.length,
                unchanged: unchanged.length
            },
            changes: {
                to_add: toAdd,
                to_remove: toRemove,
                unchanged: unchanged
            }
        });

    } catch (err) {
        console.error("Preview Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Helper: Backfill absences for a student added mid-semester
const backfillAbsences = async (classId, studentId, enrollmentId) => {
    try {
        // Find all sessions for this class that have already ended
        const [pastSessions] = await pool.query(
            `SELECT id FROM sessions 
             WHERE class_id = ? AND (monitoring_ended_at IS NOT NULL OR date < CURDATE())`,
            [classId]
        );

        if (pastSessions.length === 0) return;

        // Insert 'Absent' logs for each past session
        const values = pastSessions.map(s => [s.id, studentId || null, enrollmentId, 'Absent', 'System Backfill']);
        
        await pool.query(
            `INSERT INTO attendance_logs (session_id, student_id, enrollment_id, status, recognition_method) 
             VALUES ?`,
            [values]
        );
        console.log(`[Backfill] Created ${pastSessions.length} absences for class ${classId}`);
    } catch (err) {
        console.error('[Backfill Error]', err);
    }
};

// Batch Upload Roster (Commit)
router.post('/:id/upload-roster', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const buffer = req.file.buffer;
        const workbook = xlsx.read(buffer, { type: 'buffer', codepage: 65001 }); // Force UTF-8
        const sheetName = workbook.SheetNames[0];
        const data = parseRosterSheet(workbook.Sheets[sheetName]);

        const classId = req.params.id;
        let addedCount = 0;
        let updatedCount = 0;

        // Process Data
        const uploadedStudentNumbers = [];

        for (const row of data) {
            const rawId = getHeader(row, STUDENT_ID_VARIANTS);
            const name = getStudentName(row);

            if (rawId) {
                const studentNumber = String(rawId).trim();
                uploadedStudentNumbers.push(studentNumber);

                // Check User Linkage (Ultra-Robust)
                const [users] = await pool.query(
                    `SELECT id FROM users 
                     WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                     REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(?), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')`, 
                    [studentNumber]
                );
                const studentId = users.length > 0 ? users[0].id : null;

                // Check for duplicate enrollment
                const [existing] = await pool.query('SELECT id, student_id FROM enrollments WHERE class_id = ? AND student_number = ?', [classId, studentNumber]);

                if (existing.length === 0) {
                    // New enrollment
                    const [insResult] = await pool.query(
                        'INSERT INTO enrollments (class_id, student_id, student_number, student_name) VALUES (?, ?, ?, ?)',
                        [classId, studentId, studentNumber, name || 'Unknown']
                    );
                    const newEnrollmentId = insResult.insertId;
                    addedCount++;

                    // Backfill absences for past sessions
                    await backfillAbsences(classId, studentId, newEnrollmentId);

                    // NOTIFICATION: Notify student if they are already registered
                    if (studentId) {
                        try {
                            const [classInfo] = await pool.query('SELECT subject_name FROM classes WHERE id = ?', [classId]);
                            const className = classInfo.length > 0 ? classInfo[0].subject_name : 'a new class';
                            
                            await pool.query(
                                'INSERT INTO notifications (user_id, title, message, type, category) VALUES (?, ?, ?, ?, ?)',
                                [studentId, 'New Class Enrollment', `You have been added to ${className} via bulk import.`, 'info', 'class']
                            );
                        } catch (notifErr) {
                            console.error('Failed to send enrollment notification:', notifErr);
                        }
                    }
                } else if (studentId && (existing[0].student_id === null || existing[0].student_id !== studentId)) {
                    // Update linkage if student now registered
                    await pool.query('UPDATE enrollments SET student_id = ?, student_name = ? WHERE id = ?', [studentId, name, existing[0].id]);
                    updatedCount++;

                    // NOTIFICATION: Notify student that their existing enrollment is now linked
                    try {
                        const [classInfo] = await pool.query('SELECT subject_name FROM classes WHERE id = ?', [classId]);
                        const className = classInfo.length > 0 ? classInfo[0].subject_name : 'a class';
                        
                        await pool.query(
                            'INSERT INTO notifications (user_id, title, message, type, category) VALUES (?, ?, ?, ?, ?)',
                            [studentId, 'Class Account Linked', `Your account is now correctly linked to ${className}.`, 'success', 'class']
                        );
                    } catch (notifErr) {
                        console.error('Failed to send linkage notification:', notifErr);
                    }
                }
            }
        }

        // SYNC: Remove students not in the uploaded list


        if (uploadedStudentNumbers.length > 0) {
            // Delete enrollments NOT in the upload
            const [deleteResult] = await pool.query(
                `DELETE FROM enrollments WHERE class_id = ? AND student_number NOT IN (${uploadedStudentNumbers.map(() => '?').join(',')})`,
                [classId, ...uploadedStudentNumbers]
            );
            console.log(`[ROSTER SYNC] Removed ${deleteResult.affectedRows} students not in the uploaded list.`);
        } else if (data.length > 0) {
            // SAFEGUARD: If the file had rows but we parsed 0 IDs, it's likely a parsing error.
            // DO NOT delete the existing roster.
            console.warn(`[ROSTER SYNC] Safeguard triggered: File has ${data.length} rows but 0 student numbers parsed. Aborting deletion.`);
            return res.status(400).json({ error: 'Failed to detect any valid student IDs in the file. Current roster was preserved.' });
        } else {
            // If list is empty AND file is empty, remove ALL students (intentional clear)
            const [deleteResult] = await pool.query('DELETE FROM enrollments WHERE class_id = ?', [classId]);
            console.log(`[ROSTER SYNC] List was empty. Removed ${deleteResult.affectedRows} students.`);
        }

        res.json({
            message: `Processed ${data.length} records. Added ${addedCount} new students. Updated ${updatedCount} existing enrollments.`,
            added: addedCount,
            updated: updatedCount,
            total: data.length
        });

    } catch (err) {
        console.error("Roster Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Class Details
router.put('/:id', async (req, res) => {
    const { subjectCode, subjectName, section, schedule, schoolYear, semester, location } = req.body;
    console.log('[DEBUG] PUT /:id Request Body:', req.body);
    try {
        // Resolve professorPk for this class (needed for validation)
        const [currentClass] = await pool.query('SELECT professor_id FROM classes WHERE id = ?', [req.params.id]);
        if (currentClass.length === 0) return res.status(404).json({ error: 'Class not found' });
        const professorPk = currentClass[0].professor_id;

        // Conflict Detection (Room & Professor Overlap)
        if (schedule && location) {
            const validation = await validateSchedule(professorPk, schedule, location, req.params.id);
            if (validation.conflict) {
                return res.status(400).json({ error: validation.message });
            }
        }

        // If schoolYear and semester are provided, get or create academic period
        let updateQuery = 'UPDATE classes SET subject_code = ?, subject_name = ?, section = ?, schedule_json = ?, location = ?';
        let updateParams = [subjectCode, subjectName, section, JSON.stringify(schedule), location || 'Lab 1'];

        if (schoolYear && semester) {
            // Get or create academic period
            let [periods] = await pool.query(
                'SELECT id FROM academic_periods WHERE school_year = ? AND semester = ?',
                [schoolYear, semester]
            );

            let periodId;
            if (periods.length === 0) {
                const [result] = await pool.query(
                    'INSERT INTO academic_periods (school_year, semester, is_active) VALUES (?, ?, TRUE)',
                    [schoolYear, semester]
                );
                periodId = result.insertId;
            } else {
                periodId = periods[0].id;
            }

            updateQuery += ', academic_period_id = ?';
            updateParams.push(periodId);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(req.params.id);

        await pool.query(updateQuery, updateParams);
        res.json({ message: 'Class updated successfully' });
    } catch (err) {
        console.error('Update class error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Class Details (Roster) - Enhanced with account status
router.get('/:id', async (req, res) => {
    try {
        const [classes] = await pool.query(`
            SELECT c.*, ap.school_year, ap.semester 
            FROM classes c 
            LEFT JOIN academic_periods ap ON c.academic_period_id = ap.id 
            WHERE c.id = ?
        `, [req.params.id]);
        if (classes.length === 0) return res.status(404).json({ message: 'Class not found' });

        const [students] = await pool.query(`
            SELECT 
                e.id as enrollment_id,
                e.student_number as user_id,
                e.student_name as full_name,
                e.student_number,
                e.student_name,
                COALESCE(e.student_id, u.id) as student_id,
                u.profile_picture,
                u.first_name,
                u.last_name,
                CASE 
                    WHEN u.id IS NOT NULL THEN 'Registered'
                    ELSE 'No Account'
                END as account_status
            FROM enrollments e 
            LEFT JOIN users u ON e.student_id = u.id OR 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
            WHERE e.class_id = ?
            ORDER BY e.student_name
        `, [req.params.id]);

        res.json({ class: classes[0], students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Students for a Class (for SessionModal batch selection)
router.get('/:id/students', async (req, res) => {
    try {
        const [students] = await pool.query(`
            SELECT 
                u.id, 
                e.id as enrollment_id,
                COALESCE(u.user_id, e.student_number) as user_id, 
                COALESCE(u.first_name, SUBSTRING_INDEX(e.student_name, ' ', 1)) as first_name, 
                COALESCE(u.last_name, TRIM(SUBSTRING(e.student_name, LOCATE(' ', e.student_name)))) as last_name, 
                e.student_name as full_name,
                u.profile_picture, 
                u.course, 
                u.year_level,
                CASE WHEN u.id IS NULL THEN 0 ELSE 1 END as is_registered
            FROM enrollments e
            LEFT JOIN users u ON e.student_id = u.id OR 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
            WHERE e.class_id = ?
            ORDER BY COALESCE(u.last_name, e.student_name)
        `, [req.params.id]);

        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Class Analytics (Attendance Statistics)
router.get('/:id/analytics', async (req, res) => {
    try {
        const classId = req.params.id;

        // Get all sessions for this class
        const [sessions] = await pool.query(
            'SELECT id, date, start_time, type FROM sessions WHERE class_id = ? ORDER BY date, start_time',
            [classId]
        );

        // Get all enrolled students
        const [students] = await pool.query(`
            SELECT e.student_id, e.student_name, u.first_name, u.last_name, u.profile_picture
            FROM enrollments e
            LEFT JOIN users u ON e.student_id = u.id OR 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
            WHERE e.class_id = ?
            ORDER BY e.student_name
        `, [classId]);

        // Get all attendance logs for this class
        const sessionIds = sessions.map(s => s.id);
        let logs = [];
        if (sessionIds.length > 0) {
            const [logsResult] = await pool.query(
                `SELECT session_id, student_id, status
                 FROM attendance_logs
                 WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
                sessionIds
            );
            logs = logsResult;
        }

        // Calculate statistics per student
        const analytics = students.map(student => {
            const studentLogs = logs.filter(log => log.student_id === student.student_id);
            const totalSessions = sessions.length;
            const attendedSessions = studentLogs.length;
            const presentCount = studentLogs.filter(log => log.status === 'Present').length;
            const lateCount = studentLogs.filter(log => log.status === 'Late').length;
            const absentCount = totalSessions - attendedSessions;

            const attendanceRate = totalSessions > 0
                ? ((attendedSessions / totalSessions) * 100).toFixed(1)
                : 0;

            const isAtRisk = parseFloat(attendanceRate) < 75;

            return {
                studentId: student.student_id,
                studentName: student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
                profilePicture: student.profile_picture,
                totalSessions,
                attendedSessions,
                presentCount,
                lateCount,
                absentCount,
                attendanceRate: parseFloat(attendanceRate),
                isAtRisk
            };
        });

        // Sort by attendance rate (lowest first)
        analytics.sort((a, b) => a.attendanceRate - b.attendanceRate);

        // Calculate class average
        const avgAttendance = analytics.length > 0
            ? (analytics.reduce((sum, s) => sum + s.attendanceRate, 0) / analytics.length).toFixed(1)
            : 0;

        res.json({
            classId,
            totalSessions: sessions.length,
            totalStudents: students.length,
            averageAttendance: parseFloat(avgAttendance),
            atRiskCount: analytics.filter(s => s.isAtRisk).length,
            students: analytics,
            sessions: sessions.map(s => ({
                id: s.id,
                date: s.date,
                startTime: s.start_time,
                type: s.type
            }))
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Professor Analytics Overview (Deduplicated Stats)


// Get Attendance Grid (Students × Sessions Matrix)
router.get('/:id/attendance-grid', async (req, res) => {
    try {
        const classId = req.params.id;

        const [sessions] = await pool.query(
            'SELECT id, date, start_time, end_time, type, monitoring_started_at FROM sessions WHERE class_id = ? ORDER BY date DESC, start_time DESC',
            [classId]
        );

        // Fetch students with deduplication logic (Group by student_number)
        // We prioritize the record with a student_id (registered user) using MAX(student_id)
        // CRITICAL: We use MIN(id) as the primary enrollment ID for saves, and collect ALL for matching
        const [students] = await pool.query(
            `SELECT 
                e_agg.id, 
                e_agg.student_id, 
                e_agg.student_name,
                COALESCE(u.user_id, e_agg.student_number) as student_number,
                e_agg.all_enrollment_ids
             FROM (
                SELECT 
                    MIN(id) as id, 
                    MAX(student_id) as student_id, 
                    student_name,
                    student_number,
                    GROUP_CONCAT(id ORDER BY id) as all_enrollment_ids
                FROM enrollments 
                WHERE class_id = ? 
                GROUP BY student_number 
             ) e_agg
             LEFT JOIN users u ON e_agg.student_id = u.id OR 
                REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '') = 
                REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e_agg.student_number), '-', ''), ' ', ''), CHAR(13), ''), CHAR(10), '')
             ORDER BY e_agg.student_name`,
            [classId]
        );

        const sessionIds = sessions.map(s => s.id);
        let logs = [];
        if (sessionIds.length > 0) {
            const [logsResult] = await pool.query(
                `SELECT session_id, student_id, enrollment_id, status, time_in, recognition_method, snapshot_url
                 FROM attendance_logs
                 WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
                sessionIds
            );
            logs = logsResult;
        }

        // Build grid
        const grid = students.map(student => {
            // Parse all enrollment IDs for this student
            const enrollmentIds = student.all_enrollment_ids.split(',').map(id => parseInt(id));

            return {
                enrollmentId: student.id,
                studentId: student.student_id,
                studentNumber: student.student_number,
                studentName: student.student_name,
                attendance: sessions.map(session => {
                    // Attempt to find a log for this student/session
                    let log = null;

                    // Try matching by enrollment IDs
                    if (enrollmentIds && enrollmentIds.length > 0) {
                        log = logs.find(l =>
                            l.session_id === session.id &&
                            enrollmentIds.some(eid => parseInt(eid) === parseInt(l.enrollment_id))
                        );
                    }

                    // Fallback to student_id matching
                    if (!log && student.student_id) {
                        log = logs.find(l =>
                            l.session_id === session.id && parseInt(l.student_id) === parseInt(student.student_id)
                        );
                    }

                    console.log(`[GRID DEBUG] Student: ${student.student_name}, Session: ${session.id}, EnrollmentIDs: [${enrollmentIds.join(',')}], Log Found:`, log ? 'Yes' : 'No');

                    // Standardize status for frontend (capitalize)
                    let finalStatus = (log && log.status && log.status.toLowerCase() !== 'not registered') ? log.status : 'Absent';
                    if (finalStatus) {
                        finalStatus = finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1).toLowerCase();
                    }

                    return {
                        sessionId: session.id,
                        date: session.date,
                        status: finalStatus,
                        timeIn: log ? log.time_in : null,
                        recognitionMethod: log ? log.recognition_method : null,
                        snapshotUrl: log ? standardizeImageUrl(log.snapshot_url, SNAPSHOT_BUCKET) : null
                    };
                })
            };
        });

        res.json({
            students: grid,
            sessions: sessions.map(s => ({
                id: s.id,
                date: s.date,
                startTime: s.start_time,
                endTime: s.end_time,
                type: s.type
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Single Student
router.post('/:id/students', async (req, res) => {
    const { studentNumber, firstName, lastName } = req.body;
    const classId = req.params.id;

    if (!studentNumber || !firstName || !lastName) {
        return res.status(400).json({ error: 'Student number, first name, and last name are required' });
    }

    try {
        const fullName = `${firstName} ${lastName}`;

        // Check if student user exists (for linking) (Multi-role support)
        const [users] = await pool.query('SELECT id FROM users WHERE user_id = ? AND role LIKE "%student%"', [studentNumber]);
        const studentId = users.length > 0 ? users[0].id : null;

        // Check for duplicate enrollment
        const [existing] = await pool.query('SELECT id FROM enrollments WHERE class_id = ? AND student_number = ?', [classId, studentNumber]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Student is already enrolled in this class' });
        }

        const [insResult] = await pool.query(
            'INSERT INTO enrollments (class_id, student_id, student_number, student_name) VALUES (?, ?, ?, ?)',
            [classId, studentId, studentNumber, fullName]
        );
        const newEnrollmentId = insResult.insertId;

        // Backfill absences for past sessions
        await backfillAbsences(classId, studentId, newEnrollmentId);

        // NOTIFICATION: Notify student if they are already registered
        if (studentId) {
            try {
                // Get class and professor info
                const [classInfo] = await pool.query(`
                    SELECT c.subject_name, u.first_name, u.last_name 
                    FROM classes c 
                    JOIN users u ON c.professor_id = u.id 
                    WHERE c.id = ?
                `, [classId]);

                if (classInfo.length > 0) {
                    const { subject_name, first_name, last_name } = classInfo[0];
                    const profName = `Prof. ${first_name} ${last_name}`;
                    
                    await pool.query(
                        'INSERT INTO notifications (user_id, title, message, type, category) VALUES (?, ?, ?, ?, ?)',
                        [studentId, 'New Class Enrollment', `You have been manually added to ${subject_name} by ${profName}.`, 'info', 'class']
                    );
                }
            } catch (notifErr) {
                console.error('Failed to send manual enrollment notification:', notifErr);
            }
        }

        res.status(201).json({ message: 'Student added successfully' });
    } catch (err) {
        console.error('Add student error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Remove Student from Class
router.delete('/:id/students/:enrollmentId', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM enrollments WHERE id = ? AND class_id = ?', [req.params.enrollmentId, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student enrollment not found in this class' });
        }

        res.json({ message: 'Student removed successfully' });
    } catch (err) {
        console.error('Remove student error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Export Attendance to Excel
router.get('/:id/export-attendance', async (req, res) => {
    try {
        const classId = req.params.id;
        const { sessionIds: filteredSessionIds, enrollmentIds: filteredEnrollmentIds } = req.query; // Optional filters

        // Fetch class info
        const [classes] = await pool.query('SELECT subject_code, subject_name, section FROM classes WHERE id = ?', [classId]);
        if (classes.length === 0) return res.status(404).json({ message: 'Class not found' });
        const classInfo = classes[0];

        // Fetch sessions (filtered if provided)
        let sessionQuery = 'SELECT id, date, start_time, end_time, type FROM sessions WHERE class_id = ?';
        let sessionParams = [classId];

        if (filteredSessionIds) {
            const sidArray = String(filteredSessionIds).split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (sidArray.length > 0) {
                sessionQuery += ` AND id IN (${sidArray.map(() => '?').join(',')})`;
                sessionParams = [classId, ...sidArray];
            }
        }

        sessionQuery += ' ORDER BY date, start_time';
        const [sessions] = await pool.query(sessionQuery, sessionParams);

        // Fetch enrolled students (filtered if provided)
        let studentQuery = `
            SELECT 
                MAX(e.id) as id, 
                MAX(COALESCE(e.student_id, u.id)) as student_id, 
                MAX(COALESCE(u.first_name, SUBSTRING_INDEX(e.student_name, ' ', 1))) as first_name,
                MAX(COALESCE(u.last_name, TRIM(SUBSTRING(e.student_name, LOCATE(' ', e.student_name))))) as last_name,
                e.student_name,
                e.student_number 
             FROM enrollments e
             LEFT JOIN users u ON e.student_id = u.id OR (e.student_id IS NULL AND 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
             )
             WHERE e.class_id = ? 
        `;
        let studentParams = [classId];

        if (filteredEnrollmentIds) {
            const eidArray = String(filteredEnrollmentIds).split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (eidArray.length > 0) {
                studentQuery += ` AND id IN (${eidArray.map(() => '?').join(',')})`;
                studentParams = [classId, ...eidArray];
            }
        }

        studentQuery += ` GROUP BY student_number ORDER BY student_name`;
        const [students] = await pool.query(studentQuery, studentParams);

        // Fetch logs
        const sessionIds = sessions.map(s => s.id);
        let logs = [];
        if (sessionIds.length > 0) {
            const [logsResult] = await pool.query(
                `SELECT session_id, student_id, enrollment_id, status, time_in
                 FROM attendance_logs
                 WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
                sessionIds
            );
            logs = logsResult;
        }

        // Prepare Data for Excel
        // Build a clean date label: "Apr 16, 2026" — no session type, no time range
        const formatDateLabel = (rawDate) => {
            const d = new Date(rawDate);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        // Deduplicate column headers in case two sessions share the same date
        const sessionDateLabels = [];
        sessions.forEach(session => {
            let label = formatDateLabel(session.date);
            // If duplicate, append a counter (e.g., "Apr 16, 2026 (2)")
            let count = sessionDateLabels.filter(l => l === label || l.startsWith(label + ' (')).length;
            if (count > 0) label = `${label} (${count + 1})`;
            sessionDateLabels.push(label);
        });

        const data = students.map(student => {
            // Only Student Name — no Student Number
            const row = {
                'Student Name': student.student_name,
            };

            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            sessions.forEach((session, idx) => {
                const dateKey = sessionDateLabels[idx];

                let log = null;
                if (student.student_id) {
                    log = logs.find(l => l.session_id === session.id && l.student_id === student.student_id);
                }
                if (!log) {
                    log = logs.find(l => l.session_id === session.id && l.enrollment_id === student.id);
                }

                let status = log ? log.status : 'Absent';
                // Remap 'Not Registered' to 'Absent'
                if (status && status.toLowerCase() === 'not registered') {
                    status = 'Absent';
                }

                // Standardize and Capitalize — plain status only, no time appended
                const stringStatus = String(status || 'Absent').trim();
                const lowerStatus = stringStatus.toLowerCase();
                const displayStatus = stringStatus.charAt(0).toUpperCase() + stringStatus.slice(1).toLowerCase();

                // Show time-in for present/late, plain status for absent
                // time_in can be a Date object, "HH:MM:SS", or a full datetime string — extract HH:MM safely
                let timeLabel = '';
                if (log && log.time_in) {
                    const t = log.time_in;
                    if (t instanceof Date) {
                        // Date object: format as HH:MM
                        timeLabel = t.toTimeString().substring(0, 5);
                    } else {
                        // String: find the HH:MM pattern inside it
                        const timeMatch = String(t).match(/(\d{2}:\d{2})/);
                        timeLabel = timeMatch ? timeMatch[1] : String(t).substring(0, 5);
                    }
                }
                row[dateKey] = timeLabel ? `${displayStatus} (${timeLabel})` : displayStatus;

                // Case-insensitive count
                if (lowerStatus === 'present') {
                    presentCount++;
                } else if (lowerStatus === 'late') {
                    lateCount++;
                } else {
                    absentCount++;
                }
            });

            row['Total Present'] = presentCount;
            row['Total Late'] = lateCount;
            row['Total Absent'] = absentCount;

            // Attendance rate: present + late count as attended
            const totalSessions = sessions.length;
            const rate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;
            row['Attendance Rate (%)'] = `${rate}%`;

            return row;
        });

        // Create Workbook
        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance');

        // Generate Buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set Headers for Download
        const filename = `${classInfo.subject_code}_${classInfo.section}_Attendance.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to generate export' });
    }
});

module.exports = router;
