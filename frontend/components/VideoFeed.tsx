"use client";
import { useState, useEffect } from 'react';
import { RefreshCw, Maximize2 } from 'lucide-react';

interface VideoFeedProps {
    src: string;
    alt: string;
    className?: string;
    onExpand?: () => void;
    label?: string;
}

interface CameraStatus {
    isOnline: boolean;
    resolution: string;
    fps: number;
    bitrate: string;
}

const VideoFeed = ({ src, alt, className, onExpand, label }: VideoFeedProps) => {
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [autoRetryCount, setAutoRetryCount] = useState(0);
    const [lastFrameCheck, setLastFrameCheck] = useState<string>('');
    const [isActuallyLive, setIsActuallyLive] = useState(false);
    const maxAutoRetries = 5;
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
        isOnline: false,
        resolution: 'N/A',
        fps: 0,
        bitrate: 'N/A'
    });
    const [isChecking, setIsChecking] = useState(true);

    // Check camera-specific status
    useEffect(() => {
        const checkCameraStatus = async () => {
            try {
                // Extract camera ID from src (e.g., "/api/ai/video_feed/1" -> "1")
                const cameraId = src.split('/').pop();

                const response = await fetch(`/api/ai/camera_status/${cameraId}`, {
                    method: 'GET',
                    cache: 'no-cache'
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.online) {
                        // Camera is actually connected
                        setCameraStatus({
                            isOnline: true,
                            resolution: '720p HD',
                            fps: 30,
                            bitrate: '4Mbps'
                        });
                        setError(false);
                    } else {
                        // Camera is offline
                        setCameraStatus({
                            isOnline: false,
                            resolution: 'N/A',
                            fps: 0,
                            bitrate: 'N/A'
                        });
                        setError(true);
                    }
                } else {
                    throw new Error('Status check failed');
                }
            } catch (err) {
                // Network error or camera down
                setCameraStatus({
                    isOnline: false,
                    resolution: 'N/A',
                    fps: 0,
                    bitrate: 'N/A'
                });
                setError(true);
            } finally {
                setIsChecking(false);
            }
        };

        checkCameraStatus();
        const interval = setInterval(checkCameraStatus, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, [src]);



    // Retry connection on error
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (error && !isChecking && autoRetryCount < maxAutoRetries) {
            timeout = setTimeout(() => {
                setIsChecking(true);
                setRetryCount(prev => prev + 1);
                setAutoRetryCount(prev => prev + 1);
            }, 5000); // Retry every 5 seconds
        }
        return () => clearTimeout(timeout);
    }, [error, isChecking, autoRetryCount]);

    const handleManualRefresh = () => {
        setIsChecking(true);
        setRetryCount(prev => prev + 1);
        setAutoRetryCount(0); // Reset auto-retries
    };

    const currentSrc = `${src}${src.includes('?') ? '&' : '?'}t=${retryCount}`;

    return (
        <div className={`relative bg-black group overflow-hidden rounded-xl border ${cameraStatus.isOnline && !error ? 'border-emerald-500/30' : 'border-red-500/30'} shadow-2xl ${className}`}>
            {cameraStatus.isOnline && !error ? (
                <img
                    src={currentSrc}
                    alt={alt}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                    onError={() => setError(true)}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 absolute inset-0 backdrop-blur-sm">
                    {isChecking ? (
                        <>
                            <div className="animate-spin mb-2 text-slate-400">
                                <RefreshCw size={32} />
                            </div>
                            <span className="text-sm font-mono tracking-widest uppercase">Checking Connection...</span>
                        </>
                    ) : (
                        <>
                            <div className="mb-2 text-red-400">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <span className="text-sm font-mono tracking-widest uppercase text-red-400">Camera Offline</span>
                            {autoRetryCount < maxAutoRetries ? (
                                <span className="text-xs text-slate-500 mt-2">Retrying in 5s... ({autoRetryCount}/{maxAutoRetries})</span>
                            ) : (
                                <button
                                    onClick={handleManualRefresh}
                                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
                                >
                                    <RefreshCw size={16} />
                                    <span>Refresh Camera</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cameraStatus.isOnline && !error ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`bg-black/40 text-xs px-2 py-1 rounded backdrop-blur-md border font-mono ${cameraStatus.isOnline && !error ? 'text-emerald-200 border-emerald-500/30' : 'text-red-200 border-red-500/30'
                            }`}>
                            {cameraStatus.isOnline && !error ? (label || 'LIVE FEED') : 'OFFLINE'}
                        </span>
                    </div>

                    {cameraStatus.isOnline && onExpand && (
                        <button
                            onClick={onExpand}
                            className="pointer-events-auto bg-black/40 hover:bg-brand-600/80 text-white p-2 rounded-lg backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                        >
                            <Maximize2 size={18} />
                        </button>
                    )}
                </div>

                {cameraStatus.isOnline && (
                    <div className="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-[10px] text-slate-400 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-md">
                            {cameraStatus.resolution} • {cameraStatus.fps} FPS • {cameraStatus.bitrate}
                        </div>
                    </div>
                )}
            </div>

            {/* Scanlines Effect - only when online */}
            {cameraStatus.isOnline && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
            )}
        </div>
    );
};

export default VideoFeed;
