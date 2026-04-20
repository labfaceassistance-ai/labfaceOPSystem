import { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Activity, ShieldCheck, Server, Wifi, AlertTriangle, Maximize2, X } from 'lucide-react';
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

    // Poll camera status instead of relying on onLoad
    useEffect(() => {
        let isMounted = true;

        // Safety timeout: hide loading after 15s regardless of status check
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.log(`[VideoFeed] Safety timeout hit for ${alt}, forcing isLoading=false`);
                setIsLoading(false);
            }
        }, 15000);

        const checkStatus = async () => {
            try {
                // Extract ID from src (e.g. /api/ai/video_feed/1)
                const id = src.split('/').pop();
                const response = await fetch(`/api/ai/camera_status/${id}`);
                const data = await response.json();

                if (isMounted && data.online) {
                    setIsLoading(false);
                    setError(false);
                    clearTimeout(safetyTimeout);
                }
            } catch (e) {
                // Ignore errors
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
            clearTimeout(safetyTimeout);
        };
    }, [src, retryKey, alt]);



    const handleRefresh = () => {
        setError(false);
        setIsLoading(true);
        setRetryKey(prev => prev + 1);
    };

    // For MJPEG streams, we don't use the interval refresh as it restarts the stream connection
    // causing massive lag. We only add a timestamp once on error/retry or manual refresh.
    const currentSrc = `${src}${src.includes('?') ? '&' : '?'}retry=${retryKey}`;

    return (
        <div className={`relative bg-black group overflow-hidden rounded-2xl border border-white/5 shadow-2xl ${className}`}>
            {!error ? (
                <>
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-identity-navy/80 z-20 backdrop-blur-md text-center p-6 font-outfit">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 rounded-full bg-identity-sky/20 animate-ping blur-xl"></div>
                                <div className="w-16 h-16 relative">
                                    <div className="absolute inset-0 border-4 border-identity-sky/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="block text-lg font-black tracking-[0.2em] uppercase text-identity-sky animate-pulse">
                                    Initializing Feed
                                </span>
                                <span className="block text-[8px] font-black tracking-[0.3em] uppercase text-slate-400">
                                    Establishing Secure Connection...
                                </span>
                            </div>
                        </div>
                    )}
                    <img
                        src={currentSrc}
                        alt={alt}
                        className="w-full h-full object-cover transition-opacity duration-300 text-transparent"
                        style={{ opacity: 1 }}
                        onError={() => {
                            setError(true);
                            setIsLoading(true);
                        }}
                        onLoad={() => {
                            setIsLoading(false);
                        }}
                    />

                    {/* Manual Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="absolute bottom-4 right-4 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center bg-identity-navy/80 text-identity-navy rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-identity-navy"
                        title="Reset Feed"
                    >
                        <RefreshCw size={16} />
                    </button>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white/50 absolute inset-0 backdrop-blur-sm">
                    <div className="animate-spin mb-2 text-slate-500">
                        <RefreshCw size={32} />
                    </div>
                    <span className="text-sm font-mono tracking-[0.15em] uppercase">Signal Lost â€¢ Reconnecting</span>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${!error ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-xs px-2 py-1 rounded backdrop-blur-md border font-mono ${!error ? 'bg-black/40 text-slate-100 border-white/10' : 'bg-red-900/60 text-red-100 border-red-500/30'}`}>
                            {error ? 'OFFLINE' : (label || 'LIVE FEED')}
                        </span>
                    </div>

                    {!error && onExpand && (
                        <button
                            onClick={onExpand}
                            className="pointer-events-auto bg-black/40 hover:bg-identity-sky/80 text-identity-navy p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                        >
                            <Maximize2 size={18} />
                        </button>
                    )}
                </div>

                {!error && (
                    <div className="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-[10px] text-secondary/60 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/5">
                            FHD â€¢ 30 FPS â€¢ NET: STABLE
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
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
            // Auto-fetch if no param
            const fetchActiveSession = async () => {
                try {
                    const token = getToken();
                    if (!token) return; // Don't fetch if no token
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const response = await axios.get(`${API_URL}/api/attendance/sessions/active/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data && response.data.id) {
                        setCurrentSessionId(response.data.id.toString());
                    }
                } catch (e) {
                    // Silent fail is okay, maybe no session active
                    console.log("No active session or failed to fetch", e);
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

    // Fetch Session Details for Dynamic Title
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
                console.error("Error fetching session details for title:", e);
            }
        };
        fetchDetails();
    }, [currentSessionId]);

    useEffect(() => {
        // Fetch System Status
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
        // Clear sessionId from URL without full reload if possible, or just push path
        setCurrentSessionId(null);
        router.push(pathname + '?tab=monitor');
    };

    // --- DEFAULT GENERIC MONITOR ---
    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="font-outfit">
                        <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tight italic">
                            <div className="p-3 bg-identity-sky/10 rounded-2xl border border-identity-sky/10">
                                <Camera className="w-6 h-6 text-identity-sky" />
                            </div>
                            {currentSessionId ? (
                                <span className="flex items-center gap-4">
                                    <span className="text-identity-sky">Live:</span>
                                    {sessionDetails?.subject_name || 'Class Monitor'}
                                    <span className="text-[10px] font-black text-slate-500 bg-white/40 px-3 py-1 rounded-full border border-identity-sky/10 ml-2 uppercase tracking-[0.15em]">
                                        {sessionDetails?.section || 'Active'}
                                    </span>
                                </span>
                            ) : (
                                'Security Monitoring'
                            )}
                        </h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 ml-16">Real-time surveillance and attendance tracking</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 font-outfit">
                        <Link 
                            href="/professor/camera-test" 
                            className="bg-identity-sky hover:bg-identity-navy text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all shadow-xl shadow-identity-sky/10 active:scale-95"
                        >
                            <Activity className="w-4 h-4" />
                            Run Diagnostic
                        </Link>
                        <div className={`flex items-center gap-2 px-4 py-2.5 bg-white/40 rounded-2xl border ${overallSystemOnline ? 'border-emerald-500/30' : 'border-rose-500/30'} backdrop-blur-md`}>
                            <Wifi size={16} className={overallSystemOnline ? "text-emerald-500" : "text-rose-500"} />
                            <span className={`text-[10px] font-black tracking-[0.15em] ${overallSystemOnline ? "text-emerald-500" : "text-rose-400"}`}>
                                {overallSystemOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
                            </span>
                        </div>
                        {overallSystemOnline && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-identity-sky/10 text-identity-sky rounded-lg border border-identity-sky/20 animate-pulse">
                                <div className="w-2 h-2 bg-identity-sky rounded-full"></div>
                                <span className="text-xs font-bold tracking-[0.15em]">LIVE</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Primary Entrance Terminal (Single Camera Focus) */}
                        <div className="identity-glass rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-3xl backdrop-blur-sm overflow-hidden font-outfit">
                            <div className="px-8 py-6 flex justify-between items-center bg-white/40 border-b border-identity-sky/5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${cam1Online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                    <h3 className="font-black text-lg text-identity-navy uppercase tracking-tighter italic">
                                        ENTRANCE TERMINAL
                                        <span className="ml-4 text-[10px] font-black text-slate-400 tracking-[0.15em]">CAM-01 â€¢ PRIMARY</span>
                                    </h3>
                                </div>
                                <div className="text-[10px] font-black text-identity-sky/60 bg-identity-sky/5 border border-identity-sky/10 px-4 py-1.5 rounded-full uppercase tracking-[0.15em]">
                                    SECURE NODE: 220
                                </div>
                            </div>
                            <div className="aspect-video w-full bg-black relative">
                                <VideoFeed
                                    src="/api/ai/video_feed/1"
                                    alt="Entrance Camera"
                                    label="MAIN ENTRANCE MONITOR"
                                    className="w-full h-full"
                                    onExpand={() => setExpandedCamera(1)}
                                    onStatusChange={setCam1Online}
                                />
                            </div>
                            <div className="px-8 py-6 bg-white/20 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">Signal Quality</span>
                                        <span className="text-xs text-emerald-500 font-bold tracking-tight">98% STABLE</span>
                                    </div>
                                    <div className="w-px h-8 bg-identity-sky/10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">Protocol</span>
                                        <span className="text-xs text-identity-navy font-bold tracking-tight">RTSP / FFMPEG</span>
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                    Camera: <span className="text-identity-sky">LN-01-ENTRANCE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="identity-glass p-8 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-3xl font-outfit">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 ml-1 italic">Surveillance Node Status</h3>

                            <div className="space-y-5">
                                <div className={`flex items-center justify-between p-4 bg-white/40 rounded-2xl border ${overallSystemOnline ? 'border-identity-sky/10 shadow-sm' : 'border-rose-500/30'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${overallSystemOnline ? 'bg-identity-sky/10 text-identity-sky border border-identity-sky/10' : 'bg-rose-500/10 text-rose-500 border border-rose-500/10'}`}>
                                            <Server size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-identity-navy uppercase tracking-tight">AI Engine</div>
                                            <div className={`text-[10px] font-bold uppercase tracking-[0.15em] ${overallSystemOnline ? 'text-slate-400' : 'text-rose-500'}`}>
                                                {loadingStatus ? 'Verifying...' : (overallSystemOnline ? 'Operational' : 'Node Unreachable')}
                                            </div>
                                        </div>
                                    </div>
                                    {overallSystemOnline ? (
                                        <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                                    ) : (
                                        <AlertTriangle size={18} className="text-rose-500" />
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-identity-sky/10 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${overallSystemOnline ? 'bg-identity-sky/10 text-identity-sky border border-identity-sky/10' : 'bg-white/5 text-slate-300 border border-identity-sky/5'}`}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-identity-navy uppercase tracking-tight">Neural Sync</div>
                                            <div className={`text-[10px] font-bold uppercase tracking-[0.15em] ${overallSystemOnline ? 'text-slate-400' : 'text-slate-300'}`}>
                                                {overallSystemOnline ? 'High Authority' : 'Paused'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${overallSystemOnline ? 'text-identity-sky' : 'text-slate-300'}`}>
                                        {overallSystemOnline ? 'ACTIVE' : 'VOID'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Active Session Panel - Only shown when session is active */}
                        {currentSessionId && (
                            <ActiveSessionPanel
                                sessionId={currentSessionId}
                                onStopSession={handleStopSession}
                            />
                        )}
                    </div>
                </div>
            </div>

            {expandedCamera && (
                <div
                    className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setExpandedCamera(null)}
                >
                    <div
                        className="relative w-full h-full flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-4 right-4 z-50">
                            <button
                                onClick={() => setExpandedCamera(null)}
                                className="bg-black/50 hover:bg-white/20 text-identity-navy p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-md border border-white/10 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center p-4 md:p-10">
                            <div className="w-full h-full flex items-center justify-center identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/20 overflow-hidden shadow-2xl relative">
                                <VideoFeed
                                    src={`/api/ai/video_feed/${expandedCamera}`}
                                    alt={`Camera ${expandedCamera} Full View`}
                                    label="ENTRANCE TERMINAL - FULL VIEW"
                                    className="h-full w-full object-contain"
                                />
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-identity-navy pl-4 pr-6 py-3 rounded-full backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-2xl">
                                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold tracking-[0.15em]">LIVE MONITORING</span>
                                        <span className="text-[10px] text-slate-400 font-mono">CAM 0{expandedCamera} â€¢ 1080p Stream</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
