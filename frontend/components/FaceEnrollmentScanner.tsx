"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, AlertCircle, User, Zap, Scan } from 'lucide-react';

interface FaceEnrollmentScannerProps {
    onComplete: (captures: Record<string, string>) => void;
    initialCaptures?: Record<string, string>;
    requireAll?: boolean;
}

const ANGLES = [
    { id: 'front', label: 'Frontal Sync',  instruction: 'Look straight at the scanner',       meshColor: '#A67B5B' },
    { id: 'left',  label: 'Left Profile',  instruction: 'Turn your head slowly to the left',  meshColor: '#22c55e' },
    { id: 'right', label: 'Right Profile', instruction: 'Turn your head slowly to the right', meshColor: '#3b82f6' },
    { id: 'up',    label: 'High View',     instruction: 'Tilt your head slightly upward',     meshColor: '#f59e0b' },
    { id: 'down',  label: 'Low View',      instruction: 'Tilt your head slightly downward',   meshColor: '#ec4899' },
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
}: FaceEnrollmentScannerProps) {
    const webcamRef    = useRef<Webcam>(null);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const faceMeshRef  = useRef<any>(null);
    const animFrameRef = useRef<number | null>(null);

    // ── All mutable state that the MediaPipe onResults closure needs ──
    // Using refs so the single registered callback always reads the latest values.
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
    const [feedback,       setFeedback]       = useState('Initialize Biometric Stream');
    const [stabilityScore, setStabilityScore] = useState(0);
    const [faceDetected,   setFaceDetected]   = useState(false);
    const [mpReady,        setMpReady]        = useState(false);

    // Keep refs in sync whenever state updates
    useEffect(() => { currentStepRef.current = currentStep; },   [currentStep]);
    useEffect(() => { statusRef.current      = status; },        [status]);
    useEffect(() => { stabilityRef.current   = stabilityScore; },[stabilityScore]);
    useEffect(() => { capturesRef.current    = captures; },      [captures]);
    useEffect(() => { isCapturingRef.current = isCapturing; },   [isCapturing]);

    // ── Head pose detection from 468 MediaPipe landmarks ──────────────────────
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

    // ── capturePhoto — also uses refs, safe inside closure ────────────────────
    const capturePhoto = useCallback((imageSrc: string) => {
        const step  = currentStepRef.current;
        const angle = ANGLES[step].id;
        const updated = { ...capturesRef.current, [angle]: imageSrc };

        // Persist into ref immediately so next closure reads it
        capturesRef.current = updated;
        setCaptures({ ...updated });
        setStabilityScore(0);
        stabilityRef.current = 0;

        const nextEmpty = ANGLES.findIndex((a, idx) => idx > step && !updated[a.id]);
        if (nextEmpty !== -1) {
            currentStepRef.current = nextEmpty;
            setCurrentStep(nextEmpty);
            statusRef.current = 'DETECTING';
            setStatus('DETECTING');
        } else {
            const allDone = ANGLES.every(a => updated[a.id]);
            if (allDone) {
                statusRef.current = 'SUCCESS';
                setStatus('SUCCESS');
                isCapturingRef.current = false;
                setIsCapturing(false);
            } else {
                const firstEmpty = ANGLES.findIndex(a => !updated[a.id]);
                if (firstEmpty !== -1) {
                    currentStepRef.current = firstEmpty;
                    setCurrentStep(firstEmpty);
                }
            }
        }
    }, []);

    // ── Initialize MediaPipe FaceMesh ONCE — register onResults ONCE ──────────
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

                // ── THE FIX: onResults registered ONCE, reads mutable state via refs ──
                mesh.onResults((results: any) => {
                    if (cancelled) return;

                    const canvas = canvasRef.current;
                    const video  = webcamRef.current?.video;
                    if (!canvas || !video) return;

                    // Sync canvas to video dimensions
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

                    // Don't process poses after SUCCESS
                    if (statusRef.current === 'SUCCESS') return;

                    const landmarks = results.multiFaceLandmarks[0];
                    const step      = currentStepRef.current;
                    const angle     = ANGLES[step];
                    const meshColor = angle?.meshColor ?? '#A67B5B';
                    const { width, height } = canvas;

                    // ── Draw mesh helper ──
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

                    drawConn(FACE_CONTOUR, meshColor + 'CC', 1.0);
                    drawConn(LIPS,        meshColor + 'AA', 1.2);
                    drawConn(LEFT_EYE,    '#FFFFFFCC',       1.0);
                    drawConn(RIGHT_EYE,   '#FFFFFFCC',       1.0);

                    // Key landmark dots
                    ctx.fillStyle = meshColor;
                    for (const idx of [4, 10, 33, 152, 263, 61, 291]) {
                        const pt = landmarks[idx];
                        if (!pt) continue;
                        ctx.beginPath();
                        ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // ── Pose detection & stability (only when actively capturing) ──
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
                    } else {
                        stabilityRef.current = 0;
                        setStabilityScore(0);
                        statusRef.current = 'DETECTING';
                        setStatus('DETECTING');
                        setFeedback(`Looking for ${angle?.label}...`);
                    }
                });

                if (!cancelled) {
                    faceMeshRef.current = mesh;
                    setMpReady(true);
                    setStatus('IDLE');
                    statusRef.current = 'IDLE';
                    setFeedback('Initialize Biometric Stream');
                }
            } catch (err) {
                console.error('[FaceEnrollment] MediaPipe init failed:', err);
                if (!cancelled) {
                    setStatus('IDLE');
                    statusRef.current = 'IDLE';
                    setFeedback('Ready — press Initialize to start');
                }
            }
        };

        init();
        return () => {
            cancelled = true;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Animation loop: feed video frames to MediaPipe at ~30fps ──────────────
    const runLoop = useCallback(async () => {
        const video = webcamRef.current?.video;
        const mesh  = faceMeshRef.current;
        const canvas = canvasRef.current;

        if (!video || !mesh || !canvas) return;
        if (!isCapturingRef.current && statusRef.current !== 'SUCCESS') {
            animFrameRef.current = requestAnimationFrame(runLoop);
            return;
        }
        if (video.readyState === 4) {
            try { await mesh.send({ image: video }); } catch {}
        }
        animFrameRef.current = requestAnimationFrame(runLoop);
    }, []);

    // Start loop when capturing begins
    useEffect(() => {
        if (isCapturing) {
            animFrameRef.current = requestAnimationFrame(runLoop);
        } else {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isCapturing, runLoop]);

    // Reset feedback when step changes
    useEffect(() => {
        stabilityRef.current = 0;
        setStabilityScore(0);
        if (isCapturing && status !== 'SUCCESS') {
            setStatus('DETECTING');
            statusRef.current = 'DETECTING';
            setFeedback(`Looking for ${ANGLES[currentStep].label}...`);
        }
    }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

    const resetScanner = () => {
        capturesRef.current  = {};
        currentStepRef.current = 0;
        stabilityRef.current = 0;
        isCapturingRef.current = true;
        statusRef.current    = 'DETECTING';

        setCaptures({});
        setCurrentStep(0);
        setStabilityScore(0);
        setIsCapturing(true);
        setStatus('DETECTING');
        setFeedback(`Looking for ${ANGLES[0].label}...`);

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleStart = () => {
        isCapturingRef.current = true;
        statusRef.current      = 'DETECTING';
        setIsCapturing(true);
        setStatus('DETECTING');
        setFeedback(`Looking for ${ANGLES[0].label}...`);
        animFrameRef.current   = requestAnimationFrame(runLoop);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-5">

            {/* ── Header HUD ─────────────────────────────────────────────── */}
            <div className="bg-coffee px-8 py-5 rounded-3xl border border-secondary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
                <div className="relative z-10 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="text-brand-cream font-black uppercase text-base tracking-tight flex items-center gap-2 leading-none mb-1">
                            <Scan size={16} className="text-secondary animate-pulse shrink-0" />
                            Neural Identity Sync
                        </h3>
                        <p className="text-secondary/70 text-[9px] font-bold uppercase tracking-[0.25em] flex items-center gap-1.5">
                            <Zap size={9} className="text-secondary animate-pulse" />
                            {mpReady ? 'MediaPipe AI · Client-Side Processing' : 'Loading AI Engine...'}
                        </p>
                    </div>
                    {/* Step progress dots */}
                    <div className="flex items-center gap-2 shrink-0">
                        {ANGLES.map((a, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { if (isCapturing && status !== 'SUCCESS') { currentStepRef.current = i; setCurrentStep(i); }}}
                                title={a.label}
                                className={`h-2.5 rounded-full transition-all duration-300 border border-secondary/20 ${
                                    i === currentStep          ? 'bg-secondary w-7'        :
                                    captures[a.id]             ? 'bg-secondary/50 w-2.5'   :
                                                                 'bg-brand-cream/10 w-2.5'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Camera + Canvas Overlay ─────────────────────────────────── */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-xl">

                {/* Idle / Not started */}
                {!isCapturing && status !== 'SUCCESS' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-coffee z-20 gap-6">
                        <div className="w-20 h-20 bg-brand-cream/5 rounded-3xl flex items-center justify-center border border-brand-cream/10">
                            <Camera size={40} className="text-secondary" />
                        </div>

                        {status === 'LOADING' ? (
                            <div className="text-center space-y-1">
                                <p className="text-secondary text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    Loading AI Engine...
                                </p>
                                <p className="text-brand-cream/30 text-[9px] font-medium">Downloading MediaPipe model (~3 MB)</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <p className="text-brand-cream/50 text-[10px] font-medium uppercase tracking-widest">
                                    5 angles · ~30 seconds
                                </p>
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    className="bg-secondary text-coffee px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 transition-all active:scale-95"
                                >
                                    Initialize Smart Sync
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Live camera */}
                {(isCapturing || status === 'SUCCESS') && (
                    <>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                            className="w-full h-full object-cover"
                        />

                        {/* MediaPipe 3D mesh canvas overlay */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                        />

                        {/* Vertical face reticle */}
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-16">
                            <div className={`w-[200px] h-[300px] rounded-[48px] relative transition-all duration-500 ${
                                status === 'STABILIZING'
                                    ? 'shadow-[0_0_0_3px_rgba(166,123,91,0.9),0_0_40px_rgba(166,123,91,0.4)]'
                                    : 'shadow-[0_0_0_2px_rgba(166,123,91,0.5)]'
                            }`}>
                                {/* Corner brackets */}
                                <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-secondary rounded-tl-[40px]" />
                                <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-secondary rounded-tr-[40px]" />
                                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-secondary rounded-bl-[40px]" />
                                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-secondary rounded-br-[40px]" />

                                {/* Sweep scanline */}
                                {status === 'DETECTING' && (
                                    <div className="absolute top-0 inset-x-4 h-px bg-secondary shadow-[0_0_12px_#A67B5B] animate-scan-y rounded-full" />
                                )}

                                {/* Lock-on pulse */}
                                {status === 'STABILIZING' && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full border-2 border-secondary/80 bg-secondary/20 animate-ping" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status HUD pill — docked at bottom */}
                        <div className="absolute bottom-4 inset-x-4 z-20">
                            <div className="bg-coffee/95 backdrop-blur-xl px-5 py-4 rounded-2xl border border-secondary/15 shadow-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            status === 'STABILIZING' ? 'bg-green-400 animate-pulse' :
                                            faceDetected             ? 'bg-secondary animate-pulse' :
                                                                       'bg-red-400 animate-pulse'
                                        }`} />
                                        <p className="text-secondary/80 text-[9px] font-black uppercase tracking-[0.3em] leading-none">
                                            {ANGLES[currentStep]?.label}
                                        </p>
                                    </div>
                                    <p className="text-brand-cream/40 text-[9px] font-bold tabular-nums">
                                        {Object.keys(captures).length}/5
                                    </p>
                                </div>
                                <p className="text-brand-cream font-bold text-sm leading-none mb-3">{feedback}</p>
                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-secondary rounded-full transition-all duration-200 ease-out"
                                        style={{ width: `${Math.min(100, (stabilityScore / STABILITY_THRESHOLD) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── SUCCESS OVERLAY ── */}
                {status === 'SUCCESS' && (
                    <div className="absolute inset-0 bg-coffee/96 backdrop-blur-2xl z-40 flex flex-col items-center justify-center px-10 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-secondary/20 text-secondary rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                            <CheckCircle size={44} />
                        </div>
                        <h4 className="text-2xl font-black text-brand-cream uppercase tracking-tight mb-2">
                            Sync Complete
                        </h4>
                        <p className="text-brand-cream/50 text-[10px] font-medium uppercase tracking-[0.2em] mb-8 max-w-xs leading-relaxed">
                            All 5 neural angles captured. Ready to finalize enrollment.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={resetScanner}
                                className="bg-brand-cream/10 text-brand-cream px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-cream/20 transition-all active:scale-95"
                            >
                                Reset
                            </button>
                            {/* THE FIX: capturesRef.current guarantees all 5 captures are sent */}
                            <button
                                type="button"
                                onClick={() => onCompleteRef.current(capturesRef.current)}
                                className="bg-secondary text-coffee px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 transition-all active:scale-95"
                            >
                                Finalize Sync →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instruction card */}
                <div className="bg-white/60 dark:bg-black/20 backdrop-blur-xl p-5 rounded-2xl border border-coffee/10 flex items-start gap-4">
                    <div className="p-2.5 bg-coffee/8 text-coffee rounded-xl shrink-0 mt-0.5">
                        <AlertCircle size={16} />
                    </div>
                    <p className="text-coffee/70 text-xs font-semibold leading-relaxed">
                        "{ANGLES[currentStep]?.instruction}"
                    </p>
                </div>

                {/* Thumbnail strip card */}
                <div className="bg-white/60 dark:bg-black/20 backdrop-blur-xl p-5 rounded-2xl border border-coffee/10 flex items-center justify-between gap-4">
                    <div className="flex -space-x-3">
                        {ANGLES.map((angle, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    if (isCapturing && status !== 'SUCCESS') {
                                        currentStepRef.current = i;
                                        setCurrentStep(i);
                                    }
                                }}
                                title={angle.label}
                                className={`w-12 h-12 rounded-full border-2 transition-all duration-300 overflow-hidden shadow-lg hover:scale-110 ${
                                    i === currentStep
                                        ? 'border-secondary scale-110 ring-2 ring-secondary/25'
                                        : captures[angle.id]
                                            ? 'border-secondary/40'
                                            : 'border-coffee/20'
                                }`}
                                style={{ zIndex: 10 - i }}
                            >
                                {captures[angle.id] ? (
                                    <img
                                        src={captures[angle.id]}
                                        className="w-full h-full object-cover"
                                        alt={angle.label}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-coffee/5 flex items-center justify-center">
                                        <User size={14} className="text-coffee/30" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-coffee/50 uppercase tracking-widest leading-none">
                            {Object.keys(captures).length}/5
                        </p>
                        <p className="text-[9px] font-medium text-coffee/30 uppercase tracking-wider mt-0.5">
                            locked
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    );
}
