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
        <div className="space-y-8 animate-fade-in">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                    <div className="bg-brand-gold/10 p-2 rounded-lg">
                        <Trash2 className="w-6 h-6 text-brand-gold" />
                    </div>
                    Privacy & Purge Matrix
                </h2>

                <div className="flex items-center gap-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest focus:outline-none focus:border-brand-gold transition-all shadow-inner text-[10px]"
                    >
                        <option value="all">Display All Protocols</option>
                        <option value="pending">Awaiting Action</option>
                        <option value="approved">Approved / Processing</option>
                        <option value="rejected">Rejected / Voided</option>
                    </select>

                    <button
                        onClick={fetchRequests}
                        className="bg-brand-gold hover:bg-black hover:text-brand-gold text-black p-3 rounded-2xl transition-all shadow-2xl shadow-brand-gold/10 border border-brand-gold active:scale-95 flex items-center justify-center group"
                    >
                        <RefreshCw className={`w-5 h-5 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-3xl relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none opacity-30" />
                {loading ? (
                    <div className="p-32 text-center relative z-10">
                        <div className="animate-spin w-12 h-12 border-[3px] border-brand-gold border-t-transparent rounded-full mx-auto mb-6 shadow-2xl"></div>
                        <p className="text-secondary/40 font-black uppercase tracking-[0.3em] text-[10px]">Accessing Identity Vault...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-32 text-center relative z-10">
                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-10 h-10 text-secondary/10" />
                        </div>
                        <p className="text-white text-lg font-black uppercase tracking-tight">Zero Anomalies</p>
                        <p className="text-secondary/30 text-[10px] mt-3 uppercase tracking-[0.3em] font-black italic">The Purge Matrix reports zero active deletion signatures.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 relative z-10">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="p-10 hover:bg-white/5 transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="flex flex-col lg:flex-row justify-between gap-10 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-6">
                                            <span className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest shadow-sm border
                                                ${req.status === 'pending' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                {req.status === 'pending' ? 'AWAITING_ACTION' : req.status.toUpperCase()}
                                            </span>
                                            <span className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Clock size={12} className="text-brand-gold" />
                                                {new Date(req.requested_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight group-hover:text-brand-gold transition-colors">
                                            {req.user_name || 'ANONYMOUS_SUBJECT'}
                                        </h3>
                                        <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 inline-flex mb-8">
                                            <User size={14} className="text-brand-gold" />
                                            <span className="text-brand-gold font-mono text-[10px] font-black tracking-widest">{req.user_id}</span>
                                        </div>

                                        <div className="bg-black/40 rounded-3xl p-8 border border-white/5 shadow-inner">
                                            <div className="flex items-center gap-3 mb-4">
                                                <FileText size={14} className="text-brand-gold/40" />
                                                <span className="text-secondary/40 text-[9px] font-black uppercase tracking-[0.3em]">Rationale Rationale</span>
                                            </div>
                                            <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed italic">
                                                "{req.reason}"
                                            </p>
                                        </div>

                                        {req.status !== 'pending' && (
                                            <div className="mt-8 flex flex-col gap-2.5 bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                                                <p className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                                    Processed by <span className="text-brand-gold">{req.processed_by || 'SYSTEM_ADMIN'}</span>
                                                </p>
                                                <p className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                                    Timestamp: {new Date(req.processed_at!).toLocaleString()}
                                                </p>
                                                {req.notes && (
                                                    <p className="text-[10px] font-black text-secondary/20 uppercase tracking-widest italic mt-2 pl-4 border-l border-white/10">
                                                        — "{req.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex flex-col gap-4 justify-center min-w-[280px]">
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'approve', request: req })}
                                                className="w-full bg-maroon-900/60 hover:bg-rose-900 text-rose-500 hover:text-white border border-rose-500/20 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 group/btn"
                                            >
                                                <Trash2 size={18} className="group-hover/btn:rotate-12 transition-transform" />
                                                Authorize Purge
                                            </button>
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'reject', request: req })}
                                                className="w-full bg-black/80 hover:bg-black text-secondary/40 hover:text-white border border-white/10 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <XCircle size={18} />
                                                Void Protocol
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="px-10 py-6 bg-black/60 border-t border-white/10 flex justify-between items-center relative z-10">
                    <p className="text-[9px] text-secondary/30 italic font-black uppercase tracking-[0.3em]">Identity Purge Matrix · Level 9 Encryption</p>
                    <p className="text-[10px] text-secondary/50 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                        {filteredRequests.length} Active Protocol{filteredRequests.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && actionModal.request && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
                    <div className="bg-maroon-950 rounded-[40px] border border-white/10 max-w-md w-full overflow-hidden shadow-3xl animate-in zoom-in-95 duration-300 relative">
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none opacity-30" />
                        
                        <div className="p-8 bg-black/60 border-b border-white/10 relative z-10">
                            <h3 className={`text-2xl font-black flex items-center gap-4 uppercase tracking-tighter
                                ${actionModal.type === 'approve' ? 'text-rose-500' : 'text-white'}`}>
                                <div className={`p-2 rounded-xl border shadow-inner ${actionModal.type === 'approve' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                                    {actionModal.type === 'approve' ? <AlertTriangle size={24} /> : <XCircle size={24} />}
                                </div>
                                {actionModal.type === 'approve' ? 'Purge Auth' : 'Void Proto'}
                            </h3>
                        </div>

                        <div className="p-10 space-y-8 relative z-10">
                            {actionModal.type === 'approve' ? (
                                <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.2em] leading-relaxed italic border-l-2 border-rose-500/30 pl-6">
                                    Initiating permanent identity purge for <span className="text-white not-italic">{actionModal.request.user_name || actionModal.request.user_id}</span>.
                                    <br /><br />
                                    <span className="text-rose-500 font-extrabold shadow-rose-500/50">CRITICAL: ALL NEURAL RECORDS WILL BE DESTROYED.</span>
                                </p>
                            ) : (
                                <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.2em] leading-relaxed italic border-l-2 border-white/10 pl-6">
                                    Provide rationale for protocol termination.
                                </p>
                            )}

                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-secondary/20 uppercase tracking-[0.3em] ml-2">
                                    Admin Dispatch (Notes)
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-[11px] font-black text-white uppercase tracking-widest focus:border-brand-gold transition-all shadow-inner min-h-[140px] placeholder:text-secondary/10"
                                    placeholder="Enter authorization notes..."
                                ></textarea>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: null, request: null })}
                                    className="flex-1 px-6 py-4 text-secondary/40 hover:text-white font-black uppercase tracking-widest transition-colors bg-black/40 rounded-2xl border border-white/10 shadow-inner"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleProcessRequest}
                                    disabled={processing}
                                    className={`flex-[2] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3
                                        ${processing ? 'opacity-50 cursor-not-allowed scale-95' : 'active:scale-95'}
                                        ${actionModal.type === 'approve' 
                                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 border border-rose-500/20' 
                                            : 'bg-brand-gold hover:bg-black hover:text-brand-gold text-black shadow-brand-gold/20 border border-brand-gold'}
                                    `}
                                >
                                    {processing ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full" />
                                    ) : (
                                        <>
                                            {actionModal.type === 'approve' ? <Trash2 size={18} /> : <CheckCircle size={18} />}
                                            {actionModal.type === 'approve' ? 'Confirm Purge' : 'Confirm Void'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
                    </div>
                </div>
            )}
        </div>
    );
}
