'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import Link from 'next/link';
import { 
    Camera, StopCircle, RefreshCw, AlertCircle, 
    User, CheckCircle, XCircle, Clock, Activity, 
    Trash2, ShieldCheck, ChevronRight, ArrowLeft,
    Signal, Monitor, Zap, Disc
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
    
    useEffect(() => {
        if (!isTesting) {
            setFaces([]);
            return;
        }
        seenUsersRef.current.clear();
        setHistory([]);
    }, [isTesting]);
    
    const captureAndTest = useCallback(async () => {
        if (!isTesting || !webcamRef.current) return;
        
        try {
            const start = performance.now();
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (!imageSrc) return;
            
            const token = getToken();
            if (!token) {
                setError("Session expired. Please re-authenticate.");
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
                setSourceDims({ 
                    width: response.data.source_width || 1280, 
                    height: response.data.source_height || 720 
                });
                setStats({ fps: parseFloat((1000 / latency).toFixed(1)), latency });
                
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
                setError(response.data.error || "Recognition error: Signal interrupted.");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Connection failure: System unreachable.");
            if (err.response?.status === 401 || err.response?.status === 403) setIsTesting(false);
        }
    }, [isTesting]);

    useEffect(() => {
        let isCancelled = false;
        let timeoutId: NodeJS.Timeout;

        const loop = async () => {
            if (!isTesting || isCancelled) return;
            await captureAndTest();
            if (!isCancelled && isTesting) timeoutId = setTimeout(loop, 100); 
        };

        if (isTesting) loop();
        return () => { isCancelled = true; clearTimeout(timeoutId); };
    }, [isTesting, captureAndTest]);

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
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [animate]);

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
            const scaledX = Math.floor(x1 * scaleX);
            const scaledY = Math.floor(y1 * scaleY);
            const scaledW = Math.floor(w * scaleX);
            const scaledH = Math.floor(h * scaleY);

            const colorSky = '#5CB4E4';
            const colorRose = '#EF4444';
            const color = face.match ? colorSky : colorRose;

            ctx.shadowColor = `${color}66`;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);
            
            // Corners
            ctx.lineWidth = 10;
            const cornerSize = 25;
            // Top Left
            ctx.beginPath(); ctx.moveTo(scaledX, scaledY + cornerSize); ctx.lineTo(scaledX, scaledY); ctx.lineTo(scaledX + cornerSize, scaledY); ctx.stroke();
            // Top Right
            ctx.beginPath(); ctx.moveTo(scaledX + scaledW - cornerSize, scaledY); ctx.lineTo(scaledX + scaledW, scaledY); ctx.lineTo(scaledX + scaledW, scaledY + cornerSize); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(scaledX + scaledW, scaledY + scaledH - cornerSize); ctx.lineTo(scaledX + scaledW, scaledY + scaledH); ctx.lineTo(scaledX + scaledW - cornerSize, scaledY + scaledH); ctx.stroke();
            // Bottom Left
            ctx.beginPath(); ctx.moveTo(scaledX + cornerSize, scaledY + scaledH); ctx.lineTo(scaledX, scaledY + scaledH); ctx.lineTo(scaledX, scaledY + scaledH - cornerSize); ctx.stroke();
            
            ctx.shadowBlur = 0;
            const text = `${face.name} ${Math.round(face.confidence)}%`.toUpperCase();
            ctx.font = 'bold 16px "Outfit", sans-serif';
            const textWidth = ctx.measureText(text).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(scaledX, scaledY - 35, textWidth + 24, 35);
            ctx.fillStyle = 'white';
            ctx.fillText(text, scaledX + 12, scaledY - 12);
        });
    }, [displayFaces, sourceDims]);

    return (
        <div className="min-h-screen bg-transparent p-10 font-outfit relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
            
            <div className="max-w-[1600px] mx-auto space-y-10 relative z-10">
                {/* Header HUD */}
                <div className="bg-white/40 backdrop-blur-3xl rounded-[4rem] border border-white/20 p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10 shadow-4xl relative overflow-hidden group">
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/40 to-transparent top-0 z-20 animate-scan-y opacity-30 pointer-events-none" />
                    
                    <div className="flex items-center gap-10">
                        <Link href="/professor/dashboard?tab=monitor"
                            className="bg-[#041C3C] text-white p-6 rounded-[2rem] hover:bg-[#5CB4E4] hover:scale-110 active:scale-95 transition-all duration-700 shadow-4xl group/back">
                            <ArrowLeft size={28} className="group-hover/back:-translate-x-2 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic flex items-center gap-6">
                                Biometric Verification Hub
                                <div className="px-6 py-2 rounded-xl bg-[#5CB4E4]/10 text-[#5CB4E4] text-[11px] font-black uppercase tracking-[0.4em] border border-[#5CB4E4]/20 italic">
                                    Faculty Access
                                </div>
                            </h1>
                            <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.5em] mt-3 italic opacity-60 flex items-center gap-4">
                                <Zap size={14} className="text-[#5CB4E4]" /> Real-time biometric recognition engine.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right hidden xl:block">
                            <p className="text-[10px] text-[#5CB4E4] font-black uppercase tracking-[0.4em] italic mb-2">System Status</p>
                            <p className="flex items-center gap-4 text-emerald-500 font-black text-xl italic uppercase tracking-tighter">
                                <span className={`w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] ${isTesting ? 'animate-pulse' : ''}`} />
                                System Operational
                            </p>
                        </div>
                        <div className="relative group/btn">
                            <div className={`absolute -inset-4 blur-2xl opacity-0 group-hover/btn:opacity-60 transition-all duration-700 rounded-[3rem] ${isTesting ? 'bg-rose-500' : 'bg-[#5CB4E4]'}`} />
                            <button onClick={() => setIsTesting(!isTesting)}
                                className={`relative flex items-center gap-6 px-14 py-6 font-black uppercase tracking-[0.4em] text-[13px] rounded-[2.5rem] transition-all duration-700 shadow-4xl active:scale-95 italic border-2 ${
                                    isTesting ? 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50' : 'bg-[#041C3C] text-white border-white/20 hover:bg-rose-600'
                                }`}>
                                {isTesting ? <><StopCircle size={28} className="fill-rose-500/20" /> Stop Verification</> : <><Camera size={28} /> Start Verification</>}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border-l-[12px] border-rose-500 rounded-[2.5rem] p-10 flex items-center gap-8 shadow-4xl animate-in fade-in slide-in-from-top-8 duration-700">
                        <AlertCircle className="w-10 h-10 text-rose-500 flex-shrink-0 animate-pulse" />
                        <span className="font-black uppercase tracking-[0.3em] text-lg text-rose-500 italic drop-shadow-lg">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 2xl:grid-cols-12 gap-10">
                    {/* Viewport */}
                    <div className="2xl:col-span-8 space-y-10">
                        <div className="aspect-video bg-[#041C3C] rounded-[4.5rem] border border-white/10 overflow-hidden relative shadow-4xl group/view transition-all duration-1000 animate-in zoom-in-95">
                            <Webcam ref={webcamRef} audio={false} mirrored={true} screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                                className={`w-full h-full object-cover transition-all duration-1000 ${isTesting ? 'grayscale-0' : 'grayscale'}`} />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />
                            
                            {/* HUD Overlays */}
                            {isTesting && (
                                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                                    <div className="absolute inset-0 border-[32px] border-[#041C3C] opacity-40" />
                                    <div className="absolute inset-x-0 h-[2px] bg-[#5CB4E4] top-0 animate-scan-y shadow-[0_0_25px_rgba(92,180,228,1)]" />
                                    <div className="absolute left-10 top-10 flex gap-4">
                                         <div className="w-4 h-4 bg-[#5CB4E4] animate-pulse" />
                                         <div className="text-[10px] text-[#5CB4E4] font-black uppercase tracking-[0.5em] italic">Biometric Monitoring Feed</div>
                                    </div>
                                    {/* Crosshair */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-[#5CB4E4]" />
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-[#5CB4E4]" />
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-[1px] bg-[#5CB4E4]" />
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-[1px] bg-[#5CB4E4]" />
                                    </div>
                                </div>
                            )}

                            {!isTesting && (
                                <div className="absolute inset-0 bg-[#041C3C]/80 backdrop-blur-3xl flex flex-col items-center justify-center z-40">
                                    <Disc size={120} className="text-[#5CB4E4]/10 animate-spin-slow" />
                                    <div className="space-y-6 text-center absolute">
                                        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Camera Offline</h2>
                                        <p className="text-[12px] text-[#5CB4E4] font-black uppercase tracking-[0.6em] italic animate-pulse">Awaiting system command...</p>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-12 left-12 flex gap-8 z-50">
                                <div className="bg-[#041C3C]/90 backdrop-blur-2xl border border-white/10 px-10 py-5 rounded-[2.5rem] flex items-center gap-6 shadow-4xl group-hover/view:scale-110 transition-transform duration-700">
                                    <Activity size={24} className="text-[#5CB4E4] animate-pulse" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">Recognition Speed</p>
                                        <p className="text-xl font-black text-white italic">{stats.fps} FPS</p>
                                    </div>
                                </div>
                                <div className="bg-[#041C3C]/90 backdrop-blur-2xl border border-white/10 px-10 py-5 rounded-[2.5rem] flex items-center gap-6 shadow-4xl group-hover/view:scale-110 transition-transform duration-700 border-rose-500/30">
                                    <Monitor size={24} className="text-rose-500" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">Signal Delay</p>
                                        <p className="text-xl font-black text-white italic">{stats.latency} ms</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Console / History */}
                    <div className="2xl:col-span-4 bg-white/40 backdrop-blur-3xl rounded-[4.5rem] border border-white/20 flex flex-col overflow-hidden shadow-4xl relative animate-in slide-in-from-right-12 duration-1000">
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                        
                        <div className="p-10 border-b border-slate-100 bg-white relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-[#041C3C] text-[#5CB4E4] rounded-2xl">
                                    <Signal size={24} />
                                </div>
                                <h3 className="text-[13px] font-black text-[#041C3C] uppercase tracking-[0.5em] italic">
                                    Verification Logs
                                </h3>
                            </div>
                            <button onClick={() => setHistory([])}
                                className="w-14 h-14 flex items-center justify-center hover:bg-rose-50 rounded-[1.5rem] text-slate-300 hover:text-rose-500 transition-all duration-700 shadow-sm border border-slate-50">
                                <Trash2 size={24} />
                            </button>
                        </div>

                        <div className="bg-[#041C3C] px-10 py-6 flex items-center justify-between relative z-10 border-y border-white/10">
                            <div className="flex items-center gap-4 text-emerald-400 font-black text-[12px] uppercase tracking-[0.4em] italic drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,1)]" />
                                {history.filter(h => h.match).length} Verified Students
                            </div>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div className="flex items-center gap-4 text-rose-500 font-black text-[12px] uppercase tracking-[0.4em] italic">
                                <XCircle size={18} />
                                {history.filter(h => !h.match).length} Unidentified Subjects
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white/5 relative z-10">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-10 text-center animate-pulse">
                                    <div className="p-16 bg-white/50 rounded-full border border-white shadow-4xl">
                                        <Camera size={80} className="text-slate-200" />
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-xl font-black text-[#041C3C]/30 uppercase tracking-[0.5em] italic">Awaiting student identification...</p>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">No biometric data captured.</p>
                                    </div>
                                </div>
                            ) : (
                                history.map((log, idx) => (
                                    <div key={`${log.timestamp}-${idx}`}
                                        className={`bg-white/80 p-8 rounded-[3rem] border transition-all duration-700 animate-in slide-in-from-right-12 group/log shadow-2xl hover:-translate-x-4 ${
                                            log.match ? 'border-white hover:border-[#5CB4E4]/50' : 'border-rose-100'
                                        }`}>
                                        <div className="flex items-center gap-10">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-20 h-20 rounded-[1.8rem] bg-white overflow-hidden border border-slate-100 shadow-4xl ring-4 ring-slate-50 transition-all duration-700 group-hover/log:scale-110">
                                                    {log.thumbnail ? <img src={log.thumbnail} alt="Detections" className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-slate-100" />}
                                                </div>
                                                {log.match && log.profile_picture && (
                                                    <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full border-4 border-white overflow-hidden shadow-4xl z-20">
                                                        <img src={log.profile_picture} alt="Registry" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-xl font-black italic uppercase tracking-tighter ${log.match ? 'text-[#041C3C]' : 'text-rose-500'}`}>
                                                        {log.name.toUpperCase()}
                                                    </h4>
                                                    <span className="text-[11px] font-black text-slate-300 italic opacity-80">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] italic border-2 shadow-2xl transition-all group-hover/log:scale-105 ${
                                                        log.match ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                    }`}>
                                                        {log.match ? 'Student Identity Verified' : 'Unidentified Subject'}
                                                    </span>
                                                    <span className="text-[12px] font-black text-slate-400 italic">{log.confidence}% Confidence Level</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
