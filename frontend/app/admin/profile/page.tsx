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
                showToast("Identity parameters synchronized successfully.", 'success');
            } catch (error) {
                console.error("Failed to update profile", error);
                showToast("Synchronization failed. Please retry.", 'error');
            }
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.currentPassword === passwordData.newPassword) {
            showToast("New credentials cannot match existing credentials.", 'error');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast("Credential verification mismatch.", 'error');
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(passwordData.newPassword)) {
            showToast("Required: 8+ chars, uppercase, lowercase, numeral, special symbol.", 'error');
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
            showToast("Security credentials verified and updated.", 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message;
            if (errorMessage === 'Incorrect current password') {
                showToast("Current credentials rejected.", 'error');
            } else {
                showToast(errorMessage || "Protocol error during credential update.", 'error');
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
                showToast("Upload transmission failed.", 'error');
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (!user || !formData) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
            <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Identity Profile...</p>
        </div>
    );

    const profileImageSrc = getProfilePictureUrl(user.profilePicture);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-identity-sky/20">
            <Navbar />
            
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
                <div className="mb-8">
                    <Link href="/admin/dashboard" className="inline-flex items-center text-slate-400 hover:text-identity-navy font-black uppercase text-[10px] tracking-[0.15em] transition-colors group bg-white/50 px-5 py-3 rounded-2xl border border-slate-200">
                        <ChevronLeft size={16} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Admin Portal
                    </Link>
                </div>
                
                <div className="identity-glass rounded-[3rem] shadow-2xl border border-identity-sky/10 bg-white/40 overflow-hidden relative group animate-fade-in">
                    <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-identity-sky/10 to-transparent pointer-events-none opacity-50" />
                    
                    <div className="h-40 bg-gradient-to-r from-identity-navy to-identity-navy relative overflow-hidden">
                        <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay"></div>
                        <div className="absolute -bottom-16 left-12 flex items-end">
                            <div className="relative group/avatar">
                                <div className="w-32 h-32 bg-slate-50 rounded-[2rem] p-2 shadow-2xl relative z-10 overflow-hidden rotate-3 hover:rotate-0 transition-transform">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-[1.5rem]" />
                                    ) : (
                                        <div className="w-full h-full bg-identity-sky/10 rounded-[1.5rem] flex items-center justify-center text-identity-navy font-black text-3xl md:text-4xl">
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
                                    className="absolute -bottom-2 -right-2 bg-identity-sky text-white p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border-4 border-slate-50 hover:scale-110 transition-transform shadow-xl z-20 group-hover/avatar:animate-pulse"
                                >
                                    <Camera size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-24 px-12 pb-12 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-identity-navy uppercase tracking-tighter italic flex items-center gap-4">
                                    {user.firstName} {user.lastName}
                                    <Shield className="text-identity-sky w-6 h-6" />
                                </h1>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 ml-1">System Administrator</p>
                            </div>
                            
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-4 px-6 py-3 min-h-[44px] min-w-[44px] font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl transition-all shadow-md bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white"
                            >
                                <LogOut size={16} /> Disconnect
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 mb-8 pb-0 scrollbar-hide">
                            <button
                                onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
                                className={`pb-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] transition-colors relative whitespace-nowrap ${activeTab === 'profile' ? 'text-identity-navy border-b-[3px] border-identity-navy' : 'text-slate-400 hover:text-identity-sky'}`}
                            >
                                Contact Profile
                            </button>
                            <button
                                onClick={() => { setActiveTab('security'); setIsEditing(false); }}
                                className={`pb-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] transition-colors relative whitespace-nowrap ${activeTab === 'security' ? 'text-identity-navy border-b-[3px] border-identity-navy' : 'text-slate-400 hover:text-identity-sky'}`}
                            >
                                Security Details
                            </button>
                            <button
                                onClick={() => { setActiveTab('privacy'); setIsEditing(false); }}
                                className={`pb-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] transition-colors relative whitespace-nowrap ${activeTab === 'privacy' ? 'text-identity-navy border-b-[3px] border-identity-navy' : 'text-slate-400 hover:text-identity-sky'}`}
                            >
                                Legal Contracts
                            </button>
                            <button
                                onClick={() => { setActiveTab('feedback'); setIsEditing(false); }}
                                className={`pb-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] transition-colors relative whitespace-nowrap ${activeTab === 'feedback' ? 'text-identity-navy border-b-[3px] border-identity-navy' : 'text-slate-400 hover:text-identity-sky'}`}
                            >
                                Provide Feedback
                            </button>
                        </div>

                        {/* Content Area */}
                        <div key={activeTab} className="animate-fade-in relative z-10">
                            
                            {activeTab === 'profile' && (
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-identity-navy uppercase tracking-[0.15em]">Personal Details</h3>
                                        {activeTab === 'profile' && (
                                            <button
                                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                                className={`flex items-center gap-4 px-6 py-2.5 font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl transition-all shadow-md border ${
                                                    isEditing ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600' : 'bg-white text-identity-navy border-slate-200 hover:border-identity-sky'
                                                }`}
                                            >
                                                {isEditing ? <><Save size={16} /> CONFIRM CHANGES</> : 'UPDATE PROFILE'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6 bg-white/50 p-6 rounded-[2rem] border border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-200 pb-3">Identification</h4>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">First Name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName || ''}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">Last Name</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName || ''}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6 bg-white/50 p-6 rounded-[2rem] border border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-200 pb-3">Contact Nodes</h4>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={16} />
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        placeholder="email@example.com"
                                                        className="w-full pl-11 pr-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky disabled:bg-slate-50 disabled:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">Assigned ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.userId || formData.id || ''}
                                                    disabled
                                                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 text-slate-400 font-mono tracking-[0.15em] cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="max-w-md bg-white/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-sm font-black text-identity-navy mb-8 uppercase tracking-[0.15em] flex items-center gap-4">
                                        <div className="p-2 bg-rose-50 text-rose-500 rounded-2xl">
                                            <Lock size={18} />
                                        </div>
                                        Change Password
                                    </h3>
                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">Current Password</label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    name="newPassword"
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 top-3 text-slate-400 hover:text-identity-sky min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                                                >
                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                                                <p className="mt-2 text-[9px] text-rose-500 font-bold flex items-start gap-1">
                                                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                    REQUIREMENTS: 8+ CHARS, UPPER, LOWER, NUMERAL, SPECIAL.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.15em]">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-white text-identity-navy font-bold focus:ring-2 focus:outline-none focus:ring-identity-sky focus:border-identity-sky pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-3 text-slate-400 hover:text-identity-sky min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                <p className="mt-2 text-[9px] text-rose-500 font-bold flex items-center gap-1">
                                                    <AlertCircle size={12} /> VERIFICATION MISMATCH
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-identity-navy text-white font-black uppercase tracking-[0.15em] text-[10px] py-4 rounded-2xl hover:bg-identity-navy transition-colors shadow-lg shadow-identity-navy/20"
                                        >
                                            SAVE ATTENDANCE
                                        </button>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'privacy' && (
                                <div className="space-y-8">
                                    <div className="bg-identity-sky/10 border border-identity-sky/20 text-identity-navy p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center gap-6 shadow-sm">
                                        <div className="p-4 bg-white rounded-2xl flex-shrink-0 shadow-sm border border-slate-100">
                                            <Shield className="w-8 h-8 text-identity-sky" />
                                        </div>
                                        <div>
                                            <strong className="text-sm font-black uppercase tracking-[0.15em]">Federal Privacy Framework</strong>
                                            <p className="text-slate-500 mt-2 text-xs font-medium">Compliance bound to Philippine Data Privacy Act of 2012.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/50 rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-black text-identity-navy mb-6 uppercase tracking-[0.15em] flex items-center gap-4">
                                            <FileText className="text-identity-sky w-5 h-5" />
                                            Active Agreements
                                        </h3>
                                        {consentLoading ? (
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Loading data...</p>
                                        ) : consentStatus ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl">
                                                    <span className="text-xs font-bold text-identity-navy uppercase tracking-[0.15em]">Biometric Capture</span>
                                                    {consentStatus.consent_status === 'given' ? (
                                                        <span className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.15em] bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                            <CheckCircle2 size={16} /> CONSENTED
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.15em] bg-amber-50 px-3 py-1.5 rounded-lg">
                                                            <AlertTriangle size={16} /> PENDING
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl">
                                                    <span className="text-xs font-bold text-identity-navy uppercase tracking-[0.15em]">System Policies</span>
                                                    {consentStatus.privacy_policy_accepted ? (
                                                        <span className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.15em] bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                            <CheckCircle2 size={16} /> ACCEPTED
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.15em] bg-amber-50 px-3 py-1.5 rounded-lg">
                                                            <AlertTriangle size={16} /> UNSIGNED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">NO CONTRACT FOUND</p>
                                        )}
                                    </div>

                                    <div className="bg-white/50 rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-black text-identity-navy mb-6 uppercase tracking-[0.15em]">Modification Log</h3>
                                        {consentHistory.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <div className="table-responsive-wrapper">
                                                    <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-slate-200">
                                                            <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">TIMESTAMP</th>
                                                            <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">CONTRACT TYPE</th>
                                                            <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">VERDICT</th>
                                                            <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">BUILD</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {consentHistory.map((record: any, index: number) => (
                                                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                                <td className="py-4 px-4 text-identity-navy font-medium text-xs">
                                                                    {new Date(record.timestamp).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-4 px-4 text-identity-navy text-xs uppercase tracking-[0.15em] font-bold">
                                                                    {record.consent_type.replace('_', ' ')}
                                                                </td>
                                                                <td className="py-4 px-4">
                                                                    {record.consent_given ? (
                                                                        <span className="text-emerald-500 font-black text-[9px] uppercase flex items-center gap-1">
                                                                            <CheckCircle2 size={12} /> APPROVED
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-rose-500 font-black text-[9px] uppercase flex items-center gap-1">
                                                                            <XCircle size={12} /> CANCELLED
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-4 px-4 text-slate-400 font-mono text-xs">v{record.consent_version}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        ) : (
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">NO LOGS RECORDED</p>
                                        )}
                                    </div>

                                    <div className="bg-white/50 rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-black text-identity-navy mb-4 uppercase tracking-[0.15em]">Extract Data</h3>
                                        <p className="text-slate-500 mb-6 text-xs">As an Admin, initiate a total system database export if authorized.</p>
                                        <div className="flex flex-wrap gap-4">
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
                                                        a.download = `matrix-export-${user?.userId || user?.id}.json`;
                                                        a.click();
                                                        showToast('Data fully exported.', 'success');
                                                    } catch (error: any) {
                                                        console.error("Export error:", error);
                                                        showToast(`Extraction failed.`, 'error');
                                                    }
                                                }}
                                                className="flex items-center gap-4 px-6 py-4 bg-identity-sky text-white rounded-2xl transition-all shadow-lg shadow-identity-sky/20 hover:scale-105 font-black uppercase tracking-[0.15em] text-[10px]"
                                            >
                                                <Download size={18} /> EXPORT DATA
                                            </button>
                                            <Link href="/privacy-policy" className="flex items-center gap-4 px-6 py-4 bg-white border border-slate-200 text-identity-navy hover:border-identity-sky rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px]">
                                                <FileText size={18} /> READ FRAMEWORK
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'feedback' && (
                                <div className="max-w-2xl mx-auto text-center space-y-10 py-12">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-identity-sky/10 text-identity-sky mb-4 shadow-inner border border-identity-sky/20">
                                            <MessageSquare size={36} />
                                        </div>
                                        <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Submit Field Reports</h2>
                                        <p className="text-slate-500 max-w-lg mx-auto text-sm">
                                            Help calibrate LabFace operations. Report malfunctions or propose parameter upgrades.
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-2xl border border-slate-100 mx-auto transform hover:scale-105 transition-transform duration-500 group">
                                        <img
                                            src="/feedback-qr.png"
                                            alt="Transmission code"
                                            className="w-48 h-48 object-contain rounded-2xl opacity-90 group-hover:opacity-100"
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Scan face or manually verify below</p>
                                        <a
                                            href="https://forms.gle/58sdJkHppikg8iMq7"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-4 px-8 py-4 bg-identity-navy text-white text-[10px] uppercase font-black tracking-[0.15em] rounded-2xl transition-all transform hover:-translate-y-1 shadow-xl shadow-identity-navy/20 active:scale-95"
                                        >
                                            ESTABLISH CONNECTION <ExternalLink size={16} />
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
