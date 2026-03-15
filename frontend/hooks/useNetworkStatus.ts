import { useState, useEffect } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
}

/**
 * React hook for monitoring network status
 * Provides real-time updates on connectivity
 */
export function useNetworkStatus(): NetworkStatus {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
    });

    useEffect(() => {
        // Update network info
        const updateNetworkInfo = () => {
            const connection = (navigator as any).connection ||
                (navigator as any).mozConnection ||
                (navigator as any).webkitConnection;

            setNetworkStatus({
                isOnline: navigator.onLine,
                effectiveType: connection?.effectiveType || 'unknown',
                downlink: connection?.downlink || 0,
                rtt: connection?.rtt || 0,
                saveData: connection?.saveData || false
            });
        };

        // Initial update
        updateNetworkInfo();

        // Online/offline event listeners
        const handleOnline = () => {
            console.log('🟢 Network: Online');
            updateNetworkInfo();
        };

        const handleOffline = () => {
            console.log('🔴 Network: Offline');
            updateNetworkInfo();
        };

        // Connection change listener
        const handleConnectionChange = () => {
            console.log('🔄 Network: Connection changed');
            updateNetworkInfo();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const connection = (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        if (connection) {
            connection.addEventListener('change', handleConnectionChange);
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (connection) {
                connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    return networkStatus;
}

/**
 * Get human-readable connection quality
 */
export function getConnectionQuality(effectiveType: string): {
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
    color: string;
    icon: string;
} {
    switch (effectiveType) {
        case '4g':
            return { quality: 'excellent', color: 'green', icon: '🟢' };
        case '3g':
            return { quality: 'good', color: 'blue', icon: '🔵' };
        case '2g':
            return { quality: 'fair', color: 'yellow', icon: '🟡' };
        case 'slow-2g':
            return { quality: 'poor', color: 'orange', icon: '🟠' };
        default:
            return { quality: 'offline', color: 'red', icon: '🔴' };
    }
}
