const pool = require('../config/db');
const { templates } = require('../utils/notificationHelper');

class AttendanceWarningService {

    // Calculate equivalent absences: 3 Lates = 1 Absent (now recorded directly)
    // So equivalent absences is simply the absent count.
    calculateEquivalentAbsences(lateCount, absentCount) {
        return absentCount;
    }

    determineWarningLevel(lateCount, absentCount, isConverted = false) {
        const equivalent = this.calculateEquivalentAbsences(lateCount, absentCount);

        if (equivalent >= 3) return 'dropout_warning';
        if (equivalent >= 2) return 'absence_warning';

        // Trigger conversion alert if this record was just converted
        if (isConverted) return 'late_threshold';

        // 2 lates warning (2, 5, 8...)
        // Since 3rd becomes absent, lateCount will be 2, 4, 6...
        // 1st cycle: 2 lates. 2 % 2 == 0? No, let's use the actual count.
        // If we have 2 lates and 0 absents -> incoming warning.
        // If we have 4 lates and 1 absent -> incoming warning.
        // Pattern: lateCount is 2, 4, 6...
        if (lateCount > 0 && lateCount % 2 === 0 && (lateCount / 2) === (absentCount + 1)) {
            return 'incoming_absence_warning';
        }

        return null;
    }

    // Main function to check status and trigger warnings if needed
    async checkAndNotify(studentId, classId, isConverted = false) {
        try {
            // 1. Get current counts
            const counts = await this.getAttendanceCounts(studentId, classId);
            const { late_count, absent_count, excused_count } = counts;

            // 2. Determine implied warning level
            const warningType = this.determineWarningLevel(late_count, absent_count, isConverted);
            if (!warningType) return; // No warning needed

            // 3. Check if we already have an active warning of this type or higher
            // (Simplification: just check if we processed this specific threshold recently? 
            // Better: Check if the current state has already been warned.)

            // For now, let's allow re-warning if the counts have changed since the last warning?
            // A simple approach: Check the active/unresolved warnings.
            // But 'late_threshold' might happen multiple times (3, 6, 9).
            // 'absence_warning' (2) happens once. 'dropout_warning' (3+) happens once (until resolved?).

            // Let's check the existing Active warnings.
            const existing = await this.getActiveWarning(studentId, classId, warningType);

            const equivalent = this.calculateEquivalentAbsences(late_count, absent_count);

            // Logic to prevent spam:
            if (existing) {
                // If we already have this warning, do we need to update?
                if (warningType === 'dropout_warning' || warningType === 'absence_warning') {
                    return;
                }
                // For late_threshold and incoming_absence_warning, we want to warn at each cycle
                if (warningType === 'late_threshold' || warningType === 'incoming_absence_warning') {
                    if (existing.late_count === late_count) return; // Already warned for this count
                }
            }

            // 4. Determine context data (names)
            const context = await this.getContextData(studentId, classId);
            if (!context) return;

            // 5. Create Warning Record
            await this.createWarning(studentId, classId, warningType, counts, equivalent);

            // 6. Send Notifications
            await this.sendNotifications(studentId, context, warningType, counts, equivalent);

        } catch (error) {
            console.error('[WarningService] Error:', error);
        }
    }

    // Perform audit for the entire class (useful after session stops)
    async checkAndNotifyClass(classId) {
        try {
            // 1. Get all students in this class with their counts
            // Note: We count a session as an absence if there's no log (al.id IS NULL)
            const [students] = await pool.query(`
                SELECT 
                    e.student_id,
                    u.first_name, u.last_name,
                    c.subject_code, c.subject_name, c.professor_id,
                    SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                    SUM(CASE WHEN al.status = 'Absent' OR (al.id IS NULL AND s.id IS NOT NULL) THEN 1 ELSE 0 END) as absent_count
                FROM enrollments e
                JOIN users u ON e.student_id = u.id
                JOIN classes c ON e.class_id = c.id
                JOIN sessions s ON e.class_id = s.class_id
                    AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = u.id
                    AND al.status NOT LIKE 'Log%' AND al.status != 'Unknown'
                WHERE e.class_id = ?
                GROUP BY e.student_id
            `, [classId]);

            for (const s of students) {
                const late_count = parseInt(s.late_count || 0);
                const absent_count = parseInt(s.absent_count || 0);
                const counts = { late_count, absent_count, excused_count: 0 }; 

                const warningType = this.determineWarningLevel(late_count, absent_count, false);
                if (!warningType) continue;

                const existing = await this.getActiveWarning(s.student_id, classId, warningType);
                const equivalent = this.calculateEquivalentAbsences(late_count, absent_count);

                if (existing) {
                    if (warningType === 'dropout_warning' || warningType === 'absence_warning') continue;
                    if ((warningType === 'late_threshold' || warningType === 'incoming_absence_warning') && existing.late_count === late_count) continue;
                }

                const context = {
                    first_name: s.first_name,
                    last_name: s.last_name,
                    subject_code: s.subject_code,
                    subject_name: s.subject_name,
                    professor_id: s.professor_id
                };

                await this.createWarning(s.student_id, classId, warningType, counts, equivalent);
                await this.sendNotifications(s.student_id, context, warningType, counts, equivalent);
            }
        } catch (error) {
            console.error('[WarningService] Class Audit Error:', error);
        }
    }

    async getAttendanceCounts(studentId, classId) {
        const [rows] = await pool.query(`
            SELECT 
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused_count
            FROM attendance_logs
            JOIN sessions s ON session_id = s.id
            JOIN enrollments e ON enrollment_id = e.id
            WHERE e.student_id = ? AND s.class_id = ?
        `, [studentId, classId]);

        return {
            late_count: parseInt(rows[0].late_count || 0),
            absent_count: parseInt(rows[0].absent_count || 0),
            excused_count: parseInt(rows[0].excused_count || 0)
        };
    }

    async getActiveWarning(studentId, classId, type) {
        const [rows] = await pool.query(`
            SELECT * FROM attendance_warnings 
            WHERE student_id = ? AND class_id = ? AND warning_type = ? AND is_resolved = FALSE
            ORDER BY triggered_at DESC LIMIT 1
        `, [studentId, classId, type]);
        return rows[0];
    }

    async getContextData(studentId, classId) {
        const [rows] = await pool.query(`
            SELECT 
                u.first_name, u.last_name, 
                c.subject_code, c.subject_name, c.professor_id
            FROM users u, classes c
            WHERE u.id = ? AND c.id = ?
        `, [studentId, classId]);
        return rows[0];
    }

    async createWarning(studentId, classId, type, counts, equivalent) {
        await pool.query(`
            INSERT INTO attendance_warnings 
            (student_id, class_id, warning_type, late_count, absent_count, excused_count, equivalent_absences)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [studentId, classId, type, counts.late_count, counts.absent_count, counts.excused_count, equivalent]);
    }

    async sendNotifications(studentId, context, type, counts, equivalent) {
        const template = templates[type];
        if (!template) return;

        const studentName = `${context.first_name} ${context.last_name}`;
        const className = context.subject_code; // e.g. "IT101"

        // Student Notification
        if (template.student) {
            const msg = typeof template.student.message === 'function'
                ? template.student.message(className, type === 'late_threshold' ? counts.late_count : equivalent, counts.excused_count)
                : template.student.message;

            await this.createNotification(studentId, template.student.title, msg, template.student.type, template.student.category);
        }

        // Professor Notification
        if (template.professor) {
            const msg = typeof template.professor.message === 'function'
                ? template.professor.message(studentName, className, type === 'late_threshold' ? counts.late_count : equivalent)
                : template.professor.message;

            await this.createNotification(context.professor_id, template.professor.title, msg, template.professor.type, template.professor.category);
        }
    }

    async createNotification(userId, title, message, type, category) {
        await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, category)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, title, message, type, category]);
    }

    // Called when an excuse is approved
    async recalculateWarnings(studentId, classId) {
        // Logic: active warnings might need to be resolved if thresholds are no longer met
        const warnings = await this.getActiveWarnings(studentId, classId); // fetch all active
        const counts = await this.getAttendanceCounts(studentId, classId);
        const equivalent = this.calculateEquivalentAbsences(counts.late_count, counts.absent_count);

        for (const w of warnings) {
            let shouldResolve = false;

            if (w.warning_type === 'dropout_warning' && equivalent < 3) shouldResolve = true;
            else if (w.warning_type === 'absence_warning' && equivalent < 2) shouldResolve = true;
            else if (w.warning_type === 'late_threshold') {
                // If lates reduced below the threshold that triggered it? 
                // Difficult to track exactly which threshold. 
                // But generally, if equivalent drops, we resolve.
                // Or if late_count drops below the warning's recorded late_count?
                if (counts.late_count < w.late_count) shouldResolve = true;
            }

            if (shouldResolve) {
                await pool.query(`UPDATE attendance_warnings SET is_resolved = TRUE, resolved_at = NOW(), notes = 'Resolved via recalculation (excuse)' WHERE id = ?`, [w.id]);
            }
        }
    }

    async getActiveWarnings(studentId, classId) {
        const [rows] = await pool.query(`
            SELECT * FROM attendance_warnings 
            WHERE student_id = ? AND class_id = ? AND is_resolved = FALSE
        `, [studentId, classId]);
        return rows;
    }
}

module.exports = new AttendanceWarningService();
