'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getToken, getUser, API_URL, getBackendUrl, logout, getProfilePictureUrl } from '@/utils/auth';
import ConfirmModal from '@/components/ConfirmModal';
import { User, Shield, Users, Clock, CheckCircle, XCircle, AlertCircle, LogOut, UserCheck, Search, Filter, Camera, History, AlertTriangle, ExternalLink, Briefcase, RefreshCw, Activity, GraduationCap, LayoutDashboard, Eye, Home, Monitor, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SessionTimeout from '@/components/SessionTimeout';
import BulkActions from '@/components/BulkActions';
import SmartSearch from '@/components/SmartSearch';
import VideoFeed from '@/components/VideoFeed';
import AcademicSettingsTab from '@/components/AcademicSettingsTab';
import DeletionRequestsTab from '@/components/DeletionRequestsTab';
import DashboardTabs from '@/components/ui/DashboardTabs';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import InputField from '@/components/ui/InputField';

import IdentityBackground from '@/components/IdentityBackground';


interface PendingProfessor {
    id: number;
    user_id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    id_photo: string;
    created_at: string;
}

interface RecentAction {
    id: number;
    action_type: string;
    details: string;
    created_at: string;
    first_name: string;
    last_name: string;
}

interface IdentityTheftReport {
    id: number;
    reported_user_id: string;
    reporter_email: string;
    reporter_name: string;
    description: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    created_at: string;
    updated_at: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    certificate_of_registration?: string;
    id_photo?: string;
    user_primary_id?: number;
}

interface SystemUser {
    id: number;
    user_id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    role: string;
    approval_status: string;
    created_at: string;
}

interface ActiveSession {
    id: number;
    class_id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    professor_name: string;
    session_type: string;
    session_name: string | null;
    start_time: string;
    student_count: number;
}

interface Stats {
    pendingProfessors: number;
    userStats: Array<{
        role: string;
        approval_status: string;
        count: number;
    }>;
    recentActions: RecentAction[];
    activeSessions: number;
}

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [pendingProfessors, setPendingProfessors] = useState<PendingProfessor[]>([]);
    const [filteredProfessors, setFilteredProfessors] = useState<PendingProfessor[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProfessor, setSelectedProfessor] = useState<PendingProfessor | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Confirmation State
    const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'users' | 'academic' | 'sessions' | 'privacy'>('dashboard');
    const [reports, setReports] = useState<IdentityTheftReport[]>([]);
    const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
    const [selectedReport, setSelectedReport] = useState<IdentityTheftReport | null>(null);
    const [loadingReports, setLoadingReports] = useState(false);


    // Users Tab State
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userStatusFilter, setUserStatusFilter] = useState('all');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // FIX: isPDF should be a plain function, not a useState
    const isPDF = (url: string | undefined | null): boolean => {
        if (!url) return false;
        return url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf');
    };

    // Sessions Tab State
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: 'resolved' | 'dismissed' | null; reportId: number | null }>({ isOpen: false, type: null, reportId: null });
    const [actionNote, setActionNote] = useState('');
    const [deleteUser, setDeleteUser] = useState(false);
    const [resolutionOutcome, setResolutionOutcome] = useState<string>('reported_is_impostor');

    const router = useRouter();

    useEffect(() => {
        const savedTheme = localStorage.getItem('adminTheme');
        if (savedTheme === 'dark') {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        fetchData();
        const currentUser = getUser();
        if (currentUser) {
            setUser(currentUser);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchReports();
        }
    }, [activeTab, reportStatusFilter]);

    useEffect(() => {
        let filtered = pendingProfessors;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(prof =>
                prof.first_name.toLowerCase().includes(query) ||
                prof.last_name.toLowerCase().includes(query) ||
                prof.email.toLowerCase().includes(query) ||
                prof.user_id.toLowerCase().includes(query)
            );
        }

        if (dateFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(prof => {
                const createdDate = new Date(prof.created_at);
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (dateFilter === 'today') return diffDays <= 1;
                if (dateFilter === 'week') return diffDays <= 7;
                if (dateFilter === 'month') return diffDays <= 30;
                return true;
            });
        }

        setFilteredProfessors(filtered);
    }, [searchQuery, dateFilter, pendingProfessors]);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        if (!darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('adminTheme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('adminTheme', 'light');
        }
    };

    const fetchData = async () => {
        try {
            const token = getToken();
            if (!token) {
                router.push('/admin/login');
                return;
            }

            const axios = (await import('axios')).default;

            const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const userData = userResponse.data;

            // Role Guard
            if (userData.role !== 'admin') {
                console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting.`);
                if (userData.role === 'student') window.location.href = '/student/dashboard';
                else if (userData.role === 'professor') window.location.href = '/professor/dashboard';
                else window.location.href = '/login';
                return;
            }

            setUser(userData);

            const [professorsRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/pending-professors`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setPendingProfessors(professorsRes.data);
            setFilteredProfessors(professorsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const token = getToken();
            if (!token) return;

            const axios = (await import('axios')).default;

            const url = reportStatusFilter === 'all'
                ? `${API_URL}/api/admin/identity-theft-reports`
                : `${API_URL}/api/admin/identity-theft-reports?status=${reportStatusFilter}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReports(response.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoadingReports(false);
        }
    };

    const fetchUsers = async (role = userRoleFilter, search = userSearch) => {
        setLoadingUsers(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            let url = `${API_URL}/api/admin/users?`;
            if (role !== 'all') url += `role=${role}&`;
            if (userStatusFilter !== 'all') url += `status=${userStatusFilter}&`;
            if (search) url += `search=${search}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSystemUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Failed to fetch users', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchSessions = async () => {
        setLoadingSessions(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            const response = await axios.get(`${API_URL}/api/admin/active-sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setActiveSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            showToast('Failed to fetch active sessions', 'error');
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'sessions') {
            fetchSessions();
        }
    }, [activeTab, userRoleFilter, userStatusFilter]);

    const submitReportStatusUpdate = async (reportId: number, newStatus: string, note?: string, shouldDeleteUser?: boolean, outcome?: string) => {
        try {
            const token = localStorage.getItem('token');
            const axios = (await import('axios')).default;

            await axios.patch(
                `${API_URL}/api/admin/identity-theft-reports/${reportId}`,
                {
                    status: newStatus,
                    notes: note,
                    deleteUser: shouldDeleteUser,
                    outcome: outcome
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus as any } : r));
            setSelectedReport(null);
            closeActionModal();
            showToast(`Report marked as ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating report status:', error);
            showToast('Failed to update report status', 'error');
        }
    };

    const handleInitiateStatusUpdate = (reportId: number, status: 'investigating' | 'resolved' | 'dismissed') => {
        if (status === 'investigating') {
            submitReportStatusUpdate(reportId, status);
        } else {
            setActionModal({ isOpen: true, type: status, reportId });
            setActionNote('');
            setDeleteUser(false);
            setResolutionOutcome('reported_is_impostor');
        }
    };

    const closeActionModal = () => {
        setActionModal({ isOpen: false, type: null, reportId: null });
        setActionNote('');
        setDeleteUser(false);
        setResolutionOutcome('reported_is_impostor');
    };

    const confirmAction = () => {
        if (actionModal.reportId && actionModal.type) {
            const outcome = actionModal.type === 'resolved' ? resolutionOutcome : undefined;
            submitReportStatusUpdate(actionModal.reportId, actionModal.type, actionNote, deleteUser, outcome);
        }
    };

    const handleApprove = async (professor: PendingProfessor) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const axios = (await import('axios')).default;

            await axios.post(
                `${API_URL}/api/admin/approve-professor/${professor.id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast('Professor approved successfully!', 'success');
            setSelectedProfessor(null);
            fetchData();
        } catch (error: any) {
            console.error('Error approving professor:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to approve professor';
            showToast(msg, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectClick = () => {
        if (!rejectReason.trim()) {
            showToast('Please provide a reason for rejection', 'error');
            return;
        }
        setRejectConfirmOpen(true);
    };

    const confirmReject = async () => {
        if (!selectedProfessor) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const axios = (await import('axios')).default;

            const response = await axios.post(
                `${API_URL}/api/admin/reject-professor/${selectedProfessor.id}`,
                { reason: rejectReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.emailSent === false) {
                showToast('Professor rejected, but email failed to send (check logs).', 'info');
            } else {
                showToast('Professor rejected and removed successfully!', 'success');
            }
            setSelectedProfessor(null);
            setRejectReason('');
            fetchData();
        } catch (error: any) {
            console.error('Error rejecting professor:', error);
            showToast(error.response?.data?.message || 'Failed to reject professor', 'error');
        } finally {
            setActionLoading(false);
            setRejectConfirmOpen(false);
        }
    };

    // Swipe Navigation Logic
    const tabOrder: Array<'dashboard' | 'reports' | 'users' | 'academic' | 'sessions' | 'privacy'> =
        ['dashboard', 'users', 'academic', 'sessions', 'reports', 'privacy'];

    const handleSwipeLeft = () => {
        const currentIndex = tabOrder.indexOf(activeTab);
        if (currentIndex < tabOrder.length - 1) {
            const nextTab = tabOrder[currentIndex + 1];
            setActiveTab(nextTab);
            if (nextTab === 'users') fetchUsers();
            else if (nextTab === 'sessions') fetchSessions();
            else if (nextTab === 'reports') fetchReports();
        }
    };

    const handleSwipeRight = () => {
        const currentIndex = tabOrder.indexOf(activeTab);
        if (currentIndex > 0) {
            const prevTab = tabOrder[currentIndex - 1];
            setActiveTab(prevTab);
            if (prevTab === 'users') fetchUsers();
            else if (prevTab === 'sessions') fetchSessions();
            else if (prevTab === 'reports') fetchReports();
        }
    };

    const handleLogout = () => {
        logout('/admin/login');
    };

    const handleExtendSession = async () => {
        const token = localStorage.getItem('token');
        console.log('Extending session...');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-identity-sky/10"></div>
                    <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    const totalStudents = stats?.userStats
        ?.filter(s => s.role.includes('student'))
        .reduce((sum, s) => sum + s.count, 0) || 0;

    const totalProfessors = stats?.userStats
        ?.filter(s => s.role.includes('professor'))
        .reduce((sum, s) => sum + s.count, 0) || 0;

    const totalAdmins = stats?.userStats
        ?.filter(s => s.role.includes('admin'))
        .reduce((sum, s) => sum + s.count, 0) || 0;

    const activeSessionsCount = stats?.activeSessions || 0;

    const tabs = [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'academic', label: 'Academic', icon: GraduationCap },
        { id: 'sessions', label: 'Monitor', icon: Monitor },
        { id: 'reports', label: 'Reports', icon: AlertTriangle },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId as any);
        if (tabId === 'users') fetchUsers();
        else if (tabId === 'sessions') fetchSessions();
        else if (tabId === 'reports') fetchReports();
    };

    return (
        <div className="min-h-screen bg-white font-outfit text-slate-900 relative selection:bg-identity-sky/20 selection:text-identity-navy page-transition overflow-x-hidden">
            <IdentityBackground />
            
            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 relative z-10">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="flex items-center gap-6 group">
                        <div className="p-4 identity-glass text-identity-navy rounded-xl border-2 border-white/40 shadow-sm relative overflow-hidden bg-white/20">
                            <LayoutDashboard size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-500 text-identity-sky" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.3em] mb-1 italic opacity-60">System Controller</p>
                            <h1 className="text-3xl font-black text-identity-navy tracking-tighter uppercase italic leading-none">ADMIN DASHBOARD</h1>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-12">
                    <DashboardTabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                </div>

                <div key={activeTab} className="tab-content-fade">
                    {activeTab === 'dashboard' ? (
                        <div className="space-y-12 animate-in fade-in duration-700">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                                {[
                                    { label: "Pending Approvals", value: stats?.pendingProfessors || 0, icon: Clock, color: "identity-sky", onClick: () => { setActiveTab('users'); setUserRoleFilter('professor'); setUserStatusFilter('pending'); } },
                                    { label: "Administrators", value: totalAdmins, icon: Shield, color: "rose-500", onClick: () => { setActiveTab('users'); setUserRoleFilter('admin'); setUserStatusFilter('all'); } },
                                    { label: "Students", value: totalStudents, icon: Users, color: "emerald-500", onClick: () => { setActiveTab('users'); setUserRoleFilter('student'); setUserStatusFilter('all'); } },
                                    { label: "Professors", value: totalProfessors, icon: Briefcase, color: "identity-navy", onClick: () => { setActiveTab('users'); setUserRoleFilter('professor'); setUserStatusFilter('all'); } },
                                    { label: "Live Sessions", value: activeSessionsCount, icon: Activity, color: "purple-500", onClick: () => { setActiveTab('sessions'); fetchSessions(); } },
                                ].map((stat, idx) => (
                                    <div
                                        key={idx}
                                        onClick={stat.onClick}
                                        className="identity-glass p-8 rounded-[2rem] border border-white/40 relative overflow-hidden group hover:scale-[1.03] active:scale-95 transition-all cursor-pointer shadow-xl bg-white/30"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                                            <stat.icon size={80} />
                                        </div>
                                        <div className="flex flex-col items-center text-center gap-4 relative z-10">
                                            <div className="bg-identity-sky/10 p-3 rounded-xl border border-identity-sky/20 group-hover:scale-110 transition-transform duration-700">
                                                <stat.icon size={24} className="text-identity-navy" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1 italic">{stat.label}</p>
                                                <p className="text-4xl font-black text-identity-navy tracking-tighter italic leading-none">{stat.value}</p>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-identity-sky/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                                    </div>
                                ))}
                            </div>

                            {/* Pending Approvals */}
                            <div className="identity-glass p-10 rounded-[3rem] border-2 border-white/40 shadow-2xl relative overflow-hidden group">
                                <div className="corner-bracket-tl opacity-40" />
                                <div className="corner-bracket-br opacity-40" />
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/20 shadow-inner">
                                            <Clock className="w-6 h-6 text-identity-sky" />
                                        </div>
                                        <h2 className="text-2xl font-black text-identity-navy uppercase tracking-tighter italic">PENDING USER VERIFICATIONS</h2>
                                    </div>
                                    {filteredProfessors.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-identity-sky animate-ping" />
                                            <span className="identity-glass border border-identity-sky/20 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-identity-sky shadow-inner">
                                                {filteredProfessors.length} PENDING REVIEW
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10">
                                    {filteredProfessors.length === 0 ? (
                                        <div className="text-center py-24 rounded-[2rem] border-2 border-dashed border-slate-100 bg-white/30 backdrop-blur-sm">
                                            <div className="bg-slate-100/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-white">
                                                <UserCheck className="w-12 h-12 text-slate-300" />
                                            </div>
                                            <p className="text-identity-navy text-xl font-black uppercase tracking-tight italic">VERIFICATION COMPLETE</p>
                                            <p className="text-slate-400 text-[10px] mt-4 uppercase tracking-[0.2em] font-black">All user accounts have been verified.</p>
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-bottom-5 duration-700">
                                            <BulkActions
                                                users={filteredProfessors.map(prof => ({
                                                    id: prof.user_id,
                                                    professor_id: prof.user_id,
                                                    name: `${prof.first_name} ${prof.middle_name} ${prof.last_name}`,
                                                    email: prof.email,
                                                    role: 'professor',
                                                    approval_status: 'pending'
                                                }))}
                                                onRefresh={fetchData}
                                                onView={(userId) => {
                                                    const prof = pendingProfessors.find(p => p.user_id === userId);
                                                    if (prof) setSelectedProfessor(prof);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Telemetry Diagnostics Section */}
                            <div className="space-y-10 pt-10 border-t border-slate-100">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4 group">
                                        <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 shadow-sm group-hover:scale-105 transition-transform duration-700">
                                            <Camera className="w-6 h-6 text-rose-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic group-hover:text-rose-600 transition-colors leading-none">MONITORING FEEDS</h2>
                                            <p className="text-[8px] text-rose-500/60 font-black uppercase tracking-[0.2em] mt-2 italic">LIVE STREAMS ACTIVE</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/admin/camera-test"
                                        className="identity-glass border border-identity-navy/10 text-identity-navy px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 transition-all hover:bg-identity-navy hover:text-white hover:scale-[1.02] active:scale-95 shadow-lg group italic"
                                    >
                                        <Monitor className="w-5 h-5 text-identity-sky animate-pulse group-hover:animate-none" />
                                        DIAGNOSTICS
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {[
                                        { id: "01", unit: "ENTRANCE", ip: "192.168.1.220", feed: "/api/ai/video_feed/1" },
                                        { id: "02", unit: "EXIT", ip: "192.168.1.221", feed: "/api/ai/video_feed/2" }
                                    ].map((cam, idx) => (
                                        <div key={idx} className="identity-glass rounded-[2rem] border border-white/40 p-6 shadow-xl group hover:shadow-identity-sky/5 transition-all duration-1000 relative overflow-hidden bg-white/20">
                                            <div className="flex justify-between items-center mb-6 px-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,1)]" />
                                                    <h3 className="text-[10px] font-black text-identity-navy uppercase tracking-[0.1em] italic">
                                                        CAM {cam.id}: <span className="text-identity-sky">{cam.unit}</span>
                                                    </h3>
                                                </div>
                                                <div className="text-[8px] font-black text-slate-300 tracking-[0.2em] font-mono">
                                                    {cam.ip}
                                                </div>
                                            </div>
                                            <div className="aspect-video w-full relative group-hover:scale-[1.01] transition-transform duration-1000 bg-identity-navy rounded-2xl overflow-hidden border border-white/40 shadow-inner">
                                                <VideoFeed
                                                    src={cam.feed}
                                                    alt={`Camera ${cam.id}`}
                                                    label={cam.unit.split('_')[0]}
                                                    className="w-full h-full grayscale brightness-110 group-hover:grayscale-0 transition-all duration-1000 object-cover opacity-80"
                                                />
                                                <div className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/10 text-[8px] font-black text-white/90 uppercase tracking-[0.2em] italic animate-pulse rounded-lg">
                                                    LIVE
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Archived Actions Log */}
                            <div className="pt-16 border-t border-slate-100">
                                <div className="flex items-center gap-4 mb-10 group">
                                    <div className="bg-identity-navy/5 p-4 rounded-xl border border-identity-navy/10 shadow-sm group-hover:scale-105 transition-transform duration-700">
                                        <History className="w-6 h-6 text-identity-navy" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">SYSTEM AUDIT</h2>
                                        <p className="text-[8px] text-identity-sky font-black uppercase tracking-[0.2em] mt-2 italic opacity-60">ADMINISTRATIVE ACTION HISTORY</p>
                                    </div>
                                </div>
                                <div className="identity-glass border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl relative group bg-white/40">
                                    {stats?.recentActions && stats.recentActions.length > 0 ? (
                                        <div className="divide-y divide-slate-50 relative z-10">
                                            {stats.recentActions.slice(0, 8).map((action) => (
                                                <div key={action.id} className="p-8 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 transition-all group/item gap-8 text-center md:text-left relative">
                                                    <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
                                                        <div className="w-16 h-16 rounded-xl bg-identity-navy text-identity-sky flex items-center justify-center shadow-lg group-hover/item:scale-105 transition-all duration-700 font-black uppercase text-xl relative overflow-hidden border border-white/20">
                                                            <span className="relative z-10 italic">{action.action_type[0]}</span>
                                                        </div>
                                                        <div className="space-y-2 flex-1">
                                                            <p className="text-identity-navy font-black text-lg uppercase tracking-tight group-hover/item:text-identity-sky transition-colors italic leading-none">
                                                                {action.action_type.replace(/_/g, ' ')}
                                                            </p>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] italic opacity-80">
                                                                ADMIN: <span className="text-identity-navy">{action.first_name} {action.last_name}</span>
                                                            </p>
                                                            {action.details && (
                                                                <p className="text-[9px] font-black text-slate-400 max-w-xl uppercase tracking-tight italic leading-relaxed border-l-2 border-identity-sky/20 pl-4 mt-2">
                                                                    — {action.details}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center md:items-end gap-3 min-w-[180px]">
                                                        <p className="text-[9px] font-black text-identity-navy uppercase tracking-widest font-mono italic">
                                                            {new Date(action.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' }).toUpperCase()}
                                                        </p>
                                                        <span className="text-[7px] text-identity-sky/40 font-black uppercase tracking-[0.2em] italic">ID: {action.id.toString().padStart(4, '0')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-24 text-center relative z-10 flex flex-col items-center gap-8">
                                            <History className="w-12 h-12 text-slate-200" />
                                            <div>
                                                <p className="text-identity-navy text-xl font-black uppercase tracking-tight italic">NO LOGS FOUND</p>
                                                <p className="text-slate-400 text-[8px] mt-2 uppercase tracking-[0.2em] font-black italic opacity-60">MONITORING IDLE</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'privacy' ? (
                        <DeletionRequestsTab />
                    ) : activeTab === 'users' ? (
                        <div className="space-y-12 animate-in fade-in duration-700">
                            {/* Population Registry Header & Filters */}                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4 group">
                                    <div className="bg-identity-sky/5 p-3 rounded-xl border border-identity-sky/10 shadow-sm group-hover:scale-105 transition-transform">
                                        <Users className="w-5 h-5 text-identity-sky" />
                                    </div>
                                    <h2 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic">USER DIRECTORY</h2>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative group min-w-[280px]">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-identity-sky transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH USERS..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(userRoleFilter, userSearch); }}
                                            className="identity-glass border border-slate-100 text-identity-navy pl-12 pr-10 py-3.5 rounded-xl focus:outline-none focus:border-identity-sky w-full placeholder:text-slate-300 font-black uppercase text-[9px] tracking-[0.1em] transition-all shadow-sm"
                                        />
                                    </div>
                                    
                                    <select
                                        value={userRoleFilter}
                                        onChange={(e) => setUserRoleFilter(e.target.value)}
                                        className="identity-glass border border-slate-100 text-identity-navy px-6 py-3.5 rounded-xl focus:outline-none focus:border-identity-sky font-black uppercase text-[9px] tracking-[0.1em] transition-all appearance-none cursor-pointer hover:bg-white shadow-sm min-w-[140px] italic"
                                    >
                                        <option value="all">ALL STATUS</option>
                                        <option value="approved">ACTIVE</option>
                                        <option value="pending">PENDING</option>
                                        <option value="rejected">INACTIVE</option>
                                    </select>
                                    
                                    <button
                                        onClick={() => fetchUsers()}
                                        className="identity-glass border border-slate-100 text-identity-navy p-3.5 rounded-xl transition-all hover:bg-slate-50 active:scale-90 shadow-sm group"
                                    >
                                        <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 ${loadingUsers ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>


                            {/* Registry Table */}
                            <div className="identity-glass border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl relative group bg-white/40">
                                {loadingUsers ? (
                                    <div className="p-12 space-y-6">
                                        {[...Array(5)].map((_, idx) => (
                                            <div key={idx} className="flex gap-8 items-center">
                                                <Skeleton className="h-12 w-12 rounded-xl" />
                                                <Skeleton className="h-10 flex-1 rounded-xl" />
                                                <Skeleton className="h-10 w-32 rounded-xl" />
                                            </div>
                                        ))}
                                    </div>
                                ) : systemUsers.length === 0 ? (
                                    <div className="p-24 text-center relative z-10 flex flex-col items-center gap-6">
                                        <Users className="w-12 h-12 text-slate-200" />
                                        <div>
                                            <p className="text-identity-navy text-xl font-black uppercase tracking-tight italic">NO RECORDS</p>
                                            <p className="text-slate-400 text-[9px] mt-2 uppercase tracking-[0.2em] font-black italic opacity-60">NO USERS MATCH YOUR CRITERIA</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto relative z-10">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic">USER NAME</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-center">ID</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-center">ROLE</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-center">STATUS</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-right">REGISTERED</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {systemUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-all group/row">
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-12 h-12 rounded-xl bg-identity-navy text-identity-sky border border-white/20 flex items-center justify-center font-black group-hover/row:scale-105 transition-all shadow-lg uppercase text-sm italic relative overflow-hidden">
                                                                    <span className="relative z-10">{u.first_name?.[0] || 'U'}{u.last_name?.[0] || 'N'}</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-identity-navy font-black text-sm uppercase tracking-tight group-hover/row:text-identity-sky transition-colors italic leading-none">{u.first_name} {u.last_name}</p>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mt-2 group-hover/row:text-slate-500 italic lowercase opacity-80">{u.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <code className="text-[10px] text-slate-400 font-mono font-black italic">
                                                                #{u.user_id}
                                                            </code>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <div className="inline-flex items-center gap-3 bg-white/40 px-4 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-rose-500' : u.role === 'professor' ? 'bg-identity-sky' : 'bg-emerald-500'}`} />
                                                                <span className={`text-[9px] font-black uppercase tracking-[0.1em] italic ${u.role === 'admin' ? 'text-rose-500' : u.role === 'professor' ? 'text-identity-sky' : 'text-emerald-500'}`}>
                                                                    {u.role === 'professor' ? 'PROF' : u.role === 'admin' ? 'ADMIN' : 'STUDENT'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] italic transition-all ${u.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : u.approval_status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                                {u.approval_status === 'approved' ? 'ACTIVE' : u.approval_status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-6 text-right">
                                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em] italic">
                                                                {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="px-12 py-8 bg-identity-navy text-white border-t-2 border-white/10 flex justify-between items-center relative z-10 overflow-hidden">
                                    <div className="absolute inset-0 bg-identity-sky/5 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] font-mono italic relative z-20 opacity-60">SECURE USER MANAGEMENT SYSTEM</p>
                                    <div className="flex items-center gap-6 relative z-20">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_12px_rgba(92,180,228,1)]" />
                                            TOTAL USERS: <span className="text-identity-sky">{systemUsers.length}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'academic' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                            <AcademicSettingsTab />
                        </div>
                    ) : activeTab === 'sessions' ? (
                        <div className="space-y-12 animate-in fade-in duration-700">
                            {/* Operational Sessions Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4 group">
                                    <div className="bg-identity-sky/5 p-3 rounded-xl border border-identity-sky/10 shadow-sm group-hover:scale-105 transition-transform">
                                        <Activity className="w-5 h-5 text-identity-sky" />
                                    </div>
                                    <h2 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic">ACTIVE SESSIONS</h2>
                                </div>
                                <button
                                    onClick={() => fetchSessions()}
                                    className="identity-glass border border-slate-100 text-identity-navy p-3.5 rounded-xl transition-all hover:bg-slate-50 active:scale-95 shadow-sm group flex items-center gap-3"
                                >
                                    <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 ${loadingSessions ? 'animate-spin' : ''}`} />
                                    <span className="text-[9px] font-black uppercase tracking-wider hidden md:block">REFRESH</span>
                                </button>
                            </div>

                            {/* Sessions Registry */}
                            <div className="identity-glass border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl relative group bg-white/40">
                                {loadingSessions ? (
                                    <div className="p-12 space-y-6">
                                        <Skeleton className="h-20 w-full rounded-2xl" />
                                        <Skeleton className="h-20 w-full rounded-2xl" />
                                    </div>
                                ) : activeSessions.length === 0 ? (
                                    <div className="p-24 text-center relative z-10 flex flex-col items-center gap-8">
                                        <Activity className="w-12 h-12 text-slate-200" />
                                        <div>
                                            <p className="text-identity-navy text-xl font-black uppercase tracking-tight italic">SYSTEM IDLE</p>
                                            <p className="text-slate-400 text-[9px] mt-2 uppercase tracking-[0.2em] font-black italic opacity-60">NO ACTIVE CLASS SESSIONS</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto relative z-10">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic">SUBJECT</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic">PROFESSOR</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-center">TYPE</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-center">START</th>
                                                    <th className="px-10 py-6 text-identity-navy font-black uppercase tracking-[0.2em] text-[9px] italic text-right">PRESENT</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {activeSessions.map((session) => (
                                                    <tr key={session.id} className="hover:bg-slate-50/50 transition-all group/row">
                                                        <td className="px-10 py-6">
                                                            <div className="space-y-1.5">
                                                                <p className="text-identity-navy font-black text-sm uppercase tracking-tight italic leading-none">{session.subject_code}</p>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] italic opacity-60">
                                                                    {session.section}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-lg bg-identity-navy text-identity-sky flex items-center justify-center font-black text-[9px] italic border border-white/20 shadow-md">
                                                                    {session.professor_name?.split(' ').map(n => n[0]).join('')}
                                                                </div>
                                                                <p className="text-identity-navy text-[11px] font-black uppercase tracking-tight italic">{session.professor_name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] italic transition-all ${session.session_type === 'regular' ? 'bg-identity-sky/5 text-identity-sky border border-identity-sky/10' : 'bg-amber-500/5 text-amber-600 border border-amber-500/10'}`}>
                                                                {session.session_name ? session.session_name.toUpperCase() : session.session_type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <div className="text-[10px] font-black text-slate-400 font-mono italic">
                                                                {new Date(session.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <p className="text-identity-navy font-black text-[11px] uppercase tracking-tight italic leading-none">{session.student_count} STUDENTS</p>
                                                                <p className="text-[7px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1.5 italic animate-pulse">ACTIVE</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="px-12 py-8 bg-identity-navy text-white border-t-2 border-white/10 flex justify-between items-center relative z-10 overflow-hidden">
                                    <div className="absolute inset-0 bg-identity-sky/5 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] font-mono italic relative z-20 opacity-60">SYSTEM SESSION MONITOR</p>
                                    <div className="flex items-center gap-6 relative z-20">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-identity-sky animate-bounce shadow-[0_0_12px_rgba(92,180,228,1)]" />
                                            ACTIVE SESSIONS: <span className="text-identity-sky">{activeSessions.length}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Security Telemetry tab (Reports)
                        <div className="space-y-10 animate-in fade-in duration-700 relative z-10">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-4 group">
                                    <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 shadow-sm group-hover:scale-105 transition-transform duration-700">
                                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">SECURITY LOGS</h2>
                                        <p className="text-[8px] text-rose-500 font-black uppercase tracking-[0.2em] mt-2 italic opacity-60">INCIDENT MONITORING</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="identity-glass border border-slate-100 p-1.5 rounded-xl shadow-sm flex gap-1.5 bg-white/40">
                                        {['all', 'pending', 'resolved'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => { setReportStatusFilter(status); setTimeout(() => fetchReports(), 100); }}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all italic ${reportStatusFilter === status ? 'bg-identity-navy text-white shadow-lg' : 'text-slate-400 hover:text-identity-navy'}`}
                                            >
                                                {status.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => fetchReports()}
                                        className="identity-glass border border-slate-100 text-identity-navy p-3.5 rounded-xl transition-all hover:bg-slate-50 active:scale-95 shadow-sm group"
                                    >
                                        <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 ${loadingReports ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="identity-glass border border-slate-100 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden group/container min-h-[400px] bg-white/40">
                                {reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 relative z-10 gap-8">
                                        <Shield className="w-12 h-12 text-emerald-400" />
                                        <div className="text-center">
                                            <p className="text-identity-navy text-xl font-black uppercase tracking-tight italic">NO SECURITY ISSUES</p>
                                            <p className="text-slate-400 text-[9px] mt-3 uppercase tracking-[0.2em] font-black italic opacity-60">SYSTEM STATUS: CLEAR</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-8 relative z-10">
                                        {reports.map((report) => (
                                            <div key={report.id} className="identity-glass border border-slate-100 rounded-3xl p-8 hover:border-identity-sky/30 transition-all group/item shadow-lg relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 bg-white/60">
                                                <div className="flex-1 w-full space-y-6">
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="bg-rose-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] shadow-sm italic">
                                                            LOG: #{report.id}
                                                        </div>
                                                        <span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] italic backdrop-blur-md transition-all ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-identity-sky/10 text-identity-sky border border-identity-sky/20'}`}>
                                                            {report.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <div className="space-y-2">
                                                            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] italic opacity-60">SUBJECT ID</p>
                                                            <p className="font-mono text-identity-navy text-[10px] font-black italic">#{report.reported_user_id}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] italic opacity-60">REPORTER</p>
                                                            <p className="text-identity-navy font-black text-sm uppercase tracking-tight italic">{report.reporter_name}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] italic opacity-60">TIMESTAMP</p>
                                                            <p className="text-slate-500 font-mono text-[9px] font-black italic">
                                                                {new Date(report.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' }).toUpperCase()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => setSelectedReport(report)}
                                                    className="w-full lg:w-auto bg-identity-navy text-white px-10 py-4 rounded-xl transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 hover:bg-identity-sky active:scale-95 shadow-lg italic"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                    DETAILS
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Detail Modal */}
                {selectedReport && (
                    <div className="fixed inset-0 bg-identity-navy/95 backdrop-blur-3xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-500 overflow-y-auto">
                        <div className="identity-glass border-2 border-white/20 rounded-[4rem] p-16 max-w-6xl w-full shadow-[0_64px_128px_rgba(0,0,0,0.5)] relative overflow-hidden my-auto pointer-events-auto">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.05] via-transparent to-identity-sky/[0.05] pointer-events-none" />
                            
                            <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10 relative z-10 border-b-2 border-white/10 pb-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-8">
                                        <div className="bg-rose-500 p-5 rounded-[2.5rem] shadow-[0_0_40px_rgba(244,63,94,0.3)]">
                                            <Shield className="w-12 h-12 text-white animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.5em] mb-2 italic">Security Intelligence Division</p>
                                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">SECURITY INCIDENT DETAILS</h3>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-2xl border border-white/20 text-white/60 font-mono text-xs tracking-widest italic">
                                        REFERENCE ID: <span className="text-identity-sky">0x{selectedReport.id.toString(16).padStart(8, '0')}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="identity-glass border-2 border-white/20 text-white/50 hover:text-white hover:border-white transition-all p-4 rounded-full group">
                                    <XCircle className="w-10 h-10 group-hover:rotate-90 transition-transform duration-700" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16 relative z-10">
                                {/* Technical Metadata */}
                                <div className="space-y-10">
                                    <div className="identity-glass border-2 border-white/10 rounded-[3rem] p-10 shadow-inner relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                                        <h4 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mb-10 flex items-center gap-5 italic text-shadow-blue">
                                            <div className="w-3 h-3 bg-identity-sky rounded-full animate-pulse shadow-glow-blue" />
                                            INCIDENT METADATA
                                        </h4>
                                        <div className="grid grid-cols-2 gap-12">
                                            <div className="space-y-4">
                                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">REPORTED USER ID</p>
                                                <div className="inline-block bg-identity-navy px-4 py-2 rounded-xl text-identity-sky text-sm font-mono font-black border border-identity-sky/30 shadow-lg italic">
                                                    {selectedReport.reported_user_id}
                                                </div>
                                            </div>
                                            <div className="space-y-4 text-right">
                                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">CURRENT STATUS</p>
                                                <span className="inline-block px-5 py-2 rounded-xl text-[10px] font-black uppercase text-white bg-white/20 border border-white/30 italic">
                                                    {selectedReport.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">REPORTED BY</p>
                                                <p className="text-white font-black text-sm uppercase italic tracking-tighter">{selectedReport.reporter_name}</p>
                                            </div>
                                            <div className="space-y-4 text-right">
                                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">REPORTER EMAIL</p>
                                                <p className="text-white/60 font-black text-[10px] lowercase italic truncate">{selectedReport.reporter_email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="identity-glass border-2 border-white/10 rounded-[3rem] p-10 shadow-inner relative overflow-hidden min-h-[200px]">
                                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-5 italic text-shadow-red">
                                            <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-glow-red" />
                                            REPORTED USER PROFILE
                                        </h4>
                                        {(selectedReport.user_primary_id || selectedReport.first_name) ? (
                                            <div className="grid grid-cols-2 gap-10">
                                                <div className="col-span-2 space-y-4">
                                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">USER FULL NAME</p>
                                                    <p className="text-white font-black text-2xl uppercase tracking-tighter italic text-shadow-glow">
                                                        {selectedReport.first_name} {selectedReport.last_name}
                                                    </p>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">USER ROLE</p>
                                                    <span className="text-identity-sky font-extra-black text-[11px] uppercase tracking-[0.2em] italic border-b border-identity-sky/20 pb-1">
                                                        {selectedReport.role?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="space-y-4 text-right">
                                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">SYSTEM ID</p>
                                                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest italic">ID:{selectedReport.user_primary_id}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-6 py-4 text-rose-500/60 font-black uppercase text-[10px] tracking-[0.4em] italic text-center animate-pulse">
                                                <AlertCircle size={48} />
                                                FAILED TO RETRIEVE USER DATA
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Evidence Telemetry */}
                                <div className="space-y-10 group">
                                     <div className="identity-glass border-2 border-white/10 rounded-[3rem] p-10 shadow-inner h-full flex flex-col">
                                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-5 italic text-shadow-green">
                                            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-glow-green" />
                                            INCIDENT DESCRIPTION
                                        </h4>
                                        {selectedReport.description ? (
                                            <blockquote className="flex-1 bg-black/40 rounded-[2.5rem] p-10 border-2 border-white/5 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 p-6 opacity-10">
                                                    <FileText size={40} className="text-white" />
                                                </div>
                                                <p className="text-white/80 italic text-lg font-black leading-relaxed tracking-tight relative z-10 text-center uppercase">
                                                    "{selectedReport.description}"
                                                </p>
                                            </blockquote>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] p-20 opacity-30 text-white italic text-[10px] font-black uppercase tracking-[0.6em]">
                                                NO DESCRIPTION PROVIDED
                                            </div>
                                        )}
                                     </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 relative z-10">
                                <div className="identity-glass border-2 border-white/10 rounded-[3rem] p-8 shadow-inner group/card overflow-hidden">
                                    <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] mb-8 italic">STUDENT ENROLLMENT CERTIFICATE</h5>
                                    {selectedReport.certificate_of_registration ? (
                                        <div className="aspect-video bg-black/60 rounded-[2rem] border-2 border-white/5 overflow-hidden relative group/img shadow-2xl">
                                            <img
                                                src={getProfilePictureUrl(selectedReport.certificate_of_registration) || ''}
                                                alt="COR"
                                                className="w-full h-full object-contain grayscale transition-all duration-1000 group-hover/img:grayscale-0 group-hover/img:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-identity-navy/90 opacity-0 group-hover/img:opacity-100 transition-all flex flex-col items-center justify-center gap-6 cursor-pointer backdrop-blur-md">
                                                <ExternalLink size={40} className="text-identity-sky animate-bounce" />
                                                <a href={getProfilePictureUrl(selectedReport.certificate_of_registration) || '#'} target="_blank" className="text-[10px] font-black text-white uppercase tracking-[0.3em]">VIEW FULL IMAGE</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] text-white/20 text-[10px] font-black uppercase tracking-[0.5em] italic">NO IMAGE PROVIDED</div>
                                    )}
                                </div>
                                <div className="identity-glass border-2 border-white/10 rounded-[3rem] p-8 shadow-inner group/card overflow-hidden">
                                    <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] mb-8 italic">SCHOOL ID PHOTO</h5>
                                    {selectedReport.id_photo ? (
                                        <div className="aspect-video bg-black/60 rounded-[2rem] border-2 border-white/5 overflow-hidden relative group/img shadow-2xl">
                                            <img
                                                src={getProfilePictureUrl(selectedReport.id_photo) || ''}
                                                alt="ID Badge"
                                                className="w-full h-full object-contain grayscale transition-all duration-1000 group-hover/img:grayscale-0 group-hover/img:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-identity-navy/90 opacity-0 group-hover/img:opacity-100 transition-all flex flex-col items-center justify-center gap-6 cursor-pointer backdrop-blur-md">
                                                <ExternalLink size={40} className="text-identity-sky animate-bounce" />
                                                <a href={getProfilePictureUrl(selectedReport.id_photo) || '#'} target="_blank" className="text-[10px] font-black text-white uppercase tracking-[0.3em]">VIEW FULL IMAGE</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] text-white/20 text-[10px] font-black uppercase tracking-[0.5em] italic">NO IMAGE PROVIDED</div>
                                    )}
                                </div>
                            </div>

                            {/* Execution Controls */}
                            <div className="flex flex-wrap gap-8 relative z-10 pt-16 border-t-2 border-white/10">
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'investigating')}
                                    className="flex-1 bg-white/[0.03] hover:bg-identity-sky hover:text-identity-navy text-identity-sky px-10 py-6 rounded-[1.5rem] border-2 border-identity-sky/40 transition-all font-black uppercase tracking-[0.2em] text-[11px] shadow-glow-blue italic active:scale-95"
                                >
                                    START INVESTIGATION
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'resolved')}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 rounded-[1.5rem] border-2 border-emerald-500/40 transition-all font-black uppercase tracking-[0.3em] text-[11px] shadow-glow-green italic active:scale-95"
                                >
                                    RESOLVE INCIDENT
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'dismissed')}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white px-10 py-6 rounded-[1.5rem] border-2 border-rose-500/40 transition-all font-black uppercase tracking-[0.3em] text-[11px] shadow-glow-red italic active:scale-95"
                                >
                                    DISMISS REPORT
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Operation Confirmation */}
                {actionModal.isOpen && (
                    <div className="fixed inset-0 bg-identity-navy/98 backdrop-blur-3xl flex items-center justify-center p-12 z-[150] animate-in zoom-in-95 duration-500">
                        <div className="identity-glass border-2 border-white/20 rounded-[3.5rem] p-16 max-w-2xl w-full shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-identity-sky to-transparent animate-pulse" />
                             
                             <div className="flex items-center gap-8 mb-16">
                                <div className={`p-4 rounded-[1.5rem] shadow-glow- ${actionModal.type === 'resolved' ? 'bg-emerald-500 text-emerald-100 shadow-emerald-500/40' : 'bg-rose-500 text-rose-100 shadow-rose-500/40'}`}>
                                    {actionModal.type === 'resolved' ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
                                </div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                                    {actionModal.type === 'resolved' ? 'CONFIRM RESOLUTION' : 'CONFIRM DISMISSAL'}
                                </h3>
                             </div>

                             <div className="space-y-12 mb-16">
                                <div className="space-y-6">
                                    <label className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] italic mb-4 block">RESOLUTION NOTES</label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        className="w-full bg-black/40 border-2 border-white/10 text-white rounded-[2rem] p-10 focus:outline-none focus:border-identity-sky/60 h-60 placeholder:text-white/10 font-bold uppercase text-[12px] tracking-[0.1em] leading-relaxed shadow-inner italic"
                                        placeholder="ENTER NOTES FOR THE SYSTEM LOG..."
                                    />
                                </div>

                                {actionModal.type === 'resolved' && (
                                    <div className="space-y-8 p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/5 shadow-inner">
                                        <p className="text-identity-sky/60 text-[9px] font-black uppercase tracking-[0.5em] mb-4 italic text-center">FINAL DECISION</p>
                                        <div className="grid grid-cols-1 gap-6">
                                            {[
                                                { id: "reported_is_impostor", label: "VERIFIED SECURITY BREACH", desc: "USER WILL BE FLAGGED" },
                                                { id: "reporter_is_impostor", label: "DISMISS AS FALSE ALARM", desc: "NO ACTION TAKEN" }
                                            ].map((opt) => (
                                                <div 
                                                    key={opt.id}
                                                    onClick={() => setResolutionOutcome(opt.id)}
                                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${resolutionOutcome === opt.id ? 'bg-identity-sky/20 border-identity-sky shadow-glow-blue' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                                                >
                                                    <div>
                                                        <p className={`text-[11px] font-black uppercase tracking-widest italic ${resolutionOutcome === opt.id ? 'text-white' : 'text-white/40'}`}>{opt.label}</p>
                                                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1 italic">{opt.desc}</p>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${resolutionOutcome === opt.id ? 'border-identity-sky bg-identity-sky scale-110' : 'border-white/10'}`}>
                                                        {resolutionOutcome === opt.id && <CheckCircle size={14} className="text-identity-navy" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div 
                                            onClick={() => setDeleteUser(!deleteUser)}
                                            className={`mt-6 p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-center gap-6 group ${deleteUser ? 'bg-rose-500/20 border-rose-500 shadow-glow-red' : 'bg-white/5 border-white/10 hover:border-rose-500/30'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${deleteUser ? 'bg-rose-500 border-rose-400 rotate-90 scale-110' : 'border-white/10 group-hover:rotate-12'}`}>
                                                {deleteUser && <XCircle size={20} className="text-white" />}
                                            </div>
                                            <p className={`text-[10px] font-extra-black uppercase tracking-[0.3em] italic ${deleteUser ? 'text-rose-400' : 'text-white/20 group-hover:text-rose-400/50'}`}>PERMANENTLY DELETE USER FROM SYSTEM</p>
                                        </div>
                                    </div>
                                )}
                             </div>

                             <div className="flex gap-8 relative z-10">
                                <button
                                    onClick={closeActionModal}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white px-10 py-6 rounded-[1.5rem] border-2 border-white/10 transition-all font-black uppercase tracking-[0.3em] text-[11px] italic"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`flex-1 px-10 py-6 rounded-[1.5rem] text-white transition-all font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 italic border-2 ${actionModal.type === 'resolved' ? 'bg-emerald-600 border-emerald-400 shadow-emerald-500/30 hover:bg-emerald-500' : 'bg-rose-600 border-rose-400 shadow-rose-500/30 hover:bg-rose-500'}`}
                                >
                                    CONFIRM ACTION
                                </button>
                             </div>
                        </div>
                    </div>
                )}

                {/* Professor Sync Authentication */}
                {selectedProfessor && (
                    <div className="fixed inset-0 bg-identity-navy/98 backdrop-blur-3xl flex items-center justify-center p-8 z-[100] animate-in fade-in duration-500 overflow-y-auto">
                        <div className="identity-glass border-2 border-white/20 rounded-[4rem] p-16 max-w-6xl w-full shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(92,180,228,0.08),transparent_40%)]" />
                            
                            <div className="flex justify-between items-start mb-16 relative z-10 border-b-2 border-white/10 pb-12">
                                <div className="flex items-center gap-10">
                                    <div className="bg-identity-sky p-5 rounded-[2.2rem] shadow-glow-blue relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        <UserCheck className="w-14 h-14 text-identity-navy relative z-10" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-identity-sky/60 uppercase tracking-[0.6em] mb-3 italic">Identity Authentication Protocol</p>
                                        <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter text-shadow-glow">PROFESSOR APPROVAL</h3>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedProfessor(null)} className="identity-glass border-2 border-white/20 text-white/50 hover:text-white hover:border-white transition-all p-5 rounded-full group">
                                    <XCircle className="w-12 h-12 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-700" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 relative z-10 items-start">
                                <div className="lg:col-span-4 space-y-10 group">
                                    <div className="aspect-[3/4] bg-black/40 rounded-[3rem] overflow-hidden border-2 border-white/10 relative shadow-[0_48px_96px_rgba(0,0,0,0.5)] group-hover:border-identity-sky/40 transition-all duration-700">
                                        {selectedProfessor.id_photo ? (
                                            <>
                                                <img
                                                    src={getProfilePictureUrl(selectedProfessor.id_photo) || ''}
                                                    alt="Identity Badge"
                                                    className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-identity-navy/90 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-10 text-white backdrop-blur-xl">
                                                    <div className="w-24 h-24 rounded-full border-4 border-identity-sky/40 border-t-identity-sky animate-spin" />
                                                    <a href={getProfilePictureUrl(selectedProfessor.id_photo) || '#'} target="_blank" className="text-[10px] font-black uppercase tracking-[0.4em] italic bg-white/5 px-10 py-4 rounded-xl border border-white/10 hover:bg-identity-sky hover:text-identity-navy transition-all animate-in fade-in slide-in-from-bottom-5 duration-700">VIEW FULL IMAGE</a>
                                                </div>
                                                <div className="absolute top-8 left-8 z-20 identity-glass px-5 py-2 border border-white/30 text-[9px] font-black text-white/80 uppercase tracking-widest backdrop-blur-md italic">
                                                    Identity_ID: VERIFIED
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 space-y-8">
                                                <Camera className="w-24 h-24 text-white/5 animate-pulse" />
                                                <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] italic">NO IMAGE</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="identity-glass border-2 border-white/5 rounded-[2rem] p-8 text-center shadow-inner group-hover:border-white/10 transition-all">
                                        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.5em] mb-2 italic">PROFESSOR ID</p>
                                        <code className="text-identity-sky font-mono text-xs font-black tracking-widest uppercase">ID:{selectedProfessor.user_id}</code>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-16">
                                    <div className="identity-glass border-2 border-white/10 rounded-[3.5rem] p-12 shadow-inner relative overflow-hidden group/meta">
                                        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none group-hover/meta:bg-identity-sky/[0.02] transition-colors" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                                            <div className="space-y-12">
                                                <div className="space-y-4">
                                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mb-4 italic flex items-center gap-4">
                                                        <div className="w-2 h-2 rounded-full bg-identity-sky/40" />
                                                        PROFESSOR FULL NAME
                                                    </p>
                                                    <p className="text-white font-black text-4xl uppercase tracking-tighter leading-tight italic text-shadow-glow">
                                                        {selectedProfessor.first_name} <span className="text-identity-sky">{selectedProfessor.last_name}</span>
                                                    </p>
                                                    <div className="inline-flex items-center gap-4 bg-identity-sky/10 px-6 py-2 rounded-2xl border border-identity-sky/20">
                                                        <span className="w-2 h-2 rounded-full bg-identity-sky shadow-glow-blue" />
                                                        <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.3em] font-outfit italic">PENDING APPROVAL</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mb-4 italic flex items-center gap-4">
                                                        <div className="w-2 h-2 rounded-full bg-white/20" />
                                                        EMAIL ADDRESS
                                                    </p>
                                                    <p className="text-white/60 font-black text-[12px] uppercase tracking-[0.2em] font-outfit lowercase italic border-l-2 border-identity-sky/40 pl-6 bg-white/5 py-4 rounded-r-2xl shadow-inner">
                                                        {selectedProfessor.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-12">
                                                <div className="bg-black/30 border-2 border-white/5 p-10 rounded-[2.5rem] shadow-inner space-y-6">
                                                    <h5 className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em] italic mb-6">REGISTRATION DETAILS</h5>
                                                    <div className="space-y-10">
                                                        <div className="flex justify-between items-center">
                                                              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">DATE REGISTERED</span>
                                                            <span className="text-white font-mono text-[10px] font-black">{new Date(selectedProfessor.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">APPROVAL STATUS</span>
                                                            <span className="text-identity-sky bg-identity-sky/10 px-4 py-1 rounded-xl text-[9px] font-black border border-identity-sky/20 italic">PENDING_REVIEW</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">USER ROLE</span>
                                                              <span className="text-white/80 text-[10px] font-black italic">PROFESSOR</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-10 pt-10">
                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.6em] mb-6 flex items-center gap-6 italic text-shadow-glow">
                                            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                            APPROVAL ACTIONS
                                            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-10">
                                            <button
                                                onClick={() => handleApprove(selectedProfessor)}
                                                disabled={actionLoading}
                                                className="flex-1 bg-identity-sky hover:bg-white text-identity-navy px-16 py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[13px] transition-all shadow-[0_32px_64px_rgba(92,180,228,0.3)] flex items-center justify-center gap-10 active:scale-95 disabled:opacity-50 italic group/auth overflow-hidden relative"
                                            >
                                                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/auth:translate-x-full transition-transform duration-1000" />
                                                <CheckCircle className="w-8 h-8 group-hover/auth:scale-125 transition-transform" />
                                                APPROVE PROFESSOR
                                            </button>
                                            <div className="flex-[1.2] flex flex-col gap-6 group/rej">
                                                <div className="flex gap-4">
                                                    <input
                                                        type="text"
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        placeholder="ENTER REASON FOR REJECTION..."
                                                        className="flex-1 bg-white/5 border-2 border-white/10 text-white px-10 py-6 rounded-[2rem] focus:outline-none focus:border-rose-500/60 font-black uppercase text-[11px] tracking-[0.2em] placeholder:text-white/10 transition-all shadow-inner italic"
                                                    />
                                                    <button
                                                        onClick={handleRejectClick}
                                                        disabled={actionLoading || !rejectReason}
                                                        className="bg-rose-600 hover:bg-rose-500 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[12px] transition-all shadow-[0_32px_64px_rgba(244,63,94,0.2)] disabled:opacity-30 active:scale-95 border-2 border-rose-400/20 flex items-center justify-center group-hover/rej:shadow-glow-red italic"
                                                    >
                                                        <XCircle className="w-8 h-8" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={rejectConfirmOpen}
                    onClose={() => setRejectConfirmOpen(false)}
                    onConfirm={confirmReject}
                    title="Confirm Rejection"
                    message={`Are you sure you want to reject ${selectedProfessor?.first_name} ${selectedProfessor?.last_name}? This action cannot be undone.`}
                    confirmText="Yes, Reject"
                    cancelText="Cancel"
                    type="danger"
                />
            </main>
        </div>
    );
}