"use client";
import { useState, useEffect, useRef } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import { User, Mail, MapPin, Save, Camera, Lock, Shield, Image as ImageIcon, CheckCircle, AlertCircle, X, Eye, EyeOff, ArrowLeft, FileText, AlertTriangle, CheckCircle2, XCircle, Download, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../components/Toast';
import { API_URL, getBackendUrl, createAuthAxios, logout, getToken, getProfilePictureUrl } from '../../../utils/auth';

interface UserData {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    professorId?: string;
    schoolId?: string;
    profilePicture?: string;
    userId?: string;
}

export default function ProfessorProfile() {
    const [user, setUser] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<UserData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'feedback'>('profile');

    // Consent state
    const [consentStatus, setConsentStatus] = useState<any>(null);
    const [consentHistory, setConsentHistory] = useState<any[]>([]);
    const [consentLoading, setConsentLoading] = useState(false);

    // Password State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { showToast } = useToast();

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'success' | 'info';
        onConfirm: () => void;
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                console.log('[ProfessorProfile] No token found in any storage, redirecting to login');
                window.location.href = '/login';
                return;
            }

            try {
                console.log('[ProfessorProfile] Fetching user data...');
                // Use createAuthAxios to ensure Authorization header is present
                const authAxios = createAuthAxios();
                console.log('[ProfessorProfile] Making API call to /api/auth/me');
                const response = await authAxios.get(`${API_URL}/api/auth/me`);
                console.log('[ProfessorProfile] API call successful, user data:', response.data);

                const userData = response.data;

                // Role Guard: Ensure user is a professor in this session
                if (userData.role !== 'professor') {
                    console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting to appropriate workspace.`);
                    if (userData.role === 'student') window.location.href = '/student/dashboard';
                    else if (userData.role === 'admin') window.location.href = '/admin/dashboard';
                    else window.location.href = '/login';
                    return;
                }

                setUser(userData);
                setFormData(userData);
                localStorage.setItem('user', JSON.stringify(userData));

                // Fetch consent data
                if (userData.userId) {
                    fetchConsentData(userData.userId);
                }
            } catch (error: any) {
                console.error('[ProfessorProfile] Failed to fetch user data:', error);
                console.error('[ProfessorProfile] Error status:', error.response?.status);
                console.error('[ProfessorProfile] Error message:', error.message);

                if (error.response?.status === 401 || error.response?.status === 403) {
                    console.log('[ProfessorProfile] Got 401/403, logging out and redirecting to login');
                    logout();
                    return;
                }

                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    console.log('[ProfessorProfile] Using cached user data from localStorage');
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setFormData(parsedUser);
                } else {
                    console.log('[ProfessorProfile] No cached user found, redirecting to login');
                    logout();
                }
            }
        };

        fetchUserData();
    }, []);

    const profileTabs: ('profile' | 'security' | 'privacy' | 'feedback')[] =
        ['profile', 'security', 'privacy', 'feedback'];

    const handleTabChange = (tab: 'profile' | 'security' | 'privacy' | 'feedback') => {
        setActiveTab(tab);
        setIsEditing(false);
    };

    // useSwipe removed - hook deleted in Phase 2 cleanup; tab buttons remain fully functional

    const fetchLatestUserData = async (userId: number) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            console.log(`Fetching profile for user ${userId}...`);
            const res = await axios.get(`${API_URL}/api/users/profile/${userId}`);
            console.log("Fetched user data:", res.data);

            setUser(prev => ({ ...prev, ...res.data }));
            setFormData(prev => ({ ...prev, ...res.data }));

            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                localStorage.setItem('user', JSON.stringify({ ...parsed, ...res.data }));
            }
        } catch (error) {
            console.error("Failed to fetch latest user data", error);
        }
    };

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
                showToast("Profile updated successfully!");
            } catch (error) {
                console.error("Failed to update profile", error);
                showToast("Failed to update profile. Please try again.");
            }
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.currentPassword === passwordData.newPassword) {
            showToast("The new password cannot be identical to the current password. Please select a different password.", 'error');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast("The new password and confirmation password do not match. Please ensure both fields are identical.", 'error');
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(passwordData.newPassword)) {
            showToast("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.", 'error');
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.post(`${API_URL}/api/auth/change-password`, {
                userId: user?.userId,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                targetRole: 'professor' // Explicitly target professor password
            });
            showToast("Your password has been successfully updated.", 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message;
            if (errorMessage === 'Incorrect current password') {
                showToast("The current password you entered is incorrect. Please verify and try again.", 'error');
            } else {
                showToast(errorMessage || "An error occurred while attempting to change your password. Please try again later.", 'error');
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const formData = new FormData();
            formData.append('profilePicture', file);

            try {
                const response = await axios.post(`${getBackendUrl()}/api/users/profile/${user.id}/upload-photo`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                setUser(updatedUser);
                setFormData(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                showToast("Profile picture updated!");
            } catch (error) {
                console.error("Failed to upload photo", error);
                showToast("Failed to upload photo.");
            }
        }
    };



    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (!user || !formData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="flex flex-col items-center gap-10">
                    <div className="w-20 h-20 relative">
                        <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute inset-0 border-4 border-[#5CB4E4]/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-[#041C3C] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-[12px] font-black text-[#5CB4E4] uppercase tracking-[0.5em] animate-pulse italic font-outfit">Accessing your profile...</p>
                </div>
            </div>
        );
    }

    const profileImageSrc = getProfilePictureUrl(user.profilePicture);

    return (
        <div className="max-w-5xl mx-auto px-6 py-16 font-outfit select-none">
            <Navbar />

            <main className="pt-24 pb-20">
                <div className="mb-12 animate-in fade-in slide-in-from-left-10 duration-1000">
                    <Link href="/professor/dashboard" className="group flex items-center gap-4 text-slate-400 hover:text-[#041C3C] transition-all duration-500">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-[#041C3C] group-hover:text-white transition-all">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">Back to Dashboard</span>
                    </Link>
                </div>

                <div className="bg-white/40 backdrop-blur-xl rounded-[3.5rem] border border-slate-100 shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-1000 relative">
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                    
                    <div className="bg-[#041C3C] h-48 relative overflow-hidden">
                        <div className="absolute inset-0 bg-mesh opacity-30" />
                        <div className="absolute -bottom-16 left-12 group">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-white blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="w-40 h-40 bg-white rounded-[2.5rem] p-1.5 shadow-3xl relative z-10 overflow-hidden border border-white/20">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-[2rem]" />
                                    ) : (
                                        <div className="w-full h-full bg-[#5CB4E4]/10 rounded-[2rem] flex items-center justify-center text-[#041C3C] font-black text-5xl italic border border-[#5CB4E4]/20">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-[#041C3C]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <Camera size={32} className="text-white animate-pulse" />
                                    </div>
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
                                    className="absolute -right-4 -bottom-4 w-14 h-14 bg-[#5CB4E4] text-white rounded-2xl flex items-center justify-center shadow-3xl hover:scale-110 active:scale-95 transition-all z-20 border-4 border-white"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-24 px-12 pb-16 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-100 pb-12">
                            <div className="space-y-4">
                                <h1 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic">
                                    {user.firstName.toUpperCase()} {user.lastName.toUpperCase()}
                                </h1>
                                <div className="flex items-center gap-6">
                                    <div className="px-4 py-1.5 bg-[#5CB4E4]/10 text-[#5CB4E4] rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border border-[#5CB4E4]/20 italic">
                                        Faculty ID: {user.professorId || 'Unassigned'}
                                    </div>
                                    <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border border-emerald-500/20 italic">
                                        Status: Active
                                    </div>
                                </div>
                            </div>
                            
                            {activeTab === 'profile' && (
                                <div className="relative group/save">
                                    <div className={`absolute -inset-2 bg-[#5CB4E4]/20 blur-xl opacity-0 group-hover/save:opacity-100 transition-opacity rounded-[2rem]`} />
                                    <button
                                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                        className={`relative flex items-center gap-4 px-10 py-5 font-black uppercase tracking-[0.4em] text-[12px] rounded-[1.8rem] transition-all duration-700 shadow-3xl hover:scale-[1.05] active:scale-95 italic border ${
                                            isEditing ? 'bg-[#041C3C] text-white border-[#5CB4E4]/30' : 'bg-white text-[#041C3C] border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        {isEditing ? <><Save size={20} /> Save Changes</> : 'Edit Profile'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Tabs Navigation - Redesigned */}
                        <div className="flex gap-4 overflow-x-auto mb-16 pb-2 scrollbar-hide">
                            {profileTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] italic transition-all duration-500 whitespace-nowrap shadow-sm border ${
                                        activeTab === tab 
                                            ? 'bg-[#041C3C] text-white border-[#5CB4E4]/30 shadow-2xl scale-105' 
                                            : 'bg-white text-slate-400 border-slate-50 hover:bg-slate-50 hover:text-slate-600'
                                    }`}
                                >
                                    {tab === 'profile' ? 'Personal Details' : tab === 'security' ? 'Security' : tab === 'privacy' ? 'Privacy' : 'Feedback'}
                                </button>
                            ))}
                        </div>

                        <div key={activeTab} className="tab-content-fade">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
                                    <div className="space-y-10">
                                        <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic border-l-4 border-[#5CB4E4] pl-6 py-2">PERSONAL DETAILS</h3>

                                        <div className="space-y-8">
                                            {[
                                                { label: 'FIRST NAME', name: 'firstName', value: formData.firstName, icon: User },
                                                { label: 'LAST NAME', name: 'lastName', value: formData.lastName, icon: User },
                                                { label: 'EMAIL ADDRESS', name: 'email', value: formData.email, icon: Mail }
                                            ].map((field) => (
                                                <div key={field.name} className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">{field.label}</label>
                                                    <div className="relative group/input">
                                                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within/input:text-[#5CB4E4] transition-colors">
                                                            <field.icon size={18} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name={field.name}
                                                            value={field.value || ''}
                                                            onChange={handleChange}
                                                            disabled={!isEditing}
                                                            className="w-full pl-16 pr-8 py-5 bg-white rounded-2xl border border-slate-100 text-[#041C3C] font-black uppercase tracking-[0.2em] italic focus:outline-none focus:ring-2 focus:ring-[#5CB4E4] disabled:bg-slate-50 disabled:text-slate-400 shadow-sm transition-all text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic border-l-4 border-slate-200 pl-6 py-2 opacity-60">Professional Information</h3>

                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">FACULTY IDENTIFICATION</label>
                                                <input
                                                    type="text"
                                                    value={formData.professorId || formData.schoolId || ''}
                                                    disabled
                                                    className="w-full px-8 py-5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-black uppercase tracking-[0.2em] italic cursor-not-allowed shadow-inner text-sm"
                                                />
                                            </div>
                                            <div className="p-8 bg-[#041C3C] rounded-[2.5rem] border border-[#5CB4E4]/20 shadow-2xl relative overflow-hidden group/alert">
                                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                                                <div className="flex items-start gap-6 relative z-10">
                                                    <div className="w-12 h-12 bg-[#5CB4E4]/20 rounded-2xl flex items-center justify-center text-[#5CB4E4] shrink-0 border border-[#5CB4E4]/30">
                                                        <Shield size={24} />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-[#5CB4E4] text-[10px] font-black uppercase tracking-[0.3em] italic">NOTE</p>
                                                        <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.1em] italic leading-relaxed">
                                                            YOUR ID IS MANAGED BY THE SYSTEM ADMINISTRATOR. PLEASE CONTACT THEM FOR ANY CHANGES.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="max-w-xl animate-in fade-in slide-in-from-bottom-10 duration-700">
                                    <div className="mb-12">
                                        <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic flex items-center gap-6">
                                            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-[#5CB4E4] shadow-lg">
                                                <Lock size={20} />
                                            </div>
                                            Change Password
                                        </h3>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-10">
                                        {[
                                            { label: 'CURRENT PASSWORD', name: 'currentPassword', show: true, type: 'password' },
                                            { label: 'NEW PASSWORD', name: 'newPassword', show: showNewPassword, setShow: setShowNewPassword, type: 'password' },
                                            { label: 'CONFIRM NEW PASSWORD', name: 'confirmPassword', show: showConfirmPassword, setShow: setShowConfirmPassword, type: 'password' }
                                        ].map((field) => (
                                            <div key={field.name} className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">{field.label}</label>
                                                <div className="relative group/input">
                                                    <input
                                                        type={field.setShow ? (field.show ? "text" : "password") : "password"}
                                                        name={field.name}
                                                        required
                                                        value={(passwordData as any)[field.name]}
                                                        onChange={handlePasswordChange}
                                                        autoComplete="off"
                                                        className="w-full px-8 py-5 bg-white rounded-2xl border border-slate-100 text-[#041C3C] font-black uppercase tracking-[0.2em] italic focus:outline-none focus:ring-2 focus:ring-[#5CB4E4] shadow-sm transition-all text-sm"
                                                    />
                                                    {field.setShow && (
                                                        <button
                                                            type="button"
                                                            onClick={() => field.setShow!(!field.show)}
                                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5CB4E4] transition-colors"
                                                        >
                                                            {field.show ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    )}
                                                </div>
                                                {field.name === 'newPassword' && passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                                                    <p className="mt-3 text-[10px] text-rose-500 font-black uppercase tracking-[0.1em] italic flex items-start gap-2 bg-rose-50 p-4 rounded-xl border border-rose-100">
                                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                        PASSWORD TOO WEAK: MUST BE AT LEAST 8 CHARACTERS WITH UPPERCASE, LOWERCASE, NUMBERS, AND SYMBOLS.
                                                    </p>
                                                )}
                                                {field.name === 'confirmPassword' && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                    <p className="mt-3 text-[10px] text-rose-500 font-black uppercase tracking-[0.1em] italic flex items-center gap-2 bg-rose-50 p-4 rounded-xl border border-rose-100">
                                                        <AlertCircle size={14} />
                                                        PASSWORDS DO NOT MATCH.
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        
                                        <div className="relative group/btn pt-4">
                                            <div className="absolute -inset-2 bg-[#5CB4E4]/20 blur-xl opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-[2rem]" />
                                            <button
                                                type="submit"
                                                className="relative w-full px-10 py-6 bg-[#041C3C] text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-[12px] italic transition-all duration-700 shadow-3xl hover:scale-[1.02] active:scale-95 border border-[#5CB4E4]/30"
                                            >
                                                UPDATE PASSWORD
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Privacy & Consent Tab */}
                            {activeTab === 'privacy' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
                                    <div className="bg-[#041C3C] p-8 rounded-[2.5rem] border border-[#5CB4E4]/30 shadow-3xl relative overflow-hidden group/notice">
                                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#5CB4E4] to-transparent top-0 animate-scan-x opacity-40" />
                                        <div className="flex items-center gap-8 relative z-10">
                                            <div className="w-16 h-16 bg-[#5CB4E4]/10 rounded-2xl flex items-center justify-center text-[#5CB4E4] shrink-0 border border-[#5CB4E4]/30">
                                                <Shield size={32} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-[0.2em] italic text-sm mb-2">DATA PRIVACY COMPLIANCE</h4>
                                                <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.1em] italic leading-relaxed">
                                                    YOUR DATA IS PROTECTED UNDER THE DATA PRIVACY ACT OF 2012.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl space-y-10">
                                        <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic flex items-center gap-4">
                                            <FileText size={18} className="text-[#5CB4E4]" /> Active Permissions
                                        </h3>
                                        
                                        {consentLoading ? (
                                            <div className="flex items-center gap-4 animate-pulse">
                                                <div className="w-4 h-4 bg-slate-200 rounded-full" />
                                                <div className="h-4 bg-slate-100 rounded-full w-32" />
                                            </div>
                                        ) : consentStatus ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {[
                                                    { label: 'BIOMETRIC RECORDS', status: consentStatus.biometricAccepted },
                                                    { label: 'PRIVACY POLICY', status: consentStatus.privacyPolicyAccepted }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group/item hover:bg-white hover:border-[#5CB4E4]/20 transition-all duration-500">
                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic group-hover/item:text-[#041C3C] transition-colors">{item.label}</span>
                                                        {item.status ? (
                                                            <div className="flex items-center gap-3 text-emerald-500 text-[11px] font-black uppercase tracking-[0.2em] italic">
                                                                <CheckCircle2 size={18} /> Authorized
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3 text-rose-500 text-[11px] font-black uppercase tracking-[0.2em] italic">
                                                                <AlertTriangle size={18} /> Pending
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic">NO CONSENT RECORDS FOUND.</p>
                                        )}
                                    </div>

                                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl space-y-10 overflow-hidden">
                                        <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic flex items-center gap-4">CONSENT HISTORY</h3>
                                        {consentHistory.length > 0 ? (
                                            <div className="overflow-x-auto scrollbar-hide -mx-10 px-10">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-50">
                                                            <th className="py-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">DATE</th>
                                                            <th className="py-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">TYPE</th>
                                                            <th className="py-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">ACTION</th>
                                                            <th className="py-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic text-right">VERSION</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {consentHistory.map((record: any, index: number) => (
                                                            <tr key={index} className="group/row hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-8 px-4 text-[11px] font-black text-[#041C3C]/60 uppercase tracking-[0.1em] italic">
                                                                    {new Date(record.timestamp).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-8 px-4 text-[11px] font-black text-[#041C3C] uppercase tracking-[0.2em] italic">
                                                                    {record.consent_type.toUpperCase()}
                                                                </td>
                                                                <td className="py-8 px-4">
                                                                    {record.consent_given ? (
                                                                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] italic flex items-center gap-2">
                                                                            <CheckCircle size={14} /> AUTHORIZED
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] italic flex items-center gap-2">
                                                                            <XCircle size={14} /> REVOKED
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-8 px-4 text-[10px] font-black text-slate-400 text-right">v{record.consent_version}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic">NO HISTORY AVAILABLE.</p>
                                        )}
                                    </div>
                                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl space-y-10">
                                        <div>
                                            <h3 className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic mb-2">DATA RIGHTS</h3>
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">ACTIONS AVAILABLE UNDER DATA PRIVACY ACT</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                             {[
                                                { label: 'EXPORT PERSONAL DATA', icon: Download, color: 'bg-emerald-500', onClick: async () => {
                                                    try {
                                                        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                        const res = await axios.post(`${API_URL}/api/data-rights/export`, { userId: user?.userId });
                                                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                                                        const url = window.URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `data-export-${user?.userId}.json`;
                                                        a.click();
                                                        showToast('Data export successful.', 'success');
                                                    } catch (error) {
                                                        showToast('Export failed. Please try again.', 'error');
                                                    }
                                                }},
                                                { label: 'READ PRIVACY POLICY', icon: FileText, color: 'bg-[#5CB4E4]', href: '/privacy-policy' },
                                                 { label: 'REQUEST DELETION', icon: Trash2, color: 'bg-rose-500', onClick: () => {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Account Deletion',
                                                        message: 'You are requesting the permanent deletion of your account. This action is irreversible after 30 days. Proceed?',
                                                        type: 'danger',
                                                        confirmText: 'Confirm Deletion',
                                                        onConfirm: async () => {
                                                            try {
                                                                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                                const token = getToken();
                                                                await axios.post(`${API_URL}/api/data-rights/delete`, { userId: user?.userId, reason: 'User requested' }, { headers: { Authorization: `Bearer ${token}` } });
                                                                showToast('Account deletion process initiated.', 'success');
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            } catch (error) {
                                                                showToast('An error occurred during the deletion request.', 'error');
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        }
                                                    });
                                                }}
                                            ].map((btn, i) => (
                                                btn.href ? (
                                                    <Link key={i} href={btn.href} className="flex flex-col items-center justify-center gap-6 p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group/btn">
                                                        <div className={`w-16 h-16 ${btn.color} text-white rounded-2xl flex items-center justify-center shadow-3xl group-hover/btn:scale-110 transition-transform`}>
                                                            <btn.icon size={24} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.3em] text-center italic">{btn.label}</span>
                                                    </Link>
                                                ) : (
                                                    <button key={i} onClick={btn.onClick} className="flex flex-col items-center justify-center gap-6 p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group/btn">
                                                        <div className={`w-16 h-16 ${btn.color} text-white rounded-2xl flex items-center justify-center shadow-3xl group-hover/btn:scale-110 transition-transform`}>
                                                            <btn.icon size={24} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.3em] text-center italic">{btn.label}</span>
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Tab */}
                            {activeTab === 'feedback' && (
                                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 py-12 max-w-2xl mx-auto text-center space-y-12">
                                    <div className="space-y-6">
                                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-[#5CB4E4]/10 text-[#5CB4E4] border border-[#5CB4E4]/20 shadow-3xl animate-bounce-slow">
                                            <MessageSquare size={40} />
                                        </div>
                                        <h2 className="text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic">SEND FEEDBACK</h2>
                                        <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.2em] italic max-w-lg mx-auto leading-relaxed">
                                            HELP US IMPROVE LABFACE. REPORT BUGS OR SUGGEST NEW FEATURES.
                                        </p>
                                    </div>

                                    <div className="bg-white p-12 rounded-[3.5rem] inline-block shadow-3xl border border-slate-100 relative group/qr">
                                        <div className="absolute inset-0 bg-[#5CB4E4]/5 opacity-0 group-hover/qr:opacity-100 transition-opacity rounded-[3.5rem]" />
                                        <img
                                            src="/feedback-qr.png"
                                            alt="Scan to provide feedback"
                                            className="w-56 h-56 object-contain relative z-10 grayscale hover:grayscale-0 transition-all duration-700"
                                        />
                                    </div>

                                    <div className="space-y-8">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] italic opacity-60">SCAN THE QR CODE OR USE THE LINK BELOW</p>
                                        <div className="relative group/btn inline-block">
                                            <div className="absolute -inset-2 bg-emerald-500/20 blur-xl opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-[2rem]" />
                                            <a
                                                href="https://forms.gle/58sdJkHppikg8iMq7"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative inline-flex items-center gap-6 px-12 py-6 bg-white text-[#041C3C] font-black uppercase tracking-[0.4em] text-[12px] rounded-[2rem] transition-all duration-700 shadow-3xl hover:scale-[1.05] active:scale-95 border border-slate-100 italic"
                                            >
                                                OPEN FEEDBACK FORM <ExternalLink size={20} className="text-[#5CB4E4]" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
            />
        </div>
    );
}
