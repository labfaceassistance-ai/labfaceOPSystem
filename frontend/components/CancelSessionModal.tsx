import { useState } from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';
import axios from 'axios';

interface CancelSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    className: string;
    sessionDate: string;
    sessionTime: string;
    onSuccess: () => void;
}

export default function CancelSessionModal({
    isOpen,
    onClose,
    classId,
    className,
    sessionDate,
    sessionTime,
    onSuccess
}: CancelSessionModalProps) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCancel = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            // Format date to YYYY-MM-DD (backend expects this format)
            const formattedDate = new Date(sessionDate).toISOString().split('T')[0];

            await axios.post(`${API_URL}/api/classes/${classId}/cancellations`, {
                date: formattedDate,  // Backend expects 'date', not 'sessionDate'
                reason: reason.trim()
            });

            onSuccess();
            onClose();
            setReason('');
        } catch (err: any) {
            console.error('Failed to cancel session:', err);
            setError(err.response?.data?.error || 'Failed to cancel session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setReason('');
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-maroon-950 rounded-2xl shadow-3xl border border-white/10 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <AlertTriangle className="text-brand-gold" size={24} />
                        Cancel Session
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-secondary/40 hover:text-white transition-colors disabled:opacity-50 p-1"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Session Details */}
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="text-brand-gold/60" size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary/40">Selected Class</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-black text-white tracking-tight">{className}</p>
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-[0.15em] leading-none">
                                    {new Date(sessionDate).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                                <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.15em]">{sessionTime}</p>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-xl p-5 shadow-inner">
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="text-brand-gold flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-gold leading-relaxed">
                                Alert: All enrolled students will be formally notified of this cancellation.
                            </p>
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div>
                        <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-[0.15em] mb-3">
                            Reason for Cancellation <span className="text-brand-gold">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Specify formal reason for archival..."
                            disabled={loading}
                            rows={3}
                            className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-secondary/20 font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold/40 transition-all disabled:opacity-50 resize-none shadow-inner"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.15em]">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-4 p-8 border-t border-white/5 bg-white/2">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-black/40 hover:bg-white/5 text-secondary/60 hover:text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] border border-white/5 transition-all shadow-inner disabled:opacity-50"
                    >
                        Keep Class
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={loading || !reason.trim()}
                        className="flex-1 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-lg shadow-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Confirm Cancellation'}
                    </button>
                </div>
            </div>
        </div>
    );
}
