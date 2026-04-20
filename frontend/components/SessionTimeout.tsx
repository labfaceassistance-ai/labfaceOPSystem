/**
 * Session Timeout Warning Component
 * Shows warning 5 minutes before session expires
 * Allows user to extend session or logout gracefully
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

interface SessionTimeoutProps {
    sessionDuration?: number; // in milliseconds (default: 30 minutes)
    warningTime?: number; // in milliseconds (default: 5 minutes)
    onExtend?: () => Promise<void>;
    onLogout?: () => void;
}

export default function SessionTimeout({
    sessionDuration = 30 * 60 * 1000, 
    warningTime = 5 * 60 * 1000, 
    onExtend,
    onLogout
}: SessionTimeoutProps) {
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(warningTime);
    const [isExtending, setIsExtending] = useState(false);

    const lastActivityRef = useRef<number>(Date.now());
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        setShowWarning(false);
        setTimeLeft(warningTime);
    }, [warningTime]);

    useEffect(() => {
        const checkSession = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const timeRemaining = sessionDuration - timeSinceLastActivity;

            if (timeRemaining <= warningTime && timeRemaining > 0) {
                setShowWarning(true);
                setTimeLeft(timeRemaining);
            } else if (timeRemaining <= 0) {
                if (onLogout) onLogout();
            } else {
                setShowWarning(false);
            }
        };

        checkIntervalRef.current = setInterval(checkSession, 1000);

        const handleActivity = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
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
            if (onExtend) await onExtend();
            resetTimer();
        } catch (error) {
            console.error('Failed to extend session:', error);
        } finally {
            setIsExtending(false);
        }
    };

    const formatTime = (ms: number) => {
        const safeMs = Math.max(0, ms);
        const minutes = Math.floor(safeMs / 60000);
        const seconds = Math.floor((safeMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-3xl border border-slate-200 max-w-md w-full animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-center gap-5 mb-10 relative z-10">
                    <div className="p-4 bg-identity-sky/10 rounded-2xl border border-identity-sky/20 text-identity-sky shadow-sm">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter font-outfit">Session Expiry</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Auto Log Out in</p>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-[2rem] p-10 mb-8 text-center border border-slate-100 shadow-inner relative group">
                    <div className="text-5xl md:text-7xl font-black text-identity-navy mb-2 font-outfit tabular-nums tracking-tighter">
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Seconds Remaining</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 mb-10 shadow-sm">
                    <div className="flex items-start gap-4">
                        <ShieldAlert size={20} className="text-identity-sky mt-1 flex-shrink-0" />
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-relaxed">
                            <p className="mb-2 text-identity-navy font-black tracking-[0.15em] text-[11px]">Identity Lock Active</p>
                            <p className="opacity-60 text-[9px] leading-relaxed">
                                Your session will expire soon to protect your account. Choose an action below.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                    <button
                        onClick={() => onLogout && onLogout()}
                        className="flex-1 px-8 py-5 bg-white hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all font-black uppercase tracking-[0.3em] text-[10px] border border-slate-100 shadow-sm flex items-center justify-center gap-3"
                    >
                        <LogOut size={18} />
                        Log Out
                    </button>
                    <button
                        onClick={handleExtend}
                        disabled={isExtending}
                        className="flex-1 px-8 py-5 bg-identity-navy hover:bg-identity-sky text-white rounded-2xl transition-all font-black uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-identity-navy/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        {isExtending ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Extending...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                                Stay Logged In
                            </>
                        )}
                    </button>
                </div>

                <p className="text-[8px] font-black text-slate-200 uppercase tracking-[0.5em] text-center mt-8">
                    Extension Period: 30 Units
                </p>
            </div>
        </div>
    );
}
