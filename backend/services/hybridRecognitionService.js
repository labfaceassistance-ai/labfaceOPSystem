const pool = require('../config/db');
const faceNetService = require('./faceNetService');

/**
 * Hybrid Face Recognition Service
 * Uses FaceNet (99% accurate) as primary, face-api.js (95% accurate) as fallback
 */

class HybridRecognitionService {
    constructor() {
        this.faceNetThreshold = 0.6;  // Distance threshold for FaceNet
        this.faceApiThreshold = 0.6;   // Similarity threshold for face-api.js
    }

    /**
     * Recognize face using hybrid approach
     * @param {string} base64Image - Base64 encoded face image
     * @returns {Promise<Object>} - {success, user, method, confidence}
     */
    async recognizeFace(base64Image) {
        console.log('Starting hybrid face recognition...');

        // Step 1: Try FaceNet first (more accurate)
        const faceNetResult = await this.tryFaceNetRecognition(base64Image);
        if (faceNetResult.success) {
            console.log(`✓ FaceNet recognition successful: ${faceNetResult.user.user_id}`);
            return faceNetResult;
        }

        console.log('FaceNet recognition failed, trying face-api.js fallback...');

        // Step 2: Fallback to face-api.js
        const faceApiResult = await this.tryFaceApiRecognition(base64Image);
        if (faceApiResult.success) {
            console.log(`✓ face-api.js recognition successful: ${faceApiResult.user.user_id}`);
            return faceApiResult;
        }

        console.log('✗ Both recognition methods failed');
        return {
            success: false,
            error: 'Face not recognized',
            details: {
                faceNetError: faceNetResult.error,
                faceApiError: faceApiResult.error
            }
        };
    }

    /**
     * Try FaceNet recognition
     * @param {string} base64Image 
     * @returns {Promise<Object>}
     */
    async tryFaceNetRecognition(base64Image) {
        try {
            // Generate embedding from input image
            const embeddingResult = await faceNetService.generateEmbedding(base64Image);

            if (!embeddingResult.success) {
                return {
                    success: false,
                    error: embeddingResult.error || 'Failed to generate embedding'
                };
            }

            const inputEmbedding = embeddingResult.embedding;

            // Get all users with FaceNet embeddings
            const [users] = await pool.query(`
                SELECT id, user_id, first_name, last_name, email, role, facenet_embedding
                FROM users 
                WHERE facenet_embedding IS NOT NULL
            `);

            if (users.length === 0) {
                return {
                    success: false,
                    error: 'No users with FaceNet embeddings found'
                };
            }

            // Find best match
            let bestMatch = null;
            let bestConfidence = 0;
            let bestDistance = 1.0;

            for (const user of users) {
                try {
                    const storedEmbedding = JSON.parse(user.facenet_embedding.toString());

                    // Compare embeddings
                    const comparison = await faceNetService.compareEmbeddings(
                        inputEmbedding,
                        storedEmbedding,
                        this.faceNetThreshold
                    );

                    if (comparison.success && comparison.isMatch) {
                        if (comparison.confidence > bestConfidence) {
                            bestConfidence = comparison.confidence;
                            bestDistance = comparison.distance;
                            bestMatch = user;
                        }
                    }
                } catch (error) {
                    console.error(`Error comparing with user ${user.user_id}:`, error.message);
                    continue;
                }
            }

            if (bestMatch) {
                return {
                    success: true,
                    user: bestMatch,
                    method: 'facenet',
                    confidence: bestConfidence,
                    distance: bestDistance
                };
            }

            return {
                success: false,
                error: 'No matching face found (FaceNet)'
            };

        } catch (error) {
            console.error('FaceNet recognition error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Try face-api.js recognition (fallback)
     * @param {string} base64Image 
     * @returns {Promise<Object>}
     */
    async tryFaceApiRecognition(base64Image) {
        try {
            // This would call your existing face-api.js recognition
            // For now, return not implemented
            return {
                success: false,
                error: 'face-api.js fallback not yet implemented'
            };
        } catch (error) {
            console.error('face-api.js recognition error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get recognition statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN facenet_embedding IS NOT NULL THEN 1 ELSE 0 END) as facenet_users,
                SUM(CASE WHEN face_embeddings IS NOT NULL THEN 1 ELSE 0 END) as faceapi_users
            FROM users
        `);

        return stats[0];
    }
}

module.exports = new HybridRecognitionService();
