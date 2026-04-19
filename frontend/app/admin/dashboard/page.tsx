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

    // Users Tab State
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userStatusFilter, setUserStatusFilter] = useState('all');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [isPDF, setIsPDF] = useState<(url: string | undefined | null) => boolean>(() => (url: string | undefined | null) => {
        if (!url) return false;
        // Detect PDF by extension or content type in data URI
        return url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf');
    });


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

            // Fetch current user from token to verify role
            const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const userData = userResponse.data;

            // Role Guard: Ensure user is an admin in this session
            if (userData.role !== 'admin') {
                console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting to appropriate workspace.`);
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
            // Better error extraction
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

    // useSwipe removed — hook was deleted in Phase 2 cleanup

    const handleLogout = () => {
        logout('/admin/login');
    };

    const handleExtendSession = async () => {
        const token = localStorage.getItem('token');
        console.log('Extending session...');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-maroon-950 flex items-center justify-center">
                <div className="text-secondary/60 animate-pulse uppercase tracking-[0.3em] font-bold text-xs">Loading LabFace System...</div>
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

    return (
        <div className="min-h-screen bg-maroon-950 font-sans selection:bg-brand-gold/30">
            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
                <div className="sticky top-20 z-40 bg-maroon-950/90 backdrop-blur-md border-b border-white/5 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 transition-all duration-300">
                    <div className="flex gap-4 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'dashboard'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <Home className="w-4 h-4" />
                            Home
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('users');
                                fetchUsers();
                            }}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'users'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </button>
                        <button
                            onClick={() => setActiveTab('academic')}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'academic'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Academic
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('sessions');
                                fetchSessions();
                            }}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'sessions'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <Monitor className="w-4 h-4" />
                            Monitor
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('reports');
                                fetchReports();
                            }}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'reports'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`px-6 py-4 font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest text-[11px] ${activeTab === 'privacy'
                                ? 'text-brand-gold border-brand-gold'
                                : 'text-secondary/50 border-transparent hover:text-brand-cream'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Data Privacy
                        </button>
                    </div>
                </div>

                <div key={activeTab} className="tab-content-fade">
                    {activeTab === 'dashboard' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('professor');
                                        setUserStatusFilter('pending');
                                    }}
                                    className="bg-maroon-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-brand-gold/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-brand-gold/10 p-3 rounded-lg group-hover:bg-brand-gold/20 transition-colors">
                                            <Clock className="w-6 h-6 text-brand-gold" />
                                        </div>
                                        <div>
                                            <p className="text-secondary/60 text-xs uppercase font-bold tracking-widest">Pending</p>
                                            <p className="text-2xl font-black text-white">{stats?.pendingProfessors || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('admin');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-maroon-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-red-500/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-red-500/10 p-3 rounded-lg group-hover:bg-red-500/20 transition-colors">
                                            <Shield className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-secondary/60 text-xs uppercase font-bold tracking-widest">Admins</p>
                                            <p className="text-2xl font-black text-white">{totalAdmins}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('student');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-maroon-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-500/10 p-3 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                                            <Users className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-secondary/60 text-xs uppercase font-bold tracking-widest">Students</p>
                                            <p className="text-2xl font-black text-white">{totalStudents}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('professor');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-maroon-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-500/10 p-3 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                            <Briefcase className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-secondary/60 text-xs uppercase font-bold tracking-widest">Professors</p>
                                            <p className="text-2xl font-black text-white">{totalProfessors}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('sessions');
                                        fetchSessions();
                                    }}
                                    className="bg-maroon-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-purple-500/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-500/10 p-3 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                            <Activity className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-secondary/60 text-xs uppercase font-bold tracking-widest">Active Sessions</p>
                                            <p className="text-2xl font-black text-white">{activeSessionsCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 mb-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                                <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4 uppercase tracking-tight relative z-10">
                                    <div className="bg-brand-gold/10 p-2 rounded-lg">
                                        <Clock className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    Pending Professor Approvals
                                    {filteredProfessors.length > 0 && (
                                        <span className="bg-brand-gold text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ml-auto">
                                            {filteredProfessors.length} PENDING
                                        </span>
                                    )}
                                </h2>

                                {filteredProfessors.length === 0 ? (
                                    <div className="text-center py-20 bg-black/20 rounded-[24px] border border-white/5">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <UserCheck className="w-10 h-10 text-secondary/20" />
                                        </div>
                                        <p className="text-white text-lg font-black uppercase tracking-tight">Queue Depleted</p>
                                        <p className="text-secondary/40 text-[10px] mt-3 uppercase tracking-[0.3em] font-black">All credentials have been processed</p>
                                    </div>
                                ) : (
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
                                )}
                            </div>
                             <div className="flex justify-between items-center mt-16 mb-8">
                                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                                    <div className="bg-brand-gold/10 p-2 rounded-lg">
                                        <Camera className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    Live Security Matrix
                                </h2>
                                <Link 
                                    href="/admin/camera-test" 
                                    className="bg-brand-gold text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-brand-gold/20"
                                >
                                    <Monitor className="w-4 h-4" />
                                    Run Face Diagnostic
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                                <div className="bg-black/60 rounded-[32px] border border-white/10 p-2 shadow-2xl group overflow-hidden relative">
                                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none opacity-50" />
                                    <div className="px-6 py-4 flex justify-between items-center relative z-10">
                                        <h3 className="text-[10px] font-black text-white flex items-center gap-3 uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            NODE 01 <span className="text-secondary/40 font-bold ml-2">MAIN ENTRANCE</span>
                                        </h3>
                                        <div className="text-[8px] font-black text-secondary/30 tracking-[0.2em] font-mono">192.168.1.220:554</div>
                                    </div>
                                    <div className="aspect-video w-full relative">
                                        <VideoFeed
                                            src="/api/ai/video_feed/1"
                                            alt="Camera 1"
                                            label="MAIN ENTRANCE"
                                            className="w-full h-full rounded-[24px]"
                                        />
                                    </div>
                                </div>
                                <div className="bg-black/60 rounded-[32px] border border-white/10 p-2 shadow-2xl group overflow-hidden relative">
                                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none opacity-50" />
                                    <div className="px-6 py-4 flex justify-between items-center relative z-10">
                                        <h3 className="text-[10px] font-black text-white flex items-center gap-3 uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            NODE 02 <span className="text-secondary/40 font-bold ml-2">EXIT CORRIDOR</span>
                                        </h3>
                                        <div className="text-[8px] font-black text-secondary/30 tracking-[0.2em] font-mono">192.168.1.221:554</div>
                                    </div>
                                    <div className="aspect-video w-full relative">
                                        <VideoFeed
                                            src="/api/ai/video_feed/2"
                                            alt="Camera 2"
                                            label="EXIT CORRIDOR"
                                            className="w-full h-full rounded-[24px]"
                                        />
                                    </div>
                                </div>
                            </div>
                             <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4 uppercase tracking-tight mt-16">
                                <div className="bg-brand-gold/10 p-2 rounded-lg">
                                    <UserCheck className="w-6 h-6 text-brand-gold" />
                                </div>
                                System Audit Log
                            </h2>

                            <div className="bg-black/40 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                                {stats?.recentActions && stats.recentActions.length > 0 ? (
                                    <div className="divide-y divide-white/5 relative z-10">
                                        {stats.recentActions.slice(0, 10).map((action) => (
                                            <div key={action.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-maroon-900 flex items-center justify-center text-brand-gold border border-white/10 shadow-inner group-hover:border-brand-gold/50 transition-all font-black uppercase text-xs">
                                                        {action.action_type[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black text-xs uppercase tracking-widest group-hover:text-brand-gold transition-colors">
                                                            {action.action_type.replace('_', ' ')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest mt-1">
                                                            MODERATOR: {action.first_name} {action.last_name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-secondary/30 uppercase tracking-[0.2em]">
                                                        {new Date(action.created_at).toLocaleString()}
                                                    </p>
                                                    {action.details && (
                                                        <p className="text-[9px] font-bold text-secondary/40 mt-2 max-w-xs truncate uppercase tracking-widest">
                                                            {action.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-20 text-center relative z-10">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <History className="w-10 h-10 text-secondary/20" />
                                        </div>
                                        <p className="text-white text-lg font-black uppercase tracking-tight">Log Purged</p>
                                        <p className="text-secondary/40 text-[10px] mt-3 uppercase tracking-[0.3em] font-black">No recent system interactions found</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : activeTab === 'privacy' ? (
                        <DeletionRequestsTab />
                    ) : activeTab === 'users' ? (
                        <div className="space-y-6">
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                                        <div className="bg-brand-gold/10 p-2 rounded-lg">
                                            <Users className="w-6 h-6 text-brand-gold" />
                                        </div>
                                        Registered Matrix
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/40 group-focus-within:text-brand-gold transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search Signature..."
                                                value={userSearch}
                                                onChange={(e) => {
                                                    setUserSearch(e.target.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') fetchUsers(userRoleFilter, userSearch);
                                                }}
                                                className="bg-black/40 border border-white/10 text-white pl-12 pr-10 py-3 rounded-2xl focus:outline-none focus:border-brand-gold w-full md:w-72 placeholder:text-secondary/20 font-black uppercase text-[10px] tracking-widest transition-all shadow-inner"
                                            />
                                            {userSearch && (
                                                <button
                                                    onClick={() => {
                                                        setUserSearch('');
                                                        fetchUsers(userRoleFilter, '');
                                                    }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-white transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <select
                                            value={userRoleFilter}
                                            onChange={(e) => setUserRoleFilter(e.target.value)}
                                            className="bg-black/40 border border-white/10 text-white px-6 py-3 rounded-2xl focus:outline-none focus:border-brand-gold font-black uppercase text-[10px] tracking-widest transition-all appearance-none cursor-pointer hover:bg-black/60 shadow-inner min-w-[140px]"
                                        >
                                            <option value="all">All Roles</option>
                                            <option value="student">Students</option>
                                            <option value="professor">Professors</option>
                                            <option value="admin">Admins</option>
                                        </select>
                                        <select
                                            value={userStatusFilter}
                                            onChange={(e) => setUserStatusFilter(e.target.value)}
                                            className="bg-black/40 border border-white/10 text-white px-6 py-3 rounded-2xl focus:outline-none focus:border-brand-gold font-black uppercase text-[10px] tracking-widest transition-all appearance-none cursor-pointer hover:bg-black/60 shadow-inner min-w-[140px]"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="approved">Approved</option>
                                            <option value="pending">Pending</option>
                                            <option value="rejected">Rejected/Deactivated</option>
                                        </select>
                                        <button
                                            onClick={() => fetchUsers()}
                                            className="bg-brand-gold hover:bg-black hover:text-brand-gold text-black p-3 rounded-2xl transition-all shadow-2xl shadow-brand-gold/10 border border-brand-gold active:scale-95 flex items-center justify-center group"
                                            title="Refresh List"
                                        >
                                            <RefreshCw className={`w-5 h-5 transition-transform group-hover:rotate-180 ${loadingUsers ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-3xl relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none opacity-30" />
                                    {loadingUsers ? (
                                        <div className="p-32 text-center relative z-10">
                                            <div className="animate-spin w-12 h-12 border-[3px] border-brand-gold border-t-transparent rounded-full mx-auto mb-6 shadow-2xl"></div>
                                            <p className="text-secondary/40 font-black uppercase tracking-[0.3em] text-[10px]">Accessing Identity Vault...</p>
                                        </div>
                                    ) : systemUsers.length === 0 ? (
                                        <div className="p-32 text-center relative z-10">
                                            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Users className="w-10 h-10 text-secondary/10" />
                                            </div>
                                            <p className="text-white text-lg font-black uppercase tracking-tight">Zero Signatures</p>
                                            <p className="text-secondary/30 text-[10px] mt-3 uppercase tracking-[0.3em] font-black italic">Search criteria returned no validated records.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto relative z-10">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-black/60 border-b border-white/10">
                                                        <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Subject Identity</th>
                                                        <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Matrix Code</th>
                                                        <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Role Node</th>
                                                        <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Verification Status</th>
                                                        <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Establishment Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {systemUsers.map((u) => (
                                                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-12 h-12 rounded-2xl bg-maroon-900 flex items-center justify-center text-brand-gold border border-white/10 font-black group-hover:border-brand-gold/50 transition-all shadow-inner uppercase text-xs">
                                                                        {u.first_name?.[0] || 'U'}{u.last_name?.[0] || 'N'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-white font-black text-xs uppercase tracking-widest">{u.first_name} {u.last_name}</p>
                                                                        <p className="text-[9px] font-bold text-secondary/40 uppercase tracking-[0.2em] mt-1.5">{u.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <code className="text-[10px] bg-black/40 px-3 py-1.5 rounded-xl text-brand-gold font-mono border border-white/5 font-black tracking-widest group-hover:border-brand-gold/30 transition-colors">
                                                                    {u.user_id}
                                                                </code>
                                                            </td>
                                                            <td className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                                        u.role === 'professor' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                                                                            'bg-brand-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                                                                        }`} />
                                                                    <span className={`${u.role === 'admin' ? 'text-rose-400' :
                                                                        u.role === 'professor' ? 'text-blue-400' :
                                                                            'text-brand-gold'
                                                                        }`}>
                                                                        {u.role}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${u.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                    u.approval_status === 'pending' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                                                    }`}>
                                                                    {u.approval_status}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                                                                {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="px-8 py-6 bg-black/60 border-t border-white/10 flex justify-between items-center relative z-10">
                                        <p className="text-[9px] text-secondary/30 italic font-black uppercase tracking-[0.3em]">Identity Vault · Integrity Confirmed</p>
                                        <p className="text-[10px] text-secondary/50 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                                            {systemUsers.length} Validated Signatures
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'academic' ? (
                        <AcademicSettingsTab />
                    ) : activeTab === 'sessions' ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                                    <div className="bg-brand-gold/10 p-2 rounded-lg">
                                        <Activity className="w-6 h-6 text-brand-gold" />
                                    </div>
                                    Live Matrix Monitoring
                                </h2>
                                <button
                                    onClick={() => fetchSessions()}
                                    className="bg-brand-gold hover:bg-black hover:text-brand-gold text-black p-3 rounded-2xl transition-all shadow-2xl shadow-brand-gold/10 border border-brand-gold active:scale-95 flex items-center justify-center group"
                                    title="Refresh List"
                                >
                                    <RefreshCw className={`w-5 h-5 transition-transform group-hover:rotate-180 ${loadingSessions ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-3xl relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none opacity-30" />
                                {loadingSessions ? (
                                    <div className="p-32 text-center relative z-10">
                                        <div className="animate-spin w-12 h-12 border-[3px] border-brand-gold border-t-transparent rounded-full mx-auto mb-6 shadow-2xl"></div>
                                        <p className="text-secondary/40 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Active Nodes...</p>
                                    </div>
                                ) : activeSessions.length === 0 ? (
                                    <div className="p-32 text-center relative z-10">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Activity className="w-10 h-10 text-secondary/10" />
                                        </div>
                                        <p className="text-white text-lg font-black uppercase tracking-tight">Static Environment</p>
                                        <p className="text-secondary/30 text-[10px] mt-3 uppercase tracking-[0.3em] font-black italic">No active attendance protocols are currently running.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto relative z-10">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-black/60 border-b border-white/10">
                                                    <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Academic Node</th>
                                                    <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Authorized Proctor</th>
                                                    <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Protocol Type</th>
                                                    <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Initialization</th>
                                                    <th className="px-8 py-6 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px]">Active Units</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {activeSessions.map((session) => (
                                                    <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div>
                                                                <p className="text-white font-black text-xs uppercase tracking-widest">{session.subject_code}</p>
                                                                <p className="text-[9px] font-bold text-secondary/40 uppercase tracking-[0.2em] mt-1.5">{session.subject_name} — SECTION {session.section}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-white text-xs font-black uppercase tracking-widest">{session.professor_name}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${session.session_type === 'regular' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                session.session_type === 'makeup' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                                                    'bg-brand-gold/10 text-brand-gold border-brand-gold/20'
                                                                }`}>
                                                                {(session.session_name || session.session_type).toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                                                            {new Date(session.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                                                                <span className="text-white font-black text-xs uppercase tracking-widest">{session.student_count} NODES</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="px-8 py-6 bg-black/60 border-t border-white/10 flex justify-between items-center relative z-10">
                                    <p className="text-[9px] text-secondary/30 italic font-black uppercase tracking-[0.3em]">Live Feed Matrix · Access Grade A</p>
                                    <p className="text-[10px] text-secondary/50 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                                        {activeSessions.length} MONITORING NODES
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                                    <div className="bg-rose-500/10 p-2 rounded-lg">
                                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    Identity Verification Reports
                                </h2>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={reportStatusFilter}
                                        onChange={(e) => {
                                            setReportStatusFilter(e.target.value);
                                            setTimeout(() => fetchReports(), 100);
                                        }}
                                        className="bg-black/40 border border-white/10 text-white px-6 py-3 rounded-2xl focus:outline-none focus:border-brand-gold font-black uppercase text-[10px] tracking-widest transition-all"
                                    >
                                        <option value="all">Display All Matrix</option>
                                        <option value="pending">Awaiting Review</option>
                                        <option value="investigating">Under Investigation</option>
                                        <option value="resolved">Resolved / Secure</option>
                                        <option value="dismissed">Dismissed / Void</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 shadow-3xl relative overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none opacity-50" />
                                {reports.length === 0 ? (
                                    <div className="text-center py-24 relative z-10">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <AlertTriangle className="w-10 h-10 text-secondary/20" />
                                        </div>
                                        <p className="text-white text-lg font-black uppercase tracking-tight">No Anomalies Detected</p>
                                        <p className="text-secondary/40 text-[10px] mt-3 uppercase tracking-[0.3em] font-black italic">The Identity Vault currently reports zero security violations.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 relative z-10">
                                        {reports.map((report) => (
                                            <div key={report.id} className="bg-black/40 border border-white/5 rounded-3xl p-8 hover:border-rose-500/30 transition-all group shadow-inner relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                                                                REPORT ID #{report.id}
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                                                                report.status === 'pending' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                                                report.status === 'investigating' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                'bg-white/5 text-secondary/40 border-white/10'
                                                            }`}>
                                                                {report.status === 'pending' ? 'AWAITING_REVIEW' : report.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                            <div>
                                                                <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Target Neural Signature</p>
                                                                <p className="text-brand-gold font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 inline-block text-xs font-black">{report.reported_user_id}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Claimant Profile</p>
                                                                <p className="text-white font-black text-xs uppercase tracking-widest">{report.reporter_name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="w-full md:w-auto bg-maroon-900 hover:bg-black text-white px-8 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10 hover:border-brand-gold/50 flex items-center justify-center gap-3 group active:scale-95 shadow-2xl"
                                                    >
                                                        <Eye className="w-4 h-4 text-brand-gold" />
                                                        Manage Protocol
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {selectedReport && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-maroon-950 border border-white/10 rounded-[40px] p-10 max-w-2xl w-full shadow-3xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <h3 className="text-3xl font-black text-rose-500 flex items-center gap-4 uppercase tracking-tighter">
                                    <AlertTriangle className="w-8 h-8" />
                                    Anomaly Protocol
                                    <span className="text-white/20 text-sm ml-4 font-mono tracking-widest text-[10px]">#{selectedReport.id}</span>
                                </h3>
                                <button onClick={() => setSelectedReport(null)} className="text-secondary/40 hover:text-white transition-colors">
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="space-y-8 mb-10 relative z-10">
                                <div className="bg-black/40 rounded-[32px] p-8 border border-white/5 shadow-inner">
                                    <h4 className="text-brand-gold font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                                        Target Identification
                                    </h4>
                                    <div className="grid grid-cols-2 gap-10 text-[10px] uppercase tracking-[0.2em] font-black">
                                        <div>
                                            <p className="text-secondary/40 mb-2.5">Neural Signature</p>
                                            <p className="text-brand-gold font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 inline-block text-xs">{selectedReport.reported_user_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary/40 mb-2.5">Current Status</p>
                                            <p className="text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 inline-block text-xs">{selectedReport.status.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary/40 mb-2.5">Claimant Profile</p>
                                            <p className="text-white text-xs">{selectedReport.reporter_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary/40 mb-2.5">Contact Link</p>
                                            <p className="text-white text-xs lowercase">{selectedReport.reporter_email}</p>
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-10 border-t border-white/5">
                                        <h4 className="text-rose-500 font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                            Reported Entity Details
                                        </h4>
                                        {(selectedReport.user_primary_id || selectedReport.first_name) ? (
                                            <div className="grid grid-cols-2 gap-10 text-[10px] uppercase tracking-[0.2em] font-black">
                                                <div>
                                                    <p className="text-secondary/40 mb-2.5">Legal Name</p>
                                                    <p className="text-white text-xs">{selectedReport.first_name} {selectedReport.last_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-secondary/40 mb-2.5">Protocol Access</p>
                                                    <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${selectedReport.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        selectedReport.role === 'professor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {selectedReport.role?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-secondary/40 mb-2.5">Primary Link</p>
                                                    <p className="text-white text-xs lowercase">{selectedReport.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-secondary/40 mb-2.5">Database ID</p>
                                                    <p className="text-secondary/20 font-mono text-xs">#{selectedReport.user_primary_id}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-500 text-[10px] flex items-center gap-4 font-black uppercase tracking-widest shadow-inner">
                                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                                ENTITY NOT FOUND IN ACTIVE DATABASE. POSSIBLE DATA CORRUPTION OR DELETION.
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.description && (
                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <p className="text-secondary/40 text-[9px] uppercase font-black tracking-[0.3em] mb-4">Anomaly Description</p>
                                            <div className="bg-black/20 p-6 rounded-2xl border border-white/5 italic text-white/80 text-xs leading-relaxed">
                                                "{selectedReport.description}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 shadow-inner">
                                        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[9px] mb-4">Evidence: COR Proof</h4>
                                        {selectedReport.certificate_of_registration ? (
                                            <div className="aspect-video bg-black/60 rounded-2xl border border-white/5 overflow-hidden relative group">
                                                {isPDF(selectedReport.certificate_of_registration) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-brand-gold">
                                                        <FileText size={40} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">PDF ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedReport.certificate_of_registration) || ''}
                                                        alt="COR"
                                                        className="w-full h-full object-contain"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedReport.certificate_of_registration) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 text-brand-gold">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">EXPAND SOURCE</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="aspect-video flex items-center justify-center border border-white/5 border-dashed rounded-2xl text-secondary/20 text-[9px] font-black uppercase tracking-[0.3em]">MISSING_COR</div>
                                        )}
                                    </div>
                                    <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 shadow-inner">
                                        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[9px] mb-4">Evidence: ID Profile</h4>
                                        {selectedReport.id_photo ? (
                                            <div className="aspect-video bg-black/60 rounded-2xl border border-white/5 overflow-hidden relative group">
                                                {isPDF(selectedReport.id_photo) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-brand-gold">
                                                        <FileText size={40} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">PDF ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedReport.id_photo) || ''}
                                                        alt="ID"
                                                        className="w-full h-full object-contain"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedReport.id_photo) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 text-brand-gold">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">EXPAND SOURCE</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="aspect-video flex items-center justify-center border border-white/5 border-dashed rounded-2xl text-secondary/20 text-[9px] font-black uppercase tracking-[0.3em]">MISSING_ID</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 relative z-10 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'investigating')}
                                    className="flex-1 bg-brand-gold hover:bg-black hover:text-brand-gold text-black px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-brand-gold shadow-2xl active:scale-95"
                                >
                                    Initiate Investigation
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'resolved')}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-900/40 active:scale-95"
                                >
                                    Resolve & Close
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'dismissed')}
                                    className="flex-1 bg-maroon-900 hover:bg-rose-900 text-white px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10 active:scale-95 shadow-2xl"
                                >
                                    Void Report
                                </button>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="bg-black/80 hover:bg-black text-secondary/40 px-8 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10 hover:text-white"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {actionModal.isOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[60] animate-in fade-in zoom-in duration-300">
                        <div className="bg-maroon-950 border border-white/10 rounded-[40px] p-10 max-w-md w-full shadow-3xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none opacity-30" />
                            
                            <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter relative z-10 flex items-center gap-4">
                                <div className="w-2 h-8 bg-brand-gold rounded-full" />
                                {actionModal.type === 'resolved' ? 'Resolution Protocol' : 'Dismissal Protocol'}
                            </h3>

                            <div className="space-y-8 relative z-10">
                                <div>
                                    <label className="block text-secondary/40 text-[9px] font-black uppercase tracking-[0.3em] mb-4">
                                        {actionModal.type === 'resolved' ? 'Resolution Dispatch (Email Content)' : 'Rejection Rationale (Email Content)'}
                                    </label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-3xl p-6 focus:outline-none focus:border-brand-gold h-40 placeholder:text-secondary/10 font-black uppercase text-[10px] tracking-widest leading-relaxed shadow-inner"
                                        placeholder={actionModal.type === 'resolved' ? 'Define the mitigation steps taken...' : 'State the reason for voiding this claim...'}
                                    />
                                </div>

                                {actionModal.type === 'resolved' && (
                                    <>
                                        <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 shadow-inner">
                                            <label className="block text-secondary/40 text-[9px] font-black uppercase tracking-[0.3em] mb-6">
                                                Classification Outcome
                                            </label>
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4 p-4 bg-black/60 border border-white/5 rounded-2xl hover:border-brand-gold/50 transition-all cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        id="outcome-reported"
                                                        name="outcome"
                                                        value="reported_is_impostor"
                                                        checked={resolutionOutcome === 'reported_is_impostor'}
                                                        onChange={(e) => setResolutionOutcome(e.target.value)}
                                                        className="w-5 h-5 mt-0.5 text-brand-gold bg-maroon-950 border-white/10 focus:ring-brand-gold cursor-pointer"
                                                    />
                                                    <label htmlFor="outcome-reported" className="cursor-pointer">
                                                        <div className="font-black uppercase tracking-widest text-[10px] text-white">Target is Impostor</div>
                                                        <div className="text-[8px] text-secondary/30 font-bold uppercase tracking-[0.2em] mt-1 italic">Confirmed fraudulent identity usage</div>
                                                    </label>
                                                </div>
                                                <div className="flex items-start gap-4 p-4 bg-black/60 border border-white/5 rounded-2xl hover:border-brand-gold/50 transition-all cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        id="outcome-reporter"
                                                        name="outcome"
                                                        value="reporter_is_impostor"
                                                        checked={resolutionOutcome === 'reporter_is_impostor'}
                                                        onChange={(e) => setResolutionOutcome(e.target.value)}
                                                        className="w-5 h-5 mt-0.5 text-brand-gold bg-maroon-950 border-white/10 focus:ring-brand-gold cursor-pointer"
                                                    />
                                                    <label htmlFor="outcome-reporter" className="cursor-pointer">
                                                        <div className="font-black uppercase tracking-widest text-[10px] text-white">False Claim Detected</div>
                                                        <div className="text-[8px] text-secondary/30 font-bold uppercase tracking-[0.2em] mt-1 italic">Claimant filed unfounded report</div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl group cursor-pointer hover:bg-rose-500/10 transition-all">
                                            <input
                                                type="checkbox"
                                                id="deleteUser"
                                                checked={deleteUser}
                                                onChange={(e) => setDeleteUser(e.target.checked)}
                                                className="w-6 h-6 rounded-lg border-white/10 bg-maroon-950 text-rose-600 focus:ring-rose-500 cursor-pointer shadow-inner"
                                            />
                                            <label htmlFor="deleteUser" className="text-rose-500 font-black uppercase tracking-[0.2em] text-[9px] cursor-pointer group-hover:text-rose-400">
                                                Permanently Purge Fraudulent Node
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-4 mt-10 relative z-10 pt-6 border-t border-white/10">
                                <button
                                    onClick={closeActionModal}
                                    className="flex-1 bg-black/80 hover:bg-black text-secondary/40 px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] border border-white/10 hover:text-white"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`flex-1 px-6 py-4 rounded-2xl text-black transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 ${actionModal.type === 'resolved'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-900/40'
                                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                                        }`}
                                >
                                    Execute {actionModal.type === 'resolved' ? 'Resolution' : 'Dismissal'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProfessor && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-maroon-950 border border-white/10 rounded-[40px] p-10 max-w-3xl w-full shadow-3xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/10 to-transparent pointer-events-none opacity-50" />
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <h3 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                                    <div className="bg-brand-gold/20 p-2 rounded-xl">
                                        <UserCheck className="w-8 h-8 text-brand-gold" />
                                    </div>
                                    Credential Audit
                                </h3>
                                <button onClick={() => setSelectedProfessor(null)} className="text-secondary/40 hover:text-white transition-all hover:rotate-90">
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 relative z-10">
                                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                                    <div className="aspect-[3/4] bg-black/60 rounded-[32px] overflow-hidden border border-white/10 relative group shadow-inner">
                                        {selectedProfessor.id_photo ? (
                                            <>
                                                {isPDF(selectedProfessor.id_photo) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-maroon-900/20 text-brand-gold p-4 border border-white/5 rounded-[24px]">
                                                        <FileText size={48} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-center">PDF ENCRYPTED ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedProfessor.id_photo) || ''}
                                                        alt="Identity Badge"
                                                        className="w-full h-full object-cover grayscale brightness-75 transition-all group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedProfessor.id_photo) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 text-brand-gold backdrop-blur-sm">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">VERIFY SOURCE</span>
                                                </a>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-secondary/10 bg-black/40">
                                                <Camera className="w-12 h-12 mb-3" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.4rem]">NO_DATA</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-8 lg:col-span-9 space-y-8">
                                    <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 shadow-inner">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Subject Header</p>
                                                    <p className="text-white font-black text-xl uppercase tracking-tighter leading-none">{selectedProfessor.first_name} {selectedProfessor.last_name}</p>
                                                    <p className="text-secondary/40 text-[9px] font-black uppercase tracking-[0.4em] mt-3">PROCTOR LEVEL ACCESS</p>
                                                </div>
                                                <div>
                                                    <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Matrix Identification</p>
                                                    <code className="text-brand-gold font-mono bg-black/40 px-4 py-2 rounded-xl border border-white/5 inline-block text-xs font-black tracking-widest">
                                                        {selectedProfessor.user_id}
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Neural Link (Email)</p>
                                                    <p className="text-white font-black text-xs uppercase tracking-widest lowercase">{selectedProfessor.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Initialization Timestamp</p>
                                                    <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">
                                                        {new Date(selectedProfessor.created_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <p className="text-secondary/40 text-[9px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                            Manual Verification Override
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => handleApprove(selectedProfessor)}
                                                disabled={actionLoading}
                                                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-emerald-900/40 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                Ratify Credentials
                                            </button>
                                            <div className="flex-[3] flex gap-3">
                                                <input
                                                    type="text"
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="State rejection rationale..."
                                                    className="flex-1 bg-black/40 border border-white/10 text-white px-6 py-4 rounded-2xl focus:outline-none focus:border-rose-500 font-black uppercase text-[10px] tracking-widest placeholder:text-secondary/10 transition-all shadow-inner"
                                                />
                                                <button
                                                    onClick={handleRejectClick}
                                                    disabled={actionLoading || !rejectReason}
                                                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-rose-900/40 disabled:opacity-50 active:scale-95 border border-rose-500/20"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
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