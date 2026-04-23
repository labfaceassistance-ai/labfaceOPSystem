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
      className={`relative bg-black group overflow-hidden rounded-[4rem] border-2 border-[#041C3C]/30 shadow-4xl ${className} group/feed transition-all duration-700`}
    >
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
                  Establishing secure link
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
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-30">
            <div className="absolute top-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#5CB4E4] to-transparent shadow-[0_0_25px_rgba(92,180,228,1)] animate-scanline" />
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/95 backdrop-blur-3xl z-40 p-16 text-center">
          <AlertTriangle size={80} className="text-rose-500 mb-10" />
          <h4 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter leading-none">
            CAMERA OFFLINE
          </h4>
          <button
            onClick={handleRefresh}
            className="mt-8 px-12 py-6 bg-rose-500 text-white rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-3xl active:scale-95 italic"
          >
            RECONNECT
          </button>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-between z-30 font-outfit">
        <div className="flex justify-between items-start">
          <div className="bg-[#041C3C]/90 backdrop-blur-2xl px-8 py-4 rounded-2.5xl border border-white/10 shadow-3xl flex items-center gap-5">
            <div
              className={`w-3.5 h-3.5 rounded-full ${!error ? "bg-[#5CB4E4] animate-pulse shadow-[0_0_20px_rgba(92,180,228,1)]" : "bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,1)]"}`}
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-black tracking-[0.4em] uppercase text-white italic leading-none mb-1">
                {error ? "OFFLINE" : label || "MAIN CAMERA"}
              </span>
              <span className="text-[8px] font-black tracking-[0.2em] uppercase text-slate-400 italic">
                SECURE CONNECTION
              </span>
            </div>
          </div>
          {!error && onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
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
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">
                  STABLE
                </span>
              </div>
              <div className="h-6 w-px bg-white/10 mx-2" />
              <div className="flex items-center gap-4">
                <Signal size={18} className="text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRefresh();
        }}
        className="absolute top-12 left-12 p-5 bg-white/10 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-[#5CB4E4] shadow-4xl backdrop-blur-xl border border-white/20 active:scale-95 z-[35]"
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
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
    <div className="space-y-16 animate-in fade-in duration-1000">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 mb-12">
        <div className="flex items-center gap-10">
          <div className="w-20 h-20 bg-[#041C3C] text-[#5CB4E4] rounded-2xl shadow-4xl border border-[#5CB4E4]/30 flex items-center justify-center">
            <Monitor size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic leading-none font-outfit">
              {currentSessionId ? (
                <>
                  <span className="text-[#5CB4E4]">Active Session:</span>{" "}
                  {sessionDetails?.subject_name?.toUpperCase() || "Main Feed"}
                </>
              ) : (
                <>
                  Monitoring Center:{" "}
                  <span className="text-[#5CB4E4]">Camera Feeds</span>
                </>
              )}
            </h2>
            <div className="flex items-center gap-6">
              {currentSessionId && (
                <div className="px-8 py-3 bg-[#5CB4E4]/10 rounded-2xl border border-[#5CB4E4]/20 text-[11px] font-black text-[#5CB4E4] uppercase tracking-[0.5em] italic shadow-2xl">
                  Section: {sessionDetails?.section || "N/A"}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/professor/camera-test"
            className="bg-[#041C3C] hover:bg-[#5CB4E4] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-4 transition-all shadow-4xl active:scale-95 italic border border-[#5CB4E4]/30"
          >
            <Zap size={20} />
            Test Camera
          </Link>
          <div
            className={`flex items-center gap-4 px-8 py-4 bg-white shadow-4xl rounded-2xl border-2 transition-all duration-1000 ${systemStatus.online ? "border-emerald-500/20" : "border-rose-500/20"}`}
          >
            <Signal
              size={20}
              className={
                systemStatus.online ? "text-emerald-500" : "text-rose-500"
              }
            />
            <span
              className={`text-[10px] font-black tracking-[0.3em] uppercase italic leading-none ${systemStatus.online ? "text-emerald-500" : "text-rose-500"}`}
            >
              {systemStatus.online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3 space-y-12">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-4xl overflow-hidden font-outfit relative">
            <div className="px-16 py-12 flex justify-between items-center bg-white border-b border-slate-100">
              <div className="flex items-center gap-8">
                <div
                  className={`w-6 h-6 rounded-full ${cam1Online ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`}
                />
                <h3 className="font-black text-3xl text-[#041C3C] uppercase tracking-tighter italic leading-none">
                  CAMERA: <span className="text-[#5CB4E4]">MAIN</span>
                </h3>
              </div>
              <div className="px-8 py-3 bg-[#041C3C] text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.4em] italic">
                LIVE FEED
              </div>
            </div>
            <div className="p-4">
              <div className="aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border-2 border-[#041C3C] shadow-2xl">
                <VideoFeed
                  src="/api/ai/video_feed/1"
                  alt="Stream"
                  label="SCANNING..."
                  className="w-full h-full"
                  onExpand={() => setExpandedCamera(1)}
                  onStatusChange={setCam1Online}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-4xl font-outfit">
            <h3 className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.4em] mb-6 flex items-center gap-3 italic border-b border-slate-100 pb-4">
              <Activity size={16} className="text-[#5CB4E4]" /> System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Server
                    size={16}
                    className={
                      systemStatus.online ? "text-emerald-500" : "text-rose-500"
                    }
                  />
                  <span className="text-[11px] font-black text-[#041C3C] uppercase italic">
                    Recognition
                  </span>
                </div>
                <span
                  className={`text-[8px] font-black px-2 py-1 rounded bg-white border ${systemStatus.online ? "text-emerald-500 border-emerald-100" : "text-rose-500 border-rose-100"}`}
                >
                  {systemStatus.online ? "LIVE" : "OFFLINE"}
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

      {expandedCamera && (
        <div
          className="fixed inset-0 bg-[#041C3C]/98 z-[100] flex items-center justify-center p-12 backdrop-blur-3xl animate-in zoom-in-95 duration-500"
          onClick={() => setExpandedCamera(null)}
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedCamera(null)}
              className="absolute top-10 right-10 w-20 h-20 flex items-center justify-center bg-white/10 hover:bg-rose-500 text-white rounded-full transition-all shadow-4xl active:scale-90"
            >
              <X size={40} />
            </button>
            <div className="w-full max-w-7xl aspect-video bg-black rounded-[5rem] border-8 border-[#041C3C] shadow-[0_0_150px_rgba(92,180,228,0.4)] overflow-hidden relative">
              <VideoFeed
                src={`/api/ai/video_feed/${expandedCamera}`}
                alt="Stream"
                label="CAMERA FEED"
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
