const pool = require('../config/db');

/**
 * Conflict Resolver Service
 * Handles conflict resolution for synced data
 */
class ConflictResolver {
    /**
     * Resolve attendance conflict
     * Strategy: Latest timestamp wins
     */
    async resolveAttendanceConflict(localData, remoteData) {
        try {
            // If timestamps are identical, it's likely a duplicate
            if (localData.timestamp === remoteData.timestamp) {
                console.log('⚠️ Duplicate attendance detected - skipping');
                return { action: 'skip', reason: 'duplicate' };
            }

            // Latest timestamp wins
            const winner = localData.timestamp > remoteData.timestamp ? localData : remoteData;
            const loser = winner === localData ? remoteData : localData;

            console.log(`🔄 Conflict resolved: Using ${winner === localData ? 'local' : 'remote'} data`);

            // Log the conflict
            await this.logConflict({
                type: 'attendance',
                localData,
                remoteData,
                resolution: winner === localData ? 'local' : 'remote',
                reason: 'latest_timestamp'
            });

            return {
                action: 'use',
                data: winner,
                discarded: loser
            };
        } catch (error) {
            console.error('Conflict resolution error:', error);
            throw error;
        }
    }

    /**
     * Validate sync data before processing
     */
    async validateSyncData(data) {
        const errors = [];

        // Check required fields
        if (!data.studentId && !data.professorId) {
            errors.push('Missing user ID');
        }

        if (!data.timestamp) {
            errors.push('Missing timestamp');
        }

        // Check timestamp is not in the future
        if (data.timestamp > Date.now()) {
            errors.push('Timestamp is in the future');
        }

        // Check timestamp is not too old (more than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (data.timestamp < thirtyDaysAgo) {
            errors.push('Timestamp is too old (>30 days)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check for duplicate attendance
     */
    async checkDuplicateAttendance(studentId, sessionId, timestamp) {
        try {
            // Check for attendance within 5 minutes of the timestamp
            const fiveMinutes = 5 * 60 * 1000;
            const startTime = new Date(timestamp - fiveMinutes);
            const endTime = new Date(timestamp + fiveMinutes);

            const [existing] = await pool.query(
                `SELECT id FROM attendance_logs 
                 WHERE student_id = ? 
                 AND session_id = ? 
                 AND timestamp BETWEEN ? AND ?
                 LIMIT 1`,
                [studentId, sessionId, startTime, endTime]
            );

            return existing.length > 0;
        } catch (error) {
            console.error('Duplicate check error:', error);
            return false;
        }
    }

    /**
     * Log conflict for audit trail
     */
    async logConflict(conflict) {
        try {
            await pool.query(
                `INSERT INTO sync_conflicts 
                 (type, local_data, remote_data, resolution, reason, timestamp)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [
                    conflict.type,
                    JSON.stringify(conflict.localData),
                    JSON.stringify(conflict.remoteData),
                    conflict.resolution,
                    conflict.reason
                ]
            );

            console.log('📝 Conflict logged');
        } catch (error) {
            console.error('Failed to log conflict:', error);
            // Don't throw - logging failure shouldn't stop sync
        }
    }

    /**
     * Get conflict history
     */
    async getConflictHistory(limit = 100) {
        try {
            const [conflicts] = await pool.query(
                `SELECT * FROM sync_conflicts 
                 ORDER BY timestamp DESC 
                 LIMIT ?`,
                [limit]
            );

            return conflicts;
        } catch (error) {
            console.error('Failed to get conflict history:', error);
            return [];
        }
    }
}

module.exports = new ConflictResolver();
