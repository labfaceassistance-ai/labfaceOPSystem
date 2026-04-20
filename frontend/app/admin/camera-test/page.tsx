'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { 
    Camera, StopCircle, RefreshCw, AlertCircle, 
    User, CheckCircle, XCircle, Clock, Activity, 
    Trash2, ShieldCheck, ChevronRight
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
    
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [faces, setFaces] = useState<FaceMatch[]>([]);
    const [history, setHistory] = useState<FaceMatch[]>([]);
    const [stats, setStats] = useState({ fps: 0, latency: 0 });
    
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
                setStats({ fps: parseFloat((1000 / latency).toFixed(1)), latency });
                
                // Update history with new identified detections only (Filter out Unknowns)
                const matchedFaces = newFaces.filter((f: any) => f.match);
                if (matchedFaces.length > 0) {
                    setHistory(prev => {
                        const updated = [...matchedFaces, ...prev];
                        // Limit to last 50 entries
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
        let interval: NodeJS.Timeout;
        if (isTesting) {
            interval = setInterval(() => {
                captureAndTest();
            }, 400); // Increased frequency for smoother tracking target updates
        }
        return () => clearInterval(interval);
    }, [isTesting, captureAndTest]);

    // --- SMOOTH TRACKING LOGIC ---
    const [displayFaces, setDisplayFaces] = useState<FaceMatch[]>([]);
    const requestRef = useRef<number>();

    const animate = useCallback(() => {
        setDisplayFaces(prev => {
            if (faces.length === 0) return [];
            
            // If the counts don't match, just snap to new targets to avoid ghosting
            if (prev.length !== faces.length) return faces;

            // LERP (Linear Interpolation) for each face position
            return prev.map((prevFace, i) => {
                const target = faces[i];
                if (!target) return prevFace;

                const lerp = (start: number, end: number) => start + (end - start) * 0.15; // Smoothing factor
                
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

        // Ensure canvas internal resolution matches display size for sharpness
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Since both video and canvas use object-cover, scaling is 1:1 on the internal resolution
        const scaleX = 1;
        const scaleY = 1;

        displayFaces.forEach((face) => {
            const [x1, y1, x2, y2] = face.bbox;
            const w = x2 - x1;
            const h = y2 - y1;
            
            const scaledX = Math.floor(x1 * scaleX);
            const scaledY = Math.floor(y1 * scaleY);
            const scaledW = Math.floor(w * scaleX);
            const scaledH = Math.floor(h * scaleY);

            const colorSky = 'rgb(92, 180, 228)'; // identity-sky
            const colorRose = 'rgb(244, 63, 94)'; // identity-rose
            const glowSky = 'rgba(92, 180, 228, 0.4)';
            const glowRose = 'rgba(244, 63, 94, 0.4)';

            // Set colors matching theme
            const color = face.match ? colorSky : colorRose;
            const glow = face.match ? glowSky : glowRose;

            // Draw Box
            ctx.shadowColor = glow;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4; // Bolder box for visibility
            ctx.lineJoin = 'round';
            ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);
            
            ctx.shadowBlur = 0;

            const text = `${face.name} (${Math.round(face.confidence)}%)`;
            ctx.font = 'black 16px "Outfit", sans-serif';
            const textWidth = ctx.measureText(text).width;
            
            // Label Background
            ctx.fillStyle = color;
            ctx.fillRect(scaledX - 2, scaledY - 32, textWidth + 16, 32);

            // Label Text
            ctx.fillStyle = 'white';
            ctx.fillText(text, scaledX + 6, scaledY - 10);
        });
    }, [displayFaces]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-outfit">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-identity-sky/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-50" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 bg-identity-sky/10 rounded-2xl border border-identity-sky/20">
                            <ShieldCheck className="w-10 h-10 text-identity-sky" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-identity-navy flex items-center gap-4 uppercase italic">
                                Face Recognition Test
                                <span className="px-4 py-1.5 rounded-2xl bg-identity-navy text-identity-sky text-[9px] font-black uppercase tracking-[0.15em] border border-identity-navy/10 shadow-lg shadow-identity-navy/10">
                                    Admin Level Access
                                </span>
                            </h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mt-3 italic">
                                Camera Feed Ã‚Â· Camera 1
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="hidden lg:flex flex-col items-end mr-6">
                            <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.15em] mb-1.5 italic">Engine Status</span>
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                Active
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsTesting(!isTesting)}
                            className={`flex items-center gap-4 px-8 py-4 font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl transition-all shadow-xl active:scale-95 italic ${
                                isTesting 
                                    ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600' 
                                    : 'bg-identity-navy text-white shadow-identity-navy/20 hover:bg-identity-navy/90'
                            }`}
                        >
                            {isTesting ? (
                                <><StopCircle className="w-5 h-5 text-rose-200" /> Kill Engine</>
                            ) : (
                                <><Camera className="w-5 h-5 text-identity-sky" /> Start Diagnostics</>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-500 rounded-[20px] p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm font-black uppercase tracking-[0.15em] text-[10px] italic">
                        <div className="bg-rose-100 p-2 rounded-lg">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <span>Protocol Error: {error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[800px]">
                    {/* Left Panel: Camera & Stats */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        {/* Live View */}
                        <div className="flex-1 bg-white rounded-[48px] border border-identity-sky/10 overflow-hidden relative shadow-3xl p-2 group">
                            <div className="w-full h-full rounded-[40px] overflow-hidden relative">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                                    className="w-full h-full object-cover grayscale brightness-[0.95] group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                                />
                                <canvas 
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none object-cover"
                                />
                            </div>
                            
                            {/* Scanning Overlay Effect */}
                            {isTesting && (
                                <div className="absolute inset-4 pointer-events-none border-2 border-identity-sky/20 overflow-hidden rounded-[36px]">
                                    <div className="w-full h-[1px] bg-identity-sky shadow-[0_0_20px_rgba(92,180,228,0.8)] absolute animate-scan-line top-0 opacity-40" />
                                </div>
                            )}

                            {!isTesting && (
                                <div className="absolute inset-2 rounded-[40px] bg-white/40 backdrop-blur-xl flex items-center justify-center transition-all duration-500">
                                    <div className="text-center space-y-4">
                                        <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                            <StopCircle size={40} />
                                        </div>
                                        <p className="text-identity-navy font-black text-2xl uppercase tracking-tighter italic">Camera Testing Paused</p>
                                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.15em] italic">Start Camera to begin capture</p>
                                    </div>
                                </div>
                            )}

                            {/* HUD In-camera Stats */}
                            <div className="absolute bottom-10 left-10 flex gap-4">
                                <div className="bg-identity-navy/90 backdrop-blur-md border border-identity-sky/20 px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] text-white flex items-center gap-4 shadow-2xl shadow-black/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    ENGINE_FPS: {stats.fps}
                                </div>
                                <div className="bg-identity-navy/90 backdrop-blur-md border border-identity-sky/20 px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] text-white flex items-center gap-4 shadow-2xl shadow-black/20">
                                    <Clock size={12} className="text-identity-sky" />
                                    LATENCY: {stats.latency}ms
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Detection History */}
                    <div className="lg:col-span-4 identity-glass rounded-[48px] border border-identity-sky/10 flex flex-col overflow-hidden shadow-3xl relative bg-white/40">
                        {/* History Header */}
                        <div className="p-8 border-b border-identity-sky/10 bg-white/20 flex items-center justify-between">
                            <h3 className="text-[12px] font-black text-identity-navy flex items-center gap-4 uppercase tracking-[0.15em] italic">
                                <div className="bg-identity-sky/10 p-2 rounded-lg">
                                    <Activity className="w-5 h-5 text-identity-sky" />
                                </div>
                                Live Detection
                            </h3>
                            <button 
                                onClick={() => setHistory([])}
                                className="p-2 hover:bg-rose-50 rounded-2xl text-slate-300 hover:text-rose-500 transition-all active:scale-90"
                                title="Clear History"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* Summary Bar */}
                        <div className="bg-slate-50/50 px-8 py-3 border-b border-slate-100 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.15em]">
                            <div className="flex items-center gap-2 text-emerald-500">
                                <CheckCircle size={12} />
                                <span>{history.filter(h => h.match).length} Validated</span>
                            </div>
                            <div className="flex items-center gap-2 text-rose-500">
                                <XCircle size={12} />
                                <span>{history.filter(h => !h.match).length} Unknown</span>
                            </div>
                        </div>

                        {/* History Feed */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {!isTesting && history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50">
                                    <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                                        <Camera className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] italic">Records Updated</p>
                                    <p className="text-slate-400 text-[8px] mt-2 uppercase tracking-[0.15em] font-black">Waiting for engine initialization...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-identity-sky/10 blur-2xl rounded-full animate-pulse" />
                                        <Activity className="w-16 h-16 text-identity-sky relative animate-pulse" />
                                    </div>
                                    <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] italic animate-pulse">Waiting for Face Detection...</p>
                                </div>
                            ) : (
                                history.map((log, idx) => (
                                    <div 
                                        key={`${log.timestamp}-${idx}`} 
                                        className={`p-4 rounded-3xl border transition-all animate-in fade-in slide-in-from-right-4 duration-500 group relative overflow-hidden ${
                                            log.match 
                                                ? 'bg-white border-slate-100 hover:border-identity-sky/30 shadow-sm' 
                                                : 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                        }`}
                                    >
                                        <div className="flex items-center gap-5 relative z-10">
                                            {/* Face Thumbnail */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                    {log.thumbnail ? (
                                                        <img src={log.thumbnail} alt="Face" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-full h-full p-4 text-slate-200" />
                                                    )}
                                                </div>
                                                {log.match && log.profile_picture && (
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-lg ring-1 ring-identity-sky/30">
                                                        <img src={log.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[11px] font-black uppercase tracking-[0.15em] italic truncate ${log.match ? 'text-identity-navy' : 'text-slate-400'}`}>
                                                        {log.name}
                                                    </span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em]">
                                                        {formatTime(log.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] border transition-colors ${
                                                        log.match 
                                                            ? 'text-identity-sky bg-identity-sky/5 border-identity-sky/20' 
                                                            : 'text-slate-300 bg-slate-100 border-slate-200'
                                                    }`}>
                                                        {log.match ? 'Subject Validated' : 'Unknown Entity'}
                                                    </div>
                                                    <span className="text-[9px] font-black text-identity-navy/20 font-mono tracking-[0.15em]">
                                                        {Math.round(log.confidence)}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <ChevronRight className="w-4 h-4 text-slate-100 group-hover:text-identity-sky transition-colors" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-6 bg-identity-navy/[0.02] border-t border-identity-sky/10">
                            <p className="text-[8px] text-slate-300 italic font-black uppercase tracking-[0.15em] text-center">Camera 1 Ã‚Â· Live Feed</p>
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
                    background: var(--identity-navy);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--identity-sky);
                }
            `}</style>
        </div>
    );
}
