/**
 * Liveness Detection Service
 * Backend service layer for 3-layer liveness detection
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

class LivenessService {
    constructor() {
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Check if liveness detection service is healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(
                `${AI_SERVICE_URL}/api/liveness/health`,
                { timeout: 5000 }
            );

            return {
                success: true,
                status: response.data.status,
                layers: response.data.layers,
                method: response.data.method
            };
        } catch (error) {
            console.error('Liveness health check failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Perform passive liveness detection only (fastest)
     * 
     * @param {string} base64Image - Base64 encoded image
     * @returns {Promise<Object>} - Detection result
     */
    async checkPassive(base64Image) {
        try {
            const response = await axios.post(
                `${AI_SERVICE_URL}/api/liveness/passive`,
                { image: base64Image },
                { timeout: this.timeout }
            );

            return {
                success: true,
                isLive: response.data.is_live,
                confidence: response.data.confidence,
                method: response.data.method,
                details: response.data.details
            };
        } catch (error) {
            console.error('Passive liveness detection failed:', error.message);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Perform full 3-layer liveness detection
     * 
     * @param {string} mainImage - Base64 encoded main image
     * @param {Array<string>} frames - Array of base64 encoded frames (optional)
     * @returns {Promise<Object>} - Detection result
     */
    async checkFull(mainImage, frames = []) {
        try {
            const response = await axios.post(
                `${AI_SERVICE_URL}/api/liveness/check`,
                {
                    image: mainImage,
                    frames: frames
                },
                { timeout: this.timeout }
            );

            return {
                success: true,
                isLive: response.data.is_live,
                confidence: response.data.confidence,
                method: response.data.method,
                layers: response.data.layers,
                details: response.data.details
            };
        } catch (error) {
            console.error('Full liveness detection failed:', error.message);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Check liveness with automatic method selection
     * Uses full detection if frames provided, otherwise passive only
     * 
     * @param {Object} options - Detection options
     * @param {string} options.image - Base64 encoded image
     * @param {Array<string>} options.frames - Optional frames for active detection
     * @param {boolean} options.requireFull - Force full detection (default: false)
     * @returns {Promise<Object>} - Detection result
     */
    async checkLiveness({ image, frames = [], requireFull = false }) {
        // If frames provided or full detection required, use full detection
        if (frames.length >= 10 || requireFull) {
            return await this.checkFull(image, frames);
        }

        // Otherwise use passive only (faster)
        return await this.checkPassive(image);
    }

    /**
     * Validate liveness result meets minimum confidence threshold
     * 
     * @param {Object} result - Liveness detection result
     * @param {number} minConfidence - Minimum confidence threshold (0-1)
     * @returns {boolean} - Whether result passes threshold
     */
    isLivenessValid(result, minConfidence = 0.7) {
        if (!result.success || !result.isLive) {
            return false;
        }

        return result.confidence >= minConfidence;
    }

    /**
     * Get human-readable liveness failure reason
     * 
     * @param {Object} result - Liveness detection result
     * @returns {string} - Failure reason
     */
    getFailureReason(result) {
        if (!result.success) {
            return `Liveness check error: ${result.error}`;
        }

        if (!result.isLive) {
            return result.details || 'Liveness check failed';
        }

        if (result.confidence < 0.7) {
            return `Low confidence (${(result.confidence * 100).toFixed(0)}%)`;
        }

        return 'Unknown reason';
    }
}

module.exports = new LivenessService();
