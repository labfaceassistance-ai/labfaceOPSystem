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
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    isAlert = false
}) => {
    if (!isOpen) return null;

    const getColorClasses = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <AlertCircle className="text-red-400" size={24} />,
                    btn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
                    bg: 'bg-red-400/10 border-red-400/20'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="text-yellow-400" size={24} />,
                    btn: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-600/20',
                    bg: 'bg-yellow-400/10 border-yellow-400/20'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="text-emerald-400" size={24} />,
                    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
                    bg: 'bg-emerald-400/10 border-emerald-400/20'
                };
            default:
                return {
                    icon: <AlertCircle className="text-brand-400" size={24} />,
                    btn: 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20',
                    bg: 'bg-brand-400/10 border-brand-400/20'
                };
        }
    };

    const colors = getColorClasses();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${colors.bg}`}>
                            {colors.icon}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-slate-400 leading-relaxed">{message}</p>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    {!isAlert && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all border border-slate-700"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            else onClose();
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg ${colors.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
