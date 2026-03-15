'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

interface LivenessCaptureProps {
    onCapture: (image: string, frames: string[]) => void;
    onCancel?: () => void;
    requireFrames?: boolean; // Whether to capture multiple frames for active detection
    frameCount?: number; // Number of frames to capture (default: 15)
}

export default function LivenessCapture({
    onCapture,
    onCancel,
    requireFrames = true,
    frameCount = 15
}: LivenessCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
    const [instruction, setInstruction] = useState('Position your face in the frame');
    const [countdown, setCountdown] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);

    // Capture a single frame
    const captureFrame = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            return imageSrc;
        }
        return null;
    }, []);

    // Start capture sequence
    const startCapture = useCallback(async () => {
        setIsCapturing(true);
        setInstruction('Get ready...');

        // Countdown
        for (let i = 3; i > 0; i--) {
            setCountdown(i);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(null);

        if (requireFrames) {
            // Capture multiple frames for active detection
            setInstruction('Please blink 2-3 times and move your head slightly');
            const frames: string[] = [];

            for (let i = 0; i < frameCount; i++) {
                const frame = captureFrame();
                if (frame) {
                    frames.push(frame);
                    setCapturedFrames(prev => [...prev, frame]);
                    setProgress(((i + 1) / frameCount) * 100);
                }
                await new Promise(resolve => setTimeout(resolve, 150)); // 150ms between frames
            }

            setInstruction('Processing...');

            // Use the middle frame as the main image
            const mainImage = frames[Math.floor(frames.length / 2)];
            onCapture(mainImage, frames);
        } else {
            // Single frame capture (passive detection only)
            setInstruction('Capturing...');
            const mainImage = captureFrame();

            if (mainImage) {
                onCapture(mainImage, []);
            }
        }

        setIsCapturing(false);
    }, [requireFrames, frameCount, captureFrame, onCapture]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">Liveness Detection</h2>
                    <p className="text-blue-100 text-sm mt-1">
                        {requireFrames
                            ? 'We need to verify you are a real person'
                            : 'Quick face verification'}
                    </p>
                </div>

                {/* Camera View */}
                <div className="p-6">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                                width: 1280,
                                height: 960,
                                facingMode: 'user'
                            }}
                            className="w-full h-full object-cover"
                        />

                        {/* Face Guide Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-64 h-80">
                                {/* Oval guide */}
                                <div className="absolute inset-0 border-4 border-white border-dashed rounded-full opacity-50"></div>

                                {/* Corner markers */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                            </div>
                        </div>

                        {/* Countdown Overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="text-white text-9xl font-bold animate-pulse">
                                    {countdown}
                                </div>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isCapturing && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-150"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start">
                            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold text-blue-900">{instruction}</p>
                                {!isCapturing && requireFrames && (
                                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                                        <li>• Position your face in the oval guide</li>
                                        <li>• Ensure good lighting</li>
                                        <li>• You'll need to blink 2-3 times</li>
                                        <li>• Move your head slightly during capture</li>
                                    </ul>
                                )}
                                {!isCapturing && !requireFrames && (
                                    <p className="mt-2 text-sm text-blue-700">
                                        Position your face in the oval guide and click "Capture"
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Captured Frames Preview (optional) */}
                    {capturedFrames.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">
                                Captured {capturedFrames.length} frames
                            </p>
                            <div className="flex gap-1 overflow-x-auto">
                                {capturedFrames.slice(0, 10).map((frame, idx) => (
                                    <img
                                        key={idx}
                                        src={frame}
                                        alt={`Frame ${idx + 1}`}
                                        className="w-12 h-12 object-cover rounded border border-gray-300"
                                    />
                                ))}
                                {capturedFrames.length > 10 && (
                                    <div className="w-12 h-12 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-600">
                                        +{capturedFrames.length - 10}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isCapturing}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={startCapture}
                        disabled={isCapturing}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                        {isCapturing ? 'Capturing...' : 'Start Capture'}
                    </button>
                </div>
            </div>
        </div>
    );
}
