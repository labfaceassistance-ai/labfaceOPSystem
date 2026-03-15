"use client";
import { useState } from 'react';
import { Video, VideoOff } from 'lucide-react';

interface LiveCCTVPreviewProps {
    className?: string;
}

export default function LiveCCTVPreview({ className = '' }: LiveCCTVPreviewProps) {
    const [selectedCamera, setSelectedCamera] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const AI_SERVICE_URL = '/api/ai';

    const handleImageLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Video size={20} className="text-brand-400" />
                    <h3 className="font-bold text-white">Live CCTV Feed</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedCamera(1)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCamera === 1
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Camera 1 (Entry)
                    </button>
                    <button
                        onClick={() => setSelectedCamera(2)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCamera === 2
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Camera 2 (Exit)
                    </button>
                </div>
            </div>

            {/* Video Feed */}
            <div className="relative aspect-video bg-black">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
                    </div>
                )}

                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <VideoOff size={48} className="mb-3" />
                        <p className="text-sm">Camera feed unavailable</p>
                        <p className="text-xs mt-1">Check AI service connection</p>
                    </div>
                )}

                <img
                    src={`${AI_SERVICE_URL}/video_feed/${selectedCamera}`}
                    alt={`Camera ${selectedCamera} Feed`}
                    className={`w-full h-full object-cover ${isLoading || hasError ? 'hidden' : ''}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                />

                {/* Live Indicator */}
                {!hasError && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                    </div>
                )}

                {/* Camera Label */}
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm">
                    Camera {selectedCamera} - {selectedCamera === 1 ? 'Entry' : 'Exit'}
                </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-slate-800/50">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                        {selectedCamera === 1 ? 'Monitoring entry point' : 'Monitoring exit point'}
                    </span>
                    <span className="text-brand-400">
                        720p • 30 FPS
                    </span>
                </div>
            </div>
        </div>
    );
}
