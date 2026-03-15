/**
 * Input Validation Middleware
 * Provides reusable validation functions for common inputs
 */

const { validationError } = require('./errorHandler');

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Student ID validation (format: YYYY-XXXXX-XX-X)
const validateStudentId = (studentId) => {
    const studentIdRegex = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;
    return studentIdRegex.test(studentId);
};

// User ID validation
const validateUserId = (userId) => {
    return userId && typeof userId === 'string' && userId.length > 0;
};

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Remove potential XSS characters
    return str
        .replace(/[<>]/g, '') // Remove < and >
        .trim();
};

// Validate required fields
const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missing = [];

        for (const field of fields) {
            if (!req.body[field]) {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            return next(validationError(
                `Missing required fields: ${missing.join(', ')}`,
                { missingFields: missing }
            ));
        }

        next();
    };
};

// Validate email field
const validateEmailField = (fieldName = 'email') => {
    return (req, res, next) => {
        const email = req.body[fieldName];

        if (!email) {
            return next(validationError(`${fieldName} is required`));
        }

        if (!validateEmail(email)) {
            return next(validationError(`Invalid ${fieldName} format`));
        }

        // Sanitize email
        req.body[fieldName] = email.toLowerCase().trim();

        next();
    };
};

// Validate student ID field
const validateStudentIdField = (fieldName = 'studentId') => {
    return (req, res, next) => {
        const studentId = req.body[fieldName];

        if (!studentId) {
            return next(validationError(`${fieldName} is required`));
        }

        if (!validateStudentId(studentId)) {
            return next(validationError(
                `Invalid ${fieldName} format. Expected format: YYYY-XXXXX-XX-X`
            ));
        }

        next();
    };
};

// Sanitize all string inputs in request body
const sanitizeInputs = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }

    next();
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Ensure reasonable limits
    if (page < 1) {
        return next(validationError('Page must be >= 1'));
    }

    if (limit < 1 || limit > 100) {
        return next(validationError('Limit must be between 1 and 100'));
    }

    // Add to request object
    req.pagination = {
        page,
        limit,
        offset: (page - 1) * limit
    };

    next();
};

// Validate date range
const validateDateRange = (startField = 'startDate', endField = 'endDate') => {
    return (req, res, next) => {
        const startDate = req.query[startField];
        const endDate = req.query[endField];

        if (startDate && isNaN(Date.parse(startDate))) {
            return next(validationError(`Invalid ${startField} format`));
        }

        if (endDate && isNaN(Date.parse(endDate))) {
            return next(validationError(`Invalid ${endField} format`));
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return next(validationError('Start date must be before end date'));
        }

        next();
    };
};

// Validate file upload
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
    return (req, res, next) => {
        if (!req.file) {
            return next(validationError('No file uploaded'));
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
            return next(validationError(
                `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
            ));
        }

        // Check file size
        if (req.file.size > maxSize) {
            return next(validationError(
                `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
            ));
        }

        next();
    };
};

// Validate numeric ID parameter
const validateIdParam = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!id || isNaN(parseInt(id))) {
            return next(validationError(`Invalid ${paramName} parameter`));
        }

        next();
    };
};

module.exports = {
    validateEmail,
    validateStudentId,
    validateUserId,
    sanitizeString,
    validateRequiredFields,
    validateEmailField,
    validateStudentIdField,
    sanitizeInputs,
    validatePagination,
    validateDateRange,
    validateFileUpload,
    validateIdParam
};
