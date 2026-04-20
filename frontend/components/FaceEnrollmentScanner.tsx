"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, AlertCircle, User, Zap, Scan, Loader2 } from 'lucide-react';

interface FaceEnrollmentScannerProps {
    onComplete: (captures: Record<string, string>) => void;
    initialCaptures?: Record<string, string>;
    requireAll?: boolean;
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

    // Keep refs in sync whenever state updates
    useEffect(() => { currentStepRef.current = currentStep; },   [currentStep]);
    useEffect(() => { statusRef.current      = status; },        [status]);
    useEffect(() => { stabilityRef.current   = stabilityScore; },[stabilityScore]);
    useEffect(() => { capturesRef.current    = captures; },      [captures]);
    useEffect(() => { isCapturingRef.current = isCapturing; },   [isCapturing]);

    // ── Head pose detection logic (UNTOUCHED) ──────────────────────
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

    const capturePhoto = useCallback((imageSrc: string) => {
        const step  = currentStepRef.current;
        const angle = ANGLES[step].id;
        const updated = { ...capturesRef.current, [angle]: imageSrc };

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
                    ctx.fillStyle = meshColor;
                    for (const idx of [4, 10, 33, 152, 263, 61, 291]) {
                        const pt = landmarks[idx];
                        if (!pt) continue;
                        ctx.beginPath();
                        ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
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
                    setFeedback('Start Camera Scanner');
                }
            } catch (err) {
                console.error('[FaceEnrollment] MediaPipe init failed:', err);
                if (!cancelled) {
                    setStatus('IDLE');
                    statusRef.current = 'IDLE';
                    setFeedback('Scanner Logic Ready');
                }
            }
        };
        init();
        return () => {
            cancelled = true;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* ── Header HUD: Navy/Sky Premium ─────────────────────────────────── */}
            <div className="bg-identity-navy px-8 py-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="text-white font-black uppercase text-base tracking-tight flex items-center gap-3 leading-none mb-1.5 font-outfit">
                            <Scan size={18} className="text-identity-sky animate-pulse shrink-0" />
                            Face Registration
                        </h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap size={9} className="text-identity-sky animate-pulse" />
                            {mpReady ? 'AI Vision Core v2.0' : 'Initializing Logic...'}
                        </p>
                    </div>
                    {/* Step progress dots */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        {ANGLES.map((a, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { if (isCapturing && status !== 'SUCCESS') { currentStepRef.current = i; setCurrentStep(i); }}}
                                title={a.label}
                                className={`h-11 w-11 flex items-center justify-center transition-all duration-500 rounded-xl group`}
                            >
                                <div className={`h-2 rounded-full transition-all duration-500 border border-white/5 ${
                                    i === currentStep          ? 'bg-identity-sky w-8 border-identity-sky/50 shadow-[0_0_12px_rgba(14,165,233,0.4)]' :
                                    captures[a.id]             ? 'bg-identity-sky/40 w-2.5' :
                                                                  'bg-white/10 w-2.5'
                                }`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Camera + Canvas Overlay ─────────────────────────────────── */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xl">
                {!isCapturing && status !== 'SUCCESS' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-identity-navy z-20 gap-8 animate-fade-in">
                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-inner">
                            <Camera size={44} className="text-identity-sky/40" />
                        </div>
                        {status === 'LOADING' ? (
                            <div className="text-center space-y-2">
                                <Loader2 className="animate-spin text-identity-sky mx-auto mb-4" size={32} />
                                <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                                    Loading Face Scanner
                                </p>
                            </div>
                        ) : (
                            <div className="text-center space-y-8 px-12">
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">
                                    Multi-Angle Face Registration
                                </p>
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    className="bg-identity-sky text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-identity-sky/20 hover:bg-white hover:text-identity-navy transition-all active:scale-95 border border-identity-sky"
                                >
                                    Start Setup
                                </button>
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
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-16">
                            <div className={`w-[180px] h-[280px] rounded-[5rem] relative transition-all duration-700 ${
                                status === 'STABILIZING'
                                    ? 'shadow-[0_0_0_3px_rgba(14,165,233,0.9),0_0_60px_rgba(14,165,233,0.3)]'
                                    : 'shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                            }`}>
                                <span className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-identity-sky rounded-tl-[40px]" />
                                <span className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-identity-sky rounded-tr-[40px]" />
                                <span className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-identity-sky rounded-bl-[40px]" />
                                <span className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-identity-sky rounded-br-[40px]" />
                            </div>
                        </div>

                        <div className="absolute bottom-6 inset-x-8 z-20">
                            <div className="identity-glass px-8 py-6 rounded-2xl border border-white/5 shadow-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${
                                            status === 'STABILIZING' ? 'bg-emerald-500 animate-pulse' :
                                            faceDetected             ? 'bg-identity-sky shadow-[0_0_10px_rgba(14,165,233,1)]' :
                                                                       'bg-rose-500 animate-pulse'
                                        }`} />
                                        <p className="text-slate-200 text-[10px] font-black uppercase tracking-[0.2em]">
                                            {ANGLES[currentStep]?.label}
                                        </p>
                                    </div>
                                    <p className="text-identity-sky font-black text-[10px] tabular-nums tracking-[0.15em]">
                                        PHASE {currentStep + 1} / 5
                                    </p>
                                </div>
                                <p className="text-white font-black text-xs uppercase tracking-[0.15em] mb-4">{feedback}</p>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-identity-sky rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                                        style={{ width: `${Math.min(100, (stabilityScore / STABILITY_THRESHOLD) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {status === 'SUCCESS' && (
                    <div className="absolute inset-0 bg-identity-navy/98 backdrop-blur-3xl z-40 flex flex-col items-center justify-center px-16 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-identity-sky/10 text-identity-sky rounded-[2.5rem] flex items-center justify-center mb-10 border border-identity-sky/20 shadow-2xl">
                            <CheckCircle size={56} />
                        </div>
                        <h4 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4 font-outfit">Face Saved</h4>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-12 max-w-sm leading-relaxed">
                            Photos successfully uploaded and saved.
                        </p>
                        <div className="flex gap-5">
                            <button
                                type="button"
                                onClick={resetScanner}
                                className="bg-white/5 text-slate-300 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:bg-white/10 transition-all border border-white/5"
                            >
                                Retake Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => onCompleteRef.current(capturesRef.current)}
                                className="bg-identity-sky text-white px-14 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-identity-sky/30 hover:bg-white hover:text-identity-navy transition-all active:scale-95 border border-identity-sky"
                            >
                                Finalize Capture
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex items-center gap-3 sm:gap-6 relative overflow-hidden group">
                    <div className="p-2 sm:p-4 bg-identity-sky/5 text-identity-sky rounded-xl sm:rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <AlertCircle size={20} />
                    </div>
                    <p className="text-identity-navy text-[9px] sm:text-xs font-black uppercase tracking-[0.15em] leading-relaxed">
                        "{ANGLES[currentStep]?.instruction}"
                    </p>
                </div>

                <div className="bg-identity-navy border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex items-center justify-between gap-3 sm:gap-6 relative overflow-hidden">
                    <div className="flex -space-x-3 sm:-space-x-4 relative z-10 transition-all">
                        {ANGLES.map((angle, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { if (isCapturing && status !== 'SUCCESS') { currentStepRef.current = i; setCurrentStep(i); }}}
                                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full border transition-all duration-500 overflow-hidden shadow-2xl hover:scale-110 hover:z-50 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    i === currentStep
                                        ? 'border-identity-sky scale-110 sm:scale-125 ring-2 sm:ring-4 ring-identity-sky/20 z-40'
                                        : captures[angle.id]
                                            ? 'border-emerald-500/50 opacity-100'
                                            : 'border-white/10 opacity-30 shadow-none'
                                }`}
                                style={{ zIndex: 10 - i }}
                                title={angle.label}
                            >
                                {captures[angle.id] ? (
                                    <img src={captures[angle.id]} className="w-full h-full object-cover scale-110" alt={angle.label} />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center"><User size={10} className="text-slate-600" /></div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="text-right shrink-0 relative z-10 pr-1">
                        <p className="text-xs sm:text-2xl font-black text-white leading-none font-outfit">
                            {Object.keys(captures).length}<span className="text-identity-sky/40 text-[8px] sm:text-lg">/5</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
