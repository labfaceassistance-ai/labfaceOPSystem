const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Middleware to verify JWT token and attach user data to request
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('[Auth] No Token provided. Headers:', JSON.stringify(req.headers));
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('[Auth] Token Verify Error:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        console.log(`[Auth] Success for User: ${user.id} (${user.role})`);
        req.user = user; // Attach decoded user data to request
        next();
    });
};

/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRoles = req.user.role ? req.user.role.toLowerCase() : '';
        const hasRole = roles.some(role => userRoles.includes(role.toLowerCase()));

        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { authenticateToken, requireRole };
