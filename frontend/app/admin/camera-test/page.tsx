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
import IdentityBackground from '@/components/IdentityBackground';

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
                setError("Session expired. Please sign in again.");
                setIsTesting(false);
                return;
            }

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
                
                const matchedFaces = newFaces.filter((f: any) => f.match);
                if (matchedFaces.length > 0) {
                    setHistory(prev => {
                        const updated = [...matchedFaces, ...prev];
                        return updated.slice(0, 50);
                    });
                }
                
                setError(null);
            } else {
                setError(response.data.error || "System error occurred during analysis.");
            }
        } catch (err: any) {
            console.error('Camera test error:', err);
            setError(err.response?.data?.error || err.message || "Server connection error.");
            
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
            }, 400);
        }
        return () => clearInterval(interval);
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

                const lerp = (start: number, end: number) => start + (end - start) * 0.15;
                
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

    // Canvas rendering loop
    useEffect(() => {
        const video = webcamRef.current?.video;
        const canvas = canvasRef.current;
        if (!video || !canvas || !displayFaces) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        displayFaces.forEach((face) => {
            const [x1, y1, x2, y2] = face.bbox;
            const w = x2 - x1;
            const h = y2 - y1;
            
            const scaledX = Math.floor(x1);
            const scaledY = Math.floor(y1);
            const scaledW = Math.floor(w);
            const scaledH = Math.floor(h);

            const colorSky = 'rgb(92, 180, 228)';
            const colorRose = 'rgb(244, 63, 94)';
            const glowSky = 'rgba(92, 180, 228, 0.4)';
            const glowRose = 'rgba(244, 63, 94, 0.4)';

            const color = face.match ? colorSky : colorRose;
            const glow = face.match ? glowSky : glowRose;

            // Box
            ctx.shadowColor = glow;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            
            // Corner Reticles
            const len = 40;
            const gap = 4;
            
            // Top Left
            ctx.beginPath();
            ctx.moveTo(scaledX - gap, scaledY - gap + len);
            ctx.lineTo(scaledX - gap, scaledY - gap);
            ctx.lineTo(scaledX - gap + len, scaledY - gap);
            ctx.stroke();

            // Top Right
            ctx.beginPath();
            ctx.moveTo(scaledX + scaledW + gap - len, scaledY - gap);
            ctx.lineTo(scaledX + scaledW + gap, scaledY - gap);
            ctx.lineTo(scaledX + scaledW + gap, scaledY - gap + len);
            ctx.stroke();

            // Bottom Left
            ctx.beginPath();
            ctx.moveTo(scaledX - gap, scaledY + scaledH + gap - len);
            ctx.lineTo(scaledX - gap, scaledY + scaledH + gap);
            ctx.lineTo(scaledX - gap + len, scaledY + scaledH + gap);
            ctx.stroke();

            // Bottom Right
            ctx.beginPath();
            ctx.moveTo(scaledX + scaledW + gap - len, scaledY + scaledH + gap);
            ctx.lineTo(scaledX + scaledW + gap, scaledY + scaledH + gap);
            ctx.lineTo(scaledX + scaledW + gap, scaledY + scaledH + gap - len);
            ctx.stroke();

            // Label
            ctx.shadowBlur = 10;
            const text = `${face.name.toUpperCase()} [${Math.round(face.confidence)}%]`;
            ctx.font = 'black 18px "Outfit", sans-serif';
            const textWidth = ctx.measureText(text).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(scaledX - gap, scaledY - gap - 40, textWidth + 24, 34);

            ctx.fillStyle = 'white';
            ctx.fillText(text, scaledX + 8, scaledY - gap - 16);
        });
    }, [displayFaces]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase();
    };

    return (
        <div className="min-h-screen relative overflow-hidden font-outfit select-none">
            <IdentityBackground />
            
            <div className="max-w-[1600px] mx-auto p-12 space-y-12 relative z-10">
                {/* Header Section */}
                <div className="identity-glass rounded-[4rem] p-12 shadow-3xl relative overflow-hidden border-2 border-white/40">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/10 to-transparent pointer-events-none opacity-50" />
                    
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 relative z-10">
                        <div className="flex items-center gap-10">
                            <div className="bg-identity-sky/20 p-6 rounded-[2.5rem] border-2 border-identity-sky/30 shadow-inner">
                                <ShieldCheck size={48} className="text-identity-sky" />
                            </div>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter text-identity-navy flex flex-wrap items-center gap-6 uppercase italic leading-none">
                                    Biometric Testing Portal
                                    <span className="px-6 py-2 rounded-2xl bg-identity-navy text-identity-sky text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                                        ADMINISTRATOR ACCESS
                                    </span>
                                </h1>
                                <p className="text-identity-sky/60 text-[10px] font-black uppercase tracking-[0.4em] mt-3 italic">
                                    LIVE FEED: CAMERA UNIT 01
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mb-3 italic">CAMERA STATUS</span>
                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 px-6 py-2.5 rounded-2xl border-2 transition-all ${
                                    isTesting ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-900/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                    <span className={`w-3 h-3 rounded-full ${isTesting ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'}`} />
                                    {isTesting ? 'ONLINE' : 'PAUSED'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setIsTesting(!isTesting)}
                                className={`flex items-center gap-6 px-12 py-7 font-black uppercase tracking-[0.3em] text-[12px] rounded-[2rem] transition-all shadow-3xl active:scale-95 italic border-2 ${
                                    isTesting 
                                        ? 'bg-rose-600 text-white border-white/20 shadow-rose-900/30 hover:bg-rose-700' 
                                        : 'bg-identity-navy text-white border-white/20 shadow-identity-navy/30 hover:bg-identity-sky'
                                }`}
                            >
                                {isTesting ? (
                                    <><StopCircle className="w-8 h-8" /> STOP TEST</>
                                ) : (
                                    <><Activity className="w-8 h-8 text-identity-sky" /> START CAMERA TEST</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="identity-glass border-2 border-rose-500/40 text-rose-500 rounded-[2.5rem] p-10 flex items-center gap-8 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-rose-500/[0.03] animate-pulse" />
                        <div className="bg-rose-500/10 p-4 rounded-2xl border-2 border-rose-500/20 relative z-10">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-[12px] italic relative z-10 leading-relaxed">TEST ERROR: {error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 min-h-[900px]">
                    {/* Left Panel: Camera & Live HUD */}
                    <div className="lg:col-span-8 flex flex-col gap-12">
                        <div className="flex-1 identity-glass rounded-[4.5rem] border-2 border-white/40 overflow-hidden relative shadow-3xl p-5 group bg-[#041C3C]/5 hover:border-identity-sky/40 transition-all duration-700">
                            <div className="w-full h-full rounded-[3.5rem] overflow-hidden relative border-4 border-white/10 shadow-inner bg-black">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                                    className={`w-full h-full object-cover transition-all duration-1000 ${isTesting ? 'grayscale-0 brightness-110' : 'grayscale brightness-50'}`}
                                />
                                <canvas 
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none object-cover z-20"
                                />
                                
                                {/* Scanning Overlay */}
                                {isTesting && (
                                    <>
                                        <div className="absolute inset-8 pointer-events-none border-2 border-identity-sky/20 overflow-hidden rounded-[2.5rem] z-10">
                                            <div className="w-full h-[3px] bg-identity-sky shadow-[0_0_40px_rgba(92,180,228,1)] absolute animate-scan-line top-0 opacity-80" />
                                        </div>
                                        <div className="absolute inset-0 pointer-events-none bg-blueprint opacity-[0.03] z-10" />
                                    </>
                                )}

                                {!isTesting && (
                                    <div className="absolute inset-0 bg-[#041C3C]/60 backdrop-blur-3xl flex items-center justify-center transition-all duration-700 z-30">
                                        <div className="text-center space-y-10 animate-in zoom-in-95 duration-700">
                                            <div className="w-32 h-32 bg-white/5 border-2 border-white/10 rounded-full flex items-center justify-center mx-auto text-white shadow-2xl relative group">
                                                <div className="absolute inset-0 bg-identity-sky/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                                <StopCircle size={60} className="relative z-10 opacity-30" />
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-3xl uppercase tracking-tighter italic">CAMERA STANDBY</p>
                                                <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.5em] mt-4 italic">SYSTEM READY FOR DIAGNOSTIC TESTING</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-16 left-16 flex flex-wrap gap-6 z-40">
                                    <div className="bg-[#041C3C]/95 backdrop-blur-2xl border-2 border-white/20 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-5 shadow-3xl">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,1)]" />
                                        RECOGNITION PERFORMANCE: {stats.fps} FPS
                                    </div>
                                    <div className="bg-[#041C3C]/95 backdrop-blur-2xl border-2 border-white/20 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-5 shadow-3xl">
                                        <Clock size={18} className="text-identity-sky" />
                                        SYSTEM RESPONSE TIME: {stats.latency} MS
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Identification History */}
                    <div className="lg:col-span-4 identity-glass rounded-[4.5rem] border-2 border-white/40 flex flex-col overflow-hidden shadow-3xl relative bg-[#041C3C]/10 backdrop-blur-2xl">
                        {/* History Header */}
                        <div className="p-10 border-b-2 border-white/10 bg-white/5 flex items-center justify-between relative overflow-hidden">
                            <div className="absolute inset-0 bg-identity-sky/5 pointer-events-none" />
                            <h3 className="text-sm font-black text-identity-navy flex items-center gap-6 uppercase tracking-[0.2em] italic relative z-10 leading-none">
                                <div className="bg-identity-sky/20 p-3 rounded-xl border border-identity-sky/30">
                                    <Activity className="w-6 h-6 text-identity-sky" />
                                </div>
                                Detection History
                            </h3>
                            <button 
                                onClick={() => setHistory([])}
                                className="p-3 bg-white/20 hover:bg-rose-500/20 rounded-2xl text-slate-400 hover:text-rose-500 transition-all active:scale-90 border-2 border-transparent hover:border-rose-500/40 relative z-10"
                                title="Clear Detection History"
                            >
                                <Trash2 size={24} />
                            </button>
                        </div>

                        {/* Detection Summary */}
                        <div className="bg-identity-navy p-8 border-b-2 border-white/10 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em]">
                            <div className="flex items-center gap-4 text-emerald-400">
                                <CheckCircle size={16} />
                                <span>{history.filter(h => h.match).length} VERIFIED STUDENTS</span>
                            </div>
                            <div className="flex items-center gap-4 text-rose-500">
                                <XCircle size={16} />
                                <span>{history.filter(h => !h.match).length} UNIDENTIFIED SUBJECTS</span>
                            </div>
                        </div>

                        {/* Identification Logs */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar relative">
                            {!isTesting && history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-16 opacity-30 gap-10">
                                    <div className="bg-white/10 w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed border-white/20">
                                        <Camera className="w-16 h-16 text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-identity-navy font-black text-[12px] uppercase tracking-[0.4em] italic mb-4">IDLE</p>
                                        <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black italic">WAITING FOR CAMERA INPUT</p>
                                    </div>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-16 gap-10">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-identity-sky/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                        <Activity className="w-20 h-20 text-identity-sky relative animate-pulse" />
                                    </div>
                                    <p className="text-identity-navy font-black text-[11px] uppercase tracking-[0.4em] italic animate-pulse">ANALYZING VIDEO STREAM...</p>
                                </div>
                            ) : (
                                history.map((log, idx) => (
                                    <div 
                                        key={`${log.timestamp}-${idx}`} 
                                        className={`p-6 rounded-[2.5rem] border-2 transition-all animate-in fade-in slide-in-from-right-8 duration-700 group relative overflow-hidden ${
                                            log.match 
                                                ? 'bg-white/90 border-white/60 hover:border-identity-sky/40 shadow-xl' 
                                                : 'bg-white/40 border-white/40 opacity-60 grayscale'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-identity-sky/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex items-center gap-6 relative z-10">
                                            {/* Entity Proxy */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-[#041C3C]/95 overflow-hidden border-2 border-white/40 shadow-inner group-hover:scale-110 transition-transform duration-700">
                                                    {log.thumbnail ? (
                                                        <img src={log.thumbnail} alt="Face" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-full h-full p-6 text-white/20" />
                                                    )}
                                                </div>
                                                {log.match && log.profile_picture && (
                                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-2xl ring-2 ring-identity-sky/40 group-hover:scale-125 transition-transform">
                                                        <img src={log.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-md font-black uppercase tracking-tighter truncate italic ${log.match ? 'text-identity-navy' : 'text-slate-400'}`}>
                                                        {log.name}
                                                    </span>
                                                    <span className="text-[9px] font-black text-identity-sky/60 uppercase tracking-[0.2em] italic">
                                                        {formatTime(log.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                    <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border-2 italic transition-all ${
                                                        log.match 
                                                            ? 'text-identity-sky bg-identity-sky/10 border-identity-sky/20' 
                                                            : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                                    }`}>
                                                        {log.match ? 'VERIFIED' : 'UNIDENTIFIED'}
                                                    </div>
                                                    <span className="text-[14px] font-black text-identity-navy font-mono tracking-[0.1em] italic opacity-40">
                                                        {Math.round(log.confidence)}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <ChevronRight className="w-6 h-6 text-slate-100 group-hover:text-identity-sky transition-all duration-700 group-hover:translate-x-2" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-8 bg-[#041C3C]/95 border-t-2 border-white/10 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-blueprint opacity-[0.03]" />
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.6em] italic relative z-10">SYSTEM STATUS: ACTIVE</p>
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
                    animation: scan-line 4s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(4, 28, 60, 0.1);
                    border-radius: 20px;
                    border: 3px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(92, 180, 228, 0.4);
                }
            `}</style>
        </div>
    );
}
