'use client';
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
        <div className="space-y-12 animate-fade-in font-outfit select-none">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="bg-rose-500/10 p-5 rounded-[2rem] border-2 border-rose-500/20 shadow-lg shadow-rose-900/5">
                        <Trash2 className="w-10 h-10 text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                            Data Purge Terminal
                        </h2>
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.4em] mt-3 italic opacity-80">Privacy_Right_Governance_Unit</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group min-w-[240px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 text-identity-navy px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] focus:outline-none focus:border-identity-sky transition-all shadow-xl text-[10px] appearance-none cursor-pointer italic"
                        >
                            <option value="all">ALL_RECORDS</option>
                            <option value="pending">AWAITING_AUTHORIZATION</option>
                            <option value="approved">AUTHORIZED_PURGE</option>
                            <option value="rejected">VOIDED_REQUESTS</option>
                        </select>
                        <Filter className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-identity-sky opacity-40" size={16} />
                    </div>

                    <button
                        onClick={fetchRequests}
                        className="bg-identity-navy text-white p-5 rounded-2xl transition-all shadow-2xl shadow-identity-navy/20 border-2 border-white/20 hover:bg-identity-sky active:scale-90 group"
                        title="Refresh_Registry"
                    >
                        <RefreshCw className={`w-6 h-6 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Requests List Node */}
            <div className="identity-glass rounded-[3.5rem] overflow-hidden shadow-3xl relative border-2 border-white/40 min-h-[600px] flex flex-col">
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-32 gap-8 relative z-10">
                        <div className="animate-spin w-20 h-20 border-4 border-identity-sky border-t-transparent rounded-full shadow-2xl" />
                        <p className="text-identity-sky font-black uppercase tracking-[0.4em] text-[11px] italic animate-pulse">Syncing_Request_Queue...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-32 text-center relative z-10">
                        <div className="bg-[#041C3C]/5 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10 border-2 border-dashed border-white/40 shadow-inner group transition-all hover:scale-110">
                            <Trash2 className="w-16 h-16 text-slate-100 opacity-50 group-hover:text-identity-sky group-hover:opacity-100 transition-all" />
                        </div>
                        <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Registry_Empty</h3>
                        <p className="text-slate-400 text-[11px] mt-6 uppercase tracking-[0.4em] font-black italic opacity-60">There are currently no active data deletion requests identified.</p>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-white/20 relative z-10 flex-1">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="p-12 hover:bg-white/10 transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="flex flex-col xl:flex-row justify-between gap-16 relative z-10">
                                    <div className="flex-1 space-y-10">
                                        <div className="flex flex-wrap items-center gap-8">
                                            <span className={`px-6 py-2 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shadow-xl border-2 italic
                                                ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-900/5' :
                                                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-900/5' :
                                                        'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-rose-900/5'
                                                }`}>
                                                {req.status === 'pending' ? 'AWAITING_PROTOCOL' : req.status.replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                            <span className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 italic">
                                                <Clock size={16} className="text-identity-sky/40" />
                                                STAMP: {new Date(req.requested_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-4xl font-black text-identity-navy mb-6 uppercase tracking-tighter group-hover:text-identity-sky transition-colors italic leading-none">
                                                {req.user_name || 'UNDEFINED_ENTITY'}
                                            </h3>
                                            <div className="flex items-center gap-5 bg-white/40 px-6 py-3 rounded-2xl border-2 border-white/60 inline-flex shadow-xl">
                                                <User size={18} className="text-identity-sky" />
                                                <span className="text-identity-sky font-mono text-[12px] font-black tracking-[0.2em] italic">{req.user_id}</span>
                                            </div>
                                        </div>

                                        <div className="bg-[#041C3C]/95 rounded-[3rem] p-12 border-2 border-white/10 shadow-2xl relative overflow-hidden group-hover:border-white/20 transition-all">
                                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                                <FileText size={80} className="text-white" />
                                            </div>
                                            <div className="flex items-center gap-5 mb-8 relative z-10">
                                                <FileText size={18} className="text-identity-sky/60" />
                                                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] italic">DELETION_RATIONALE_FIELD</span>
                                            </div>
                                            <p className="text-lg font-black text-white uppercase tracking-[0.1em] leading-relaxed italic relative z-10">
                                                "{req.reason}"
                                            </p>
                                        </div>

                                        {req.status !== 'pending' && (
                                            <div className="flex flex-col gap-5 bg-white/20 p-10 rounded-[2.5rem] border-2 border-white/40 shadow-inner animate-in slide-in-from-left-5 duration-500">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-5 italic leading-none">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                                                    AUTHORIZED_BY: <span className="text-identity-navy font-black italic">{req.processed_by || 'SYSTEM_CORE'}</span>
                                                </p>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-5 italic leading-none">
                                                    <div className="w-3 h-3 rounded-full bg-white/40 border border-slate-100" />
                                                    TIMESTAMP_SYNC: {new Date(req.processed_at!).toLocaleString().toUpperCase()}
                                                </p>
                                                {req.notes && (
                                                    <div className="mt-6 pt-8 border-t-2 border-white/20">
                                                        <p className="text-[11px] font-black text-identity-navy/60 uppercase tracking-[0.2em] italic leading-relaxed">
                                                            LOG_ENTRY: <span className="text-identity-navy">"{req.notes}"</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex flex-col gap-6 justify-center min-w-[320px]">
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'approve', request: req })}
                                                className="w-full bg-rose-600 hover:bg-rose-700 text-white px-12 py-7 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-rose-900/30 active:scale-95 flex items-center justify-center gap-6 group/btn italic border border-white/20"
                                            >
                                                <Trash2 size={24} className="group-hover/btn:rotate-12 transition-transform" />
                                                Execute_Purge
                                            </button>
                                            <button
                                                onClick={() => setActionModal({ isOpen: true, type: 'reject', request: req })}
                                                className="w-full bg-white/40 hover:bg-white/60 text-slate-400 hover:text-identity-navy px-12 py-7 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all border-2 border-white/60 shadow-xl active:scale-95 flex items-center justify-center gap-6 italic"
                                            >
                                                <XCircle size={24} />
                                                Void_Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="px-14 py-10 bg-[#041C3C]/95 border-t-2 border-white/10 flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-blueprint opacity-5" />
                    <div>
                        <p className="text-[10px] text-white/40 italic font-black uppercase tracking-[0.5em] mb-2">SECURE_DATA_DESTROY_PROTOCOL</p>
                        <p className="text-[8px] text-identity-sky/40 font-black uppercase tracking-[0.8em] italic">LABFACE_PRIVACY_ENFORCEMENT_SUITE</p>
                    </div>
                    <p className="text-[12px] text-white font-black uppercase tracking-[0.3em] flex items-center gap-5 italic relative z-10">
                        <span className="w-3 h-3 rounded-full bg-identity-sky animate-pulse shadow-[0_0_15px_rgba(92,180,228,0.8)]" />
                        {filteredRequests.length} ACTIVE_SESSIONS
                    </p>
                </div>
            </div>

            {/* Full-Screen Cyber Action Modal */}
            {actionModal.isOpen && actionModal.request && (
                <div className="fixed inset-0 bg-[#041C3C]/80 backdrop-blur-2xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500">
                    <div className="identity-glass rounded-[4rem] border-2 border-white/40 max-w-2xl w-full overflow-hidden shadow-[0_64px_128px_-24px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 relative bg-white pb-10">
                        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-identity-sky/10 to-transparent pointer-events-none opacity-50" />
                        
                        {/* Header */}
                        <div className="p-12 border-b-2 border-slate-100 relative z-10 flex items-center justify-between">
                            <h3 className={`text-4xl font-black flex items-center gap-8 uppercase tracking-tighter italic
                                ${actionModal.type === 'approve' ? 'text-rose-600' : 'text-identity-navy'}`}>
                                <div className={`p-5 rounded-[2rem] border-2 shadow-inner ${actionModal.type === 'approve' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                    {actionModal.type === 'approve' ? <AlertTriangle size={40} /> : <XCircle size={40} />}
                                </div>
                                {actionModal.type === 'approve' ? 'Protocol: EXECUTE' : 'Protocol: VOID'}
                            </h3>
                            <button 
                                onClick={() => setActionModal({ isOpen: false, type: null, request: null })}
                                className="p-4 rounded-2xl hover:bg-slate-50 text-slate-200 hover:text-identity-navy transition-all border border-transparent hover:border-slate-100"
                            >
                                <XCircle size={32} />
                            </button>
                        </div>

                        <div className="p-14 space-y-12 relative z-10">
                            {actionModal.type === 'approve' ? (
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-4">TARGET_ENTITY_IDENTIFICATION</p>
                                        <div className="bg-[#041C3C]/95 p-10 rounded-[3rem] border-2 border-white/10 shadow-2xl">
                                            <span className="text-white font-black text-3xl tracking-tighter uppercase italic block mb-3">{actionModal.request.user_name || 'UNDEFINED'}</span>
                                            <span className="text-identity-sky font-mono font-bold text-[14px] tracking-[0.4em] uppercase block opacity-60">NODE_UID: {actionModal.request.user_id}</span>
                                        </div>
                                    </div>
                                    <div className="bg-rose-600/10 p-8 rounded-[2.5rem] border-2 border-rose-600/20">
                                        <p className="text-[12px] text-rose-600 font-black uppercase tracking-[0.3em] leading-relaxed italic text-center">
                                            CRITICAL_WARNING: This operation is IRREVERSIBLE. All biometric telemetry and academic records will be PERMANENTLY DELETED.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-relaxed border-l-4 border-identity-navy/20 pl-8">
                                        Reasoning required to nullify purge request for entity:
                                        <br/>
                                        <span className="text-identity-navy font-black italic text-2xl tracking-tighter block mt-4 uppercase underline decoration-identity-sky decoration-4">{actionModal.request.user_name}</span>
                                    </p>
                                </div>
                            )}

                            <div className="space-y-6">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] ml-8 italic opacity-80">
                                    ADMIN_SYNOPSIS_LOG
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10 text-[14px] font-black text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:ring-8 focus:ring-identity-sky/5 transition-all shadow-inner min-h-[200px] placeholder:text-slate-200 placeholder:italic italic"
                                    placeholder="Enter administrative notes here..."
                                ></textarea>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-8 pt-8">
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: null, request: null })}
                                    className="flex-1 px-10 py-7 text-slate-400 hover:text-identity-navy font-black uppercase tracking-[0.4em] text-[12px] transition-all bg-white rounded-2xl border-2 border-slate-100 shadow-xl active:scale-95 italic h-20"
                                >
                                    Abort_Sequence
                                </button>
                                <button
                                    onClick={handleProcessRequest}
                                    disabled={processing}
                                    className={`flex-[2] px-12 py-7 rounded-2xl font-black uppercase tracking-[0.4em] text-[12px] shadow-2xl transition-all flex items-center justify-center gap-6 italic h-20 border border-white/20
                                        ${processing ? 'opacity-50 cursor-not-allowed scale-95' : 'active:scale-95 hover:scale-105'}
                                        ${actionModal.type === 'approve' 
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30' 
                                            : 'bg-identity-navy hover:bg-identity-sky text-white shadow-identity-navy/20'}
                                    `}
                                >
                                    {processing ? (
                                        <div className="animate-spin h-8 w-8 border-4 border-white/50 border-t-white rounded-full shadow-lg" />
                                    ) : (
                                        <>
                                            {actionModal.type === 'approve' ? <Trash2 size={24} /> : <CheckCircle size={24} />}
                                            {actionModal.type === 'approve' ? 'Execute_Purge_Sequence' : 'Commit_Void_Action'}
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

