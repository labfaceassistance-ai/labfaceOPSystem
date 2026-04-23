'use client';
import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { API_URL, getToken } from '@/utils/auth';
import { X, UserPlus, Shield, Key, Mail, Fingerprint, Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import InputField from './ui/InputField';

interface CreateProfessorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateProfessorModal({ isOpen, onClose, onSuccess }: CreateProfessorModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        professorId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!/^\d{5}$/.test(formData.professorId)) {
            showToast('Professor ID must be exactly 5 digits', 'error');
            return;
        }

        setLoading(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            await axios.post(
                `${API_URL}/api/admin/create-professor`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast('Professor account created successfully!', 'success');
            onSuccess();
            onClose();
            setFormData({
                professorId: '',
                firstName: '',
                middleName: '',
                lastName: '',
                email: '',
                password: ''
            });
        } catch (error: any) {
            console.error('Error creating professor:', error);
            showToast(error.response?.data?.message || 'Failed to create professor account', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Container Wrapper */}
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
                <div 
                    className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(4,28,60,0.3)] overflow-hidden flex flex-col font-outfit border border-slate-100 text-left animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    {/* Header: Academic Professional Style */}
                    <div className="relative p-10 pb-8 bg-white border-b border-slate-100">
                        <div className="absolute top-0 left-0 w-full h-1 bg-identity-sky opacity-80" />
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-identity-sky/5 rounded-2xl border border-identity-sky/10 flex items-center justify-center text-identity-sky shadow-sm">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck className="w-3 h-3 text-identity-sky" />
                                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.2em] italic">Authorized Personnel Only</p>
                                    </div>
                                    <h3 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">REGISTER PROFESSOR</h3>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-identity-navy transition-all border border-transparent hover:border-slate-100 group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            
                            {/* Section Label */}
                            <div className="md:col-span-2 flex items-center gap-4">
                                <span className="text-[9px] font-black text-identity-navy/40 uppercase tracking-[0.3em] italic whitespace-nowrap">ID Credentials</span>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            <div className="md:col-span-2">
                                <InputField
                                    label="PROFESSOR ID (5 DIGITS)"
                                    icon={Fingerprint}
                                    type="text"
                                    placeholder="ENTER 5-DIGIT ID"
                                    value={formData.professorId}
                                    onChange={(e) => setFormData({ ...formData, professorId: e.target.value })}
                                    required
                                    className="bg-white"
                                />
                            </div>

                            {/* Personal Details */}
                            <div className="md:col-span-2 flex items-center gap-4 mt-2">
                                <span className="text-[9px] font-black text-identity-navy/40 uppercase tracking-[0.3em] italic whitespace-nowrap">Faculty Profile</span>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            <InputField
                                label="FIRST NAME"
                                icon={Shield}
                                type="text"
                                placeholder="GIVEN NAME"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />

                            <InputField
                                label="LAST NAME"
                                icon={Shield}
                                type="text"
                                placeholder="SURNAME"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />

                            <InputField
                                label="MIDDLE NAME (OPTIONAL)"
                                icon={Shield}
                                type="text"
                                placeholder="OPTIONAL"
                                value={formData.middleName}
                                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                            />

                            <InputField
                                label="EMAIL ADDRESS"
                                icon={Mail}
                                type="email"
                                placeholder="FACULTY@EMAIL.COM"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />

                            {/* Security Credentials */}
                            <div className="md:col-span-2 flex items-center gap-4 mt-2">
                                <span className="text-[9px] font-black text-identity-navy/40 uppercase tracking-[0.3em] italic whitespace-nowrap">Security Setup</span>
                                <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>

                            <div className="md:col-span-2">
                                <InputField
                                    label="TEMPORARY PASSWORD"
                                    icon={Key}
                                    type="password"
                                    placeholder="MINIMUM 8 CHARACTERS"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    showStrength
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-10 flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-400 hover:text-identity-navy hover:border-identity-navy/20 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all italic active:scale-95 shadow-sm"
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[1.5] bg-identity-navy hover:bg-identity-sky text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-identity-navy/10 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 italic group relative overflow-hidden"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>CREATE ACCOUNT</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </button>
                        </div>
                    </form>

                    {/* Status Bar */}
                    <div className="px-10 py-5 bg-white border-t border-slate-100 flex items-center justify-center gap-3 opacity-50">
                        <ShieldCheck className="w-3 h-3 text-identity-sky" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Admin Authentication Secured</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
