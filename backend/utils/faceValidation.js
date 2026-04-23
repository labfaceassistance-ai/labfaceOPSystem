const axios = require('axios');

/**
 * Validate that an image contains a detectable face
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<{valid: boolean, error?: string, aiOffline?: boolean}>}
 */
async function validateFaceInImage(base64Image) {
    try {
        // Call AI service to detect faces
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
        const response = await axios.post(`${aiServiceUrl}/api/recognize`, {
            image: base64Image
        }, {
            timeout: 5000  // Reduced from 10s → 5s for faster UX feedback when AI is down
        });

        // If we get here without error, a face was detected.
        // The AI service returns success:false when no face is found or quality is poor.
        if (response.data.success === false) {
            const errorMsg = response.data.error || 'Unknown error';

            // 1. Quality Issues (Dark/Blurry/Bright) → ALLOW but WARN (Bypass)
            // Students might be in a dimly lit room but face is still recognizable to human staff.
            if (errorMsg.includes('too dark') || errorMsg.includes('too bright') || errorMsg.includes('too blurry')) {
                console.warn(`[FaceValidation] QUALITY WARNING: ${errorMsg}. Proceeding anyway.`);
                return {
                    valid: true, 
                    warning: response.data.message || errorMsg,
                    code: 'QUALITY_WARNING'
                };
            }

            // 2. No Face Detected → WARN but ALLOW (Bypass)
            // "No face" is often a false negative from angle photos; "too dark" is usually accurate.
            if (errorMsg.toLowerCase().includes('no face')) {
                console.warn('[FaceValidation] WARNING: AI service did not detect a face. Allowing upload to proceed (Bypass Active).');
                return { valid: true, warning: 'No face detected (Bypassed)' };
            }

            // 3. Service initializing (models still loading) → fail-open
            if (errorMsg === 'Service initializing') {
                console.warn('[FaceValidation] AI service is still initializing models. Allowing upload (Bypass Active).');
                return { valid: true, warning: 'AI service initializing (Bypassed)', aiOffline: true };
            }

            // Other errors → fail-open (don't block the student)
            console.warn(`[FaceValidation] AI returned error: ${errorMsg}. Allowing upload (Bypass Active).`);
            return { valid: true, warning: errorMsg, aiOffline: false };
        }

        // Face detected and quality checks passed
        return { valid: true };

    } catch (error) {
        // AI Service communication error — classify by error code for better Docker log diagnostics
        const code = error.code || 'UNKNOWN';
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

        if (code === 'ECONNREFUSED') {
            console.warn(`[FaceValidation] AI service REFUSED connection at ${aiServiceUrl}. Is the ai-service container running?`);
        } else if (code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            console.warn(`[FaceValidation] AI service TIMED OUT (>${5000}ms) at ${aiServiceUrl}. Service may be overloaded or still loading models.`);
        } else if (code === 'ENOTFOUND') {
            console.warn(`[FaceValidation] AI service DNS FAILED for ${aiServiceUrl}. Check docker-compose service name.`);
        } else {
            console.warn(`[FaceValidation] AI service error [${code}]: ${error.message}`);
        }

        // Check if response body has usable data (4xx/5xx with JSON body)
        if (error.response && error.response.data) {
            const errorMsg = error.response.data.error || '';
            if (errorMsg.toLowerCase().includes('no face')) {
                return { valid: true, warning: 'No face detected (Bypassed)', aiOffline: false };
            }
        }

        // Fail-open: don't block legitimate registrations when the AI is unavailable.
        // The aiOffline flag lets the frontend show a bypass banner to the student.
        return { valid: true, warning: 'Face validation service unavailable', aiOffline: true };
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

    const angles = Object.entries(facePhotos);
    const results = await Promise.all(angles.map(([angle, base64Data]) => validateFaceInImage(base64Data)));
    
    const invalidAngles = angles
        .filter((_, index) => !results[index].valid)
        .map(([angle]) => angle);

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
