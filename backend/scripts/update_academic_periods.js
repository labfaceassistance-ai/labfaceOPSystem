const dotenv = require('dotenv');
const path = require('path');

// Load environment variables for standalone execution
dotenv.config({ path: path.join(__dirname, '../../.env.prod') });

const pool = require('../config/db');

async function updateAcademicPeriods() {
    console.log('[Data Migration] Updating academic periods to use descriptive strings...');

    try {
        // 1. Identify active period
        const [activePeriods] = await pool.query('SELECT * FROM academic_periods WHERE is_active = 1');

        if (activePeriods.length === 0) {
            console.log('[Data Migration] No active academic period found to update.');
            process.exit(0);
        }

        const active = activePeriods[0];
        console.log(`[Data Migration] Current active period: ${active.school_year} ${active.semester}`);

        // 2. Perform updates to ensure descriptive strings (e.g. 2 -> Second Semester, 2526 -> 2025-2026)
        // This fixes the "2", "3", "4" folders in MinIO

        let newYear = active.school_year;
        let newSem = active.semester;

        // Year Logic
        if (newYear === '2526' || newYear === '20252026') {
            newYear = '2025-2026';
        } else if (newYear.length === 1) {
            // Probably an ID was used instead of string
            newYear = '2025-2026'; // Default to current assumed context
        }

        // Semester Logic
        if (newSem === '1' || newSem === 'First' || newSem.toLowerCase() === 'first semester') {
            newSem = 'First Semester';
        } else if (newSem === '2' || newSem === 'Second' || newSem.toLowerCase() === 'second semester') {
            newSem = 'Second Semester';
        } else if (newSem === '3' || newSem.toLowerCase().includes('summer')) {
            newSem = 'Summer';
        }

        if (newYear !== active.school_year || newSem !== active.semester) {
            console.log(`[Data Migration] Updating to: ${newYear} ${newSem}`);
            await pool.query(
                'UPDATE academic_periods SET school_year = ?, semester = ? WHERE id = ?',
                [newYear, newSem, active.id]
            );
            console.log('[Data Migration] Update successful!');
        } else {
            console.log('[Data Migration] Period is already using descriptive strings.');
        }

        process.exit(0);
    } catch (err) {
        console.error('[Data Migration] ERROR:', err.message);
        process.exit(1);
    }
}

updateAcademicPeriods();
