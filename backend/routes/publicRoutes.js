const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Get current academic settings (Public)
 * GET /api/public/academic-settings
 */
router.get('/academic-settings', async (req, res) => {
    try {
        const [settings] = await pool.query(`
            SELECT 
                school_year as schoolYear,
                semester
            FROM academic_periods
            WHERE is_active = 1
            LIMIT 1
        `);

        if (settings.length === 0) {
            // Fallback default if no active period found
            return res.json({
                schoolYear: '2025-2026',
                semester: 'Current Semester'
            });
        }

        res.json(settings[0]);
    } catch (error) {
        console.error('Error fetching public academic settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
