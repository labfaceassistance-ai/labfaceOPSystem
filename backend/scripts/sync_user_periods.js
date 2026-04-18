const pool = require('../config/db');
const verificationService = require('../services/verificationService');

/**
 * Retrospective Sync Script
 * 
 * This script identifies students who have already uploaded a COR for a future semester
 * (e.g., 2025-2026 2nd Semester) but were tagged with the previous period ID because
 * the system hadn't transitioned yet at the time of their registration.
 */
async function syncUserPeriods() {
    console.log('--- Starting Retrospective Period Sync ---');
    
    try {
        // 1. Fetch academic periods for lookup
        const [periods] = await pool.query("SELECT id, school_year, semester FROM academic_periods");
        console.log(`Loaded ${periods.length} academic periods.`);

        // 2. Fetch recent verification logs with extracted data
        const [logs] = await pool.query(`
            SELECT id, user_id, extracted_data 
            FROM verification_logs 
            WHERE verification_type = 'cor' 
            AND verification_result = 'pass'
            AND extracted_data IS NOT NULL
            ORDER BY created_at DESC
        `);
        console.log(`Found ${logs.length} successful COR verification logs.`);

        let syncCount = 0;

        for (const log of logs) {
            try {
                const data = JSON.parse(log.extracted_data);
                const { extractedAY, extractedTerm } = data;

                if (!extractedAY || !extractedTerm) continue;

                // Resolve period from log data
                const resolvedPeriodId = await verificationService.resolveAcademicPeriod(extractedAY, extractedTerm);
                
                if (resolvedPeriodId) {
                    // Update the user's last_verified_period_id
                    const [res] = await pool.query(
                        "UPDATE users SET last_verified_period_id = ? WHERE id = ? AND (last_verified_period_id != ? OR last_verified_period_id IS NULL)",
                        [resolvedPeriodId, log.user_id, resolvedPeriodId]
                    );

                    if (res.affectedRows > 0) {
                        console.log(`[Sync] Updated User ${log.user_id} to Period ${resolvedPeriodId} (Found ${extractedAY} ${extractedTerm} in logs)`);
                        syncCount++;
                    }
                }
            } catch (parseErr) {
                console.warn(`Failed to process log ${log.id}:`, parseErr.message);
            }
        }

        console.log(`\n--- Sync Complete ---`);
        console.log(`Total users synced: ${syncCount}`);
        
    } catch (error) {
        console.error('Sync process failed:', error);
    } finally {
        process.exit();
    }
}

syncUserPeriods();
