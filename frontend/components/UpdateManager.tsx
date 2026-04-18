"use client";
import { useEffect } from 'react';

/**
 * UpdateManager — Silent Auto-Cache Polling
 *
 * Every 60 seconds, fetches /version.txt (written by deploy.sh on every deploy).
 * If the version has changed since the page was first loaded, it:
 *   1. Unregisters all Service Workers
 *   2. Wipes all Cache API entries
 *   3. Hard-reloads the page to pull the fresh build
 *
 * Zero user interaction. Zero UI. Zero server load.
 */
export default function UpdateManager() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let baselineVersion: string | null = null;
        let isMounted = true;

        const getVersion = async (): Promise<string | null> => {
            try {
                // cache: 'no-store' ensures we always hit the network, never a local cache
                const res = await fetch('/version.txt', { cache: 'no-store' });
                if (!res.ok) return null;
                return (await res.text()).trim();
            } catch {
                return null;
            }
        };

        const bustCacheAndReload = async () => {
            console.log('[UpdateManager] 🚀 New deployment detected — flushing stale caches...');

            // 1. Unregister all Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(r => r.unregister()));
                console.log('[UpdateManager] ✅ Service Workers unregistered.');
            }

            // 2. Nuke every Cache API entry
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('[UpdateManager] ✅ All caches cleared.');
            }

            // 3. Hard reload — bypasses any remaining browser memory cache
            window.location.reload();
        };

        const startPolling = async () => {
            // Capture the version that was live when this page session started
            baselineVersion = await getVersion();
            console.log(`[UpdateManager] Baseline version: ${baselineVersion}`);

            // Poll every 60 seconds silently
            const interval = setInterval(async () => {
                if (!isMounted) return;

                const latestVersion = await getVersion();

                if (
                    baselineVersion !== null &&
                    latestVersion !== null &&
                    latestVersion !== baselineVersion
                ) {
                    console.log(`[UpdateManager] Version mismatch: ${baselineVersion} → ${latestVersion}`);
                    clearInterval(interval);
                    await bustCacheAndReload();
                }
            }, 60_000); // Every 60 seconds

            return interval;
        };

        let intervalHandle: ReturnType<typeof setInterval>;

        startPolling().then(handle => {
            if (handle) intervalHandle = handle;
        });

        return () => {
            isMounted = false;
            if (intervalHandle) clearInterval(intervalHandle);
        };
    }, []);

    // This component renders nothing — it is purely a background service
    return null;
}
