"use client";
import { useState } from 'react';
import { ShieldAlert, X, Send, User, Mail, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/utils/auth';
import { useToast } from '@/components/Toast';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

interface IdentityTheftModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportedUserId: string;
}

export default function IdentityTheftModal({ isOpen, onClose, reportedUserId }: IdentityTheftModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        reporterName: '',
        reporterEmail: '',
        description: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/report-identity-theft`, {
                userId: reportedUserId,
                ...formData
            });
            showToast('Report Submitted', 'Administration has been notified of the conflict.', 'success');
            onClose();
        } catch (err: any) {
            showToast('Error', err.response?.data?.error || 'Failed to submit report.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#041C3C]/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-4xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500/10 to-transparent p-8 border-b border-slate-100 flex items-center justify-between relative">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-xl shadow-rose-500/20">
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit">Report Identity Conflict</h3>
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.25em] opacity-80">Incident Tracking: {reportedUserId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] leading-relaxed">
                        If you believe your identity is being used by another account, please provide your contact information. Our administrators will manually verify your credentials and resolve the conflict.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Your Full Name"
                            name="reporterName"
                            value={formData.reporterName}
                            onChange={(e) => setFormData(prev => ({ ...prev, reporterName: e.target.value }))}
                            placeholder="Full Name"
                            isRequired
                            icon={User}
                            className="bg-slate-50/50 rounded-xl"
                        />
                        <InputField
                            label="Contact Email"
                            name="reporterEmail"
                            value={formData.reporterEmail}
                            onChange={(e) => setFormData(prev => ({ ...prev, reporterEmail: e.target.value }))}
                            placeholder="Email Address"
                            type="email"
                            isRequired
                            icon={Mail}
                            className="bg-slate-50/50 rounded-xl"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#041C3C]/60 ml-2">Description of Conflict</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors">
                                <FileText size={16} />
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Explain why you are reporting this ID..."
                                className="w-full h-32 pl-12 pr-6 py-4 rounded-xl bg-slate-50/50 border border-slate-200 transition-all outline-none text-[#041C3C] font-bold text-sm focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10 shadow-sm resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 h-14 rounded-xl text-[10px] tracking-[0.3em] border-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={loading}
                            disabled={!formData.reporterName || !formData.reporterEmail}
                            className="flex-[2] h-14 rounded-xl bg-[#041C3C] text-white text-[10px] tracking-[0.3em] group shadow-xl shadow-[#041C3C]/10"
                        >
                            Submit Conflict Report <Send size={14} className="ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
