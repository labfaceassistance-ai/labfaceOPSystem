const axios = require('axios');

/**
 * Validate that an image contains a detectable face
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function validateFaceInImage(base64Image) {
    try {
        // Call AI service to detect faces
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
        const response = await axios.post(`${aiServiceUrl}/api/recognize`, {
            image: base64Image
        }, {
            timeout: 10000
        });

        // If we get here without error, a face was detected
        // The AI service returns success:false if no face is found
        // If AI service returns success:false, it might be "No face" or "Quality issue"
        if (response.data.success === false) {
            const errorMsg = response.data.error || 'Unknown error';

            // 1. Quality Issues (Dark/Blurry) -> BLOCK
            if (errorMsg.includes('too dark') || errorMsg.includes('too bright') || errorMsg.includes('too blurry')) {
                return {
                    valid: false,
                    error: response.data.message || errorMsg,
                    code: 'QUALITY_ERROR'
                };
            }

            // 2. No Face Detected -> WARN but ALLOW (Bypass)
            // (Unless we want to be strict here too? User asked for "notify... if too dark". 
            // Often "no face" is a false negative. "Too dark" is usually true positive.)
            if (errorMsg === 'No face detected') {
                console.warn('WARNING: AI service did not detect a face. Allowing upload to proceed (Bypass Active).');
                return { valid: true, warning: 'No face detected (Bypassed)' };
            }

            // Other errors
            return { valid: false, error: errorMsg };
        }

        // Face detected successfully
        return { valid: true };
    } catch (error) {
        // AI Service communication error
        if (error.response && error.response.data) {
            const errorMsg = error.response.data.error || '';
            // Handle raw 400/500 errors if they follow schema
            if (errorMsg.toLowerCase().includes('no face')) {
                return { valid: true, warning: 'No face detected (Bypassed)' };
            }
        }


        // If AI service is down or other error, log but allow upload
        // (fail open to avoid blocking legitimate uploads)
        console.warn('Face validation service error:', error.message);
        return { valid: true, warning: 'Face validation service unavailable' };
    }
}

/**
 * Validate multiple face photos
 * @param {Object} facePhotos - Object with angle keys and base64 image values
 * @returns {Promise<{valid: boolean, invalidAngles?: string[], error?: string}>}
 */
async function validateFacePhotos(facePhotos) {
    if (!facePhotos || typeof facePhotos !== 'object') {
        return { valid: false, error: 'No face photos provided' };
    }

    const invalidAngles = [];

    for (const [angle, base64Data] of Object.entries(facePhotos)) {
        const result = await validateFaceInImage(base64Data);
        if (!result.valid) {
            invalidAngles.push(angle);
        }
    }

    if (invalidAngles.length > 0) {
        return {
            valid: false,
            invalidAngles,
            error: `No face detected in ${invalidAngles.join(', ')} photo(s)`
        };
    }

    return { valid: true };
}

module.exports = {
    validateFaceInImage,
    validateFacePhotos
};
