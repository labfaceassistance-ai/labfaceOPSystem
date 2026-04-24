"use client";
import { useState } from 'react';
import { XCircle, Users, ArrowRightLeft, UserPlus, Search, AlertCircle, CheckCircle, Info } from 'lucide-react';
import axios from 'axios';
import { getToken } from '../utils/auth';

interface Batch {
    id: number;
    name: string;
    capacity: number | null;
    student_count: number;
}

interface StudentBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    currentBatch: Batch | null;
    availableBatches: Batch[];
    onSuccess: () => void;
}

export default function StudentBatchModal({ isOpen, onClose, classId, currentBatch, availableBatches, onSuccess }: StudentBatchModalProps) {
    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
    const [requestType, setRequestType] = useState<'join' | 'swap'>('join');
    const [targetStudentId, setTargetStudentId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedBatchId) return;
        if (requestType === 'swap' && !targetStudentId) {
            setError("Please enter the Student ID of the peer you wish to swap with.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const token = getToken();
            await axios.post(`${API_URL}/api/student/batch-request`, {
                classId,
                type: requestType,
                targetGroupId: selectedBatchId,
                targetStudentId: requestType === 'swap' ? targetStudentId : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);
    const isFull = !!(selectedBatch && selectedBatch.capacity && selectedBatch.student_count >= selectedBatch.capacity);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-identity-navy/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="identity-glass bg-white/90 border border-identity-sky/20 rounded-[2.5rem] max-w-2xl w-full p-8 sm:p-10 shadow-[0_0_80px_rgba(30,58,138,0.2)] relative animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-2">Batch Marketplace</h2>
                        <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.3em] italic">Manage your laboratory schedule</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-identity-navy transition-colors bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Current Batch Info */}
                <div className="bg-identity-sky/5 border border-identity-sky/10 rounded-2xl p-5 mb-8 relative z-10 flex items-center justify-between">
                    <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block italic">Your Current Assignment:</span>
                        <span className="text-sm font-black text-identity-navy uppercase tracking-[0.1em] italic">{currentBatch ? currentBatch.name : 'Unassigned'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-identity-sky/5">
                        <Users size={20} className="text-identity-sky" />
                    </div>
                </div>

                {/* Batch Selection */}
                <div className="space-y-4 mb-8 relative z-10">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Select Target Batch:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {availableBatches.map((batch) => {
                            const isCurrent = currentBatch?.id === batch.id;
                            const full = batch.capacity && batch.student_count >= batch.capacity;
                            
                            return (
                                <button
                                    key={batch.id}
                                    disabled={isCurrent}
                                    onClick={() => {
                                        setSelectedBatchId(batch.id);
                                        if (full) setRequestType('swap');
                                        else setRequestType('join');
                                    }}
                                    className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${
                                        isCurrent ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' :
                                        selectedBatchId === batch.id ? 'bg-identity-sky/10 border-identity-sky shadow-lg' :
                                        'bg-white/60 border-identity-sky/5 hover:border-identity-sky/20 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-black uppercase tracking-[0.1em] italic ${selectedBatchId === batch.id ? 'text-identity-sky' : 'text-identity-navy'}`}>{batch.name}</span>
                                        {full && (
                                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/10">FULL</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <Users size={12} />
                                        {batch.student_count} {batch.capacity ? `/ ${batch.capacity}` : ''} Students
                                    </div>
                                    {selectedBatchId === batch.id && (
                                        <div className="absolute -top-1 -right-1">
                                            <div className="bg-identity-sky text-white p-1 rounded-full shadow-lg">
                                                <CheckCircle size={12} />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Request Logic Configuration */}
                {selectedBatchId && (
                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-6 relative z-10 bg-white/40 p-6 rounded-3xl border border-identity-sky/10 mb-8 shadow-inner">
                        <div className="flex items-center gap-4 border-b border-identity-sky/5 pb-4">
                            <button
                                onClick={() => setRequestType('join')}
                                disabled={isFull}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
                                    requestType === 'join' ? 'bg-identity-navy text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                } ${isFull ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <UserPlus size={14} /> Request Join
                            </button>
                            <button
                                onClick={() => setRequestType('swap')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
                                    requestType === 'swap' ? 'bg-identity-navy text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'
                                }`}
                            >
                                <ArrowRightLeft size={14} /> Request Swap
                            </button>
                        </div>

                        {requestType === 'join' && (
                            <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl animate-in fade-in">
                                <Info size={16} className="text-emerald-500 mt-0.5" />
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-relaxed">
                                    Slot Available. Requesting to join {selectedBatch?.name}. This requires professor approval.
                                </p>
                            </div>
                        )}

                        {requestType === 'swap' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-relaxed">
                                        Batch is full. You must request a swap with a specific student. They must agree before it goes to the professor.
                                    </p>
                                </div>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-identity-sky pointer-events-none transition-colors" size={16} />
                                    <input
                                        type="text"
                                        value={targetStudentId}
                                        onChange={(e) => setTargetStudentId(e.target.value)}
                                        placeholder="ENTER PEER'S STUDENT ID (e.g., 2024-XXXX)"
                                        className="w-full pl-12 pr-4 py-4 bg-white border border-identity-sky/10 rounded-2xl text-[10px] font-black text-identity-navy uppercase tracking-[0.2em] focus:border-identity-sky/50 focus:outline-none shadow-inner placeholder:text-slate-300 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-8 animate-in head-shake text-rose-500 relative z-10">
                        <AlertCircle size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-4 relative z-10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:bg-slate-100 transition-all border border-slate-200 italic"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!selectedBatchId || isSubmitting}
                        onClick={handleSubmit}
                        className="flex-[2] px-8 py-4 bg-identity-navy hover:bg-identity-sky disabled:opacity-50 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-identity-navy/20 flex items-center justify-center gap-3 italic"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>Submit Request <ArrowRightLeft size={16} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
