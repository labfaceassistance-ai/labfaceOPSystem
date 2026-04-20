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
        <div className="space-y-12 animate-fade-in font-outfit">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <h2 className="text-3xl font-black text-identity-navy flex items-center gap-6 uppercase tracking-tighter italic">
                    <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                        <Trash2 className="w-8 h-8 text-rose-500" />
                    </div>
                    Privacy & Deletion Requests
                </h2>

                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white/60 border border-slate-100 text-identity-navy px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] focus:outline-none focus:border-identity-sky transition-all shadow-sm text-[10px] appearance-none cursor-pointer italic"
                        >
                            <option value="all">Display All Protocols</option>
                            <option value="pending">Awaiting Action</option>
                            <option value="approved">Approved / Processing</option>
                            <option value="rejected">Rejected / Voided</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <Filter size={14} />
                        </div>
                    </div>

                    <button
                        onClick={fetchRequests}
                        className="bg-identity-navy hover:bg-identity-sky text-white p-4 min-h-[52px] min-w-[52px] rounded-2xl transition-all shadow-xl shadow-identity-navy/10 border border-identity-navy hover:border-identity-sky active:scale-90 flex items-center justify-center group"
                        title="Refresh Registry"
                    >
                        <RefreshCw className={`w-6 h-6 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Requests List */}
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl relative bg-white/40 border border-identity-sky/5">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                {loading ? (
                    <div className="p-32 text-center relative z-10">
                        <div className="animate-spin w-16 h-16 border-[4px] border-identity-sky border-t-transparent rounded-full mx-auto mb-8 shadow-xl"></div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px] italic">Retrieving Privacy Logs...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-32 text-center relative z-10">
                        <div className="bg-slate-50/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                            <Trash2 className="w-12 h-12 text-slate-200" />
                        </div>
                        <p className="text-identity-navy text-2xl font-black uppercase tracking-tight italic">Zero Anomalies Detected</p>
                        <p className="text-slate-400 text-[11px] mt-4 uppercase tracking-[0.3em] font-black italic opacity-60">The global system registry mirrors all current data sovereignty requirements.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100/50 relative z-10">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="p-10 sm:p-12 hover:bg-white/40 transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-6 mb-8">
                                            <span className={`px-4 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-[0.15em] shadow-sm border
                                                ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                        'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                }`}>
                                                {req.status === 'pending' ? 'PROTOCOL_AWAITING' : `LOG_${req.status.toUpperCase()}`}
                                            </span>
                                            <span className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                                <Clock size={14} className="text-identity-sky/40" />
                                                {new Date(req.requested_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                            </span>
                                        </div>

                                        <h3 className="text-3xl font-black text-identity-navy mb-4 uppercase tracking-tighter group-hover:text-identity-sky transition-colors italic">
                                            {req.user_name || 'ANONYMOUS_SUBJECT'}
                                        </h3>
                                        <div className="flex items-center gap-4 bg-white/60 px-5 py-2.5 rounded-2xl border border-slate-100 inline-flex mb-10 shadow-sm">
                                            <User size={16} className="text-identity-sky" />
                                            <span className="text-identity-sky font-mono text-[11px] font-bold tracking-[0.15em]">{req.user_id}</span>
                                        </div>

                                        <div className="bg-white/80 rounded-[2rem] p-10 border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <FileText size={16} className="text-slate-200" />
                                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] italic opacity-60">Rationale Description</span>
                                            </div>
                                            <p className="text-sm font-black text-identity-navy uppercase tracking-[0.15em] leading-relaxed italic">
                                                "{req.reason}"
                                            </p>
                                        </div>

                                        {req.status !== 'pending' && (
                                            <div className="mt-10 flex flex-col gap-4 bg-identity-sky/5 p-8 rounded-[1.5rem] border border-identity-sky/10 shadow-sm">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4 italic">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                    Ratified by <span className="text-identity-navy font-black italic">{req.processed_by || 'SYSTEM_ADMIN_LEVEL_1'}</span>
                                                </p>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-4 italic">
                                                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                                                    Temporal Marker: {new Date(req.processed_at!).toLocaleString().toUpperCase()}
                                                </p>
                                                {req.notes && (
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] italic mt-4 pl-6 border-l-2 border-identity-sky/20">
                                                        — "{req.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex flex-col gap-5 justify-center min-w-[300px]">
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'approve', request: req })}
                                                className="w-full bg-rose-500 hover:bg-rose-600 text-white px-10 py-6 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-rose-900/10 active:scale-95 flex items-center justify-center gap-4 group/btn italic"
                                            >
                                                <Trash2 size={20} className="group-hover/btn:rotate-12 transition-transform" />
                                                Approve Deletion
                                            </button>
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'reject', request: req })}
                                                className="w-full bg-white hover:bg-slate-50 text-slate-400 hover:text-identity-navy px-10 py-6 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 shadow-sm active:scale-95 flex items-center justify-center gap-4 italic"
                                            >
                                                <XCircle size={20} />
                                                Decline Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="px-12 py-8 bg-white/40 border-t border-slate-100 flex justify-between items-center relative z-10">
                    <p className="text-[10px] text-slate-300 italic font-black uppercase tracking-[0.4em]">DATA_INTEGRITY_PROTOCOLS</p>
                    <p className="text-[11px] text-identity-navy font-black uppercase tracking-[0.2em] flex items-center gap-4 italic">
                        <span className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_10px_rgba(92,180,228,0.5)]" />
                        {filteredRequests.length} Active Sovereignty Requirement{filteredRequests.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && actionModal.request && (
                <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
                    <div className="identity-glass rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 max-w-lg w-full overflow-hidden shadow-[0_32px_64px_-12px_rgba(4,28,60,0.5)] animate-in zoom-in-95 duration-300 relative bg-white">
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                        
                        <div className="p-10 bg-white border-b border-slate-100/50 relative z-10">
                            <h3 className={`text-3xl font-black flex items-center gap-6 uppercase tracking-tighter italic
                                ${actionModal.type === 'approve' ? 'text-rose-500' : 'text-identity-navy'}`}>
                                <div className={`p-3 rounded-2xl border shadow-sm ${actionModal.type === 'approve' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                    {actionModal.type === 'approve' ? <AlertTriangle size={32} /> : <XCircle size={32} />}
                                </div>
                                {actionModal.type === 'approve' ? 'Authorize Purge' : 'System Rejection'}
                            </h3>
                        </div>

                        <div className="p-12 space-y-10 relative z-10">
                            {actionModal.type === 'approve' ? (
                                <div className="space-y-6">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed italic border-l-4 border-rose-500/20 pl-8">
                                        Commencing permanent data extraction for student node 
                                        <br/>
                                        <span className="text-identity-navy font-extrabold not-italic text-lg tracking-tight block mt-3">{actionModal.request.user_name || actionModal.request.user_id}</span>
                                    </p>
                                    <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20">
                                        <p className="text-[11px] text-rose-600 font-extrabold uppercase tracking-[0.15em] leading-relaxed italic text-center">
                                            CRITICAL: This command will permanently delete all biometric signatures and academic history from the system nexus.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed italic border-l-4 border-identity-navy/20 pl-8">
                                    State the system rationale for declining this sovereignty request.
                                </p>
                            )}

                            <div className="space-y-5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4 italic opacity-60">
                                    Authorization Notes
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    className="w-full bg-white/60 border border-slate-200 rounded-[2rem] p-8 text-[12px] font-black text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/5 transition-all shadow-inner min-h-[160px] placeholder:text-slate-200 italic"
                                    placeholder="Enter system protocol notes..."
                                ></textarea>
                            </div>

                            <div className="flex gap-6 pt-6">
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: null, request: null })}
                                    className="flex-1 px-8 py-5 text-slate-400 hover:text-identity-navy font-black uppercase tracking-[0.2em] text-[10px] transition-all bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 italic"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleProcessRequest}
                                    disabled={processing}
                                    className={`flex-[2] px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all flex items-center justify-center gap-4 italic
                                        ${processing ? 'opacity-50 cursor-not-allowed scale-95' : 'active:scale-95'}
                                        ${actionModal.type === 'approve' 
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20' 
                                            : 'bg-identity-navy hover:bg-identity-sky text-white shadow-identity-navy/10'}
                                    `}
                                >
                                    {processing ? (
                                        <div className="animate-spin h-6 w-6 border-2 border-white/50 border-t-white rounded-full" />
                                    ) : (
                                        <>
                                            {actionModal.type === 'approve' ? <Trash2 size={20} /> : <CheckCircle size={20} />}
                                            {actionModal.type === 'approve' ? 'Confirm Purge' : 'Commit Rejection'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent opacity-50" />
                    </div>
                </div>
            )}
        </div>
    );
}
