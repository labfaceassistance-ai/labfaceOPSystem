/**
 * Face Login Hook with Liveness Detection
 * Handles secure face login with 3-layer liveness detection
 */

import { useState } from 'react';
import axios from 'axios';

interface LivenessResult {
    passed: boolean;
    confidence: number;
    method: string;
}

interface RecognitionResult {
    method: string;
    confidence: number;
    distance: number;
}

interface FaceLoginResult {
    success: boolean;
    token?: string;
    user?: any;
    security?: {
        liveness: LivenessResult;
        recognition: RecognitionResult;
    };
    error?: string;
    message?: string;
}

export function useFaceLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Login with face and liveness detection
     */
    const loginWithFace = async (
        faceImage: string,
        frames: string[] = [],
        useSecure: boolean = true
    ): Promise<FaceLoginResult> => {
        setIsLoading(true);
        setError(null);

        try {
            const endpoint = useSecure ? '/api/auth/face-login-secure' : '/api/auth/face-login';

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
                {
                    faceImage,
                    frames: useSecure ? frames : undefined
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds
                }
            );

            setIsLoading(false);

            return {
                success: true,
                token: response.data.token,
                user: response.data.user,
                security: response.data.security
            };
        } catch (err: any) {
            setIsLoading(false);

            const errorMessage = err.response?.data?.message || err.message || 'Face login failed';
            setError(errorMessage);

            return {
                success: false,
                error: errorMessage,
                message: err.response?.data?.reason || err.response?.data?.details
            };
        }
    };

    /**
     * Quick login (passive liveness only)
     */
    const quickLogin = async (faceImage: string): Promise<FaceLoginResult> => {
        return loginWithFace(faceImage, [], false);
    };

    /**
     * Secure login (full 3-layer liveness)
     */
    const secureLogin = async (faceImage: string, frames: string[]): Promise<FaceLoginResult> => {
        return loginWithFace(faceImage, frames, true);
    };

    return {
        loginWithFace,
        quickLogin,
        secureLogin,
        isLoading,
        error
    };
}
