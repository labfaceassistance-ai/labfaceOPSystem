const pool = require('../config/db');
const os = require('os');

/**
 * Monitoring Service
 * Tracks system metrics and health
 */
class MonitoringService {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
    }

    /**
     * Track a metric
     */
    async trackMetric(name, value, metadata = {}) {
        try {
            await pool.query(
                `INSERT INTO system_metrics (metric_name, metric_value, metadata, timestamp)
                 VALUES (?, ?, ?, NOW())`,
                [name, value, JSON.stringify(metadata)]
            );

            // Also store in memory for quick access
            if (!this.metrics.has(name)) {
                this.metrics.set(name, []);
            }
            this.metrics.get(name).push({ value, timestamp: Date.now(), metadata });

            // Keep only last 100 entries in memory
            if (this.metrics.get(name).length > 100) {
                this.metrics.get(name).shift();
            }
        } catch (error) {
            console.error('Error tracking metric:', error);
        }
    }

    /**
     * Get system health
     */
    async getSystemHealth() {
        try {
            const health = {
                status: 'healthy',
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                timestamp: new Date().toISOString(),
                checks: {}
            };

            // Database check
            try {
                await pool.query('SELECT 1');
                health.checks.database = { status: 'healthy', message: 'Connected' };
            } catch (error) {
                health.checks.database = { status: 'unhealthy', message: error.message };
                health.status = 'unhealthy';
            }

            // Memory check
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const memPercent = Math.round((memUsageMB / memLimitMB) * 100);

            health.checks.memory = {
                status: memPercent < 80 ? 'healthy' : 'warning',
                usage: `${memUsageMB}MB / ${memLimitMB}MB`,
                percent: memPercent
            };

            if (memPercent >= 90) {
                health.status = 'unhealthy';
            }

            // CPU check
            const cpuUsage = process.cpuUsage();
            const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000);

            health.checks.cpu = {
                status: cpuPercent < 80 ? 'healthy' : 'warning',
                usage: `${cpuPercent}%`
            };

            // Disk space check (system-wide)
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const diskPercent = Math.round((usedMem / totalMem) * 100);

            health.checks.disk = {
                status: diskPercent < 80 ? 'healthy' : 'warning',
                usage: `${Math.round(usedMem / 1024 / 1024 / 1024)}GB / ${Math.round(totalMem / 1024 / 1024 / 1024)}GB`,
                percent: diskPercent
            };

            // Recent errors check
            const [errors] = await pool.query(
                `SELECT COUNT(*) as count FROM system_logs 
                 WHERE level IN ('error', 'critical') 
                 AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`
            );

            const errorCount = errors[0].count;
            health.checks.errors = {
                status: errorCount < 10 ? 'healthy' : 'warning',
                count: errorCount,
                period: 'last hour'
            };

            if (errorCount >= 50) {
                health.status = 'unhealthy';
            }

            return health;
        } catch (error) {
            console.error('Error getting system health:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get metrics for a specific name
     */
    async getMetrics(name, limit = 100) {
        try {
            const [metrics] = await pool.query(
                `SELECT metric_value, metadata, timestamp 
                 FROM system_metrics 
                 WHERE metric_name = ? 
                 ORDER BY timestamp DESC 
                 LIMIT ?`,
                [name, limit]
            );

            return metrics;
        } catch (error) {
            console.error('Error getting metrics:', error);
            throw error;
        }
    }

    /**
     * Get error rate
     */
    async getErrorRate(period = '1 HOUR') {
        try {
            const [result] = await pool.query(
                `SELECT 
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_errors,
                    COUNT(CASE WHEN level = 'error' THEN 1 END) as errors,
                    COUNT(CASE WHEN level = 'warning' THEN 1 END) as warnings
                 FROM system_logs 
                 WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${period})`
            );

            return result[0];
        } catch (error) {
            console.error('Error getting error rate:', error);
            throw error;
        }
    }

    /**
     * Log system event
     */
    async logEvent(level, message, context = {}, userId = null) {
        try {
            await pool.query(
                `INSERT INTO system_logs (level, message, context, user_id, timestamp)
                 VALUES (?, ?, ?, ?, NOW())`,
                [level, message, JSON.stringify(context), userId]
            );
        } catch (error) {
            console.error('Error logging event:', error);
        }
    }

    /**
     * Get recent logs
     */
    async getRecentLogs(limit = 50, level = null) {
        try {
            let query = 'SELECT * FROM system_logs';
            const params = [];

            if (level) {
                query += ' WHERE level = ?';
                params.push(level);
            }

            query += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(limit);

            const [logs] = await pool.query(query, params);
            return logs;
        } catch (error) {
            console.error('Error getting recent logs:', error);
            throw error;
        }
    }

    /**
     * Send alert (placeholder - can integrate with email/SMS)
     */
    async sendAlert(type, message, severity = 'warning') {
        console.log(`[ALERT] [${severity.toUpperCase()}] ${type}: ${message}`);

        // Log the alert
        await this.logEvent(severity, `Alert: ${type}`, { message, type });

        // TODO: Integrate with email service, SMS, Slack, etc.
        // For now, just log to console and database
    }

    /**
     * Check thresholds and send alerts
     */
    async checkThresholds() {
        const health = await this.getSystemHealth();

        // Check memory
        if (health.checks.memory?.percent >= 90) {
            await this.sendAlert('High Memory Usage', `Memory usage at ${health.checks.memory.percent}%`, 'critical');
        }

        // Check errors
        if (health.checks.errors?.count >= 50) {
            await this.sendAlert('High Error Rate', `${health.checks.errors.count} errors in the last hour`, 'critical');
        }

        // Check overall health
        if (health.status === 'unhealthy') {
            await this.sendAlert('System Unhealthy', 'One or more health checks failed', 'critical');
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
        };
    }
}

module.exports = new MonitoringService();
