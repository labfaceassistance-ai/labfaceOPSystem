const pool = require('../config/db');
const ocrService = require('./ocrService');

/**
 * Document Verification Service
 * Handles verification of student COR and professor ID documents
 */
class VerificationService {
    /**
     * Verify student documents (COR + Face Photos)
     * @param {Object} studentData - Student registration data
     * @param {string} corImage - Base64 encoded COR image
     * @param {string} requestId - Request ID for debug tracking
     * @returns {Promise<Object>} Verification result
     */
    /**
     * Verify student documents (COR + Face Photos)
     * @param {Object} studentData - Student registration data
     * @param {string} corImage - Base64 encoded COR image
     * @param {string} requestId - Request ID for debug tracking
     * @returns {Promise<Object>} Verification result
     */
    async verifyStudentDocuments(studentData, corImage, requestId = 'unknown') {
        const logPrefix = `[Verify Debug ${requestId}]`;
        console.log(`${logPrefix} Starting document verification for student ${studentData.studentId}`);
        
        try {
            // 0. Fetch active academic period for COR validation
            let activePeriod = null;
            try {
                const [periods] = await pool.query(
                    "SELECT id, school_year as schoolYear, semester FROM academic_periods WHERE effective_date <= NOW() ORDER BY effective_date DESC LIMIT 1"
                );
                if (periods.length > 0) {
                    activePeriod = periods[0];
                    console.log(`${logPrefix} Active period: ${activePeriod.schoolYear} ${activePeriod.semester}`);
                }
            } catch (dbError) {
                console.warn(`${logPrefix} Could not fetch active academic period:`, dbError.message);
            }

            // 1. Verify COR using OCR - pass requestId for debug logging
            console.log(`${logPrefix} Calling OCR verifyCOR with requestId...`);
            const corVerification = await ocrService.verifyCOR(corImage, {
                studentId: studentData.studentId,
                firstName: studentData.firstName,
                middleName: studentData.middleName,
                lastName: studentData.lastName,
                course: studentData.course,
                yearLevel: studentData.yearLevel
            }, activePeriod, requestId);
            
            // 2. Resolve Academic Period from COR content
            if (corVerification.valid && corVerification.details) {
                const { extractedAY, extractedTerm } = corVerification.details;
                if (extractedAY && extractedTerm) {
                    const corPeriodId = await this.resolveAcademicPeriod(extractedAY, extractedTerm);
                    corVerification.corPeriodId = corPeriodId;
                    console.log(`${logPrefix} Resolved COR to academic_period_id: ${corPeriodId}`);
                }
            }

            console.log(`${logPrefix} COR verification result:`, {
                valid: corVerification.valid,
                confidence: corVerification.confidence,
                extractedStudentId: corVerification.details?.extractedStudentNumber,
                corPeriodId: corVerification.corPeriodId
            });

            // 3. Log verification attempt
            if (studentData.userId) {
                await this.logVerification(
                    studentData.userId,
                    'cor',
                    corVerification.valid ? 'pass' : 'fail',
                    { ...corVerification.details, requestId, corPeriodId: corVerification.corPeriodId },
                    corVerification.confidence,
                    corVerification.reason
                );
            }

            console.log(`${logPrefix} Verification complete. Valid: ${corVerification.valid}, Confidence: ${corVerification.confidence}%`);
            return corVerification;
        } catch (error) {
            console.error('Student document verification error:', error);
            return {
                valid: false,
                confidence: 0,
                mismatches: [],
                suggestions: ['An error occurred during verification. Please try again with a clearer image.'],
                reason: 'Verification service error: ' + error.message
            };
        }
    }

    /**
     * Resolve Academic Period ID from strings
     * @param {string} year - e.g. "2024-2025"
     * @param {string} term - e.g. "First Semester"
     * @returns {Promise<number|null>} Period ID
     */
    async resolveAcademicPeriod(year, term) {
        try {
            // 1. Fetch all recent academic periods for code-level matching
            const [periods] = await pool.query(
                "SELECT id, school_year, semester FROM academic_periods ORDER BY effective_date DESC LIMIT 20"
            );

            if (periods.length === 0) return null;

            // 2. Filter by Academic Year (handles 2526, 2025-2026, 2025, etc.)
            const yearMatchedPeriods = periods.filter(p => {
                const activeAY = p.school_year;
                const extDigits = year.replace(/\D/g, ''); // e.g. "2526"
                const activeDigits = activeAY.replace(/\D/g, ''); // e.g. "20252026"

                if (extDigits === activeDigits) return true;
                
                // Short form match (e.g. "2526" vs "20252026")
                if (extDigits.length === 4 && activeDigits.length === 8) {
                    const activeShort = activeAY.split(/[^\d]+/).map(y => y.slice(-2)).join('');
                    if (extDigits === activeShort) return true;
                }

                return activeAY.includes(year) || year.includes(activeAY);
            });

            const candidatePeriods = yearMatchedPeriods.length > 0 ? yearMatchedPeriods : periods;

            // Normalize a semester string for comparison
            // e.g. "2nd Semester" and "Second Semester" both → "2ndsemester"
            const normalizeTerm = (t) => t
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')        // strip punctuation/spaces
                .replace('first', '1st')
                .replace('second', '2nd')
                .replace('third', '3rd')
                .replace('fourth', '4th');

            const normalizedCor = normalizeTerm(term);

            // Exact normalized match first
            let matched = candidatePeriods.find(p => normalizeTerm(p.semester) === normalizedCor);

            // Fallback: substring match after normalization
            if (!matched) {
                matched = candidatePeriods.find(p =>
                    normalizeTerm(p.semester).includes(normalizedCor) ||
                    normalizedCor.includes(normalizeTerm(p.semester))
                );
            }

            // Final fallback: word-based matching for ordinal variations
            if (!matched) {
                const termLower = term.toLowerCase();
                if (termLower.includes('first') || termLower.includes('1st')) {
                    matched = candidatePeriods.find(p =>
                        p.semester.toLowerCase().includes('first') || p.semester.toLowerCase().includes('1st')
                    );
                } else if (termLower.includes('second') || termLower.includes('2nd')) {
                    matched = candidatePeriods.find(p =>
                        p.semester.toLowerCase().includes('second') || p.semester.toLowerCase().includes('2nd')
                    );
                } else if (termLower.includes('third') || termLower.includes('3rd') || termLower.includes('summer')) {
                    matched = candidatePeriods.find(p =>
                        p.semester.toLowerCase().includes('third') ||
                        p.semester.toLowerCase().includes('3rd') ||
                        p.semester.toLowerCase().includes('summer')
                    );
                }
            }

            return matched ? matched.id : candidatePeriods[0].id; // Fallback to first matching year candidate
        } catch (error) {
            console.error('Error resolving academic period:', error);
            return null;
        }
    }

    /**
     * Log verification attempt to database
     * @param {number} userId - User ID
     * @param {string} type - Verification type ('cor', 'id', 'manual')
     * @param {string} result - Result ('pass' or 'fail')
     * @param {Object} extractedData - Data extracted during verification
     * @param {number} confidenceScore - Confidence score (0-1)
     * @param {string} errorMessage - Error message if failed
     */
    async logVerification(userId, type, result, extractedData = null, confidenceScore = null, errorMessage = null) {
        try {
            await pool.query(
                `INSERT INTO verification_logs 
                (user_id, verification_type, verification_result, extracted_data, confidence_score, error_message) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    type,
                    result,
                    extractedData ? JSON.stringify(extractedData) : null,
                    confidenceScore,
                    errorMessage
                ]
            );
        } catch (error) {
            console.error('Failed to log verification:', error);
            // Don't throw - logging failure shouldn't break verification
        }
    }

    /**
     * Get verification history for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Verification logs
     */
    async getVerificationHistory(userId) {
        try {
            const [logs] = await pool.query(
                `SELECT * FROM verification_logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 10`,
                [userId]
            );
            return logs;
        } catch (error) {
            console.error('Failed to get verification history:', error);
            return [];
        }
    }

    /**
     * Get verification statistics
     * @returns {Promise<Object>} Statistics
     */
    async getVerificationStats() {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    verification_type,
                    verification_result,
                    COUNT(*) as count,
                    AVG(confidence_score) as avg_confidence
                FROM verification_logs
                GROUP BY verification_type, verification_result
            `);
            return stats;
        } catch (error) {
            console.error('Failed to get verification stats:', error);
            return [];
        }
    }
}

module.exports = new VerificationService();
