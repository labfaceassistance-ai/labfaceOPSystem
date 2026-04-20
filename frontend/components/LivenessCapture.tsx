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
        <div className="fixed inset-0 bg-identity-navy/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] shadow-3xl max-w-2xl w-full overflow-hidden border border-identity-sky/10 relative">
                {/* Decorative background */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/10 via-transparent to-transparent pointer-events-none" />

                {/* Header */}
                <div className="px-10 py-8 relative z-10 border-b border-identity-sky/5">
                    <h2 className="text-2xl font-black text-identity-navy uppercase tracking-tight leading-none italic font-outfit">Liveness Verification</h2>
                    <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.15em] mt-3 italic">
                        {requireFrames
                            ? 'Camera Check · Active System'
                            : 'Quick Identity Validation'}
                    </p>
                </div>

                {/* Camera View */}
                <div className="p-10 relative z-10">
                    <div className="relative bg-identity-navy/20 rounded-[2rem] overflow-hidden border border-identity-sky/10 shadow-inner group" style={{ aspectRatio: '4/3' }}>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                                width: 1280,
                                height: 960,
                                facingMode: 'user'
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                        />

                        {/* Face Guide Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-64 h-80 transition-all duration-700">
                                {/* Oval guide */}
                                <div className="absolute inset-0 border-[3px] border-identity-sky/10 border-dashed rounded-[80px] scale-105"></div>

                                {/* Corner markers */}
                                <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-identity-sky rounded-tl-[40px]" />
                                <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-identity-sky rounded-tr-[40px]" />
                                <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-identity-sky rounded-bl-[40px]" />
                                <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-identity-sky rounded-br-[40px]" />
                                
                                {/* Scan line */}
                                {isCapturing && (
                                    <div className="absolute top-0 inset-x-8 h-px bg-identity-sky shadow-[0_0_15px_var(--identity-sky)] animate-scan-y rounded-full" />
                                )}
                            </div>
                        </div>

                        {/* Countdown Overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 bg-identity-navy/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="text-identity-sky text-[120px] font-black animate-ping opacity-80 italic">
                                    {countdown}
                                </div>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isCapturing && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 mx-6 mb-6 rounded-full overflow-hidden shadow-inner border border-identity-sky/5">
                                <div
                                    className="h-full bg-identity-sky transition-all duration-150 shadow-[0_0_12px_rgba(56,182,255,0.4)]"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-8 p-6 bg-identity-navy/5 rounded-[2rem] border border-identity-sky/10 shadow-inner">
                        <div className="flex items-start gap-5">
                            <div className="p-3 bg-identity-sky/10 text-identity-sky rounded-2xl">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-identity-navy uppercase tracking-[0.15em] mb-3 italic">{instruction}</p>
                                {!isCapturing && requireFrames && (
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[8px] font-black text-secondary/40 uppercase tracking-[0.2em]">
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(56,182,255,0.4)]"></div> Align Face in Guide</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(56,182,255,0.4)]"></div> Optimal Lighting</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(56,182,255,0.4)]"></div> Blink Frequently</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(56,182,255,0.4)]"></div> Slight Head Tilt</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Captured Frames Preview */}
                    {capturedFrames.length > 0 && (
                        <div className="mt-8">
                            <p className="text-[8px] font-black text-identity-navy/20 uppercase tracking-[0.15em] mb-3 italic">
                                BUFFER STATUS: {capturedFrames.length} FRAMES ARCHIVED
                            </p>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                {capturedFrames.slice(0, 8).map((frame, idx) => (
                                    <img
                                        key={idx}
                                        src={frame}
                                        alt={`Frame ${idx + 1}`}
                                        className="w-10 h-10 object-cover rounded-xl border border-identity-sky/10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                                    />
                                ))}
                                {capturedFrames.length > 8 && (
                                    <div className="w-10 h-10 bg-identity-navy/5 rounded-xl border border-identity-sky/10 flex items-center justify-center text-[8px] font-black text-identity-navy/20">
                                        +{capturedFrames.length - 8}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-10 py-8 bg-identity-navy/5 border-t border-identity-sky/5 flex justify-end gap-4 relative z-10">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isCapturing}
                            className="px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] text-identity-navy/40 hover:text-identity-navy hover:bg-identity-navy/5 transition-all disabled:opacity-20 active:scale-95 border border-transparent hover:border-identity-sky/20"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={startCapture}
                        disabled={isCapturing}
                        className="px-12 py-3 bg-identity-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] shadow-2xl shadow-identity-navy/20 hover:bg-identity-sky transition-all active:scale-95 border border-identity-navy"
                    >
                        {isCapturing ? 'Processing...' : 'Start Camera'}
                    </button>
                </div>
            </div>
        </div>
    );
}
