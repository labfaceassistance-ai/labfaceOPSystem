"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, CheckCircle, RefreshCw, AlertCircle, ArrowRight, User, Shield, Zap, Sparkles } from 'lucide-react';
import { API_URL } from '../utils/auth';

interface FaceEnrollmentScannerProps {
    onComplete: (captures: Record<string, string>) => void;
    initialCaptures?: Record<string, string>;
    requireAll?: boolean;
}

const ANGLES = [
    { id: 'front', label: 'Frontal Sync', instruction: 'Look straight at the scanner', icon: User },
    { id: 'left', label: 'Left Profile', instruction: 'Turn your head slowly to the left', icon: User },
    { id: 'right', label: 'Right Profile', instruction: 'Turn your head slowly to the right', icon: User },
    { id: 'up', label: 'High View', instruction: 'Tilt your head slightly up', icon: User },
    { id: 'down', label: 'Low View', instruction: 'Tilt your head slightly down', icon: User }
];

export default function FaceEnrollmentScanner({ 
    onComplete, 
    initialCaptures = {}, 
    requireAll = true 
}: FaceEnrollmentScannerProps) {
    const webcamRef = useRef<Webcam>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [captures, setCaptures] = useState<Record<string, string>>(initialCaptures);
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'DETECTING' | 'STABILIZING' | 'CAPTURING' | 'SUCCESS'>('IDLE');
    const [feedback, setFeedback] = useState('Initialize Biometric Stream');
    const [stabilityScore, setStabilityScore] = useState(0);

    const STABILITY_THRESHOLD = 5; // Frames of consistent pose required

    // Stability Reset when step changes
    useEffect(() => {
        setStabilityScore(0);
        if (isCapturing) {
            setStatus('DETECTING');
            setFeedback(`Looking for ${ANGLES[currentStep].label}...`);
        }
    }, [currentStep, isCapturing]);

    const detectPose = useCallback((landmarks: number[][]) => {
        if (!landmarks || landmarks.length < 5) return null;
        
        const lEye = landmarks[0];
        const rEye = landmarks[1];
        const nose = landmarks[2];
        
        const eyeWidth = Math.abs(rEye[0] - lEye[0]);
        const midPoint = (lEye[0] + rEye[0]) / 2;
        
        const noseOffsetX = (nose[0] - midPoint) / eyeWidth;
        const eyeLineY = (lEye[1] + rEye[1]) / 2;
        const noseOffsetY = (nose[1] - eyeLineY) / eyeWidth;

        if (Math.abs(noseOffsetX) < 0.2 && Math.abs(noseOffsetY - 0.6) < 0.2) return 'front';
        if (noseOffsetX < -0.4) return 'right';
        if (noseOffsetX > 0.4) return 'left';
        if (noseOffsetY < 0.3) return 'up';
        if (noseOffsetY > 0.9) return 'down';

        return 'unknown';
    }, []);

    const processFrame = useCallback(async () => {
        if (!webcamRef.current || status === 'CAPTURING' || status === 'SUCCESS') return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            const response = await axios.post(`${API_URL}/api/recognize`, { image: imageSrc });
            
            if (response.data.success && response.data.landmarks) {
                const landmarks = response.data.landmarks;
                const pose = detectPose(landmarks);
                const targetAngle = ANGLES[currentStep].id;

                if (pose === targetAngle) {
                    setStabilityScore(prev => prev + 1);
                    setStatus('STABILIZING');
                    setFeedback(`Hold steady... ${Math.min(100, ((stabilityScore + 1) / STABILITY_THRESHOLD) * 100).toFixed(0)}%`);
                    
                    if (stabilityScore + 1 >= STABILITY_THRESHOLD) {
                        capturePhoto(imageSrc);
                    }
                } else {
                    setStabilityScore(0);
                    setStatus('DETECTING');
                    setFeedback(`Looking for ${ANGLES[currentStep].label}...`);
                }
            } else {
                setStabilityScore(0);
                setStatus('IDLE');
                setFeedback('Position your face in the center');
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    }, [currentStep, status, detectPose, stabilityScore]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isCapturing) processFrame();
        }, 400); // Slightly slower for better stability
        return () => clearInterval(interval);
    }, [isCapturing, processFrame]);

    const capturePhoto = (img: string) => {
        const angle = ANGLES[currentStep].id;
        const newCaptures = { ...captures, [angle]: img };
        setCaptures(newCaptures);
        setStabilityScore(0);
        
        // Find next empty angle
        const nextEmptyIndex = ANGLES.findIndex((a, idx) => idx > currentStep && !newCaptures[a.id]);
        
        if (nextEmptyIndex !== -1) {
            setCurrentStep(nextEmptyIndex);
            setStatus('DETECTING');
        } else {
            // Check if ALL are done
            const allDone = ANGLES.every(a => newCaptures[a.id]);
            if (allDone) {
                setStatus('SUCCESS');
                setIsCapturing(false);
                // onComplete(newCaptures); // Let user manually finish if partial allowed, or auto-complete if required
            } else {
                // Return to first empty if any
                const firstEmpty = ANGLES.findIndex(a => !newCaptures[a.id]);
                if (firstEmpty !== -1) setCurrentStep(firstEmpty);
            }
        }
    };

    const resetScanner = () => {
        setCaptures({});
        setCurrentStep(0);
        setIsCapturing(true);
        setStatus('DETECTING');
    };

    const isAllCaptured = ANGLES.every(a => captures[a.id]);
    const hasAnyCapture = Object.keys(captures).length > 0;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8">
            {/* Header HUD */}
            <div className="bg-coffee p-8 rounded-[2rem] shadow-4xl border border-secondary/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-50"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-brand-cream font-black uppercase text-xl tracking-tighter">Neural Identity Sync</h3>
                        <p className="text-secondary/60 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap size={10} className="text-secondary animate-pulse" /> Non-Sequential Mode Active
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {ANGLES.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setCurrentStep(i)}
                                className={`w-3 h-3 rounded-full transition-all duration-500 border border-secondary/20 ${i === currentStep ? 'bg-secondary w-8 shadow-glow' : captures[ANGLES[i].id] ? 'bg-secondary/60' : 'bg-brand-cream/10'}`}
                                title={ANGLES[i].label}
                            ></button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scanner Viewport */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
                {!isCapturing && status !== 'SUCCESS' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-coffee backdrop-blur-md z-20 space-y-6">
                        <div className="w-24 h-24 bg-brand-cream/5 rounded-[2.5rem] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500 border border-brand-cream/10">
                            <Camera size={48} className="text-secondary" />
                        </div>
                        <button 
                            onClick={() => setIsCapturing(true)}
                            className="bg-secondary text-coffee px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-xl hover:bg-brand-cream transition-all active:scale-95"
                        >
                            Initialize Smart Sync
                        </button>
                    </div>
                ) : (
                    <>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                            className="w-full h-full object-cover"
                        />
                        
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-12">
                            {/* Premium Cyber-HUD Vertical Face Target */}
                            <div className="w-[240px] h-[340px] border-l-4 border-r-4 border-secondary/80 rounded-[50px] flex items-center justify-center overflow-hidden relative shadow-[0_0_30px_rgba(166,123,91,0.2)]">
                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-secondary/90 rounded-tl-[40px]"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-secondary/90 rounded-tr-[40px]"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-secondary/90 rounded-bl-[40px]"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-secondary/90 rounded-br-[40px]"></div>
                                
                                {/* Sweeping Scanline Effect */}
                                {status === 'DETECTING' && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-secondary shadow-[0_0_20px_#A67B5B] animate-scan-y"></div>
                                )}

                                {/* Stabilizing Lock Indicator */}
                                <div className={`w-16 h-16 rounded-full bg-secondary/30 border border-secondary animate-ping transition-all duration-500 flex items-center justify-center ${status === 'STABILIZING' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                                    <div className="w-4 h-4 bg-secondary rounded-full shadow-glow"></div>
                                </div>
                            </div>
                        </div>

                        {/* Status HUD */}
                        <div className="absolute bottom-6 inset-x-6 z-20">
                            <div className="bg-coffee/95 backdrop-blur-xl p-4 md:p-5 rounded-[2.5rem] border-2 border-secondary/20 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/5 mix-blend-overlay pointer-events-none"></div>
                                <div className="flex flex-col items-center text-center gap-1.5 relative z-10">
                                    <p className="text-secondary/80 text-[9px] font-black uppercase tracking-[0.4em]">{ANGLES[currentStep].label}</p>
                                    <p className="text-brand-cream font-bold text-sm leading-none">{feedback}</p>
                                </div>
                                <div className="w-full h-1.5 bg-black/40 rounded-full mt-4 overflow-hidden shadow-inner">
                                    {status === 'STABILIZING' ? (
                                        <div className="h-full bg-secondary shadow-glow scale-x-100 origin-left transition-transform duration-500 ease-out" style={{ transform: `scaleX(${Math.min(1, (stabilityScore + 1) / STABILITY_THRESHOLD)})` }}></div>
                                    ) : (
                                        <div className="h-full bg-secondary/20 w-0"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {status === 'SUCCESS' && (
                    <div className="absolute inset-0 bg-coffee/95 backdrop-blur-2xl z-40 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-secondary/20 text-secondary rounded-[2.5rem] flex items-center justify-center mb-8 shadow-4xl animate-bounce-subtle">
                            <CheckCircle size={56} />
                        </div>
                        <h4 className="text-3xl font-black text-brand-cream uppercase tracking-tight mb-3">Sync Optimized</h4>
                        <p className="text-brand-cream/40 text-[10px] font-medium uppercase tracking-[0.2em] mb-12 max-w-xs">All neural angles have been captured. You may now finalize the identity update.</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={resetScanner}
                                className="bg-brand-cream/10 text-brand-cream px-8 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-brand-cream/20 transition-all"
                            >
                                Reset Array
                            </button>
                            <button 
                                onClick={() => onComplete(captures)}
                                className="bg-secondary text-coffee px-12 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-4xl hover:scale-105 transition-all"
                            >
                                Finalize Synchronization
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instruction Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 backdrop-blur-xl p-6 rounded-[2rem] border border-coffee/5 flex items-center gap-4">
                    <div className="p-3 bg-coffee/5 text-coffee rounded-2xl">
                        <AlertCircle size={20} />
                    </div>
                    <p className="text-coffee/60 text-[11px] font-bold leading-relaxed italic">"{ANGLES[currentStep].instruction}"</p>
                </div>
                <div className="flex items-center justify-between bg-white/50 backdrop-blur-xl p-6 rounded-[2rem] border border-coffee/5">
                    <div className="flex -space-x-3">
                        {ANGLES.map((angle, i) => (
                            <button 
                                key={i} 
                                onClick={() => setCurrentStep(i)}
                                className={`w-10 h-10 rounded-full border-2 transition-all duration-300 overflow-hidden shadow-xl hover:scale-125 z-[${10-i}] ${i === currentStep ? 'border-secondary scale-110 shadow-glow ring-2 ring-secondary/20' : 'border-brand-cream'}`}
                            >
                                {captures[angle.id] ? (
                                    <img src={captures[angle.id]} className="w-full h-full object-cover" alt={angle.label} />
                                ) : (
                                    <div className="w-full h-full bg-coffee/5 flex items-center justify-center">
                                        <User size={12} className="text-coffee/20" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-coffee/30 uppercase tracking-widest">{Object.keys(captures).length}/5 VALIDATED</span>
                </div>
            </div>
            
            <style jsx global>{`
                .shadow-glow {
                    box-shadow: 0 0 15px rgba(212, 163, 115, 0.5);
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
