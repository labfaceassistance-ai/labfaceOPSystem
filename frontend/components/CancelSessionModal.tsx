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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-orange-400" size={24} />
                        Cancel Class Session
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Session Details */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="text-brand-400" size={18} />
                            <span className="text-sm font-medium text-slate-400">Session Details</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-bold">{className}</p>
                            <p className="text-sm text-slate-300">
                                {new Date(sessionDate).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                            <p className="text-sm text-slate-300">{sessionTime}</p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                        <p className="text-orange-300 text-sm">
                            <strong>Warning:</strong> All enrolled students will be notified about this cancellation.
                        </p>
                    </div>

                    {/* Reason Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Reason for Cancellation <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Faculty meeting, Emergency, etc."
                            disabled={loading}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 resize-none"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-800">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        Keep Session
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={loading || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Canceling...' : 'Cancel Session'}
                    </button>
                </div>
            </div>
        </div>
    );
}
