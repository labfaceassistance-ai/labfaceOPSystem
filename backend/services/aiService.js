const pool = require('../config/db');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * AI Service - Advanced AI Features
 * Communicates with the Python AI engine for predictive analytics and recognition.
 */
class AIService {
    /**
     * Predict student success
     */
    async predictStudentSuccess(studentId) {
        try {
            const studentData = await this.getStudentData(studentId);
            const response = await axios.post(`${AI_SERVICE_URL}/api/predict/success`, studentData);
            return response.data;
        } catch (error) {
            console.error('Error predicting student success:', error);
            throw error;
        }
    }

    /**
     * Forecast attendance for a specific class
     */
    async forecastAttendance(classId, daysAhead = 7) {
        try {
            // Fetch historical totals for this class only
            const [historicalData] = await pool.query(`
                SELECT 
                    DATE(s.date) as date, 
                    COUNT(al.id) as count
                FROM sessions s
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND (al.status = 'Present' OR al.status = 'Late')
                WHERE s.class_id = ?
                AND s.date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
                GROUP BY s.date
                ORDER BY s.date ASC
            `, [classId]);

            const response = await axios.post(`${AI_SERVICE_URL}/api/predict/attendance`,
                { historical_data: historicalData, days_ahead: daysAhead }
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
     * Get student data formatted for AI Service heuristics
     */
    async getStudentData(studentId) {
        try {
            // Get combined stats across all enrolled classes
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as total_sessions,
                    SUM(CASE WHEN al.status IN ('Present', 'Late', 'Excused') THEN 1 ELSE 0 END) as attended,
                    SUM(CASE WHEN al.status = 'Late' THEN 1 ELSE 0 END) as lates,
                    AVG(al.confidence_score) as avg_confidence
                FROM enrollments e
                JOIN sessions s ON e.class_id = s.class_id
                LEFT JOIN attendance_logs al ON s.id = al.session_id AND al.student_id = e.student_id
                WHERE e.student_id = ?
                AND s.date <= CURDATE()
                AND s.monitoring_started_at IS NOT NULL
            `, [studentId]);

            const [userInfo] = await pool.query(`
                SELECT DATEDIFF(NOW(), created_at) as days_enrolled
                FROM users
                WHERE id = ?
            `, [studentId]);

            const s = stats[0];
            const u = userInfo[0];

            return {
                student_id: studentId,
                attendance_rate: s.total_sessions > 0 ? (s.attended / s.total_sessions) * 100 : 0,
                absences: Math.max(0, s.total_sessions - s.attended),
                lates: s.lates || 0,
                days_enrolled: u.days_enrolled || 0,
                avg_confidence: s.avg_confidence || 0
            };
        } catch (error) {
            console.error('Error getting student data for AI:', error);
            throw error;
        }
    }

    /**
     * Process chatbot message
     */
    async processChatMessage(message, userId) {
        try {
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

    async getQuickReplies() {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/api/chatbot/quick-replies`);
            return response.data.quick_replies;
        } catch (error) {
            return ["How to register?", "Check attendance", "LabFace info"];
        }
    }

    async getSystemStatus() {
        try {
            // Primary endpoint for FastAPI status in this project.
            const primary = await axios.get(`${AI_SERVICE_URL}/api/status`, { timeout: 5000 });
            return { online: true, details: primary.data };
        } catch (primaryError) {
            try {
                // Backward-compat fallback for deployments exposing root status only.
                const fallback = await axios.get(`${AI_SERVICE_URL}/`, { timeout: 5000 });
                return { online: true, details: fallback.data };
            } catch (fallbackError) {
                return {
                    online: false,
                    error: primaryError.message,
                    fallbackError: fallbackError.message
                };
            }
        }
    }

    async getUserChatContext(userId) {
        try {
            // Simplified context for chatbot
            const [user] = await pool.query(`
                SELECT u.first_name, u.role
                FROM users u WHERE u.id = ?
            `, [userId]);

            return {
                name: user[0]?.first_name || 'User',
                role: user[0]?.role || 'student'
            };
        } catch (error) {
            return null;
        }
    }
}

module.exports = new AIService();
