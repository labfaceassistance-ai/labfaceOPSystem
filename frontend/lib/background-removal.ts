// import removeBackground from '@imgly/background-removal';
import axios from 'axios';

/**
 * Configuration for background removal
 */
const config = {
    publicPath: '/models/', // Path to models (will be auto-downloaded)
    debug: false,
    proxyToWorker: true, // Use web worker for better performance
    fetchArgs: {
        mode: 'cors' as RequestMode,
    },
};

/**
 * Remove background from image using frontend library
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise<string> - Processed image as base64 data URL with transparent background
 */
export async function removeBackgroundFrontend(imageDataUrl: string): Promise<string> {
    throw new Error("Frontend background removal disabled during build debugging");
    /*
    try {
        // Convert data URL to Blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();

        // Process with background removal - call as default export function
        const processedBlob = await (removeBackground as any)(blob, config);

        // Convert back to data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to data URL'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(processedBlob);
        });
    } catch (error) {
        console.error('Frontend background removal failed:', error);
        throw error;
    }
    */
}

/**
 * Remove background from image using backend API
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise<string> - Processed image as base64 data URL
 */
export async function removeBackgroundBackend(imageDataUrl: string): Promise<string> {
    try {
        const API_URL = '/api/ai';

        // Send image to backend for processing
        const response = await axios.post(`${API_URL}/remove-background`, {
            image: imageDataUrl
        }, {
            timeout: 30000 // 30 second timeout
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data.processedImage;
    } catch (error) {
        console.error('Backend background removal failed:', error);
        throw error;
    }
}

/**
 * Hybrid approach: Try frontend first, fallback to backend, then original
 * @param imageDataUrl - Base64 data URL of the image
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<{processedImage: string, method: 'frontend' | 'backend' | 'original'}>
 */
export async function removeBackgroundHybrid(
    imageDataUrl: string,
    onProgress?: (status: string) => void
): Promise<{ processedImage: string; method: 'frontend' | 'backend' | 'original' }> {
    // Try frontend processing first
    try {
        onProgress?.('Processing with browser...');
        const processed = await removeBackgroundFrontend(imageDataUrl);
        onProgress?.('Background removed successfully!');
        return { processedImage: processed, method: 'frontend' };
    } catch (frontendError) {
        console.warn('Frontend processing failed, trying backend...', frontendError);

        // Fallback to backend processing
        try {
            onProgress?.('Trying server processing...');
            const processed = await removeBackgroundBackend(imageDataUrl);
            onProgress?.('Background removed successfully!');
            return { processedImage: processed, method: 'backend' };
        } catch (backendError) {
            console.warn('Backend processing also failed, using original image', backendError);

            // Use original image if both fail
            onProgress?.('Using original image');
            return { processedImage: imageDataUrl, method: 'original' };
        }
    }
}

/**
 * Process multiple images with background removal
 * @param images - Record of angle -> image data URL
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<Record<string, string>> - Processed images
 */
export async function processMultipleImages(
    images: Record<string, string>,
    onProgress?: (angle: string, status: string, current: number, total: number) => void
): Promise<Record<string, string>> {
    const processedImages: Record<string, string> = {};
    const angles = Object.keys(images);
    const total = angles.length;

    for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        const imageDataUrl = images[angle];

        try {
            onProgress?.(angle, 'Processing...', i + 1, total);

            const result = await removeBackgroundHybrid(
                imageDataUrl,
                (status) => onProgress?.(angle, status, i + 1, total)
            );

            processedImages[angle] = result.processedImage;

            onProgress?.(angle, `Done (${result.method})`, i + 1, total);
        } catch (error) {
            console.error(`Failed to process ${angle}:`, error);
            // Use original if processing fails
            processedImages[angle] = imageDataUrl;
            onProgress?.(angle, 'Using original', i + 1, total);
        }
    }

    return processedImages;
}

/**
 * Check if browser supports WebGL (required for frontend processing)
 */
export function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
}
