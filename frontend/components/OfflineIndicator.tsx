/**
 * Offline Indicator Component
 */

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 z-50 flex items-center justify-center gap-2">
            <WifiOff size={20} />
            <span className="font-medium">You're offline. Some features may be limited.</span>
        </div>
    );
}
