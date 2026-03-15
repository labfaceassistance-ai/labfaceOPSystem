import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncManager, SyncStatus } from '../services/syncManager';
import { offlineDB } from '../utils/offlineDB';

/**
 * Network Status Indicator Component
 * Shows online/offline status and sync progress
 */
export default function NetworkStatusIndicator() {
    const { isOnline } = useNetworkStatus();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle', progress: 0 });
    const [queueCount, setQueueCount] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Subscribe to sync status updates
        const unsubscribe = syncManager.onSyncStatusChange(setSyncStatus);

        // Update queue count
        const updateQueueCount = async () => {
            const stats = await offlineDB.getQueueStats();
            setQueueCount(stats.pending + stats.syncing);
        };

        updateQueueCount();
        const interval = setInterval(updateQueueCount, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const handleManualSync = async () => {
        if (isOnline && syncStatus.status !== 'syncing') {
            await syncManager.syncNow();
        }
    };

    const getStatusIcon = () => {
        if (!isOnline) {
            return <WifiOff size={18} className="text-red-400" />;
        }

        switch (syncStatus.status) {
            case 'syncing':
                return <Loader size={18} className="text-blue-400 animate-spin" />;
            case 'success':
                return <CheckCircle size={18} className="text-green-400" />;
            case 'error':
                return <AlertCircle size={18} className="text-yellow-400" />;
            default:
                return <Wifi size={18} className="text-green-400" />;
        }
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';

        switch (syncStatus.status) {
            case 'syncing':
                return 'Syncing...';
            case 'success':
                return 'Synced';
            case 'error':
                return 'Sync Error';
            default:
                return 'Online';
        }
    };

    const getStatusColor = () => {
        if (!isOnline) return 'bg-red-500/10 border-red-500/30 text-red-400';

        switch (syncStatus.status) {
            case 'syncing':
                return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
            case 'success':
                return 'bg-green-500/10 border-green-500/30 text-green-400';
            case 'error':
                return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
            default:
                return 'bg-green-500/10 border-green-500/30 text-green-400';
        }
    };

    return (
        <div className="relative">
            {/* Status Badge */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${getStatusColor()}`}
            >
                {getStatusIcon()}
                <span className="hidden sm:inline">{getStatusText()}</span>
                {queueCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                        {queueCount}
                    </span>
                )}
            </button>

            {/* Details Dropdown */}
            {showDetails && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-white">Network Status</h3>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        {/* Status Info */}
                        <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Connection:</span>
                                <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Pending Operations:</span>
                                <span className="text-white font-medium">{queueCount}</span>
                            </div>
                            {syncStatus.message && (
                                <div className="text-xs text-slate-400 mt-2">
                                    {syncStatus.message}
                                </div>
                            )}
                        </div>

                        {/* Manual Sync Button */}
                        {isOnline && queueCount > 0 && (
                            <button
                                onClick={handleManualSync}
                                disabled={syncStatus.status === 'syncing'}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <RefreshCw size={16} className={syncStatus.status === 'syncing' ? 'animate-spin' : ''} />
                                {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                            </button>
                        )}

                        {/* Offline Message */}
                        {!isOnline && (
                            <div className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded">
                                You're offline. Operations will be saved and synced when you're back online.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
