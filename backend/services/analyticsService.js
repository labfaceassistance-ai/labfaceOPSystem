const pool = require('../config/db');

/**
 * Analytics Service (Refactored)
 * Provides real-time, accurate attendance insights derived from sessions and logs.
 */
class AnalyticsService {
    /**
     * Get aggregate stats for a professor's dashboard
     */
    async getProfessorStats(professorPk) {
        try {
            // 1. Get active class IDs
            const [classes] = await pool.query(
                'SELECT id FROM classes WHERE professor_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
                [professorPk]
            );
            
            if (classes.length === 0) return { totalStudents: 0, activeClasses: 0, avgAttendance: 0, attendanceGrowth: 0 };
            const classIds = classes.map(c => c.id);

            // 2. Count unique students
            const [enrollments] = await pool.query(
                `SELECT COUNT(DISTINCT student_number) as count FROM enrollments WHERE class_id IN (${classIds.map(() => '?').join(',')})`,
                classIds
            );

            // 3. Calculate Average Attendance Rate
            // (Total Present/Late/Excused / Total expected appearances in past sessions)
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(al.id) as attended_count,
                    (
                        SELECT SUM(student_count * session_count)
                        FROM (
                            SELECT 
                                (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as student_count,
                                (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND (s.monitoring_ended_at IS NOT NULL OR s.date <= CURDATE())) as session_count
                            FROM classes c
                            WHERE c.id IN (${classIds.map(() => '?').join(',')})
                        ) as class_aggregates
                    ) as total_expected
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.class_id IN (${classIds.map(() => '?').join(',')})
                AND (al.status = 'Present' OR al.status = 'Late' OR al.status = 'Excused')
            `, [...classIds, ...classIds]);

            const totalAttended = stats[0].attended_count || 0;
            const totalExpected = stats[0].total_expected || 0;
            const avgAttendance = totalExpected > 0 ? (totalAttended / totalExpected) * 100 : 0;

            // 4. Calculate Growth (This week vs Last week)
            const [currentWeek] = await pool.query(`
                SELECT COUNT(*) as count FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.class_id IN (${classIds.map(() => '?').join(',')})
                AND al.time_in >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND (al.status = 'Present' OR al.status = 'Late')
            `, classIds);

            const [lastWeek] = await pool.query(`
                SELECT COUNT(*) as count FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.class_id IN (${classIds.map(() => '?').join(',')})
                AND al.time_in BETWEEN DATE_SUB(NOW(), INTERVAL 14 DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND (al.status = 'Present' OR al.status = 'Late')
            `, classIds);

            const currCount = currentWeek[0].count;
            const prevCount = lastWeek[0].count;
            let growth = 0;
            if (prevCount > 0) {
                growth = ((currCount - prevCount) / prevCount) * 100;
            } else if (currCount > 0) {
                growth = 100; // First week growth
            }

            return {
                totalStudents: enrollments[0].count,
                activeClasses: classes.length,
                avgAttendance: Math.round(avgAttendance * 10) / 10,
                attendanceGrowth: Math.round(growth * 10) / 10
            };
        } catch (error) {
            console.error('[Analytics] Professor Stats Error:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive AI insights for a specific student
     */
    async getStudentInsights(studentPk) {
        try {
            // 1. Get Overall Rate & Streak
            const [logs] = await pool.query(`
                SELECT al.status, s.date, s.start_time
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE al.student_id = ?
                ORDER BY s.date DESC, s.start_time DESC
            `, [studentPk]);

            // Calculate Streak
            let streak = 0;
            for (const log of logs) {
                if (log.status === 'Present' || log.status === 'Late') {
                    streak++;
                } else {
                    break;
                }
            }

            // 2. Fetch Global Rate
            const [summary] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as total_past_sessions,
                    SUM(CASE WHEN al.status IN ('Present', 'Late', 'Excused') THEN 1 ELSE 0 END) as attended_count
                FROM enrollments e
                JOIN sessions s ON e.class_id = s.class_id
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e.student_id
                WHERE e.student_id = ?
                AND (s.monitoring_ended_at IS NOT NULL OR s.date < CURDATE())
            `, [studentPk]);

            const total = summary[0].total_past_sessions || 0;
            const attended = summary[0].attended_count || 0;
            const rate = total > 0 ? (attended / total) * 100 : 0;

            // 3. Trend (Last 5 sessions vs Previous 5)
            const last5 = logs.slice(0, 5);
            const prev5 = logs.slice(5, 10);
            
            const last5Rate = last5.length > 0 ? (last5.filter(l => ['Present', 'Late', 'Excused'].includes(l.status)).length / last5.length) * 100 : 0;
            const prev5Rate = prev5.length > 0 ? (prev5.filter(l => ['Present', 'Late', 'Excused'].includes(l.status)).length / prev5.length) * 100 : 0;
            
            let trend = 'stable';
            let trendPercentage = 0;
            if (prev5Rate > 0) {
                trendPercentage = Math.round(last5Rate - prev5Rate);
                if (trendPercentage > 5) trend = 'up';
                else if (trendPercentage < -5) trend = 'down';
            }

            // 4. Calculate Risk & Classes Needed
            const targetRate = 75;
            let classesNeeded = 0;
            if (rate < targetRate && total > 0) {
                // (attended + X) / (total + X) = 0.75
                // attended + X = 0.75 * total + 0.75 * X
                // 0.25 * X = 0.75 * total - attended
                // X = (0.75 * total - attended) / 0.25
                classesNeeded = Math.ceil((0.75 * total - attended) / 0.25);
            }

            const riskLevel = rate >= 85 ? 'low' : rate >= 75 ? 'medium' : 'high';

            // 5. Monthly Data
            const [monthly] = await pool.query(`
                SELECT 
                    DATE_FORMAT(s.date, '%b') as month,
                    COUNT(DISTINCT s.id) as total,
                    SUM(CASE WHEN al.status IN ('Present', 'Late', 'Excused') THEN 1 ELSE 0 END) as attended
                FROM enrollments e
                JOIN sessions s ON e.class_id = s.class_id
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e.student_id
                WHERE e.student_id = ?
                AND s.date <= CURDATE()
                GROUP BY month
                ORDER BY MIN(s.date) ASC
                LIMIT 6
            `, [studentPk]);

            const monthlyData = monthly.map(m => ({
                month: m.month,
                attended: parseInt(m.attended),
                total: parseInt(m.total),
                rate: m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0
            }));

            // 6. Percentile (Rank against other students in the same classes)
            // For simplicity, we compare their overall rate with others
            const [classPeers] = await pool.query(`
                SELECT 
                    e2.student_id,
                    COUNT(DISTINCT s.id) as total,
                    SUM(CASE WHEN al.status IN ('Present', 'Late', 'Excused') THEN 1 ELSE 0 END) as attended
                FROM enrollments e1
                JOIN enrollments e2 ON e1.class_id = e2.class_id
                JOIN sessions s ON e2.class_id = s.class_id
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e2.student_id
                WHERE e1.student_id = ?
                AND s.date < CURDATE()
                GROUP BY e2.student_id
            `, [studentPk]);

            const peerRates = classPeers.map(p => (p.attended / (p.total || 1)) * 100).sort((a,b) => a-b);
            const myRate = (attended / total) * 100;
            const rank = peerRates.filter(r => r < myRate).length;
            const percentile = peerRates.length > 0 ? Math.round((rank / peerRates.length) * 100) : 100;

            // 7. Recommendations
            const recommendations = [];
            if (riskLevel === 'high') recommendations.push("Urgent: Your attendance is below the 75% threshold. Please attend all remaining classes.");
            if (trend === 'down') recommendations.push("Your attendance has dropped recently. Try to maintain a consistent schedule.");
            if (streak > 0) recommendations.push(`Awesome! You're on a ${streak}-session streak. Keep it up!`);
            if (rate > 90) recommendations.push("Excellent work! You're one of the top performers in your class.");
            if (classesNeeded > 0) recommendations.push(`Target: Attend at least ${classesNeeded} more consecutive classes to reach safe standing.`);

            return {
                streak,
                trend,
                trendPercentage: Math.abs(trendPercentage),
                riskLevel,
                attendanceRate: Math.round(rate),
                percentile,
                predictions: {
                    passLikelihood: Math.round(rate), // Simplified for now
                    classesNeeded
                },
                recommendations: recommendations.length > 0 ? recommendations : ["Maintain your current attendance to stay on track."],
                monthlyData
            };
        } catch (error) {
            console.error('[Analytics] Student Insights Error:', error);
            throw error;
        }
    }

    /**
     * Get Class Health for Professor Insights
     */
    async getClassHealth(professorPk) {
        try {
            const [classes] = await pool.query(`
                SELECT 
                    c.id, 
                    c.subject_code,
                    (
                        SELECT COUNT(al.id) 
                        FROM attendance_logs al 
                        JOIN sessions s ON al.session_id = s.id 
                        WHERE s.class_id = c.id AND al.time_in >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                    ) as recent_count,
                    (
                        SELECT COUNT(DISTINCT e.id) FROM enrollments e WHERE e.class_id = c.id
                    ) * (
                        SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id AND s.date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND s.date <= CURDATE()
                    ) as expected_count
                FROM classes c
                WHERE c.professor_id = ? AND (c.is_archived = 0 OR c.is_archived IS NULL)
            `, [professorPk]);

            return classes.map(cls => {
                const rate = cls.expected_count > 0 ? (cls.recent_count / cls.expected_count) * 100 : 0;
                return {
                    id: cls.id,
                    subjectCode: cls.subject_code,
                    health: rate >= 85 ? 'Good' : rate >= 70 ? 'Fair' : 'Critical',
                    rate: Math.round(rate)
                };
            });
        } catch (error) {
            console.error('[Analytics] Class Health Error:', error);
            return [];
        }
    }

    /**
     * Session Optimization (Best day/time)
     */
    async getSessionOptimization(professorPk) {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    DAYNAME(s.date) as day,
                    AVG(attended_count / student_count * 100) as avg_rate
                FROM sessions s
                JOIN classes c ON s.class_id = c.id
                JOIN (
                    SELECT session_id, COUNT(*) as attended_count 
                    FROM attendance_logs 
                    WHERE status IN ('Present', 'Late') 
                    GROUP BY session_id
                ) al ON s.id = al.session_id
                JOIN (
                    SELECT class_id, COUNT(*) as student_count 
                    FROM enrollments 
                    GROUP BY class_id
                ) e ON c.id = e.class_id
                WHERE c.professor_id = ?
                GROUP BY day
                ORDER BY avg_rate DESC
            `, [professorPk]);

            return stats.map(s => ({
                day: s.day,
                rate: Math.round(s.avg_rate)
            }));
        } catch (error) {
            return [];
        }
    }
}

module.exports = new AnalyticsService();
