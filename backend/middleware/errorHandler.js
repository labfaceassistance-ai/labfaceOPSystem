/**
 * Centralized Error Handler Middleware
 * Standardizes error responses and prevents information leakage
 */

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

// Error types for categorization
const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE: 'DATABASE_ERROR',
    EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
    INTERNAL: 'INTERNAL_SERVER_ERROR'
};

// Centralized error handler
const errorHandler = (err, req, res, next) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errorType = ErrorTypes.INTERNAL;

    // Log error details server-side
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id,
        error: {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode
        }
    });

    // Categorize error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorType = ErrorTypes.VALIDATION;
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorType = ErrorTypes.AUTHENTICATION;
        message = 'Authentication failed';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        statusCode = 503;
        errorType = ErrorTypes.EXTERNAL_SERVICE;
        message = 'External service unavailable';
    } else if (err.code && err.code.startsWith('ER_')) {
        // MySQL errors
        statusCode = 500;
        errorType = ErrorTypes.DATABASE;
        message = 'Database operation failed';

        // Handle specific MySQL errors
        if (err.code === 'ER_DUP_ENTRY') {
            statusCode = 409;
            message = 'Duplicate entry';
        } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            statusCode = 400;
            message = 'Invalid reference';
        }
    }

    // Production vs Development response
    const isDevelopment = process.env.NODE_ENV === 'development';

    const errorResponse = {
        success: false,
        error: {
            type: errorType,
            message: message,
            timestamp: new Date().toISOString()
        }
    };

    // Add stack trace in development
    if (isDevelopment) {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = err;
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.error.requestId = req.id;
    }

    res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        404
    );
    next(error);
};

// Validation error helper
const validationError = (message, details = null) => {
    const error = new AppError(message, 400);
    error.name = 'ValidationError';
    error.details = details;
    return error;
};

// Authorization error helper
const authorizationError = (message = 'Access denied') => {
    const error = new AppError(message, 403);
    error.name = 'AuthorizationError';
    return error;
};

// Authentication error helper
const authenticationError = (message = 'Authentication required') => {
    const error = new AppError(message, 401);
    error.name = 'AuthenticationError';
    return error;
};

module.exports = {
    AppError,
    ErrorTypes,
    errorHandler,
    asyncHandler,
    notFoundHandler,
    validationError,
    authorizationError,
    authenticationError
};
