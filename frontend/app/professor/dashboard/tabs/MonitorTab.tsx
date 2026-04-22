"use client";
import { useState, useEffect } from 'react';
import { Camera, RefreshCw, Activity, ShieldCheck, Server, Wifi, AlertTriangle, Maximize2, X, Zap, Signal, Monitor, Cpu } from 'lucide-react';
import axios from 'axios';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ActiveSessionPanel from './ActiveSessionPanel';
import { getToken } from '@/utils/auth';
import Link from 'next/link';

interface SystemStatus {
    online: boolean;
    details?: {
        version: string;
        features: string[];
        threshold: number;
    }
}

interface VideoFeedProps {
    src: string;
    alt: string;
    className?: string;
    onExpand?: () => void;
    label?: string;
    onStatusChange?: (isOnline: boolean) => void;
}

const VideoFeed = ({ src, alt, className, onExpand, label, onStatusChange }: VideoFeedProps) => {
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        if (onStatusChange) {
            onStatusChange(!error);
        }
    }, [error, onStatusChange]);

    useEffect(() => {
        let isMounted = true;
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                setIsLoading(false);
            }
        }, 15000);

        const checkStatus = async () => {
            try {
                const id = src.split('/').pop();
                const response = await fetch(`/api/ai/camera_status/${id}`);
                const data = await response.json();
                if (isMounted && data.online) {
                    setIsLoading(false);
                    setError(false);
                    clearTimeout(safetyTimeout);
                }
            } catch (e) { }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
            clearTimeout(safetyTimeout);
        };
    }, [src, retryKey]);

    const handleRefresh = () => {
        setError(false);
        setIsLoading(true);
        setRetryKey(prev => prev + 1);
    };

    const currentSrc = `${src}${src.includes('?') ? '&' : '?'}retry=${retryKey}`;

    return (
        <div className={`relative bg-black group overflow-hidden rounded-[4rem] border-2 border-[#041C3C]/30 shadow-4xl ${className} group/feed transition-all duration-700`}>
            {!error ? (
                <>
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#041C3C]/98 z-30 backdrop-blur-3xl p-12">
                            <div className="w-32 h-32 relative mb-12">
                                <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-[3rem] rotate-45" />
                                <div className="absolute inset-0 border-4 border-[#5CB4E4] border-t-transparent rounded-[3rem] rotate-45 animate-spin shadow-[0_0_30px_rgba(92,180,228,0.6)]" />
                                <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                                    <Activity className="text-[#5CB4E4] w-10 h-10 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <span className="block text-2xl font-black tracking-[0.5em] uppercase text-[#5CB4E4] animate-pulse italic font-outfit">
                                    CONNECTING...
                                </span>
                                <span className="block text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 italic font-outfit">
                                    Connecting to camera feed...
                                </span>
                            </div>
                        </div>
                    )}
                    <img
                        src={currentSrc}
                        alt={alt}
                        className="w-full h-full object-cover transition-opacity duration-300"
                        style={{ opacity: 1 }}
                        onError={() => {
                            setError(true);
                            setIsLoading(true);
                        }}
                        onLoad={() => {
                            setIsLoading(false);
                        }}
                    />
  
                    {/* High-Tech Scan Line Overlay */}
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-30">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(92,180,228,0.05),transparent,rgba(92,180,228,0.05))] bg-[length:100%_4px,10%_100%] pointer-events-none" />
                        <div className="absolute top-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#5CB4E4] to-transparent shadow-[0_0_25px_rgba(92,180,228,1)] animate-scanline" />
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/95 backdrop-blur-3xl z-40 p-16 text-center">
                    <div className="relative mb-10">
                        <div className="absolute inset-0 blur-3xl bg-rose-500/30 animate-pulse" />
                        <AlertTriangle size={80} className="text-rose-500 relative z-10" />
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter leading-none">CAMERA OFFLINE</h4>
                        <p className="text-[11px] font-black text-rose-300/60 uppercase tracking-[0.4em] italic mb-8">Error: Connection timed out</p>
                        <button 
                            onClick={handleRefresh}
                            className="px-12 py-6 bg-rose-500 hover:bg-rose-600 text-white border border-rose-400/30 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-3xl active:scale-95 italic"
                        >
                            RECONNECT CAMERA
                        </button>
                    </div>
                </div>
            )}
  
            {/* UI Overlay HUD Redesigned */}
            <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-between z-30 font-outfit">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-6">
                        <div className="bg-[#041C3C]/90 backdrop-blur-2xl px-8 py-4 rounded-2.5xl border border-white/10 shadow-3xl flex items-center gap-5">
                            <div className={`w-3.5 h-3.5 rounded-full ${!error ? 'bg-[#5CB4E4] animate-pulse shadow-[0_0_20px_rgba(92,180,228,1)]' : 'bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,1)]'}`} />
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black tracking-[0.4em] uppercase text-white italic leading-none mb-1">
                                    {error ? 'OFFLINE' : (label || 'MAIN CAMERA')}
                                </span>
                                <span className="text-[8px] font-black tracking-[0.2em] uppercase text-slate-400 italic">SECURE CONNECTION</span>
                            </div>
                        </div>
                    </div>
  
                    {!error && onExpand && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onExpand(); }}
                            className="pointer-events-auto w-16 h-16 flex items-center justify-center bg-white/10 hover:bg-[#5CB4E4] text-white rounded-2.5xl backdrop-blur-xl border border-white/20 opacity-0 group-hover/feed:opacity-100 transition-all duration-700 transform translate-y-6 group-hover/feed:translate-y-0 shadow-3xl active:scale-90"
                        >
                            <Maximize2 size={24} />
                        </button>
                    )}
                </div>
  
                {!error && (
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-8 bg-[#041C3C]/80 backdrop-blur-2xl px-10 py-5 rounded-3xl border border-white/10 shadow-3xl">
                            <div className="flex items-center gap-4">
                                <Activity size={18} className="text-[#5CB4E4] animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">STABLE</span>
                            </div>
                            <div className="h-6 w-px bg-white/10 mx-2" />
                            <div className="flex items-center gap-4">
                                <Signal size={18} className="text-emerald-400" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">LIVE</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                             <div className="bg-black/60 px-6 py-2 rounded-xl border border-white/5 text-[11px] font-black text-white/50 tracking-[0.5em] italic">
                                {new Date().toLocaleTimeString('en-US', { hour12: false })}
                            </div>
                            <div className="text-[9px] font-black text-white/20 tracking-[0.3em] uppercase italic">FEED ACTIVE</div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.7)] z-10" />
            
            {/* Manual Sync Button (Hover) */}
            <button
                onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
                className="absolute top-12 left-12 p-5 bg-white/10 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-[#5CB4E4] shadow-4xl backdrop-blur-xl border border-white/20 active:scale-95 z-[35]"
                title="RESET CONNECTION"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
    );
};

export default function MonitorTab() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const activeSessionIdParam = searchParams.get('sessionId');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(activeSessionIdParam);

    useEffect(() => {
        if (activeSessionIdParam) {
            setCurrentSessionId(activeSessionIdParam);
        } else {
            const fetchActiveSession = async () => {
                try {
                    const token = getToken();
                    if (!token) return;
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const response = await axios.get(`${API_URL}/api/attendance/sessions/active/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data && response.data.id) {
                        setCurrentSessionId(response.data.id.toString());
                    }
                } catch (e) {
                    console.log("No active session detected", e);
                }
            };
            fetchActiveSession();
        }
    }, [activeSessionIdParam]);

    const [expandedCamera, setExpandedCamera] = useState<number | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({ online: false });
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [cam1Online, setCam1Online] = useState(false);
    const [sessionDetails, setSessionDetails] = useState<any>(null);

    useEffect(() => {
        if (!currentSessionId) {
            setSessionDetails(null);
            return;
        }
        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await axios.get(`${API_URL}/api/attendance/sessions/${currentSessionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSessionDetails(response.data);
            } catch (e) {
                console.error("Error fetching session details:", e);
            }
        };
        fetchDetails();
    }, [currentSessionId]);

    useEffect(() => {
        const fetchSystemStatus = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await axios.get(`${API_URL}/api/ai/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSystemStatus(response.data);
            } catch (error) {
                console.error('Failed to fetch system status:', error);
                setSystemStatus({ online: false });
            } finally {
                setLoadingStatus(false);
            }
        };

        fetchSystemStatus();
        const interval = setInterval(fetchSystemStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const overallSystemOnline = systemStatus.online;

    const handleStopSession = () => {
        setCurrentSessionId(null);
        router.push(pathname + '?tab=monitor');
    };

    return (
        <div className="space-y-16 animate-in fade-in duration-1000">
            {/* Header / Sub-Nav Redesigned */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 mb-12">
                <div className="relative group transition-all duration-700 hover:translate-x-6">
                    <div className="flex items-center gap-10">
                        <div className="w-28 h-28 bg-[#041C3C] text-[#5CB4E4] rounded-[3rem] shadow-4xl border border-[#5CB4E4]/30 flex items-center justify-center group-hover:rotate-[-10deg] group-hover:scale-110 transition-all duration-1000">
                            <Monitor size={56} className="group-hover:animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-6xl font-black text-[#041C3C] uppercase tracking-tighter italic leading-none font-outfit">
                                {currentSessionId ? (
                                    <>
                                        <span className="text-[#5CB4E4]">ACTIVE SESSION:</span><br/>
                                        {sessionDetails?.subject_name?.toUpperCase() || 'MAIN FEED'}
                                    </>
                                ) : (
                                    <>
                                        MONITORING CENTER:<br/>
                                        <span className="text-[#5CB4E4]">CAMERA FEEDS</span>
                                    </>
                                )}
                            </h2>
                            <div className="flex items-center gap-6">
                                {currentSessionId && (
                                    <div className="px-8 py-3 bg-[#5CB4E4]/10 rounded-2xl border border-[#5CB4E4]/20 text-[11px] font-black text-[#5CB4E4] uppercase tracking-[0.5em] italic shadow-2xl">
                                        Section: {sessionDetails?.section || 'N/A'}
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">LIVE AND SECURE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-8">
                    <Link 
                        href="/professor/camera-test" 
                        className="bg-[#041C3C] hover:bg-[#5CB4E4] text-white px-16 py-8 rounded-[2.8rem] text-[13px] font-black uppercase tracking-[0.4em] flex items-center gap-6 transition-all shadow-4xl active:scale-95 italic group/test border border-[#5CB4E4]/30"
                    >
                        <Zap className="w-7 h-7 group-hover:animate-bounce" />
                        TEST CAMERA
                    </Link>
                    
                    <div className={`flex items-center gap-6 px-12 py-8 bg-white/40 backdrop-blur-xl shadow-4xl rounded-[2.8rem] border-2 transition-all duration-1000 ${overallSystemOnline ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                        <div className="relative">
                            <Signal size={28} className={overallSystemOnline ? "text-emerald-500" : "text-rose-500"} />
                            {overallSystemOnline && <div className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping blur-xl" />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[12px] font-black tracking-[0.4em] uppercase italic ${overallSystemOnline ? "text-emerald-500" : "text-rose-500"}`}>
                                {overallSystemOnline ? "ONLINE" : "OFFLINE"}
                            </span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">VERIFIED CONNECTION</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-3 space-y-12">
                    {/* Primary Feed Frame */}
                    <div className="bg-white/40 backdrop-blur-xl rounded-[5rem] border border-white/20 shadow-4xl overflow-hidden font-outfit relative group/stream">
                        <div className="absolute inset-x-0 top-0 h-full z-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/40 to-transparent z-20 animate-scan-y opacity-30 pointer-events-none" />
                        
                        <div className="px-16 py-12 flex justify-between items-center bg-white border-b border-slate-100 relative z-10">
                            <div className="flex items-center gap-8">
                                <div className={`w-6 h-6 rounded-full ${cam1Online ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-pulse`} />
                                <div className="space-y-1">
                                    <h3 className="font-black text-3xl text-[#041C3C] uppercase tracking-tighter italic leading-none">
                                        CAMERA: <span className="text-[#5CB4E4]">MAIN</span>
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">DEVICE: LAB MONITOR</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="px-8 py-3 bg-[#041C3C] text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.4em] italic shadow-2xl border border-[#5CB4E4]/20">
                                    LIVE FEED
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pb-16 relative z-10">
                            <div className="aspect-video w-full bg-slate-900 rounded-[4rem] overflow-hidden border-4 border-[#041C3C] shadow-[0_50px_100px_-20px_rgba(4,28,60,0.5)] relative">
                                <VideoFeed
                                    src="/api/ai/video_feed/1"
                                    alt="Main Operational Stream"
                                    label="SCANNING..."
                                    className="w-full h-full"
                                    onExpand={() => setExpandedCamera(1)}
                                    onStatusChange={setCam1Online}
                                />
                            </div>
                        </div>

                        <div className="px-10 py-6 bg-white/20 backdrop-blur-2xl border-t border-slate-100/50 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 shadow-inner">
                            <div className="flex items-center gap-10">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.4em] italic">NETWORK PING</span>
                                    <div className="flex items-center gap-3">
                                        <Activity size={14} className="text-emerald-500 animate-pulse" />
                                        <span className="text-lg font-black text-[#041C3C] italic tracking-tight">14ms</span>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-slate-200" />
                                <div className="space-y-1.5">
                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.4em] italic">SYSTEM INFO</span>
                                    <div className="flex items-center gap-3">
                                        <Cpu size={14} className="text-[#5CB4E4]" />
                                        <span className="text-lg font-black text-[#041C3C] italic tracking-tight uppercase">LAB PROCESSOR</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Metrics Sidebar Redesigned */}
                    <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-4xl font-outfit relative overflow-hidden group/side">
                        <div className="absolute inset-x-0 top-0 h-full z-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                        <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] mb-8 flex items-center gap-4 italic relative z-10">
                            <Activity size={18} className="text-[#5CB4E4] animate-pulse" /> SYSTEM STATUS
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className={`p-5 rounded-[2rem] border-2 transition-all duration-700 shadow-2xl bg-white group/stat hover:scale-105 ${overallSystemOnline ? 'border-emerald-100' : 'border-rose-100'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3.5 rounded-[1.2rem] shadow-xl transition-all duration-700 ${overallSystemOnline ? 'bg-[#041C3C] text-[#5CB4E4] border border-[#5CB4E4]/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                        <Server size={20} />
                                    </div>
                                    <div className={`text-[7px] font-black px-3 py-1.5 rounded-lg transition-all duration-700 ${overallSystemOnline ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                        {overallSystemOnline ? 'CONNECTED' : 'OFFLINE'}
                                    </div>
                                </div>
                                <h4 className="text-base font-black text-[#041C3C] uppercase tracking-tighter italic leading-none mb-2">RECOGNITION SYSTEM</h4>
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] italic leading-tight">VERSION 2.0.4</p>
                            </div>

                            <div className="p-5 rounded-[2rem] border-2 border-slate-100 bg-white group/stat hover:scale-105 hover:border-[#5CB4E4]/30 transition-all duration-700 shadow-2xl">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-[#041C3C] text-[#5CB4E4] p-3.5 rounded-[1.2rem] shadow-xl border border-[#5CB4E4]/20 group-hover/stat:bg-[#5CB4E4] group-hover/stat:text-white transition-all duration-500">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div className="text-[7px] font-black px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400">
                                        PROTECTED
                                    </div>
                                </div>
                                <h4 className="text-base font-black text-[#041C3C] uppercase tracking-tighter italic leading-none mb-2">SYSTEM SECURITY</h4>
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] italic leading-tight">STATUS: CLEAN</p>
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-[#041C3C] hover:bg-[#5CB4E4] text-white rounded-[2rem] transition-all duration-1000 border border-white/10 shadow-3xl group/footer relative overflow-hidden flex flex-col items-center gap-3 text-center cursor-pointer">
                            <div className="absolute inset-0 opacity-10 bg-blueprint pointer-events-none" />
                            <ShieldCheck size={28} className="relative z-10 group-hover/footer:scale-110 transition-transform duration-1000" />
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">VERIFICATION ACTIVE</p>
                                <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] font-mono">SYSTEM SECURE</p>
                            </div>
                        </div>
                    </div>

                    {/* Active Session Component Wrapper */}
                    {currentSessionId && (
                        <div className="relative group/panel">
                            <div className="absolute -inset-4 bg-gradient-to-b from-[#5CB4E4]/10 to-transparent blur-3xl opacity-0 group-hover/panel:opacity-100 transition-opacity duration-1000" />
                            <ActiveSessionPanel
                                sessionId={currentSessionId}
                                onStopSession={handleStopSession}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Camera Modal Redesigned */}
            {expandedCamera && (
                <div
                    className="fixed inset-0 bg-[#041C3C]/98 z-[100] flex items-center justify-center p-12 backdrop-blur-3xl animate-in zoom-in-95 duration-500"
                    onClick={() => setExpandedCamera(null)}
                >
                    <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-10 right-10 z-[120]">
                            <button
                                onClick={() => setExpandedCamera(null)}
                                className="w-20 h-20 flex items-center justify-center bg-white/10 hover:bg-rose-500 text-white rounded-full border border-white/20 transition-all shadow-4xl active:scale-90"
                            >
                                <X size={40} />
                            </button>
                        </div>
  
                        <div className="w-full max-w-7xl aspect-video bg-black rounded-[5rem] border-8 border-[#041C3C] shadow-[0_0_150px_rgba(92,180,228,0.4)] overflow-hidden relative group/full">
                            <VideoFeed
                                src={`/api/ai/video_feed/${expandedCamera}`}
                                alt="Expanded Node Stream"
                                label="CAMERA FEED"
                                className="h-full w-full"
                            />
                            
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#041C3C]/95 text-[#5CB4E4] px-14 py-8 rounded-[3.5rem] backdrop-blur-3xl border border-[#5CB4E4]/40 flex items-center gap-12 shadow-4xl shadow-black/80 font-outfit">
                                <div className="flex items-center gap-5">
                                    <div className="w-5 h-5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_30px_rgba(16,185,129,1)]" />
                                    <div className="h-10 w-px bg-white/10 mx-2" />
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black tracking-tighter uppercase italic leading-none mb-1 text-white">LIVE MONITORING</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Connecting to camera feed...</span>
                                    </div>
                                </div>
                                <ShieldCheck size={48} className="animate-bounce" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
