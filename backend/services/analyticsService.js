const pool = require('../config/db');

/**
 * Analytics Service
 * Provides data analytics and insights for the LabFace system
 */
class AnalyticsService {
    /**
     * Get dashboard overview statistics
     */
    async getOverview() {
        try {
            const [totalStudents] = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE role = "student"'
            );

            const [totalProfessors] = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE role = "professor"'
            );

            const today = new Date().toISOString().split('T')[0];
            const [attendanceToday] = await pool.query(
                'SELECT COUNT(*) as count FROM attendance_logs WHERE DATE(timestamp) = ?',
                [today]
            );

            const [avgAttendanceRate] = await pool.query(`
                SELECT 
                    ROUND((COUNT(DISTINCT al.student_id) / COUNT(DISTINCT u.id)) * 100, 2) as rate
                FROM users u
                LEFT JOIN attendance_logs al ON u.id = al.student_id AND DATE(al.timestamp) = ?
                WHERE u.role = 'student'
            `, [today]);

            const [activeSessions] = await pool.query(
                'SELECT COUNT(DISTINCT session_id) as count FROM attendance_logs WHERE DATE(timestamp) = ?',
                [today]
            );

            return {
                totalStudents: totalStudents[0].count,
                totalProfessors: totalProfessors[0].count,
                attendanceToday: attendanceToday[0].count,
                avgAttendanceRate: avgAttendanceRate[0].rate || 0,
                activeSessions: activeSessions[0].count
            };
        } catch (error) {
            console.error('Error getting overview:', error);
            throw error;
        }
    }

    /**
     * Get attendance trends over time
     */
    async getAttendanceTrends(startDate, endDate, groupBy = 'day') {
        try {
            let dateFormat;
            switch (groupBy) {
                case 'hour':
                    dateFormat = '%Y-%m-%d %H:00:00';
                    break;
                case 'day':
                    dateFormat = '%Y-%m-%d';
                    break;
                case 'week':
                    dateFormat = '%Y-%u';
                    break;
                case 'month':
                    dateFormat = '%Y-%m';
                    break;
                default:
                    dateFormat = '%Y-%m-%d';
            }

            const [trends] = await pool.query(`
                SELECT 
                    DATE_FORMAT(timestamp, ?) as period,
                    COUNT(*) as attendance_count,
                    COUNT(DISTINCT student_id) as unique_students
                FROM attendance_logs
                WHERE DATE(timestamp) BETWEEN ? AND ?
                GROUP BY period
                ORDER BY period ASC
            `, [dateFormat, startDate, endDate]);

            return trends;
        } catch (error) {
            console.error('Error getting attendance trends:', error);
            throw error;
        }
    }

    /**
     * Get course statistics
     */
    async getCourseStatistics(startDate, endDate) {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    c.course_code,
                    c.course_name,
                    COUNT(DISTINCT al.student_id) as total_students,
                    COUNT(al.id) as total_attendance,
                    ROUND(AVG(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END) * 100, 2) as attendance_rate
                FROM courses c
                LEFT JOIN sessions s ON c.id = s.course_id
                LEFT JOIN attendance_logs al ON s.id = al.session_id
                WHERE DATE(al.timestamp) BETWEEN ? AND ?
                GROUP BY c.id, c.course_code, c.course_name
                ORDER BY attendance_rate DESC
            `, [startDate, endDate]);

            return stats;
        } catch (error) {
            console.error('Error getting course statistics:', error);
            throw error;
        }
    }

    /**
     * Get student insights
     */
    async getStudentInsights(limit = 10) {
        try {
            // Top performers
            const [topPerformers] = await pool.query(`
                SELECT 
                    u.id,
                    u.student_id,
                    CONCAT(u.first_name, ' ', u.last_name) as name,
                    COUNT(al.id) as attendance_count,
                    ROUND(
                        (COUNT(al.id) / NULLIF(
                            (SELECT COUNT(DISTINCT s.id) 
                             FROM sessions s 
                             JOIN students st ON s.course_id = st.course_id 
                             WHERE st.user_id = u.id),
                        0)) * 100, 
                    2) as attendance_rate
                FROM users u
                JOIN students stu ON u.id = stu.user_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id
                WHERE u.role = 'student'
                GROUP BY u.id
                ORDER BY attendance_rate DESC, attendance_count DESC
                LIMIT ?
            `, [limit]);

            // At-risk students (low attendance)
            const [atRiskStudents] = await pool.query(`
                SELECT 
                    u.id,
                    u.student_id,
                    CONCAT(u.first_name, ' ', u.last_name) as name,
                    COUNT(al.id) as attendance_count,
                    ROUND(
                        (COUNT(al.id) / NULLIF(
                            (SELECT COUNT(DISTINCT s.id) 
                             FROM sessions s 
                             JOIN students st ON s.course_id = st.course_id 
                             WHERE st.user_id = u.id),
                        0)) * 100, 
                    2) as attendance_rate
                FROM users u
                JOIN students stu ON u.id = stu.user_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id
                WHERE u.role = 'student'
                GROUP BY u.id
                HAVING attendance_rate < 75
                ORDER BY attendance_rate ASC
                LIMIT ?
            `, [limit]);

            // Perfect attendance
            const [perfectAttendance] = await pool.query(`
                SELECT 
                    u.id,
                    u.student_id,
                    CONCAT(u.first_name, ' ', u.last_name) as name,
                    COUNT(al.id) as attendance_count
                FROM users u
                JOIN students stu ON u.id = stu.user_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id
                WHERE u.role = 'student'
                GROUP BY u.id
                HAVING attendance_count = (
                    SELECT COUNT(DISTINCT s.id) 
                    FROM sessions s 
                    JOIN students st ON s.course_id = st.course_id 
                    WHERE st.user_id = u.id
                ) AND attendance_count > 0
            `);

            return {
                topPerformers,
                atRiskStudents,
                perfectAttendance
            };
        } catch (error) {
            console.error('Error getting student insights:', error);
            throw error;
        }
    }

    /**
     * Get system health metrics
     */
    async getSystemHealth() {
        try {
            // Face recognition accuracy (last 7 days)
            const [faceRecognition] = await pool.query(`
                SELECT 
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN confidence > 0.8 THEN 1 ELSE 0 END) as successful,
                    ROUND(AVG(confidence) * 100, 2) as avg_confidence
                FROM attendance_logs
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `);

            // Liveness detection rate
            const [liveness] = await pool.query(`
                SELECT 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN liveness_passed = 1 THEN 1 ELSE 0 END) as passed,
                    ROUND((SUM(CASE WHEN liveness_passed = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                FROM attendance_logs
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND liveness_passed IS NOT NULL
            `);

            // Sync queue status
            const [syncQueue] = await pool.query(`
                SELECT COUNT(*) as pending_operations
                FROM sync_conflicts
                WHERE resolved = FALSE
            `);

            // Recent errors
            const [errors] = await pool.query(`
                SELECT COUNT(*) as error_count
                FROM system_logs
                WHERE level = 'error'
                AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            return {
                faceRecognition: {
                    totalAttempts: faceRecognition[0]?.total_attempts || 0,
                    successful: faceRecognition[0]?.successful || 0,
                    avgConfidence: faceRecognition[0]?.avg_confidence || 0
                },
                liveness: {
                    totalChecks: liveness[0]?.total_checks || 0,
                    passed: liveness[0]?.passed || 0,
                    passRate: liveness[0]?.pass_rate || 0
                },
                syncQueue: {
                    pendingOperations: syncQueue[0]?.pending_operations || 0
                },
                errors: {
                    last24Hours: errors[0]?.error_count || 0
                }
            };
        } catch (error) {
            console.error('Error getting system health:', error);
            throw error;
        }
    }

    /**
     * Get peak usage times
     */
    async getPeakUsageTimes(startDate, endDate) {
        try {
            const [peakTimes] = await pool.query(`
                SELECT 
                    HOUR(timestamp) as hour,
                    DAYOFWEEK(timestamp) as day_of_week,
                    COUNT(*) as attendance_count
                FROM attendance_logs
                WHERE DATE(timestamp) BETWEEN ? AND ?
                GROUP BY hour, day_of_week
                ORDER BY attendance_count DESC
                LIMIT 10
            `, [startDate, endDate]);

            return peakTimes.map(pt => ({
                hour: pt.hour,
                dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pt.day_of_week - 1],
                count: pt.attendance_count
            }));
        } catch (error) {
            console.error('Error getting peak usage times:', error);
            throw error;
        }
    }

    /**
     * Get attendance comparison (current vs previous period)
     */
    async getAttendanceComparison(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            const prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - daysDiff);
            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);

            const [current] = await pool.query(
                'SELECT COUNT(*) as count FROM attendance_logs WHERE DATE(timestamp) BETWEEN ? AND ?',
                [startDate, endDate]
            );

            const [previous] = await pool.query(
                'SELECT COUNT(*) as count FROM attendance_logs WHERE DATE(timestamp) BETWEEN ? AND ?',
                [prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]
            );

            const currentCount = current[0].count;
            const previousCount = previous[0].count;
            const change = previousCount > 0
                ? ((currentCount - previousCount) / previousCount) * 100
                : 0;

            return {
                current: currentCount,
                previous: previousCount,
                change: Math.round(change * 100) / 100,
                trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
            };
        } catch (error) {
            console.error('Error getting attendance comparison:', error);
            throw error;
        }
    }
}

module.exports = new AnalyticsService();
