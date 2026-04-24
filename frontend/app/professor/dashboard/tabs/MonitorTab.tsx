"use client";
import { useState, useEffect } from "react";
import {
  Camera,
  RefreshCw,
  Activity,
  ShieldCheck,
  Server,
  Wifi,
  AlertTriangle,
  Maximize2,
  X,
  Zap,
  Signal,
  Monitor,
  Cpu,
} from "lucide-react";
import axios from "axios";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ActiveSessionPanel from "./ActiveSessionPanel";
import { getToken } from "@/utils/auth";
import Link from "next/link";

interface SystemStatus {
  online: boolean;
  details?: {
    version: string;
    features: string[];
    threshold: number;
  };
}

interface VideoFeedProps {
  src: string;
  alt: string;
  className?: string;
  onExpand?: () => void;
  label?: string;
  onStatusChange?: (isOnline: boolean) => void;
}

const VideoFeed = ({
  src,
  alt,
  className,
  onExpand,
  label,
  onStatusChange,
}: VideoFeedProps) => {
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
        const id = src.split("/").pop();
        const response = await fetch(`/api/ai/camera_status/${id}`);
        const data = await response.json();
        if (isMounted && data.online) {
          setIsLoading(false);
          setError(false);
          clearTimeout(safetyTimeout);
        }
      } catch (e) {}
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
    setRetryKey((prev) => prev + 1);
  };

  const currentSrc = `${src}${src.includes("?") ? "&" : "?"}retry=${retryKey}`;

  return (
    <div
      className={`relative bg-black group overflow-hidden rounded-[2.5rem] border border-slate-200 ${className} group/feed transition-all duration-700`}
    >
      {!error ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-30 backdrop-blur-md p-12">
              <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-2xl rotate-45" />
                <div className="absolute inset-0 border-4 border-[#5CB4E4] border-t-transparent rounded-2xl rotate-45 animate-spin" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/60 animate-pulse">
                INITIALIZING...
              </span>
            </div>
          )}
          <img
            src={currentSrc}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => {
              setError(true);
              setIsLoading(true);
            }}
            onLoad={() => {
              setIsLoading(false);
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50 backdrop-blur-xl z-40 p-12 text-center">
          <AlertTriangle size={40} className="text-rose-500 mb-6 animate-pulse" />
          <h4 className="text-sm font-bold text-rose-600 uppercase tracking-widest">
            UPLINK_OFFLINE
          </h4>
          <button
            onClick={handleRefresh}
            className="mt-6 px-8 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95"
          >
            RECONNECT
          </button>
        </div>
      )}

      {/* MINIMAL OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-30">
        <div className="flex justify-end">
          {!error && onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-[#5CB4E4] text-white rounded-xl backdrop-blur-md border border-white/10 opacity-0 group-hover/feed:opacity-100 transition-all shadow-xl active:scale-90"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRefresh();
        }}
        className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-[#5CB4E4] shadow-xl backdrop-blur-md border border-white/10 active:scale-95 z-[35]"
      >
        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default function MonitorTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeSessionIdParam = searchParams.get("sessionId");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    activeSessionIdParam,
  );
  const [expandedCamera, setExpandedCamera] = useState<number | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    online: false,
  });
  const [cam1Online, setCam1Online] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  useEffect(() => {
    if (activeSessionIdParam) setCurrentSessionId(activeSessionIdParam);
    else {
      const fetchActive = async () => {
        try {
          const token = getToken();
          if (!token) return;
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/sessions/active/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.data?.id) setCurrentSessionId(res.data.id.toString());
        } catch (e) {}
      };
      fetchActive();
    }
  }, [activeSessionIdParam]);

  useEffect(() => {
    if (!currentSessionId) {
      setSessionDetails(null);
      return;
    }
    const fetchDetails = async () => {
      try {
        const token = getToken();
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/sessions/${currentSessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setSessionDetails(res.data);
      } catch (e) {}
    };
    fetchDetails();
  }, [currentSessionId]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = getToken();
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/ai/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setSystemStatus(res.data);
      } catch (error) {
        setSystemStatus({ online: false });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStopSession = () => {
    setCurrentSessionId(null);
    router.push(pathname + "?tab=monitor");
  };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-outfit relative">
            
            {/* CLEAN HEADER HUD */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-xl relative overflow-hidden group transition-all duration-700">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-[#041C3C] text-[#5CB4E4] rounded-3xl shadow-lg border border-[#5CB4E4]/20 flex items-center justify-center">
                            <Monitor size={36} />
                        </div>
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SYSTEM_OPERATIONS</span>
                                {currentSessionId && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic leading-none">
                                {currentSessionId ? (
                                    <>
                                        <span className="text-[#5CB4E4]">ACTIVE SESSION:</span> {sessionDetails?.subject_name?.toUpperCase() || "LOADING..."}
                                    </>
                                ) : (
                                    <>SYSTEM STATUS: <span className="text-[#5CB4E4]">STANDBY</span></>
                                )}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                                {currentSessionId && (
                                    <div className="flex items-center gap-3">
                                        <span className="bg-[#5CB4E4] text-[#041C3C] text-[10px] font-bold px-4 py-1 rounded-lg uppercase tracking-wider">SECTION: {sessionDetails?.section || "NA"}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LIVE</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/professor/camera-test"
                            className="bg-[#041C3C] hover:bg-[#5CB4E4] text-white px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg active:scale-95"
                        >
                            <Zap size={18} className="text-[#5CB4E4]" />
                            TEST CAMERA
                        </Link>
                        <div className={`flex items-center gap-4 px-6 py-4 bg-white shadow-lg rounded-2xl border transition-all ${systemStatus.online ? "border-emerald-100" : "border-rose-100"}`}>
                            <Signal size={18} className={systemStatus.online ? "text-emerald-500" : "text-rose-500"} />
                            <span className={`text-[11px] font-black tracking-widest uppercase ${systemStatus.online ? "text-emerald-500" : "text-rose-500"}`}>
                                {systemStatus.online ? "ONLINE" : "OFFLINE"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN OPERATIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* LEFT COLUMN: CCTV FEED */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden font-outfit relative">
                        
                        {/* CAMERA CONSOLE HEADER (HUD OUTSIDE) */}
                        <div className="px-10 py-6 flex justify-between items-center border-b border-slate-50">
                            <div className="flex items-center gap-5">
                                <div className={`w-3.5 h-3.5 rounded-full ${cam1Online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"} shadow-lg`} />
                                <h3 className="font-black text-2xl text-[#041C3C] uppercase tracking-tighter italic leading-none">
                                    CAMERA: <span className="text-[#5CB4E4]">MAIN</span>
                                </h3>
                                <div className="px-5 py-1.5 bg-[#041C3C] text-white text-[9px] font-black rounded-lg uppercase tracking-widest ml-4">
                                    LIVE FEED
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                    <Activity size={14} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">STABLE</span>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-[#5CB4E4]/10 text-[#5CB4E4] rounded-xl border border-[#5CB4E4]/20">
                                    <Signal size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                                </div>
                            </div>
                        </div>

                        {/* REFRESHING VIDEO FRAME (CLEAN) */}
                        <div className="p-4">
                            <div className="aspect-video w-full bg-black rounded-[2rem] overflow-hidden border border-slate-200 shadow-inner relative group/video">
                                <VideoFeed
                                    src="/api/ai/video_feed/1"
                                    alt="Stream"
                                    label="SCANNING..."
                                    className="w-full h-full"
                                    onExpand={() => setExpandedCamera(1)}
                                    onStatusChange={setCam1Online}
                                />
                                
                                {/* REFRESH BUTTON OVERLAY */}
                                <div className="absolute top-6 left-6 pointer-events-none z-40 opacity-0 group-hover/video:opacity-100 transition-opacity">
                                    <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-xl border border-white/20 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[#5CB4E4] animate-ping" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">SCANNING...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CONSOLE FOOTER (TECH DATA OUTSIDE) */}
                        <div className="px-10 py-5 flex justify-between items-center bg-slate-50/50">
                             <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3">
                                    <Cpu size={16} className="text-[#5CB4E4]" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">AI_ENGINE: OPTIMIZED</span>
                                </div>
                                <div className="w-px h-4 bg-slate-200" />
                                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    LATENCY: <span className="text-emerald-500">14MS</span>
                                </div>
                             </div>
                             <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">SYSTEM_VERSION_4.2.0</div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ATTENDANCE TELEMETRY */}
                <div className="lg:col-span-4 space-y-8">
                    {/* SYSTEM STATUS PANEL */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl font-outfit">
                         <h3 className="text-[10px] font-black text-[#041C3C] uppercase tracking-widest mb-6 flex items-center gap-3 italic border-b border-slate-50 pb-4">
                            <Activity size={16} className="text-[#5CB4E4]" /> SYSTEM STATUS
                         </h3>
                         <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <Server size={18} className={systemStatus.online ? "text-emerald-500" : "text-rose-500"} />
                                    <span className="text-[11px] font-bold text-[#041C3C] uppercase tracking-wider">RECOGNITION</span>
                                </div>
                                <span className={`text-[8px] font-black px-2 py-1 rounded bg-white border ${systemStatus.online ? "text-emerald-500 border-emerald-100" : "text-rose-500 border-rose-100"}`}>
                                    {systemStatus.online ? "LIVE" : "OFFLINE"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className="text-[#5CB4E4]" />
                                    <span className="text-[11px] font-bold text-[#041C3C] uppercase tracking-wider">SECURE_LINK</span>
                                </div>
                                <span className="text-[8px] font-black px-2 py-1 rounded bg-white border text-[#5CB4E4] border-[#5CB4E4]/10">
                                    ENCRYPTED
                                </span>
                            </div>
                         </div>
                    </div>

                    {currentSessionId && (
                        <ActiveSessionPanel
                            sessionId={currentSessionId}
                            onStopSession={handleStopSession}
                        />
                    )}
                </div>
            </div>

            {/* EXPANDED VIEW MODAL */}
            {expandedCamera && (
                <div
                    className="fixed inset-0 bg-[#041C3C]/95 z-[100] flex items-center justify-center p-12 backdrop-blur-2xl animate-in zoom-in-95 duration-500"
                    onClick={() => setExpandedCamera(null)}
                >
                    <div
                        className="relative w-full h-full flex flex-col items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setExpandedCamera(null)}
                            className="absolute top-10 right-10 w-16 h-16 flex items-center justify-center bg-white/10 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-xl active:scale-90 border border-white/20"
                        >
                            <X size={32} />
                        </button>
                        <div className="w-full max-w-7xl aspect-video bg-black rounded-[4rem] border-4 border-[#041C3C] shadow-4xl overflow-hidden relative">
                            <VideoFeed
                                src={`/api/ai/video_feed/${expandedCamera}`}
                                alt="Stream"
                                label="UPLINK FEED"
                                className="h-full w-full"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
