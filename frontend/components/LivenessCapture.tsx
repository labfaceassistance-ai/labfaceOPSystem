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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-maroon-950 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl w-full overflow-hidden border border-white/10 relative">
                {/* Decorative background */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/10 via-transparent to-transparent pointer-events-none" />

                {/* Header */}
                <div className="px-10 py-8 relative z-10 border-b border-white/5">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Liveness Verification</h2>
                    <p className="text-[10px] font-black text-brand-gold/60 uppercase tracking-[0.3em] mt-3">
                        {requireFrames
                            ? 'Neural Connectivity Check · Active Biometrics'
                            : 'Quick Identity Validation'}
                    </p>
                </div>

                {/* Camera View */}
                <div className="p-10 relative z-10">
                    <div className="relative bg-black rounded-[32px] overflow-hidden border border-white/10 shadow-inner group" style={{ aspectRatio: '4/3' }}>
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
                                <div className="absolute inset-0 border-[3px] border-white/10 border-dashed rounded-[80px] scale-105"></div>

                                {/* Corner markers */}
                                <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-brand-gold rounded-tl-[40px]" />
                                <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-brand-gold rounded-tr-[40px]" />
                                <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-brand-gold rounded-bl-[40px]" />
                                <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-brand-gold rounded-br-[40px]" />
                                
                                {/* Scan line */}
                                {isCapturing && (
                                    <div className="absolute top-0 inset-x-8 h-px bg-brand-gold shadow-[0_0_15px_#F5BD4F] animate-scan-y rounded-full" />
                                )}
                            </div>
                        </div>

                        {/* Countdown Overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 bg-maroon-950/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="text-white text-[120px] font-black animate-ping opacity-80">
                                    {countdown}
                                </div>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isCapturing && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 mx-6 mb-6 rounded-full overflow-hidden shadow-inner border border-white/5">
                                <div
                                    className="h-full bg-brand-gold transition-all duration-150 shadow-[0_0_12px_rgba(245,189,79,0.4)]"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-8 p-6 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                        <div className="flex items-start gap-5">
                            <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-2xl">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-widest mb-3">{instruction}</p>
                                {!isCapturing && requireFrames && (
                                    <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[8px] font-black text-secondary/40 uppercase tracking-[0.2em]">
                                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-brand-gold rounded-full"></div> Align Face in Guide</li>
                                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-brand-gold rounded-full"></div> Optimal Lighting</li>
                                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-brand-gold rounded-full"></div> Blink Frequently</li>
                                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-brand-gold rounded-full"></div> Slight Head Tilt</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Captured Frames Preview */}
                    {capturedFrames.length > 0 && (
                        <div className="mt-8">
                            <p className="text-[8px] font-black text-secondary/20 uppercase tracking-[0.4em] mb-3">
                                BUFFER STATUS: {capturedFrames.length} FRAMES ARCHIVED
                            </p>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                {capturedFrames.slice(0, 8).map((frame, idx) => (
                                    <img
                                        key={idx}
                                        src={frame}
                                        alt={`Frame ${idx + 1}`}
                                        className="w-10 h-10 object-cover rounded-xl border border-white/10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                                    />
                                ))}
                                {capturedFrames.length > 8 && (
                                    <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-[8px] font-black text-secondary/20">
                                        +{capturedFrames.length - 8}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-10 py-8 bg-maroon-950 border-t border-white/5 flex justify-end gap-4 relative z-10">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isCapturing}
                            className="px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-secondary/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95 border border-transparent hover:border-white/5"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={startCapture}
                        disabled={isCapturing}
                        className="px-12 py-3 bg-brand-gold text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-gold/20 hover:brightness-110 disabled:opacity-20 transition-all active:scale-95 border border-brand-gold"
                    >
                        {isCapturing ? 'Synchronizing...' : 'Initialize Capture'}
                    </button>
                </div>
            </div>
        </div>
    );
}
