const pool = require('../config/db');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * AI Service - Advanced AI Features
 */
class AIService {
    /**
     * Predict student success
     */
    async predictStudentSuccess(studentId) {
        try {
            // Fetch student data
            const studentData = await this.getStudentData(studentId);

            // Call AI service
            const response = await axios.post(`${AI_SERVICE_URL}/api/predict/success`, studentData);

            return response.data;
        } catch (error) {
            console.error('Error predicting student success:', error);
            throw error;
        }
    }

    /**
     * Forecast attendance
     */
    async forecastAttendance(courseId, daysAhead = 7) {
        try {
            // Fetch historical data
            const [historicalData] = await pool.query(`
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                WHERE s.course_id = ?
                AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(time_in)
                ORDER BY date ASC
            `, [courseId]);

            // Call AI service
            const response = await axios.post(`${AI_SERVICE_URL}/api/predict/attendance`,
                historicalData,
                { params: { days_ahead: daysAhead } }
            );

            return response.data;
        } catch (error) {
            console.error('Error forecasting attendance:', error);
            throw error;
        }
    }

    /**
     * Calculate student risk score
     */
    async calculateRiskScore(studentId) {
        try {
            const studentData = await this.getStudentData(studentId);

            const response = await axios.post(`${AI_SERVICE_URL}/api/predict/risk`, studentData);

            return response.data;
        } catch (error) {
            console.error('Error calculating risk score:', error);
            throw error;
        }
    }

    /**
     * Process chatbot message
     */
    async processChatMessage(message, userId) {
        try {
            // Get user data for context
            const userData = userId ? await this.getUserChatContext(userId) : null;

            const response = await axios.post(`${AI_SERVICE_URL}/api/chatbot/message`, {
                message,
                user_id: userId,
                user_data: userData
            });

            return response.data;
        } catch (error) {
            console.error('Error processing chat message:', error);
            throw error;
        }
    }

    /**
     * Get chatbot quick replies
     */
    async getQuickReplies() {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/api/chatbot/quick-replies`);
            return response.data.quick_replies;
        } catch (error) {
            console.error('Error getting quick replies:', error);
            return [];
        }
    }

    /**
     * Detect emotion from image
     */
    async detectEmotion(imageBase64, analyzeEngagement = true) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/api/emotion/detect`, {
                image: imageBase64,
                analyze_engagement: analyzeEngagement
            });

            return response.data;
        } catch (error) {
            console.error('Error detecting emotion:', error);
            throw error;
        }
    }

    /**
     * Analyze classroom mood
     */
    async analyzeClassroomMood(emotions) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/api/emotion/classroom-mood`, {
                emotions
            });

            return response.data;
        } catch (error) {
            console.error('Error analyzing classroom mood:', error);
            throw error;
        }
    }

    /**
     * Get AI System Status
     * @returns {Promise<Object>} System status
     */
    async getSystemStatus() {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/`, {
                timeout: 15000, // 15 second timeout to handle slow CPU processing
                validateStatus: (status) => status < 500 // Accept any status < 500
            });

            return {
                online: response.status === 200,
                details: response.data,
                status_code: response.status
            };
        } catch (error) {
            console.error('AI Service Check Failed:', error.message);
            return {
                online: false,
                error: error.code === 'ECONNABORTED' ? 'Connection timeout' : error.message
            };
        }
    }

    /**
     * Get student data for predictions
     */
    async getStudentData(studentId) {
        try {
            // Get attendance stats
            const [attendanceStats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(al.id) as attended,
                    ROUND((COUNT(al.id) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 2) as attendance_rate,
                    AVG(al.confidence_score) as avg_confidence,
                    SUM(CASE WHEN TIME(al.time_in) > TIME(s.start_time) THEN 1 ELSE 0 END) as late_arrivals
                FROM users u
                JOIN students stu ON u.id = stu.user_id
                JOIN sessions s ON stu.course_id = s.course_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id AND s.id = al.session_id
                WHERE u.id = ?
                AND s.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                AND (al.id IS NULL OR al.time_in IS NOT NULL)
            `, [studentId]);

            // Get recent attendance rate (last 2 weeks)
            const [recentStats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(al.id) as attended,
                    ROUND((COUNT(al.id) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 2) as recent_attendance_rate
                FROM users u
                JOIN students stu ON u.id = stu.user_id
                JOIN sessions s ON stu.course_id = s.course_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id AND s.id = al.session_id
                WHERE u.id = ?
                AND s.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            `, [studentId]);

            // Get user info
            const [userInfo] = await pool.query(`
                SELECT DATEDIFF(NOW(), created_at) as days_enrolled
                FROM users
                WHERE id = ?
            `, [studentId]);

            const stats = attendanceStats[0];
            const recent = recentStats[0];
            const user = userInfo[0];

            // Calculate attendance trend
            const attendanceTrend = recent.recent_attendance_rate - stats.attendance_rate;

            // Calculate consistency score (variance in attendance)
            const [consistencyData] = await pool.query(`
                SELECT 
                    STDDEV(daily_attendance) as std_dev
                FROM (
                    SELECT DATE(time_in) as date, COUNT(*) as daily_attendance
                    FROM attendance_logs
                    WHERE student_id = ?
                    AND time_in >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY DATE(time_in)
                ) as daily_stats
            `, [studentId]);

            const consistencyScore = consistencyData[0].std_dev
                ? Math.max(0, 100 - (consistencyData[0].std_dev * 10))
                : 100;

            return {
                student_id: studentId,
                attendance_rate: stats.attendance_rate || 0,
                total_sessions: stats.total_sessions || 0,
                attended: stats.attended || 0,
                days_enrolled: user.days_enrolled || 0,
                recent_attendance_rate: recent.recent_attendance_rate || 0,
                avg_confidence: stats.avg_confidence || 0,
                late_arrivals: stats.late_arrivals || 0,
                attendance_trend: attendanceTrend || 0,
                consistency_score: consistencyScore || 100
            };
        } catch (error) {
            console.error('Error getting student data:', error);
            throw error;
        }
    }

    /**
     * Get user context for chatbot
     */
    async getUserChatContext(userId) {
        try {
            const [user] = await pool.query(`
                SELECT u.*, 
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(al.id) as attended,
                    ROUND((COUNT(al.id) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 2) as attendance_rate
                FROM users u
                LEFT JOIN students stu ON u.id = stu.user_id
                LEFT JOIN sessions s ON stu.course_id = s.course_id
                LEFT JOIN attendance_logs al ON u.id = al.student_id AND s.id = al.session_id
                WHERE u.id = ?
                GROUP BY u.id
            `, [userId]);

            if (!user[0]) return null;

            // Get next class
            const [nextClass] = await pool.query(`
                SELECT s.session_name, s.start_time, c.course_name
                FROM sessions s
                JOIN courses c ON s.course_id = c.id
                WHERE s.start_time > NOW()
                ORDER BY s.start_time ASC
                LIMIT 1
            `);

            // Get recent attendance
            const [recentAttendance] = await pool.query(`
                SELECT c.course_code as course, DATE(al.time_in) as date, al.status
                FROM attendance_logs al
                JOIN sessions s ON al.session_id = s.id
                JOIN courses c ON s.course_id = c.id
                WHERE al.student_id = ?
                ORDER BY al.time_in DESC
                LIMIT 5
            `, [userId]);

            return {
                attendance_rate: user[0].attendance_rate || 0,
                total_sessions: user[0].total_sessions || 0,
                attended: user[0].attended || 0,
                next_class: nextClass[0]?.course_name || 'No upcoming classes',
                next_class_time: nextClass[0]?.start_time || 'N/A',
                recent_attendance: recentAttendance || []
            };
        } catch (error) {
            console.error('Error getting user chat context:', error);
            return null;
        }
    }
}

module.exports = new AIService();
