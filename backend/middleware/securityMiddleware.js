const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for admin login endpoint
 * Prevents brute force attacks by limiting login attempts
 */
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests
    skipFailedRequests: false, // Count failed requests
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
            retryAfter: 15 * 60
        });
    }
});

/**
 * Rate limiter for sensitive admin operations
 * (bulk approve/reject, user deactivation, etc.)
 */
const adminOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 operations per windowMs
    message: {
        message: 'Too many operations. Please slow down.',
        retryAfter: 5 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many operations. Please slow down and try again in a few minutes.',
            retryAfter: 5 * 60
        });
    }
});

/**
 * General API rate limiter
 * Applies to all API endpoints as a baseline protection
 */
const generalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: {
        message: 'Too many requests from this IP. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * IP Whitelist Middleware
 * Restricts admin access to whitelisted IPs (optional, configurable via env)
 */
const ipWhitelist = (req, res, next) => {
    const whitelist = process.env.ADMIN_IP_WHITELIST;

    // If no whitelist configured, allow all (for development)
    if (!whitelist || whitelist.trim() === '') {
        return next();
    }

    const allowedIPs = whitelist.split(',').map(ip => ip.trim());
    const clientIP = req.ip || req.connection.remoteAddress;

    // Extract IPv4 from IPv6-mapped address (::ffff:192.168.1.1 -> 192.168.1.1)
    const normalizedIP = clientIP.replace(/^::ffff:/, '');

    if (allowedIPs.includes(normalizedIP) || allowedIPs.includes(clientIP)) {
        return next();
    }

    console.warn(`Admin access denied from IP: ${clientIP}`);
    return res.status(403).json({
        message: 'Access denied. Your IP address is not authorized for admin access.'
    });
};

/**
 * Session Age Validation Middleware
 * Forces re-authentication if session is older than configured timeout
 */
const validateSessionAge = (maxAgeMinutes = 30) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const tokenIssuedAt = req.user.iat; // JWT issued at timestamp
        const currentTime = Math.floor(Date.now() / 1000);
        const sessionAge = currentTime - tokenIssuedAt;
        const maxAgeSeconds = maxAgeMinutes * 60;

        if (sessionAge > maxAgeSeconds) {
            return res.status(401).json({
                message: 'Session expired. Please login again.',
                reason: 'session_timeout',
                sessionAge: sessionAge,
                maxAge: maxAgeSeconds
            });
        }

        next();
    };
};

/**
 * Admin Request Logger Middleware
 * Logs all admin requests for audit trail
 */
const logAdminRequest = async (req, res, next) => {
    const pool = require('../config/db');

    // Only log if user is authenticated and has admin role
    if (req.user && req.user.role && req.user.role.includes('admin')) {
        const logData = {
            user_id: req.user.id,
            method: req.method,
            path: req.path,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            timestamp: new Date()
        };

        // Log asynchronously to not block request
        setImmediate(async () => {
            try {
                await pool.query(
                    `INSERT INTO admin_request_logs 
                    (user_id, method, path, ip_address, user_agent, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [logData.user_id, logData.method, logData.path,
                    logData.ip_address, logData.user_agent, logData.timestamp]
                );
            } catch (error) {
                console.error('Failed to log admin request:', error);
            }
        });
    }

    next();
};

module.exports = {
    adminLoginLimiter,
    adminOperationLimiter,
    generalApiLimiter,
    ipWhitelist,
    validateSessionAge,
    logAdminRequest
};
