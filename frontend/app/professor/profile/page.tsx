"use client";
import { useState, useEffect, useRef } from 'react';
import Navbar from '../../../components/Navbar';
import { useSwipe } from '../../../hooks/useSwipe';
import Link from 'next/link';
import { User, Mail, MapPin, Save, Camera, Lock, Shield, Image as ImageIcon, CheckCircle, AlertCircle, X, Eye, EyeOff, ArrowLeft, FileText, AlertTriangle, CheckCircle2, XCircle, Download, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import axios from 'axios';
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

    useSwipe(
        () => {
            const currentIndex = profileTabs.indexOf(activeTab);
            const nextIndex = Math.min(currentIndex + 1, profileTabs.length - 1);
            if (nextIndex !== currentIndex) {
                handleTabChange(profileTabs[nextIndex]);
            }
        },
        () => {
            const currentIndex = profileTabs.indexOf(activeTab);
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (prevIndex !== currentIndex) {
                handleTabChange(profileTabs[prevIndex]);
            }
        },
        50
    );

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

    if (!user || !formData) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;

    const profileImageSrc = getProfilePictureUrl(user.profilePicture);

    return (
        <div className="min-h-screen bg-slate-950 font-sans">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
                <div className="mb-6">
                    <Link href="/professor/dashboard" className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors">
                        <ArrowLeft size={20} className="mr-2" />
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>
                </div>
                <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm overflow-hidden">
                    <div className="bg-brand-600 h-32 relative">
                        <div className="absolute -bottom-12 left-8">
                            <div className="relative group">
                                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg overflow-hidden">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-3xl">
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
                                    className="absolute bottom-0 right-0 bg-gray-900 text-white p-2 rounded-full hover:bg-gray-700 transition-colors shadow-md z-10"
                                >
                                    <Camera size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 px-8 pb-8">

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
                                <p className="text-slate-400">{user.professorId || 'Professor ID'}</p>
                            </div>
                            {activeTab === 'profile' && (
                                <button
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${isEditing ? 'bg-brand-500 text-white hover:bg-brand-400' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                                >
                                    {isEditing ? <><Save size={18} /> Save Changes</> : 'Edit Profile'}
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto border-b border-slate-700 mb-8 pb-0 scrollbar-hide">
                            <button
                                onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'profile' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Personal Info
                            </button>

                            <button
                                onClick={() => { setActiveTab('security'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'security' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Security
                            </button>
                            <button
                                onClick={() => { setActiveTab('privacy'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'privacy' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Privacy & Consent
                            </button>
                            <button
                                onClick={() => { setActiveTab('feedback'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'feedback' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Feedback
                            </button>
                        </div>

                        <div key={activeTab} className="tab-content-fade">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Personal Information</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName || ''}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName || ''}
                                                    onChange={handleChange}
                                                    disabled={!isEditing}
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 text-slate-500" size={18} />
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        placeholder="email@example.com"
                                                        className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Academic Details</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Professor ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.professorId || formData.schoolId || ''}
                                                    disabled
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="max-w-md">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Lock size={20} className="text-brand-500" /> Change Password
                                    </h3>
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                autoComplete="off"
                                                className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    name="newPassword"
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                                                >
                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                                                <p className="mt-1 text-xs text-red-400 flex items-start gap-1">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                    Must be at least 8 chars with uppercase, lowercase, number, and special char.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    Passwords do not match
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-brand-500 text-white font-bold py-2 rounded-lg hover:bg-brand-400 transition-colors shadow-md"
                                        >
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Privacy & Consent Tab */}
                            {activeTab === 'privacy' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-center gap-3">
                                        <Shield size={20} />
                                        <div className="text-sm">
                                            <strong>Philippine Data Privacy Act Compliance</strong>
                                            <p className="text-blue-300 mt-1">Your privacy rights are protected under the Data Privacy Act of 2012</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <FileText size={20} className="text-brand-400" />
                                            Consent Status
                                        </h3>
                                        {consentLoading ? (
                                            <p className="text-slate-400">Loading...</p>
                                        ) : consentStatus ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                                    <span className="text-slate-300">Biometric Data</span>
                                                    {consentStatus.consent_status === 'given' ? (
                                                        <span className="flex items-center gap-2 text-green-400">
                                                            <CheckCircle2 size={18} /> Consented
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-yellow-400">
                                                            <AlertTriangle size={18} /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                                    <span className="text-slate-300">Privacy Policy</span>
                                                    {consentStatus.privacy_policy_accepted ? (
                                                        <span className="flex items-center gap-2 text-green-400">
                                                            <CheckCircle2 size={18} /> Accepted
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-yellow-400">
                                                            <AlertTriangle size={18} /> Not Accepted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400">No consent data</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4">Consent History</h3>
                                        {consentHistory.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-700">
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Date</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Type</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Action</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Version</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {consentHistory.map((record: any, index: number) => (
                                                            <tr key={index} className="border-b border-slate-700/50">
                                                                <td className="py-3 px-3 text-slate-300">
                                                                    {new Date(record.timestamp).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-3 px-3 text-slate-300 capitalize">
                                                                    {record.consent_type.replace('_', ' ')}
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    {record.consent_given ? (
                                                                        <span className="text-green-400 flex items-center gap-1">
                                                                            <CheckCircle2 size={14} /> Accepted
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-red-400 flex items-center gap-1">
                                                                            <XCircle size={14} /> Declined
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-3 text-slate-400">v{record.consent_version}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400">No history</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4">Your Data Rights</h3>
                                        <p className="text-slate-400 mb-4 text-sm">Under the Philippine Data Privacy Act:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                        const res = await axios.post(`${API_URL}/api/data-rights/export`, { userId: user?.userId });
                                                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                                                        const url = window.URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `data-export-${user?.userId}.json`;
                                                        a.click();
                                                        showToast('Data exported!', 'success');
                                                    } catch (error) {
                                                        showToast('Export failed', 'error');
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                <Download size={18} />
                                                <span className="font-medium">Export Data</span>
                                            </button>
                                            <Link href="/privacy-policy" className="flex items-center justify-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                                                <FileText size={18} />
                                                <span className="font-medium">Privacy Policy</span>
                                            </Link>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Request data deletion? This cannot be undone.')) {
                                                        try {
                                                            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                            await axios.post(`${API_URL}/api/data-rights/delete`, { userId: user?.userId, reason: 'User requested' });
                                                            showToast('Deletion request submitted (30 days)', 'success');
                                                        } catch (error) {
                                                            showToast('Request failed', 'error');
                                                        }
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                                <span className="font-medium">Request Deletion</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Tab */}
                            {activeTab === 'feedback' && (
                                <div className="animate-fade-in max-w-2xl mx-auto text-center space-y-8 py-8">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 text-brand-500 mb-4">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">We Value Your Feedback</h2>
                                        <p className="text-slate-400 max-w-lg mx-auto">
                                            Help us improve LabFace by sharing your thoughts, suggestions, or reporting any issues you've encountered.
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl inline-block shadow-lg mx-auto">
                                        <img
                                            src="/feedback-qr.png"
                                            alt="Scan to provide feedback"
                                            className="w-48 h-48 object-contain"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500">Scan the QR code or click the button below</p>
                                        <a
                                            href="https://forms.gle/58sdJkHppikg8iMq7"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-md"
                                        >
                                            Open Feedback Form <ExternalLink size={18} />
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
