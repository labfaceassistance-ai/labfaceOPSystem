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
        <div className={`relative bg-black group overflow-hidden rounded-xl border border-white/5 shadow-2xl ${className}`}>
            {!error ? (
                <>
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-md text-center p-6">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 rounded-full bg-identity-sky/20 animate-ping blur-xl"></div>
                                <div className="relative animate-spin text-identity-sky">
                                    <RefreshCw size={48} strokeWidth={1.5} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="block text-lg font-bold tracking-[0.2em] uppercase text-identity-navy drop-shadow-md">
                                    Initializing Feed
                                </span>
                                <span className="block text-[10px] font-mono tracking-widest uppercase text-slate-500">
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
                        className="absolute bottom-4 right-4 p-2 bg-identity-navy/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-identity-navy"
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
                    <span className="text-sm font-mono tracking-widest uppercase">Signal Lost • Reconnecting</span>
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
                            className="pointer-events-auto bg-black/40 hover:bg-identity-sky/80 text-white p-2 rounded-lg backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                        >
                            <Maximize2 size={18} />
                        </button>
                    )}
                </div>

                {!error && (
                    <div className="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-[10px] text-secondary/60 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/5">
                            FHD • 30 FPS • NET: STABLE
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
                    <div>
                        <h2 className="text-2xl font-bold text-identity-navy flex items-center gap-2">
                            <div className="p-1.5 bg-identity-sky/10 rounded-lg">
                                <Camera className="w-6 h-6 text-identity-sky" />
                            </div>
                            {currentSessionId ? (
                                <span className="flex items-center gap-2">
                                    <span className="text-identity-sky">Live:</span>
                                    {sessionDetails?.subject_name || 'Class Monitor'}
                                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-identity-sky/10 ml-2">
                                        {sessionDetails?.section || 'Active'}
                                    </span>
                                </span>
                            ) : (
                                'Security Monitoring'
                            )}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Real-time surveillance and attendance tracking</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link 
                            href="/professor/camera-test" 
                            className="bg-identity-navy hover:bg-identity-navy/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-identity-navy/10"
                        >
                            <Activity className="w-4 h-4" />
                            Run Diagnostic
                        </Link>
                        <div className={`flex items-center gap-2 px-4 py-2 bg-white rounded-lg border ${overallSystemOnline ? 'border-emerald-500/30 shadow-emerald-500/5' : 'border-red-500/30'}`}>
                            <Wifi size={16} className={overallSystemOnline ? "text-emerald-500" : "text-red-500"} />
                            <span className={`text-xs font-mono ${overallSystemOnline ? "text-emerald-500" : "text-red-400"}`}>
                                {overallSystemOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
                            </span>
                        </div>
                        {overallSystemOnline && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-identity-sky/10 text-identity-sky rounded-lg border border-identity-sky/20 animate-pulse">
                                <div className="w-2 h-2 bg-identity-sky rounded-full"></div>
                                <span className="text-xs font-bold tracking-wider">LIVE</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Primary Entrance Terminal (Single Camera Focus) */}
                        <div className="identity-glass rounded-2xl border border-identity-sky/10 p-1 shadow-2xl backdrop-blur-sm overflow-hidden">
                            <div className="px-6 py-4 flex justify-between items-center bg-white/40 border-b border-identity-sky/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${cam1Online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <h3 className="font-bold text-lg text-identity-navy">
                                        ENTRANCE TERMINAL
                                        <span className="ml-3 text-xs font-mono text-slate-400 tracking-tighter">CAM-01 • PRIMARY</span>
                                    </h3>
                                </div>
                                <div className="text-[10px] font-mono text-secondary/40 bg-black/30 px-2 py-1 rounded">
                                    IP: 192.168.1.220:554
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
                            <div className="px-6 py-4 bg-white/10 flex items-center justify-between transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Signal Quality</span>
                                        <span className="text-xs text-emerald-500 font-mono">98% STABLE</span>
                                    </div>
                                    <div className="w-px h-8 bg-identity-sky/10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Protocol</span>
                                        <span className="text-xs text-slate-600 font-mono">RTSP / FFMPEG</span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                    Security Node: <span className="text-identity-sky">LN-01-ENTRANCE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="identity-glass rounded-2xl border border-identity-sky/10 p-6 shadow-2xl">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">System Status</h3>

                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-3 bg-white/40 rounded-xl border ${overallSystemOnline ? 'border-identity-sky/10' : 'border-red-500/30'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${overallSystemOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <Server size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-identity-navy">AI Engine</div>
                                            <div className={`text-xs ${overallSystemOnline ? 'text-slate-400' : 'text-red-500'}`}>
                                                {loadingStatus ? 'Checking...' : (overallSystemOnline ? 'Operational' : 'Unreachable')}
                                            </div>
                                        </div>
                                    </div>
                                    {overallSystemOnline ? (
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    ) : (
                                        <AlertTriangle size={16} className="text-red-500" />
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-identity-sky/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${overallSystemOnline ? 'bg-purple-500/10 text-purple-500' : 'bg-white/5 text-slate-300'}`}>
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-identity-navy">Recognition</div>
                                            <div className="text-xs text-slate-400">
                                                {overallSystemOnline ? 'Active Mode' : 'Inactive'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-mono ${overallSystemOnline ? 'text-purple-500' : 'text-slate-300'}`}>
                                        {overallSystemOnline ? 'ON' : 'OFF'}
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
                                className="bg-black/50 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 relative flex items-center justify-center p-4 md:p-10">
                            <div className="w-full h-full flex items-center justify-center identity-glass rounded-2xl border border-identity-sky/20 overflow-hidden shadow-2xl relative">
                                <VideoFeed
                                    src={`/api/ai/video_feed/${expandedCamera}`}
                                    alt={`Camera ${expandedCamera} Full View`}
                                    label="ENTRANCE TERMINAL - FULL VIEW"
                                    className="h-full w-full object-contain"
                                />
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white pl-4 pr-6 py-3 rounded-full backdrop-blur-xl border border-white/10 flex items-center gap-3 shadow-2xl">
                                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold tracking-wider">LIVE MONITORING</span>
                                        <span className="text-[10px] text-slate-400 font-mono">CAM 0{expandedCamera} • 1080p Stream</span>
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
