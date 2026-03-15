/**
 * Password Validation Utility
 * Enforces strong password requirements for admin accounts
 */

const MIN_LENGTH = 12;
const MIN_UPPERCASE = 1;
const MIN_LOWERCASE = 1;
const MIN_DIGITS = 2;
const MIN_SPECIAL = 1;

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'] };
    }

    // Check minimum length
    if (password.length < MIN_LENGTH) {
        errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
    }

    // Check for uppercase letters
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (uppercaseCount < MIN_UPPERCASE) {
        errors.push(`Password must contain at least ${MIN_UPPERCASE} uppercase letter(s)`);
    }

    // Check for lowercase letters
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (lowercaseCount < MIN_LOWERCASE) {
        errors.push(`Password must contain at least ${MIN_LOWERCASE} lowercase letter(s)`);
    }

    // Check for digits
    const digitCount = (password.match(/[0-9]/g) || []).length;
    if (digitCount < MIN_DIGITS) {
        errors.push(`Password must contain at least ${MIN_DIGITS} digit(s)`);
    }

    // Check for special characters
    const specialCount = password.split('').filter(char => SPECIAL_CHARS.includes(char)).length;
    if (specialCount < MIN_SPECIAL) {
        errors.push(`Password must contain at least ${MIN_SPECIAL} special character(s) (${SPECIAL_CHARS})`);
    }

    // Check for spaces
    if (password.includes(' ')) {
        errors.push('Password cannot contain spaces');
    }

    // Check for common weak passwords
    const commonPasswords = [
        'password123', 'admin123456', 'administrator', '123456789012',
        'qwerty123456', 'letmein12345', 'welcome12345', 'password1234'
    ];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
        errors.push('Password is too common. Please choose a more unique password');
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        strength: calculatePasswordStrength(password)
    };
}

/**
 * Calculate password strength score (0-100)
 * @param {string} password
 * @returns {number} - Strength score
 */
function calculatePasswordStrength(password) {
    let score = 0;

    // Length bonus
    score += Math.min(password.length * 4, 40);

    // Character variety bonus
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    // Complexity bonus
    const uniqueChars = new Set(password.split('')).size;
    score += Math.min(uniqueChars * 2, 15);

    return Math.min(score, 100);
}

/**
 * Get password strength label
 * @param {number} score - Strength score (0-100)
 * @returns {string} - 'weak', 'fair', 'good', 'strong', 'very strong'
 */
function getPasswordStrengthLabel(score) {
    if (score < 30) return 'weak';
    if (score < 50) return 'fair';
    if (score < 70) return 'good';
    if (score < 90) return 'strong';
    return 'very strong';
}

/**
 * Middleware to validate password on registration/change
 */
function validatePasswordMiddleware(req, res, next) {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({
            message: 'Password is required'
        });
    }

    const validation = validatePasswordStrength(password);

    if (!validation.valid) {
        return res.status(400).json({
            message: 'Password does not meet security requirements',
            errors: validation.errors,
            requirements: {
                minLength: MIN_LENGTH,
                minUppercase: MIN_UPPERCASE,
                minLowercase: MIN_LOWERCASE,
                minDigits: MIN_DIGITS,
                minSpecialChars: MIN_SPECIAL,
                allowedSpecialChars: SPECIAL_CHARS
            }
        });
    }

    // Attach strength info to request for logging
    req.passwordStrength = {
        score: validation.strength,
        label: getPasswordStrengthLabel(validation.strength)
    };

    next();
}

module.exports = {
    validatePasswordStrength,
    calculatePasswordStrength,
    getPasswordStrengthLabel,
    validatePasswordMiddleware
};
