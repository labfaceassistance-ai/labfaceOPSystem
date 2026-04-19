import React from 'react';
import { AlertCircle, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    isAlert?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Execute Protocol',
    cancelText = 'Abort',
    type = 'info',
    isAlert = false
}) => {
    if (!isOpen) return null;

    const getColorClasses = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <AlertCircle className="text-rose-500" size={24} />,
                    btn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 border border-rose-500/20',
                    bg: 'bg-rose-500/10 border-rose-500/20'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="text-brand-gold" size={24} />,
                    btn: 'bg-brand-gold hover:bg-black hover:text-brand-gold text-black shadow-brand-gold/20 border border-brand-gold',
                    bg: 'bg-brand-gold/10 border-brand-gold/20'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="text-emerald-400" size={24} />,
                    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 border border-emerald-500/20',
                    bg: 'bg-emerald-500/10 border-emerald-500/20'
                };
            default:
                return {
                    icon: <AlertCircle className="text-brand-gold" size={24} />,
                    btn: 'bg-brand-gold hover:bg-black hover:text-brand-gold text-black shadow-brand-gold/20 border border-brand-gold',
                    bg: 'bg-brand-gold/10 border-brand-gold/20'
                };
        }
    };

    const colors = getColorClasses();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-maroon-950 border border-white/10 w-full max-w-md rounded-[40px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-20" />
                
                <div className="p-10 relative z-10">
                    <div className="flex items-start justify-between mb-8">
                        <div className={`p-5 rounded-2xl border shadow-inner ${colors.bg}`}>
                            {colors.icon}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-secondary/20 hover:text-white transition-all hover:rotate-90 p-2"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter leading-tight">{title}</h3>
                    <p className="text-[10px] font-black text-secondary/40 leading-relaxed uppercase tracking-[0.2em] italic">
                        {message}
                    </p>
                </div>

                <div className="px-10 pb-10 flex gap-4 relative z-10">
                    {!isAlert && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-8 py-4 rounded-2xl bg-black/40 text-[10px] font-black text-secondary/40 hover:text-white uppercase tracking-widest hover:bg-black transition-all border border-white/10 shadow-inner"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            else onClose();
                        }}
                        className={`flex-1 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 ${colors.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
                
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
            </div>
        </div>
    );
};

export default ConfirmModal;
