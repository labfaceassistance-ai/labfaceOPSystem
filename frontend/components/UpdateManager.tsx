"use client";
import { useEffect, useState } from 'react';
import { useToast } from './Toast';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { BUILD_ID } from '../utils/version';

/**
 * UpdateManager Component
 * 
 * Handles Service Worker updates and version checking.
 * When a new version is deployed and detected by the browser, 
 * this component notifies the user and provides a way to refresh.
 */
export default function UpdateManager() {
    const { showToast } = useToast();
    const [newVersionAvailable, setNewVersionAvailable] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const handleControllerChange = () => {
            // This event fires when the new service worker takes over Control
            console.log('[UpdateManager] New Service Worker activated. Flushing page state.');
            // Hard reload to strip the document layer of any Next.js legacy chunk references
            window.location.reload();
        };

        const checkUpdates = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New update is available and has been installed (but is waiting)
                                console.log('[UpdateManager] New update found and installed');
                                setNewVersionAvailable(true);
                                // Optional: notify with toast that a refresh is waiting
                            }
                        });
                    }
                });
            } catch (err) {
                console.error('[UpdateManager] Update check failed:', err);
            }
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        checkUpdates();

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, [showToast]);

    const triggerUpdate = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (reg?.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    // Fallback if no worker is actively waiting but they hit update
                    window.location.reload();
                }
            });
        } else {
            window.location.reload();
        }
    };

    if (!newVersionAvailable) return null;

    return (
        <div className="fixed top-24 right-8 z-[9999] animate-bounce-in max-w-sm w-full sm:w-auto">
            <div className="bg-coffee border border-white/10 rounded-3xl p-6 shadow-4xl backdrop-blur-xl">
               <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-yellow-500 text-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                      <RefreshCw size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                      <h4 className="text-brand-cream font-black uppercase text-[10px] tracking-[0.3em] mb-1">System Update</h4>
                      <p className="text-brand-cream/60 text-xs font-bold leading-snug">
                          A newer version of LabFace is ready. Refresh now to experience the latest optimizations.
                      </p>
                  </div>
               </div>
               
               <div className="flex gap-3">
                  <button 
                      onClick={triggerUpdate}
                      className="flex-1 bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      <ArrowUpCircle size={16} /> Update Now
                  </button>
                  <button 
                      onClick={() => setNewVersionAvailable(false)}
                      className="px-6 bg-white/5 text-brand-cream/50 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-brand-cream hover:bg-white/10 transition-all active:scale-95"
                  >
                      Later
                  </button>
               </div>
            </div>
        </div>
    );
}
