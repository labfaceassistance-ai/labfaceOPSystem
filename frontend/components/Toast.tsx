'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
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

    const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
        if (!message) return;
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem
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
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

function ToastItem({ message, type = 'info', onClose, duration = 3000 }: ToastItemProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles = {
        success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/5',
        error: 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-rose-500/5',
        info: 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold shadow-brand-gold/5'
    };

    return (
        <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-auto ${styles[type]}`}>
            <div className={`p-1.5 rounded-lg border border-current border-opacity-20`}>
                {type === 'success' && <CheckCircle className="w-5 h-5" />}
                {type === 'error' && <XCircle className="w-5 h-5" />}
                {type === 'info' && <AlertCircle className="w-5 h-5" />}
            </div>

            <p className="font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed">{message}</p>

            <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-95 ml-2"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Default export for manual usage (compatible with Admin Dashboard implementation)
export default function Toast(props: ToastItemProps) {
    return <ToastItem {...props} />;
}
