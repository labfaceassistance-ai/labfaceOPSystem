const pool = require('../config/db');
const { templates } = require('../utils/notificationHelper');

class AttendanceWarningService {

    // Calculate equivalent absences: 3 Lates = 1 Absent + Actual Absences
    calculateEquivalentAbsences(lateCount, absentCount) {
        const lateEquivalent = Math.floor(lateCount / 3);
        return absentCount + lateEquivalent;
    }

    // Determine the highest priority warning level based on counts
    determineWarningLevel(lateCount, absentCount) {
        const equivalent = this.calculateEquivalentAbsences(lateCount, absentCount);

        if (equivalent >= 3) return 'dropout_warning';
        if (equivalent >= 2) return 'absence_warning';
        if (lateCount >= 3 && lateCount % 3 === 0) return 'late_threshold';

        return null;
    }

    // Main function to check status and trigger warnings if needed
    async checkAndNotify(studentId, classId) {
        try {
            // 1. Get current counts
            const counts = await this.getAttendanceCounts(studentId, classId);
            const { late_count, absent_count, excused_count } = counts;

            // 2. Determine implied warning level
            const warningType = this.determineWarningLevel(late_count, absent_count);
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
                // For dropout, maybe reminder? For now, skip if exists.
                if (warningType === 'dropout_warning' || warningType === 'absence_warning') {
                    // Maybe update the counts but don't re-notify immediately?
                    return;
                }
                // For late_threshold, we want to warn at 3, 6, 9...
                // existing.late_count might be 3. current is 6.
                if (warningType === 'late_threshold') {
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
