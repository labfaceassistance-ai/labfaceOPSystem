'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import Link from 'next/link';
import { 
    Camera, StopCircle, RefreshCw, AlertCircle, 
    User, CheckCircle, XCircle, Clock, Activity, 
    Trash2, ShieldCheck, ChevronRight, ArrowLeft
} from 'lucide-react';
import { getToken } from '@/utils/auth';

interface FaceMatch {
    bbox: number[];
    match: boolean;
    name: string;
    confidence: number;
    student_id: string;
    profile_picture: string | null;
    thumbnail: string;
    timestamp: string;
}

export default function CameraTestPage() {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const seenUsersRef = useRef<Set<string>>(new Set());
    
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [faces, setFaces] = useState<FaceMatch[]>([]);
    const [history, setHistory] = useState<FaceMatch[]>([]);
    const [stats, setStats] = useState({ fps: 0, latency: 0 });
    const [sourceDims, setSourceDims] = useState({ width: 0, height: 0 });
    
    // Clear history and seen users when starting test
    useEffect(() => {
        if (!isTesting) return;
        seenUsersRef.current.clear();
        setHistory([]);
    }, [isTesting]);
    
    // Polling loop
    const captureAndTest = useCallback(async () => {
        if (!isTesting || !webcamRef.current) return;
        
        try {
            const start = performance.now();
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (!imageSrc) return;
            
            const token = getToken();
            if (!token) {
                setError("Authentication session missing. Please re-login.");
                setIsTesting(false);
                return;
            }

            // Using relative URL to ensure it hits the local backend correctly
            const response = await axios.post(
                `/api/ai/camera-test`, 
                { image: imageSrc }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const latency = Math.round(performance.now() - start);
            
            if (response.data.success) {
                const newFaces = response.data.faces || [];
                setFaces(newFaces);
                setSourceDims({ 
                    width: response.data.source_width || 1280, 
                    height: response.data.source_height || 720 
                });
                setStats({ fps: parseFloat((1000 / latency).toFixed(1)), latency });
                
                // Update history with new identified detections only (Filter out Unknowns)
                // One-Time Detection Implementation
                const matchedFaces = newFaces.filter((f: any) => f.match);
                if (matchedFaces.length > 0) {
                    setHistory(prev => {
                        const newLogs = matchedFaces.filter((f: any) => {
                            if (!seenUsersRef.current.has(f.student_id)) {
                                seenUsersRef.current.add(f.student_id);
                                return true;
                            }
                            return false;
                        });
                        
                        if (newLogs.length === 0) return prev;
                        const updated = [...newLogs, ...prev];
                        return updated.slice(0, 50);
                    });
                }
                
                setError(null);
            } else {
                setError(response.data.error || "Unknown recognition error");
            }
        } catch (err: any) {
            console.error('Camera test error:', err);
            setError(err.response?.data?.error || err.message || "Failed to reach backend");
            
            // Only auto-pause on critical auth errors
            if (err.response?.status === 401 || err.response?.status === 403) {
                setIsTesting(false);
            }
        }
    }, [isTesting]);

    useEffect(() => {
        let isCancelled = false;
        let timeoutId: NodeJS.Timeout;

        const loop = async () => {
            if (!isTesting || isCancelled) return;
            await captureAndTest();
            
            if (!isCancelled && isTesting) {
                // Wait 50ms *after* request finishes before pulling next frame
                // Maximizes tracking FPS without creating infinite queues
                timeoutId = setTimeout(loop, 50); 
            }
        };

        if (isTesting) {
            loop();
        }

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [isTesting, captureAndTest]);

    // --- SMOOTH TRACKING LOGIC ---
    const [displayFaces, setDisplayFaces] = useState<FaceMatch[]>([]);
    const requestRef = useRef<number>();

    const animate = useCallback(() => {
        setDisplayFaces(prev => {
            if (faces.length === 0) return [];
            if (prev.length !== faces.length) return faces;

            return prev.map((prevFace, i) => {
                const target = faces[i];
                if (!target) return prevFace;

                const lerp = (start: number, end: number) => start + (end - start) * 0.35;
                
                return {
                    ...target,
                    bbox: [
                        lerp(prevFace.bbox[0], target.bbox[0]),
                        lerp(prevFace.bbox[1], target.bbox[1]),
                        lerp(prevFace.bbox[2], target.bbox[2]),
                        lerp(prevFace.bbox[3], target.bbox[3])
                    ]
                };
            });
        });
        requestRef.current = requestAnimationFrame(animate);
    }, [faces]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    // Canvas rendering loop - uses displayFaces for liquid motion
    useEffect(() => {
        const video = webcamRef.current?.video;
        const canvas = canvasRef.current;
        if (!video || !canvas || !displayFaces) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaleX = sourceDims.width > 0 ? (canvas.width / sourceDims.width) : 1;
        const scaleY = sourceDims.height > 0 ? (canvas.height / sourceDims.height) : 1;

        displayFaces.forEach((face) => {
            const [x1, y1, x2, y2] = face.bbox;
            const w = x2 - x1;
            const h = y2 - y1;
            
            // The webcam screenshot is already mirrored by react-webcam mirrored={true}
            // so the AI returns coordinates in the mirrored space.
            // We map them directly to the canvas without a second flip.
            const boxX = x1;
            
            const scaledX = Math.floor(boxX * scaleX);
            const scaledY = Math.floor(y1 * scaleY);
            const scaledW = Math.floor(w * scaleX);
            const scaledH = Math.floor(h * scaleY);

            const color = face.match ? '#10b981' : '#f43f5e';
            const glow = face.match ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';

            ctx.shadowColor = glow;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);
            
            ctx.shadowBlur = 0;

            const text = `${face.name} (${Math.round(face.confidence)}%)`;
            ctx.font = 'bold 16px "Inter", sans-serif';
            const textWidth = ctx.measureText(text).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(scaledX - 2, scaledY - 32, textWidth + 16, 32);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, scaledX + 6, scaledY - 10);
        });
    }, [displayFaces]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/professor/dashboard?tab=monitor"
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors mr-2"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20">
                                <ShieldCheck className="w-8 h-8 text-brand-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    Face Recognition Diagnostic
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30">
                                        Professor Mode
                                    </span>
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">
                                    Calibrate and test detection accuracy before starting class
                                </p>
                            </div>
                        </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Engine</span>
                            <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Operational
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsTesting(!isTesting)}
                            className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                                isTesting ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' : 'bg-brand-500 text-white hover:bg-brand-600'
                            }`}
                        >
                            {isTesting ? (
                                <><StopCircle className="w-5 h-5" /> Stop Engine</>
                            ) : (
                                <><Camera className="w-5 h-5" /> Start Diagnostics</>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold text-sm">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
                    {/* Left Panel: Camera & Stats */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* Live View */}
                        <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                mirrored={true}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={0.8}
                                videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                                className="w-full h-full object-contain"
                            />
                            <canvas 
                                ref={canvasRef}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
                            />
                            
                            {/* Scanning Overlay Effect */}
                            {isTesting && (
                                <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/20 overflow-hidden">
                                    <div className="w-full h-[2px] bg-brand-500/40 shadow-[0_0_15px_rgba(59,130,246,0.8)] absolute animate-scan-line top-0" />
                                </div>
                            )}

                            {!isTesting && (
                                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center backdrop-blur-md">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                                            <StopCircle size={32} />
                                        </div>
                                        <p className="text-slate-200 font-bold text-xl tracking-tight">Diagnostic Engine Paused</p>
                                        <p className="text-slate-500 text-sm">Click the button above to begin detection</p>
                                    </div>
                                </div>
                            )}

                            {/* HUD In-camera Stats */}
                            <div className="absolute bottom-4 left-4 flex gap-4">
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono text-white/80 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    FPS: {stats.fps}
                                </div>
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono text-white/80 flex items-center gap-2">
                                    <Clock size={10} />
                                    LATENCY: {stats.latency}ms
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Detection History */}
                    <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
                        {/* History Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-400" />
                                Real-time Detections
                            </h3>
                            <button 
                                onClick={() => setHistory([])}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                title="Clear History"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Summary Bar */}
                        <div className="bg-slate-950/50 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-1.5 text-brand-400">
                                <CheckCircle size={10} />
                                <span>{history.filter(h => h.match).length} Matches</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-red-400">
                                <XCircle size={10} />
                                <span>{history.filter(h => !h.match).length} Unknown</span>
                            </div>
                        </div>

                        {/* History Feed */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-900/30">
                            {!isTesting && history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <Camera className="w-12 h-12 text-slate-800 mb-4" />
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                        Logs will appear here once you<br />start the diagnostic engine.
                                    </p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full" />
                                        <Activity className="w-12 h-12 text-brand-500 relative animate-pulse" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-semibold italic">Awaiting first face capture...</p>
                                </div>
                            ) : (
                                history.map((log, idx) => (
                                    <div 
                                        key={`${log.timestamp}-${idx}`} 
                                        className={`p-3 rounded-xl border transition-all animate-in fade-in slide-in-from-right-4 duration-300 ${
                                            log.match 
                                                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                                                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Face Thumbnail */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                                                    {log.thumbnail ? (
                                                        <img src={log.thumbnail} alt="Face" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-full h-full p-3 text-slate-600" />
                                                    )}
                                                </div>
                                                {log.match && log.profile_picture && (
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-900 overflow-hidden ring-1 ring-emerald-500/50">
                                                        <img src={log.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-xs font-bold truncate ${log.match ? 'text-white' : 'text-slate-400'}`}>
                                                        {log.name}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-slate-500">
                                                        {formatTime(log.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                        log.match 
                                                            ? 'text-emerald-400 border-emerald-500/30' 
                                                            : 'text-slate-500 border-slate-700'
                                                    }`}>
                                                        {log.match ? 'Student Match' : 'Unknown Entity'}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        {log.confidence}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <ChevronRight className="w-4 h-4 text-slate-700" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan-line {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
