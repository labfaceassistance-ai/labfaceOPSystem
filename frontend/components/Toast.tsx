'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, AlertTriangle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
    id: string;
    title: string;
    message?: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (title: string, message?: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const showToast = (title: string, message?: string, type: ToastType = 'info', duration = 4000) => {
        if (!title) return;
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem
                            title={toast.title}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                            duration={toast.duration}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

interface ToastItemProps {
    title: string;
    message?: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

function ToastItem({ title, message, type = 'info', onClose, duration = 4000 }: ToastItemProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const colors = {
        success: {
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            icon: <CheckCircle className="text-emerald-500" size={20} />,
            glow: 'shadow-emerald-500/10'
        },
        error: {
            bg: 'bg-rose-50 border-rose-200 text-rose-800',
            icon: <XCircle className="text-rose-500" size={20} />,
            glow: 'shadow-rose-500/10'
        },
        warning: {
            bg: 'bg-amber-50 border-amber-200 text-amber-800',
            icon: <AlertTriangle className="text-amber-500" size={20} />,
            glow: 'shadow-amber-500/10'
        },
        info: {
            bg: 'bg-sky-50 border-sky-200 text-sky-800',
            icon: <Info className="text-sky-500" size={20} />,
            glow: 'shadow-sky-500/10'
        }
    };

    const config = colors[type];

    return (
        <div className={`flex gap-4 p-5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto max-w-sm ${config.bg} ${config.glow}`}>
            <div className="flex-shrink-0 mt-0.5">
                {config.icon}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-black text-[11px] uppercase tracking-wider mb-1">{title}</h4>
                {message && (
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-[0.15em] leading-relaxed">
                        {message}
                    </p>
                )}
            </div>

            <button 
                onClick={onClose} 
                className="flex-shrink-0 self-start p-1.5 hover:bg-black/5 rounded-xl transition-all active:scale-95"
            >
                <X size={16} className="opacity-50" />
            </button>
        </div>
    );
}

export default function Toast(props: ToastItemProps) {
    return <ToastItem {...props} />;
}
