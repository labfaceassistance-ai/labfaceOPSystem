'use client';
import { useEffect } from 'react';
import PageTransition from "../components/PageTransition";
import { ToastProvider } from "../components/Toast";
import { PersonalizationProvider } from "../components/Personalization";
import SmartSearch from "../components/SmartSearch";
import OfflineIndicator from "../components/OfflineIndicator";
import { registerServiceWorker } from "../lib/offline";

export default function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Register Service Worker for offline support
        registerServiceWorker();

        // Initialize offline services
        const initOfflineServices = async () => {
            try {
                // Dynamic imports to avoid SSR issues
                const { offlineQueueService } = await import('../services/offlineQueueService');
                const { syncManager } = await import('../services/syncManager');

                await offlineQueueService.init();
                syncManager.startAutoSync(30000); // Sync every 30 seconds
                console.log('✅ Offline services initialized');
            } catch (error) {
                console.error('Failed to initialize offline services:', error);
            }
        };

        initOfflineServices();

        // Cleanup on unmount
        return () => {
            import('../services/syncManager').then(({ syncManager }) => {
                syncManager.stopAutoSync();
            }).catch(() => { });
        };
    }, []);

    return (
        <PersonalizationProvider>
            <ToastProvider>
                <OfflineIndicator />
                <SmartSearch />
                <PageTransition>
                    {children}
                </PageTransition>
            </ToastProvider>
        </PersonalizationProvider>
    );
}
