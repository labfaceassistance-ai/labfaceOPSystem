const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * AI Routes - Advanced AI Features
 */

/**
 * GET /api/ai/status
 * Check AI service status (public endpoint)
 */
router.get('/status', async (req, res) => {
    try {
        const status = await aiService.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Error checking system status:', error);
        res.status(500).json({ error: 'Failed to check status', online: false });
    }
});

/**
 * POST /api/ai/predict/success
 * Predict student success probability
 */
router.post('/predict/success', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: 'studentId is required' });
        }

        const prediction = await aiService.predictStudentSuccess(studentId);
        res.json(prediction);
    } catch (error) {
        console.error('Error predicting success:', error);
        res.status(500).json({ error: 'Failed to predict student success' });
    }
});

/**
 * POST /api/ai/predict/attendance
 * Forecast future attendance
 */
router.post('/predict/attendance', authenticateToken, requireRole(['admin', 'professor']), async (req, res) => {
    try {
        const { courseId, daysAhead = 7 } = req.body;

        if (!courseId) {
            return res.status(400).json({ error: 'courseId is required' });
        }

        const forecast = await aiService.forecastAttendance(courseId, daysAhead);
        res.json(forecast);
    } catch (error) {
        console.error('Error forecasting attendance:', error);
        res.status(500).json({ error: 'Failed to forecast attendance' });
    }
});

/**
 * POST /api/ai/predict/risk
 * Calculate student risk score
 */
router.post('/predict/risk', authenticateToken, requireRole(['admin', 'professor']), async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: 'studentId is required' });
        }

        const risk = await aiService.calculateRiskScore(studentId);
        res.json(risk);
    } catch (error) {
        console.error('Error calculating risk:', error);
        res.status(500).json({ error: 'Failed to calculate risk score' });
    }
});

/**
 * POST /api/ai/chatbot/message
 * Process chatbot message
 */
router.post('/chatbot/message', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const response = await aiService.processChatMessage(message, userId);
        res.json(response);
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

/**
 * GET /api/ai/chatbot/quick-replies
 * Get chatbot quick reply suggestions
 */
router.get('/chatbot/quick-replies', authenticateToken, async (req, res) => {
    try {
        const replies = await aiService.getQuickReplies();
        res.json({ quick_replies: replies });
    } catch (error) {
        console.error('Error getting quick replies:', error);
        res.status(500).json({ error: 'Failed to get quick replies' });
    }
});

/**
 * POST /api/ai/emotion/detect
 * Detect emotion from image
 */
router.post('/emotion/detect', authenticateToken, requireRole(['admin', 'professor']), async (req, res) => {
    try {
        const { image, analyzeEngagement = true } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'image is required' });
        }

        const emotion = await aiService.detectEmotion(image, analyzeEngagement);
        res.json(emotion);
    } catch (error) {
        console.error('Error detecting emotion:', error);
        res.status(500).json({ error: 'Failed to detect emotion' });
    }
});

/**
 * POST /api/ai/emotion/classroom-mood
 * Analyze overall classroom mood
 */
router.post('/emotion/classroom-mood', authenticateToken, requireRole(['admin', 'professor']), async (req, res) => {
    try {
        const { emotions } = req.body;

        if (!emotions || !Array.isArray(emotions)) {
            return res.status(400).json({ error: 'emotions array is required' });
        }

        const mood = await aiService.analyzeClassroomMood(emotions);
        res.json(mood);
    } catch (error) {
        console.error('Error analyzing classroom mood:', error);
        res.status(500).json({ error: 'Failed to analyze classroom mood' });
    }
});

/**
 * GET /api/ai/student-insights/:studentId
 * Get comprehensive AI insights for a student
 */
router.get('/student-insights/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Students can only view their own insights
        if (userRole === 'student' && parseInt(studentId) !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get all AI insights
        const [prediction, risk] = await Promise.all([
            aiService.predictStudentSuccess(studentId),
            aiService.calculateRiskScore(studentId)
        ]);

        res.json({
            success_prediction: prediction,
            risk_assessment: risk
        });
    } catch (error) {
        console.error('Error getting student insights:', error);
        res.status(500).json({ error: 'Failed to get student insights' });
    }
});


/**
 * GET /api/ai/camera_status/:camera_id
 * Get specific camera connection status
 */
router.get('/camera_status/:camera_id', async (req, res) => {
    const { camera_id } = req.params;
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    console.log(`[CameraStatus] Checking CAM ${camera_id} at ${AI_SERVICE_URL}...`);

    try {
        // Use require('axios') here or move to top. For safety, keep here but it's okay.
        const axios = require('axios');
        const response = await axios.get(`${AI_SERVICE_URL}/camera_status/${camera_id}`, {
            timeout: 2000 // Reduced timeout for performance
        });
        console.log(`[CameraStatus] CAM ${camera_id} Response:`, response.status, response.data);
        res.json(response.data);
    } catch (error) {
        console.error(`[CameraStatus] Error for CAM ${camera_id}:`, error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('[CameraStatus] Connection refused. Is AI Service running?');
        }
        // Send 200 with online:false instead of crashing or 500
        res.json({
            camera_id: parseInt(camera_id) || 0,
            online: false,
            message: `Camera Check Failed: ${error.message}`
        });
    }
});

/**
 * GET /api/ai/video_feed/:camera_id
 * Proxy video feed from AI service
 */
router.get('/video_feed/:camera_id', (req, res) => {
    const { camera_id } = req.params;
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const url = `${AI_SERVICE_URL}/video_feed/${camera_id}`;
    console.log(`[VideoFeed] Proxying CAM ${camera_id} to ${url}...`);

    // Use native http/https to avoid axios buffering and timeout issues for MJPEG
    const http = require('http');
    const https = require('https');
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (proxyRes) => {
        console.log(`[VideoFeed] CAM ${camera_id} Proxy Success: ${proxyRes.statusCode}`);
        // Copy headers
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Pipe the stream directly
        proxyRes.pipe(res);
    }).on('error', (err) => {
        console.error(`[VideoFeed] Proxy error for CAM ${camera_id} (URL: ${url}):`, err.message);
        res.status(502).json({
            error: 'AI Service unreachable',
            details: err.message,
            target_url: url
        });
    });
});

module.exports = router;
