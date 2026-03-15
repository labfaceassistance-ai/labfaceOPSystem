import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { Trash2, CheckCircle, XCircle, AlertTriangle, Clock, Search, Filter, RefreshCw, User, FileText } from 'lucide-react';
import { API_URL, getToken, getUser } from '@/utils/auth';

interface DeletionRequest {
    id: number;
    user_id: string;
    user_name: string;
    reason: string;
    requested_at: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    processed_at?: string;
    processed_by?: string;
    notes?: string;
}

export default function DeletionRequestsTab() {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<DeletionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'approve' | 'reject' | null;
        request: DeletionRequest | null;
    }>({ isOpen: false, type: null, request: null });
    const [actionNote, setActionNote] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            const response = await axios.get(`${API_URL}/api/data-rights/deletion-requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setRequests(response.data.requests);
        } catch (error) {
            console.error('Error fetching deletion requests:', error);
            showToast('Failed to fetch deletion requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRequest = async () => {
        if (!actionModal.request || !actionModal.type) return;

        setProcessing(true);
        try {
            const token = getToken();
            const user = getUser();
            const axios = (await import('axios')).default;

            await axios.post(`${API_URL}/api/data-rights/process-deletion`, {
                requestId: actionModal.request.id,
                action: actionModal.type,
                adminId: user.userId || 'admin',
                notes: actionNote
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast(`Request ${actionModal.type}d successfully`, 'success');
            setActionModal({ isOpen: false, type: null, request: null });
            setActionNote('');
            fetchRequests();
        } catch (error) {
            console.error('Error processing request:', error);
            showToast(`Failed to ${actionModal.type} request`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        if (statusFilter === 'all') return true;
        return req.status === statusFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-brand-500" />
                    Data Deletion Requests
                </h2>

                <div className="flex items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-900/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <button
                        onClick={fetchRequests}
                        className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center">
                        <Trash2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">No requests found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="p-6 hover:bg-slate-800/50 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider
                                                ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                    req.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {req.status}
                                            </span>
                                            <span className="text-slate-500 text-sm flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(req.requested_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-white mb-1">
                                            {req.user_name || req.user_id}
                                        </h3>
                                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                                            <User size={14} />
                                            <span>ID: {req.user_id}</span>
                                        </div>

                                        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                                            <p className="text-sm text-slate-300">
                                                <span className="text-slate-500 font-medium block mb-1">Reason for deletion:</span>
                                                {req.reason}
                                            </p>
                                        </div>

                                        {req.status !== 'pending' && (
                                            <div className="mt-3 text-sm">
                                                <p className="text-slate-400">
                                                    Processed by <span className="text-white">{req.processed_by}</span> on {new Date(req.processed_at!).toLocaleString()}
                                                </p>
                                                {req.notes && (
                                                    <p className="text-slate-500 mt-1 italic">"{req.notes}"</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'approve', request: req })}
                                                className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={16} />
                                                Approve Deletion
                                            </button>
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'reject', request: req })}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={16} />
                                                Reject Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && actionModal.request && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 
                            ${actionModal.type === 'approve' ? 'text-red-500' : 'text-white'}`}>
                            {actionModal.type === 'approve' ? (
                                <><AlertTriangle /> Confirm Data Deletion</>
                            ) : (
                                'Reject Request'
                            )}
                        </h3>

                        <div className="space-y-4">
                            {actionModal.type === 'approve' ? (
                                <p className="text-slate-300">
                                    Are you sure you want to approve this deletion request?
                                    This will permanently remove <strong>{actionModal.request.user_name}</strong>'s data from the system.
                                    <br /><br />
                                    <span className="text-red-400 text-sm">Create a backup export before proceeding if necessary.</span>
                                </p>
                            ) : (
                                <p className="text-slate-300">
                                    Please provide a reason for rejecting this request.
                                </p>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Notes / Reason (Optional)
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-brand-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Add internal notes or rejection reason..."
                                ></textarea>
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: null, request: null })}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProcessRequest}
                                    disabled={processing}
                                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2
                                        ${processing ? 'opacity-50 cursor-not-allowed' : ''}
                                        ${actionModal.type === 'approve' ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20' : 'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-900/20'}
                                    `}
                                >
                                    {processing ? 'Processing...' : (
                                        <>
                                            {actionModal.type === 'approve' ? <Trash2 size={16} /> : <CheckCircle size={16} />}
                                            {actionModal.type === 'approve' ? 'Confirm Deletion' : 'Confirm Rejection'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
