"use client";
import { useState, useEffect, useRef } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import { User, Mail, Shield, Camera, Lock, FileText, AlertTriangle, CheckCircle2, XCircle, Download, ExternalLink, MessageSquare, Save, LogOut, Eye, EyeOff, ChevronLeft, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { logout, API_URL, createAuthAxios, getToken, getProfilePictureUrl, getUser } from '@/utils/auth';

import { useToast } from '../../../components/Toast';

interface UserData {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    professorId?: string;
    schoolId?: string;
    profilePicture?: string;
    userId?: string;
    role?: string;
}

export default function AdminProfile() {
    const [user, setUser] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<UserData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'feedback'>('profile');

    const [consentStatus, setConsentStatus] = useState<any>(null);
    const [consentHistory, setConsentHistory] = useState<any[]>([]);
    const [consentLoading, setConsentLoading] = useState(false);

    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { showToast } = useToast();

    const handleLogout = () => {
        logout();
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                logout();
                return;
            }

            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const authAxios = createAuthAxios();
                const response = await authAxios.get(`${API_URL}/api/auth/me`);

                const userData = response.data;

                if (userData.role !== 'admin') {
                    console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting to appropriate workspace.`);
                    if (userData.role === 'student') window.location.href = '/student/dashboard';
                    else if (userData.role === 'professor') window.location.href = '/professor/dashboard';
                    else window.location.href = '/login';
                    return;
                }

                setUser(userData);
                setFormData(userData);
                localStorage.setItem('user', JSON.stringify(userData));

                if (userData.userId) {
                    fetchConsentData(userData.userId);
                }
            } catch (error: any) {
                console.error('Failed to fetch user data:', error);

                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                    return;
                }

                const parsedUser = getUser();
                if (parsedUser) {
                    setUser(parsedUser);
                    setFormData(parsedUser);
                } else {
                    window.location.href = '/login';
                }
            }
        };

        fetchUserData();
    }, []);

    const fetchConsentData = async (userId: string) => {
        try {
            setConsentLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const [statusRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/api/consent/status/${userId}`),
                axios.get(`${API_URL}/api/consent/history/${userId}`)
            ]);

            setConsentStatus(statusRes.data);
            setConsentHistory(historyRes.data.history || []);
        } catch (error) {
            console.error("Failed to fetch consent data", error);
        } finally {
            setConsentLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (formData) {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (formData && user) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                await axios.put(`${API_URL}/api/users/profile/${user.id}`, formData);

                setUser(formData);
                localStorage.setItem('user', JSON.stringify(formData));
                setIsEditing(false);
                showToast("Profile updated successfully.", 'success');
            } catch (error) {
                console.error("Failed to update profile", error);
                showToast("Update failed. Please retry.", 'error');
            }
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.currentPassword === passwordData.newPassword) {
            showToast("New password cannot match your current password.", 'error');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast("Passwords do not match.", 'error');
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(passwordData.newPassword)) {
            showToast("Password requires 8+ characters, including uppercase, lowercase, numbers, and symbols.", 'error');
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.post(`${API_URL}/api/auth/change-password`, {
                userId: user?.userId,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                targetRole: 'admin'
            });
            showToast("Security credentials updated successfully.", 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message;
            if (errorMessage === 'Incorrect current password') {
                showToast("Current password was incorrect.", 'error');
            } else {
                showToast(errorMessage || "Error during update.", 'error');
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const formData = new FormData();
            formData.append('profilePicture', file);

            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await axios.post(`${API_URL}/api/users/profile/${user.id}/upload-photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                setUser(updatedUser);
                setFormData(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser)); 
                showToast("Profile picture updated.", 'success');
            } catch (error) {
                console.error("Failed to upload photo", error);
                showToast("Upload failed. Please try again.", 'error');
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (!user || !formData) return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
            <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Loading your profile...</p>
        </div>
    );

    const profileImageSrc = getProfilePictureUrl(user.profilePicture);

    return (
        <div className="min-h-screen bg-transparent font-sans selection:bg-identity-sky/20">
            <Navbar />
            
            <main className="max-w-5xl mx-auto px-6 lg:px-12 pt-36 pb-24">
                <div className="mb-10">
                    <Link href="/admin/dashboard" className="inline-flex items-center text-slate-400 hover:text-[#041C3C] font-black uppercase text-[10px] tracking-[0.2em] transition-all group bg-white/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-100 shadow-sm font-outfit">
                        <ChevronLeft size={18} className="mr-4 group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" />
                        Back to Dashboard
                    </Link>
                </div>
                
                <div className="bg-white/40 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-[#5CB4E4]/10 overflow-hidden relative group animate-in fade-in duration-700">
                    <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#5CB4E4]/10 to-transparent pointer-events-none opacity-40" />
                    
                    <div className="h-48 bg-[#041C3C] relative overflow-hidden">
                        <div className="absolute inset-0 bg-mesh opacity-40 mix-blend-overlay"></div>
                        <div className="absolute -bottom-20 left-16 flex items-end">
                            <div className="relative group/avatar">
                                <div className="w-40 h-40 bg-white rounded-[2.5rem] p-3 shadow-2xl relative z-10 overflow-hidden rotate-3 hover:rotate-0 transition-all duration-500 border border-slate-100">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-[1.8rem]" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 rounded-[1.8rem] flex items-center justify-center text-[#041C3C] font-black text-4xl">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <button
                                    onClick={triggerFileInput}
                                    className="absolute -bottom-3 -right-3 bg-[#5CB4E4] text-white p-4 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl border-4 border-white hover:scale-110 transition-all shadow-xl z-20 group-hover/avatar:shadow-[#5CB4E4]/40"
                                >
                                    <Camera size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-28 px-16 pb-16 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-5xl font-black text-[#041C3C] uppercase tracking-tight flex items-center gap-6 font-outfit">
                                    {user.firstName} {user.lastName}
                                    <div className="bg-[#5CB4E4]/10 p-2.5 rounded-xl border border-[#5CB4E4]/20">
                                        <Shield className="text-[#5CB4E4] w-7 h-7" />
                                    </div>
                                </h1>
                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] ml-1 flex items-center gap-4 font-outfit">
                                    <span className="w-1.5 h-1.5 bg-[#5CB4E4] rounded-full shadow-[0_0_8px_rgba(92,180,228,0.6)]" />
                                    SYSTEM ADMINISTRATOR
                                </p>
                            </div>
                            
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-4 px-8 py-4 min-h-[48px] font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white active:scale-95 font-outfit"
                            >
                                <LogOut size={18} /> LOGOUT
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex gap-4 overflow-x-auto border-b border-slate-100 mb-12 pb-0 scrollbar-hide">
                            {[
                                { id: 'profile', label: 'PROFILE DETAILS' },
                                { id: 'security', label: 'SECURITY SETTINGS' },
                                { id: 'privacy', label: 'PRIVACY & CONSENT' },
                                { id: 'feedback', label: 'FEEDBACK' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }}
                                    className={`pb-5 px-8 font-black uppercase tracking-[0.2em] text-[10px] transition-all relative whitespace-nowrap font-outfit ${
                                        activeTab === tab.id 
                                            ? 'text-[#041C3C] border-b-[3px] border-[#5CB4E4] scale-105' 
                                            : 'text-slate-300 hover:text-[#5CB4E4] hover:bg-slate-50/50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div key={activeTab} className="animate-fade-in relative z-10">
                            
                             {activeTab === 'profile' && (
                                <div className="space-y-12">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-[#041C3C] uppercase tracking-[0.2em] font-outfit flex items-center gap-4">
                                            <div className="w-2 h-2 bg-[#5CB4E4] rounded-full" />
                                            ACCOUNT INFORMATION
                                        </h3>
                                        {activeTab === 'profile' && (
                                            <button
                                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                                className={`flex items-center gap-4 px-8 py-3.5 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl font-outfit ${
                                                    isEditing ? 'bg-emerald-600 text-white shadow-emerald-900/10 hover:bg-emerald-700' : 'bg-white text-[#041C3C] border border-slate-100 hover:border-[#5CB4E4] shadow-sm'
                                                }`}
                                            >
                                                {isEditing ? <><Save size={18} /> SAVE CHANGES</> : 'EDIT PROFILE'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2rem] border-b border-slate-200/60 pb-4 font-outfit">PERSONAL DETAILS</h4>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">FIRST NAME</label>
                                                    <input
                                                        type="text"
                                                        name="firstName"
                                                        value={formData.firstName || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-black uppercase tracking-[0.1em] text-[11px] focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] disabled:opacity-60 disabled:bg-slate-50 transition-all font-outfit"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">LAST NAME</label>
                                                    <input
                                                        type="text"
                                                        name="lastName"
                                                        value={formData.lastName || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-black uppercase tracking-[0.1em] text-[11px] focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] disabled:opacity-60 disabled:bg-slate-50 transition-all font-outfit"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2rem] border-b border-slate-200/60 pb-4 font-outfit">CONTACT INFORMATION</h4>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">EMAIL ADDRESS</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email || ''}
                                                            onChange={handleChange}
                                                            disabled={!isEditing}
                                                            placeholder="NODELOG@LABFACE.OPS"
                                                            className="w-full pl-14 pr-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-bold lowercase text-[11px] focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] disabled:opacity-60 disabled:bg-slate-50 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">ADMIN ID</label>
                                                    <input
                                                        type="text"
                                                        value={formData.userId || formData.id || ''}
                                                        disabled
                                                        className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-slate-100 text-slate-400 font-mono tracking-[0.2em] text-[11px] cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {activeTab === 'security' && (
                                <div className="max-w-xl bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                                    <h3 className="text-sm font-black text-[#041C3C] mb-10 uppercase tracking-[0.2em] flex items-center gap-5 font-outfit">
                                        <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shadow-sm">
                                            <Lock size={20} />
                                        </div>
                                        CHANGE PASSWORD
                                    </h3>
                                    <form onSubmit={handleChangePassword} className="space-y-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">CURRENT PASSWORD</label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-bold focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] transition-all font-outfit"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">NEW PASSWORD</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    name="newPassword"
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-bold focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] pr-14 transition-all font-outfit"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5CB4E4] min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                                                >
                                                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                            {passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                                                <p className="mt-3 text-[10px] text-rose-500 font-black flex items-start gap-2 font-outfit">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                    CRITICAL: 8+ CHARS, UPPER, LOWER, NUMERAL, SYMBOL_REQUIRED.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] font-outfit">CONFIRM NEW PASSWORD</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-6 py-4 border border-slate-100 rounded-2xl bg-white text-[#041C3C] font-bold focus:ring-2 focus:outline-none focus:ring-[#5CB4E4] focus:border-[#5CB4E4] pr-14 transition-all font-outfit"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5CB4E4] min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                <p className="mt-3 text-[10px] text-rose-500 font-black flex items-center gap-2 font-outfit">
                                                    <AlertCircle size={14} /> SECURITY_MISMATCH: PASSWORDS_DO_NOT_ALIGN
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-[#041C3C] text-white font-black uppercase tracking-[0.2em] text-[11px] py-6 rounded-2xl hover:bg-[#5CB4E4] transition-all shadow-2xl shadow-[#041C3C]/20 active:scale-95 font-outfit"
                                        >
                                            UPDATE PASSWORD
                                        </button>
                                    </form>
                                </div>
                            )}

                             {activeTab === 'privacy' && (
                                <div className="space-y-10">
                                    <div className="bg-[#5CB4E4]/5 border border-[#5CB4E4]/20 text-[#041C3C] p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center gap-8 shadow-sm">
                                        <div className="p-5 bg-white rounded-2xl flex-shrink-0 shadow-xl border border-[#5CB4E4]/10">
                                            <Shield className="w-10 h-10 text-[#5CB4E4]" />
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-sm font-black uppercase tracking-[0.2em] font-outfit">DATA PRIVACY COMPLIANCE</strong>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.05em] font-outfit opacity-70">COMPLIANT WITH PHILIPPINE PRIVACY ACT 2012</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-10 border border-slate-100 shadow-xl space-y-8">
                                            <h3 className="text-sm font-black text-[#041C3C] uppercase tracking-[0.2em] flex items-center gap-4 font-outfit border-b border-slate-100 pb-6">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full" />
                                                ACTIVE CONSENTS
                                            </h3>
                                            {consentLoading ? (
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] font-outfit animate-pulse">LOADING DATA...</p>
                                            ) : consentStatus ? (
                                                <div className="space-y-5">
                                                    {[
                                                        { label: 'FACE RECOGNITION', status: consentStatus.consent_status === 'given' ? 'AUTHORIZED' : 'PENDING' },
                                                        { label: 'PRIVACY POLICY', status: consentStatus.privacy_policy_accepted ? 'ACCEPTED' : 'UNSIGNED' }
                                                    ].map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-50 shadow-sm transition-all hover:border-[#5CB4E4]/30">
                                                            <span className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.2em] font-outfit">{item.label}</span>
                                                            <span className={`flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] font-outfit px-4 py-2 rounded-xl ${
                                                                item.status === 'CONSENTED' || item.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                                <CheckCircle2 size={16} /> {item.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] font-outfit">NO CONSENT DATA FOUND</p>
                                            )}
                                        </div>

                                        <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-10 border border-slate-100 shadow-xl space-y-8">
                                            <h3 className="text-sm font-black text-[#041C3C] uppercase tracking-[0.2em] flex items-center gap-4 font-outfit border-b border-slate-100 pb-6">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full" />
                                                CONSENT HISTORY LOGS
                                            </h3>
                                            {consentHistory.length > 0 ? (
                                                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                                                    {consentHistory.map((record: any, index: number) => (
                                                        <div key={index} className="p-5 bg-white rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group hover:border-[#5CB4E4]/30 transition-all">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.1em] font-outfit">{record.consent_type.replace('_', ' ')}</p>
                                                                <p className="text-[9px] text-slate-400 font-mono">v{record.consent_version} | {new Date(record.timestamp).toLocaleDateString()}</p>
                                                            </div>
                                                            {record.consent_given ? (
                                                                <span className="text-emerald-500 font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-2 font-outfit bg-emerald-50/50 px-3 py-1.5 rounded-lg">
                                                                    <CheckCircle2 size={12} /> APPROVED
                                                                </span>
                                                            ) : (
                                                                <span className="text-rose-500 font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-2 font-outfit bg-rose-50/50 px-3 py-1.5 rounded-lg">
                                                                    <XCircle size={12} /> VOIDED
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] font-outfit">NO LOGS FOUND</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-[#041C3C] rounded-[3rem] p-12 border border-[#041C3C]/10 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
                                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                            <div className="space-y-4">
                                             <h3 className="text-2xl font-black text-white uppercase tracking-[0.1em] font-outfit italic">EXPORT PERSONAL DATA</h3>
                                                <p className="text-slate-300 max-w-md text-xs font-bold uppercase tracking-[0.1em] font-outfit opacity-80 leading-relaxed">AS AN ADMINISTRATOR, YOU CAN EXPORT A COPY OF YOUR ACCOUNT DATA FOR AUDIT PURPOSES.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-5">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const token = getToken();
                                                            const res = await axios.post(`${API_URL}/api/data-rights/export`,
                                                                { userId: user?.userId || user?.id },
                                                                { headers: { 'Authorization': `Bearer ${token}` } }
                                                            );
                                                            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `LABFACE_ARCHIVE_${user?.userId || user?.id}.json`;
                                                            a.click();
                                                            showToast('DATA_EXTRACTION_SUCCESSFUL', 'success');
                                                        } catch (error: any) {
                                                            showToast(`EXTRACTION_FAILURE: ACCESS_REJECTED`, 'error');
                                                        }
                                                    }}
                                                    className="flex items-center gap-4 px-10 py-5 bg-[#5CB4E4] text-white rounded-2xl transition-all shadow-xl shadow-[#5CB4E4]/30 hover:scale-105 active:scale-95 font-black uppercase tracking-[0.2em] text-[11px] font-outfit"
                                                >
                                                    <Download size={20} /> EXPORT DATA
                                                </button>
                                                <Link href="/privacy-policy" className="flex items-center gap-4 px-10 py-5 bg-white/10 text-white border border-white/20 hover:bg-white/20 rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[11px] font-outfit backdrop-blur-sm">
                                                    <FileText size={20} className="text-[#5CB4E4]" /> VIEW PRIVACY POLICY
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {activeTab === 'feedback' && (
                                <div className="max-w-3xl mx-auto text-center space-y-12 py-16 animate-in zoom-in-95 duration-500">
                                    <div className="space-y-6">
                                        <div className="inline-flex items-center justify-center w-28 h-28 rounded-[3rem] bg-[#5CB4E4]/10 text-[#5CB4E4] mb-6 shadow-xl border border-[#5CB4E4]/20 relative">
                                            <div className="absolute inset-0 bg-[#5CB4E4]/5 blur-2xl rounded-full animate-pulse" />
                                            <MessageSquare size={44} className="relative z-10" />
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit">SUBMIT FEEDBACK</h2>
                                        <p className="text-slate-400 max-w-lg mx-auto text-xs font-black uppercase tracking-[0.1em] font-outfit opacity-70 leading-relaxed">
                                            Help us improve LabFace. Report bugs or suggest new features via our feedback form.
                                        </p>
                                    </div>

                                    <div className="bg-white p-8 rounded-[4rem] inline-block shadow-2xl border border-slate-100 mx-auto transform hover:scale-105 transition-all duration-700 group relative">
                                        <div className="absolute -inset-4 bg-gradient-to-tr from-[#5CB4E4]/20 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <img
                                            src="/feedback-qr.png"
                                            alt="Transmission code"
                                            className="w-56 h-56 object-contain rounded-3xl opacity-90 group-hover:opacity-100 transition-all relative z-10"
                                        />
                                    </div>

                                    <div className="space-y-10">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] font-outfit flex items-center justify-center gap-6">
                                            <div className="h-[1px] w-12 bg-slate-200" />
                                            SCAN OR CLICK BELOW
                                            <div className="h-[1px] w-12 bg-slate-200" />
                                        </p>
                                        <a
                                            href="https://forms.gle/58sdJkHppikg8iMq7"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-6 px-12 py-6 bg-[#041C3C] text-white text-[11px] uppercase font-black tracking-[0.3em] rounded-2xl transition-all transform hover:-translate-y-2 shadow-2xl shadow-[#041C3C]/30 active:scale-95 font-outfit"
                                        >
                                            OPEN FEEDBACK FORM <ExternalLink size={20} className="text-[#5CB4E4]" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
