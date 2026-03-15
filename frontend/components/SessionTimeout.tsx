/**
 * Session Timeout Warning Component
 * Shows warning 5 minutes before session expires
 * Allows user to extend session or logout gracefully
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Clock, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutProps {
    sessionDuration?: number; // in milliseconds (default: 30 minutes)
    warningTime?: number; // in milliseconds (default: 5 minutes)
    onExtend?: () => Promise<void>;
    onLogout?: () => void;
}

export default function SessionTimeout({
    sessionDuration = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes
    onExtend,
    onLogout
}: SessionTimeoutProps) {
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(warningTime);
    const [isExtending, setIsExtending] = useState(false);

    // Use refs for values accessed in intervals to avoid stale closures and re-renders
    const lastActivityRef = useRef<number>(Date.now());

    // Check interval ref
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Reset activity timer
    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        setShowWarning(false);
        setTimeLeft(warningTime);
    }, [warningTime]);

    useEffect(() => {
        // Function to check session status
        const checkSession = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const timeRemaining = sessionDuration - timeSinceLastActivity;

            // If time remaining is less than warning time, show warning
            if (timeRemaining <= warningTime && timeRemaining > 0) {
                setShowWarning(true);
                setTimeLeft(timeRemaining);
            }
            // If time is up
            else if (timeRemaining <= 0) {
                if (onLogout) onLogout();
            }
            // Otherwise ensure warning is hidden
            else {
                setShowWarning(false);
            }
        };

        // Run check every second
        checkIntervalRef.current = setInterval(checkSession, 1000);

        // Activity handler - throttled to avoid excessive updates
        const handleActivity = () => {
            // Only update if not currently in warning state
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            // Only update if we're not in the warning period (let the user manually extend)
            // and don't update on every millisec
            if (sessionDuration - timeSinceLastActivity > warningTime) {
                lastActivityRef.current = now;
            }
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [sessionDuration, warningTime, onLogout]);

    const handleExtend = async () => {
        setIsExtending(true);
        try {
            if (onExtend) {
                await onExtend();
            }
            // Explicitly reset the timer after successful extension
            resetTimer();
        } catch (error) {
            console.error('Failed to extend session:', error);
        } finally {
            setIsExtending(false);
        }
    };

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const formatTime = (ms: number) => {
        // Prevent negative numbers
        const safeMs = Math.max(0, ms);
        const minutes = Math.floor(safeMs / 60000);
        const seconds = Math.floor((safeMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border-2 border-yellow-500/50 max-w-md w-full animate-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-yellow-500/20 rounded-full ring-2 ring-yellow-500/50">
                        <Clock className="text-yellow-400" size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Session Expiring Soon</h3>
                        <p className="text-sm text-slate-400">Your session will expire in</p>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-6 mb-6 text-center">
                    <div className="text-5xl font-bold text-yellow-400 mb-2 font-mono">
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-sm text-slate-400">minutes remaining</p>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-200">
                            <p className="font-semibold mb-1">Don't lose your work!</p>
                            <p className="text-xs text-yellow-300/80">
                                Click "Stay Logged In" to continue your session, or "Logout" to save and exit.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleLogout}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                    <button
                        onClick={handleExtend}
                        disabled={isExtending}
                        className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all font-bold shadow-xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExtending ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Extending...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                Stay Logged In
                            </>
                        )}
                    </button>
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                    Session will be extended by 30 minutes
                </p>
            </div>
        </div>
    );
}
