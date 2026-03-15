const axios = require('axios');

class FaceNetService {
    constructor() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    }

    /**
     * Generate FaceNet embedding from base64 image
     * @param {string} base64Image - Base64 encoded image
     * @returns {Promise<Object>} - {success, embedding, dimension, error}
     */
    async generateEmbedding(base64Image) {
        try {
            const response = await axios.post(`${this.aiServiceUrl}/api/facenet/embedding`, {
                image: base64Image
            }, {
                timeout: 10000 // 10 second timeout
            });

            return {
                success: true,
                embedding: response.data.embedding,
                dimension: response.data.dimension,
                model: response.data.model
            };
        } catch (error) {
            console.error('FaceNet embedding generation failed:', error.message);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Compare two FaceNet embeddings
     * @param {Array} embedding1 - First embedding
     * @param {Array} embedding2 - Second embedding
     * @param {number} threshold - Similarity threshold (default: 0.6)
     * @returns {Promise<Object>} - {success, isMatch, confidence, distance, error}
     */
    async compareEmbeddings(embedding1, embedding2, threshold = 0.6) {
        try {
            const response = await axios.post(`${this.aiServiceUrl}/api/facenet/compare`, {
                embedding1,
                embedding2,
                threshold
            }, {
                timeout: 5000
            });

            return {
                success: true,
                isMatch: response.data.is_match,
                confidence: response.data.confidence,
                distance: response.data.distance
            };
        } catch (error) {
            console.error('FaceNet comparison failed:', error.message);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Check if FaceNet service is healthy
     * @returns {Promise<Object>} - {status, model, device, ready}
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.aiServiceUrl}/api/facenet/health`, {
                timeout: 3000
            });
            return response.data;
        } catch (error) {
            console.error('FaceNet health check failed:', error.message);
            return {
                status: 'unhealthy',
                error: error.message,
                ready: false
            };
        }
    }
}

module.exports = new FaceNetService();
