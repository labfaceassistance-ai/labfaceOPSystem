"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, AlertCircle, User, Zap, Scan, Loader2 } from 'lucide-react';

interface FaceEnrollmentScannerProps {
    onComplete: (captures: Record<string, string>) => void;
    initialCaptures?: Record<string, string>;
    requireAll?: boolean;
    selective?: boolean;
}

const ANGLES = [
    { id: 'front', label: 'Frontal View',  instruction: 'Look straight at the scanner',       meshColor: '#0ea5e9' },
    { id: 'left',  label: 'Left Profile',  instruction: 'Turn your head slowly to the left',  meshColor: '#0ea5e9' },
    { id: 'right', label: 'Right Profile', instruction: 'Turn your head slowly to the right', meshColor: '#0ea5e9' },
    { id: 'up',    label: 'High View',     instruction: 'Tilt your head slightly upward',     meshColor: '#0ea5e9' },
    { id: 'down',  label: 'Low View',      instruction: 'Tilt your head slightly downward',   meshColor: '#0ea5e9' },
];

const STABILITY_THRESHOLD = 6;

// Face contour + feature connection maps
const FACE_CONTOUR = [
    [10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],
    [454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,378],[378,400],
    [400,377],[377,152],[152,148],[148,176],[176,149],[149,150],[150,136],[136,172],
    [172,58],[58,132],[132,93],[93,234],[234,127],[127,162],[162,21],[21,54],
    [54,103],[103,67],[67,109],[109,10],
];
const LIPS = [
    [61,146],[146,91],[91,181],[181,84],[84,17],[17,314],[314,405],[405,321],
    [321,375],[375,291],[61,185],[185,40],[40,39],[39,37],[37,0],[0,267],
    [267,269],[269,270],[270,409],[409,291],
];
const LEFT_EYE  = [[33,7],[7,163],[163,144],[144,145],[145,153],[153,154],[154,155],[155,133],[33,246],[246,161],[161,160],[160,159],[159,158],[158,157],[157,173],[173,133]];
const RIGHT_EYE = [[362,382],[382,381],[381,380],[380,374],[374,373],[373,390],[390,249],[249,263],[362,398],[398,384],[384,385],[385,386],[386,387],[387,388],[388,466],[466,263]];

export default function FaceEnrollmentScanner({
    onComplete,
    initialCaptures = {},
    selective = false,
}: FaceEnrollmentScannerProps) {
    const webcamRef    = useRef<Webcam>(null);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const faceMeshRef  = useRef<any>(null);
    const animFrameRef = useRef<number | null>(null);

    // ── All mutable state that the MediaPipe onResults closure needs ──
    const currentStepRef    = useRef(0);
    const statusRef         = useRef<string>('IDLE');
    const stabilityRef      = useRef(0);
    const capturesRef       = useRef<Record<string, string>>(initialCaptures);
    const isCapturingRef    = useRef(false);
    const onCompleteRef     = useRef(onComplete);

    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    // ── Mirrored React state for rendering only ──
    const [currentStep,    setCurrentStep]    = useState(0);
    const [captures,       setCaptures]       = useState<Record<string, string>>(initialCaptures);
    const [isCapturing,    setIsCapturing]    = useState(false);
    const [status,         setStatus]         = useState<'IDLE' | 'LOADING' | 'DETECTING' | 'STABILIZING' | 'SUCCESS'>('IDLE');
    const [feedback,       setFeedback]       = useState('Start Camera Scanner');
    const [stabilityScore, setStabilityScore] = useState(0);
    const [faceDetected,   setFaceDetected]   = useState(false);
    const [mpReady,        setMpReady]        = useState(false);

    // Finalization Loading State
    const [isFinalizing,   setIsFinalizing]   = useState(false);

    // Selective Update State
    const [targetAngles,   setTargetAngles]   = useState<string[]>(['front', 'left', 'right', 'up', 'down']);
    const [sessionCompleted, setSessionCompleted] = useState<string[]>([]);
    const targetAnglesRef  = useRef<string[]>(['front', 'left', 'right', 'up', 'down']);

    useEffect(() => { targetAnglesRef.current = targetAngles; }, [targetAngles]);

    // Keep refs in sync whenever state updates
    useEffect(() => { currentStepRef.current = currentStep; },   [currentStep]);
    useEffect(() => { statusRef.current      = status; },        [status]);
    useEffect(() => { stabilityRef.current   = stabilityScore; },[stabilityScore]);
    useEffect(() => { capturesRef.current    = captures; },      [captures]);
    useEffect(() => { isCapturingRef.current = isCapturing; },   [isCapturing]);

    // ── Head pose detection logic ──
    const detectPose = (landmarks: any[]): string | null => {
        if (!landmarks || landmarks.length < 468) return null;
        const nose     = landmarks[4];
        const leftEye  = landmarks[33];
        const rightEye = landmarks[263];
        const chin     = landmarks[152];
        const forehead = landmarks[10];

        const eyeMidX    = (leftEye.x  + rightEye.x)  / 2;
        const eyeWidth   = Math.abs(rightEye.x - leftEye.x);
        const eyeMidY    = (leftEye.y  + rightEye.y)  / 2;
        const faceHeight = Math.abs(chin.y - forehead.y);

        const yaw   = (nose.x - eyeMidX) / (eyeWidth  || 0.01);
        const pitch = (nose.y - eyeMidY) / (faceHeight || 0.01);

        if (Math.abs(yaw) < 0.12 && Math.abs(pitch - 0.25) < 0.12) return 'front';
        if (yaw  < -0.18) return 'right';
        if (yaw  >  0.18) return 'left';
        if (pitch < 0.10) return 'up';
        if (pitch > 0.40) return 'down';
        return 'unknown';
    };

    // ── Voice Guidance Logic ──
    const lastSpokenRef = useRef<string>('');
    const diagnosticTimerRef = useRef<number>(0);

    const speak = useCallback((text: string, force = false) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        if (!force && (lastSpokenRef.current === text && window.speechSynthesis.speaking)) return;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        
        lastSpokenRef.current = text;
        window.speechSynthesis.speak(utterance);
    }, []);

    const capturePhoto = useCallback((imageSrc: string) => {
        const step  = currentStepRef.current;
        const angleId = ANGLES[step].id;
        const updated = { ...capturesRef.current, [angleId]: imageSrc };

        capturesRef.current = updated;
        setCaptures({ ...updated });
        setStabilityScore(0);
        stabilityRef.current = 0;
        diagnosticTimerRef.current = 0;

        setSessionCompleted(prev => {
            const nextSession = Array.from(new Set([...prev, angleId]));
            const isFinished = targetAnglesRef.current.every(t => nextSession.includes(t));
            
            if (isFinished) {
                statusRef.current = 'SUCCESS';
                setStatus('SUCCESS');
                isCapturingRef.current = false;
                setIsCapturing(false);
                speak(`${ANGLES[step].label} secured. Verification sequence complete.`, true);
            } else {
                const nextTargetIdx = ANGLES.findIndex((a, idx) => 
                    targetAnglesRef.current.includes(a.id) && !nextSession.includes(a.id)
                );
                
                if (nextTargetIdx !== -1) {
                    currentStepRef.current = nextTargetIdx;
                    setCurrentStep(nextTargetIdx);
                    statusRef.current = 'DETECTING';
                    setStatus('DETECTING');
                    
                    // Priority Speech: Success message first
                    speak(`${ANGLES[step].label} captured successfully.`, true);
                    
                    // Buffer before next instruction to avoid overlap
                    setTimeout(() => {
                        if (isCapturingRef.current && currentStepRef.current === nextTargetIdx) {
                            speak(ANGLES[nextTargetIdx].instruction, false);
                        }
                    }, 2200);
                }
            }
            return nextSession;
        });
    }, [speak]);

    const handleFinalize = async () => {
        setIsFinalizing(true);
        try {
            await onCompleteRef.current(capturesRef.current);
        } catch (err) {
            console.error("Finalization failed:", err);
        } finally {
            setIsFinalizing(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            setStatus('LOADING');
            statusRef.current = 'LOADING';
            try {
                const { FaceMesh } = await import('@mediapipe/face_mesh');
                const mesh = new FaceMesh({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
                });
                mesh.setOptions({
                    maxNumFaces:            1,
                    refineLandmarks:        true,
                    minDetectionConfidence: 0.6,
                    minTrackingConfidence:  0.6,
                });
                mesh.onResults((results: any) => {
                    if (cancelled) return;
                    const canvas = canvasRef.current;
                    const video  = webcamRef.current?.video;
                    if (!canvas || !video) return;
                    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                        canvas.width  = video.videoWidth  || 1280;
                        canvas.height = video.videoHeight || 720;
                    }
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const detected = results.multiFaceLandmarks?.length > 0;
                    setFaceDetected(detected);
                    
                    if (!detected) {
                        stabilityRef.current = 0;
                        setStabilityScore(0);
                        if (isCapturingRef.current) setFeedback('Position your face in the frame');
                        return;
                    }
                    
                    if (statusRef.current === 'SUCCESS') return;
                    
                    const landmarks = results.multiFaceLandmarks[0];
                    const step      = currentStepRef.current;
                    const angle     = ANGLES[step];
                    const meshColor = angle?.meshColor ?? '#0ea5e9';
                    const { width, height } = canvas;

                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
                    
                    if (eyeDistance < 0.15) {
                        setFeedback('Face too far. Please step closer.');
                        if (Date.now() - diagnosticTimerRef.current > 4000) {
                            speak("Please step closer to the camera.", true);
                            diagnosticTimerRef.current = Date.now();
                        }
                        return;
                    }

                    const drawConn = (conns: number[][], color: string, lw: number) => {
                        ctx.strokeStyle = color;
                        ctx.lineWidth   = lw;
                        ctx.beginPath();
                        for (const [s, e] of conns) {
                            const a = landmarks[s], b = landmarks[e];
                            if (!a || !b) continue;
                            ctx.moveTo(a.x * width, a.y * height);
                            ctx.lineTo(b.x * width, b.y * height);
                        }
                        ctx.stroke();
                    };
                    drawConn(FACE_CONTOUR, meshColor + '99', 1.0);
                    drawConn(LIPS,        meshColor + '77', 1.2);
                    drawConn(LEFT_EYE,    '#0ea5e988',       1.0);
                    drawConn(RIGHT_EYE,   '#0ea5e988',       1.0);
                    
                    if (!isCapturingRef.current) return;
                    
                    const pose        = detectPose(landmarks);
                    const targetAngle = angle?.id;

                    if (pose === targetAngle) {
                        const next = stabilityRef.current + 1;
                        stabilityRef.current = next;
                        const pct = Math.min(100, Math.round((next / STABILITY_THRESHOLD) * 100));
                        statusRef.current = 'STABILIZING';
                        setStatus('STABILIZING');
                        setStabilityScore(next);
                        setFeedback(`Hold steady... ${pct}%`);
                        
                        if (next >= STABILITY_THRESHOLD) {
                            const img = webcamRef.current?.getScreenshot();
                            if (img) capturePhoto(img);
                        }
                        diagnosticTimerRef.current = Date.now();
                    } else {
                        stabilityRef.current = 0;
                        setStabilityScore(0);
                        statusRef.current = 'DETECTING';
                        setStatus('DETECTING');
                        setFeedback(`Looking for ${angle?.label}...`);

                        if (pose !== 'unknown' && pose !== targetAngle && pose !== null) {
                            let correction = "";
                            if (targetAngle === 'left' && pose === 'right') correction = "You are turning right. Please turn left.";
                            if (targetAngle === 'right' && pose === 'left') correction = "You are turning left. Please turn right.";
                            if (targetAngle === 'front' && pose !== 'front') correction = "Please look straight at the camera.";
                            if (targetAngle === 'up' && pose === 'down') correction = "You are looking down. Please tilt your head up.";
                            if (targetAngle === 'down' && pose === 'up') correction = "You are looking up. Please tilt your head down.";
                            
                            if (correction && (Date.now() - diagnosticTimerRef.current > 3500)) {
                                speak(correction, true);
                                diagnosticTimerRef.current = Date.now();
                            }
                        }
                    }
                });
                if (!cancelled) {
                    faceMeshRef.current = mesh;
                    setMpReady(true);
                    setStatus('IDLE');
                    statusRef.current = 'IDLE';
                    setFeedback('Start Camera Scanner');
                }
            } catch (err) {
                console.error('[FaceEnrollment] MediaPipe init failed:', err);
            }
        };
        init();
        return () => {
            cancelled = true;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, [capturePhoto, speak]);

    const runLoop = useCallback(async () => {
        const video = webcamRef.current?.video;
        const mesh  = faceMeshRef.current;
        if (!video || !mesh) return;
        if (!isCapturingRef.current && statusRef.current !== 'SUCCESS') {
            animFrameRef.current = requestAnimationFrame(runLoop);
            return;
        }
        if (video.readyState === 4) {
            try { await mesh.send({ image: video }); } catch {}
        }
        animFrameRef.current = requestAnimationFrame(runLoop);
    }, []);

    useEffect(() => {
        if (isCapturing) {
            animFrameRef.current = requestAnimationFrame(runLoop);
        } else {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }
    }, [isCapturing, runLoop]);

    useEffect(() => {
        stabilityRef.current = 0;
        setStabilityScore(0);
        // Only speak if this is a manual jump in IDLE or if we just started
        if (isCapturing && status === 'IDLE') {
            const instruction = ANGLES[currentStep].instruction;
            speak(instruction, true);
        }
    }, [currentStep, speak, isCapturing, status]);

    const resetScanner = () => {
        setSessionCompleted([]);
        currentStepRef.current = 0;
        stabilityRef.current = 0;
        isCapturingRef.current = true;
        setCurrentStep(0);
        setStabilityScore(0);
        setIsCapturing(true);
        setStatus('DETECTING');
        speak(ANGLES[0].instruction, true);
    };

    const handleStart = () => {
        setSessionCompleted([]);
        currentStepRef.current = 0;
        isCapturingRef.current = true;
        setIsCapturing(true);
        setStatus('DETECTING');
        setCurrentStep(0);
        speak(ANGLES[0].instruction, true);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* ── Header HUD ── */}
            <div className="bg-identity-navy px-8 py-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="text-white font-black uppercase text-base tracking-tight flex items-center gap-3 leading-none mb-1.5 font-outfit">
                            <Scan size={18} className="text-identity-sky animate-pulse shrink-0" />
                            Biometric Sync
                        </h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap size={9} className="text-identity-sky animate-pulse" />
                            5 Targets Required
                        </p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        {ANGLES.map((a, i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={!selective || status !== 'IDLE'}
                                onClick={() => {
                                    if (selective && status === 'IDLE') {
                                        currentStepRef.current = i;
                                        setCurrentStep(i);
                                    }
                                }}
                                className={`h-1.5 flex-1 min-w-[18px] md:min-w-[24px] transition-all duration-500 rounded-full border border-white/5 relative ${
                                    i === currentStep          ? 'bg-identity-sky border-identity-sky/50 shadow-[0_0_12px_rgba(14,165,233,0.4)]' :
                                    sessionCompleted.includes(a.id) ? 'bg-emerald-500' :
                                                                  'bg-white/10'
                                } ${selective && status === 'IDLE' ? 'hover:bg-identity-sky/60 cursor-pointer' : 'cursor-default'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Camera Container ── */}
            <div className="relative aspect-[3/4] md:aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xl">
                {!isCapturing && status !== 'SUCCESS' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-identity-navy z-20 gap-4 animate-fade-in">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-4">
                            <Camera size={28} className="text-identity-sky/40" />
                        </div>
                        {status === 'LOADING' ? (
                            <div className="text-center">
                                <Loader2 className="animate-spin text-identity-sky mx-auto mb-4" size={24} />
                                <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Loading Matrix...</p>
                            </div>
                        ) : (
                            <div className="text-center px-12">
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    className="bg-identity-sky text-white px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-identity-sky/20 hover:bg-white hover:text-identity-navy transition-all active:scale-95 border border-identity-sky"
                                >
                                    {selective ? `Sync ${ANGLES[currentStep].label}` : "Start Biometric Scanner"}
                                </button>
                                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-6 opacity-60">
                                    {selective ? `Targeted HUD update active` : "Full Identity Capture Initiated"}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {(isCapturing || status === 'SUCCESS') && (
                    <>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                        
                        <div className="absolute bottom-4 inset-x-3 md:inset-x-8 z-20">
                            <div className="bg-identity-navy/80 backdrop-blur-md px-4 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            status === 'STABILIZING' ? 'bg-emerald-500 animate-pulse' :
                                            faceDetected             ? 'bg-identity-sky' :
                                                                       'bg-rose-500 animate-pulse'
                                        }`} />
                                        <p className="text-white font-black text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.15em] truncate">
                                            {feedback}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                                        <p className="text-identity-sky/60 font-black text-[7px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.15em]">
                                            {ANGLES[currentStep]?.label}
                                        </p>
                                        <div className="w-12 md:w-24 h-1 md:h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-identity-sky rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                                                style={{ width: `${Math.min(100, (stabilityScore / STABILITY_THRESHOLD) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {status === 'SUCCESS' && (
                    <div className="absolute inset-0 bg-identity-navy/98 backdrop-blur-3xl z-40 flex flex-col items-center justify-center px-6 md:px-16 text-center animate-fade-in">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-identity-sky/10 text-identity-sky rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-10 border border-identity-sky/20 shadow-2xl">
                            {isFinalizing ? <Loader2 size={32} className="animate-spin text-identity-sky md:w-14 md:h-14" /> : <CheckCircle size={32} className="md:w-14 md:h-14" />}
                        </div>
                        <h4 className="text-xl md:text-4xl font-black text-white uppercase tracking-tight mb-2 md:mb-4 font-outfit">
                            {isFinalizing ? "Synchronizing..." : "Face Saved"}
                        </h4>
                        <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-8 md:mb-12 max-w-sm leading-relaxed">
                            {isFinalizing ? "Uploading biometric data to Neural Matrix core. Do not close this window." : "Photos successfully uploaded and saved."}
                        </p>
                        <div className="flex flex-col md:flex-row gap-3 md:gap-5 w-full md:w-auto px-10 md:px-0">
                            <button
                                type="button"
                                onClick={resetScanner}
                                disabled={isFinalizing}
                                className="w-full md:w-auto bg-white/5 text-slate-300 px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-[0.15em] hover:bg-white/10 transition-all border border-white/5 disabled:opacity-20"
                            >
                                Retake Photo
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalize}
                                disabled={isFinalizing}
                                className="w-full md:w-auto bg-identity-sky text-white px-8 md:px-14 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.25em] shadow-2xl shadow-identity-sky/30 hover:bg-white hover:text-identity-navy transition-all active:scale-95 border border-identity-sky flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-identity-sky disabled:hover:text-white"
                            >
                                {isFinalizing && <Loader2 size={12} className="animate-spin" />}
                                {isFinalizing ? "Synchronizing..." : "Finalize Capture"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
