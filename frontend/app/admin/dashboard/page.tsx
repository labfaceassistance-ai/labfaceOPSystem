'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getToken, getUser, API_URL, getBackendUrl, logout, getProfilePictureUrl } from '@/utils/auth';
import ConfirmModal from '@/components/ConfirmModal';
import { User, Shield, Users, Clock, CheckCircle, XCircle, AlertCircle, LogOut, UserCheck, Search, Filter, Camera, History, AlertTriangle, ExternalLink, Briefcase, RefreshCw, Activity, GraduationCap, LayoutDashboard, Eye, Home, Monitor } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import SessionTimeout from '@/components/SessionTimeout';
import BulkActions from '@/components/BulkActions';
import VideoFeed from '@/components/VideoFeed';
import AcademicSettingsTab from '@/components/AcademicSettingsTab';
import DeletionRequestsTab from '@/components/DeletionRequestsTab';
import { useSwipe } from '@/hooks/useSwipe';

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

    useSwipe(handleSwipeLeft, handleSwipeRight);

    const handleLogout = () => {
        logout('/admin/login');
    };

    const handleExtendSession = async () => {
        const token = localStorage.getItem('token');
        console.log('Extending session...');
    };

    if (loading) {
        return <DashboardSkeleton />;
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
        <div className="min-h-screen bg-slate-950 font-sans">
            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
                <div className="sticky top-20 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 transition-all duration-300">
                    <div className="flex gap-4 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
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
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'users'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </button>
                        <button
                            onClick={() => setActiveTab('academic')}
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'academic'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
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
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'sessions'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
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
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'reports'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'privacy'
                                ? 'text-brand-500 border-brand-500'
                                : 'text-slate-400 border-transparent hover:text-white'
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
                                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-brand-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-brand-600/20 p-3 rounded-lg">
                                            <Clock className="w-6 h-6 text-brand-500" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm">Pending</p>
                                            <p className="text-2xl font-bold text-white">{stats?.pendingProfessors || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('admin');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-red-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-red-600/20 p-3 rounded-lg">
                                            <Shield className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm">Admins</p>
                                            <p className="text-2xl font-bold text-white">{totalAdmins}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('student');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-green-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-600/20 p-3 rounded-lg">
                                            <Users className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm">Students</p>
                                            <p className="text-2xl font-bold text-white">{totalStudents}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('professor');
                                        setUserStatusFilter('all');
                                    }}
                                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-600/20 p-3 rounded-lg">
                                            <Briefcase className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm">Professors</p>
                                            <p className="text-2xl font-bold text-white">{totalProfessors}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('sessions');
                                        fetchSessions();
                                    }}
                                    className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-600/20 p-3 rounded-lg">
                                            <Activity className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-sm">Active Sessions</p>
                                            <p className="text-2xl font-bold text-white">{activeSessionsCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 mb-8">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-brand-500" />
                                    Pending Professor Approvals
                                    {filteredProfessors.length > 0 && (
                                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                                            {filteredProfessors.length}
                                        </span>
                                    )}
                                </h2>

                                {filteredProfessors.length === 0 ? (
                                    <div className="text-center py-12">
                                        <UserCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg">No pending approvals</p>
                                        <p className="text-slate-500 text-sm mt-2">All professor registrations have been processed</p>
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

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 mt-12">
                                <Camera className="w-6 h-6 text-brand-400" />
                                Live Security Feed
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-1 shadow-xl">
                                    <div className="px-4 py-3 flex justify-between items-center">
                                        <h3 className="font-semibold text-white flex items-center gap-2">
                                            CAM 01 <span className="text-slate-500 text-sm font-normal">| Entrance Door</span>
                                        </h3>
                                        <div className="text-[10px] font-mono text-slate-500">192.168.1.220:554</div>
                                    </div>
                                    <div className="aspect-video w-full">
                                        <VideoFeed
                                            src="/api/ai/video_feed/1"
                                            alt="Camera 1"
                                            label="MAIN ENTRANCE"
                                            className="w-full h-full rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-1 shadow-xl">
                                    <div className="px-4 py-3 flex justify-between items-center">
                                        <h3 className="font-semibold text-white flex items-center gap-2">
                                            CAM 02 <span className="text-slate-500 text-sm font-normal">| Exit Door</span>
                                        </h3>
                                        <div className="text-[10px] font-mono text-slate-500">192.168.1.220:554</div>
                                    </div>
                                    <div className="aspect-video w-full">
                                        <VideoFeed
                                            src="/api/ai/video_feed/2"
                                            alt="Camera 2"
                                            label="EXIT CORRIDOR"
                                            className="w-full h-full rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 mt-12">
                                <UserCheck className="w-6 h-6 text-brand-400" />
                                Recent Activity
                            </h2>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                                {stats?.recentActions && stats.recentActions.length > 0 ? (
                                    <div className="divide-y divide-slate-700">
                                        {stats.recentActions.slice(0, 10).map((action) => (
                                            <div key={action.id} className="p-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors">
                                                <div>
                                                    <p className="text-white font-medium capitalize">
                                                        {action.action_type.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        by {action.first_name} {action.last_name}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(action.created_at).toLocaleString()}
                                                    </p>
                                                    {action.details && (
                                                        <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">
                                                            {action.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        No recent activity found.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : activeTab === 'privacy' ? (
                        <DeletionRequestsTab />
                    ) : activeTab === 'users' ? (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Users className="w-6 h-6 text-brand-500" />
                                    Registered Users
                                </h2>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearch}
                                            onChange={(e) => {
                                                setUserSearch(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') fetchUsers(userRoleFilter, userSearch);
                                            }}
                                            className="bg-slate-900/50 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-brand-500 w-full md:w-64"
                                        />
                                        {userSearch && (
                                            <button
                                                onClick={() => {
                                                    setUserSearch('');
                                                    fetchUsers(userRoleFilter, '');
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        value={userRoleFilter}
                                        onChange={(e) => setUserRoleFilter(e.target.value)}
                                        className="bg-slate-900/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="student">Students</option>
                                        <option value="professor">Professors</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                    <select
                                        value={userStatusFilter}
                                        onChange={(e) => setUserStatusFilter(e.target.value)}
                                        className="bg-slate-900/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected/Deactivated</option>
                                    </select>
                                    {/* Refresh Button */}
                                    <button
                                        onClick={() => fetchUsers()}
                                        className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition-colors"
                                        title="Refresh List"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${loadingUsers ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                                {loadingUsers ? (
                                    <div className="p-20 text-center">
                                        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-slate-400">Loading user records...</p>
                                    </div>
                                ) : systemUsers.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg font-semibold">No users found</p>
                                        <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search query.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">User</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">ID Number</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Role</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Status</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Registered On</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {systemUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 font-bold group-hover:border-brand-500/50 transition-all">
                                                                    {u.first_name?.[0] || 'U'}{u.last_name?.[0] || 'N'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <code className="text-xs bg-slate-800/80 px-2 py-1 rounded text-brand-400 font-mono">
                                                                {u.user_id}
                                                            </code>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <span className={`capitalize ${u.role === 'admin' ? 'text-red-400' :
                                                                u.role === 'professor' ? 'text-blue-400' :
                                                                    'text-green-400'
                                                                }`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.approval_status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                                u.approval_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                    'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                {u.approval_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">
                                                            {new Date(u.created_at).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                                    <p className="text-xs text-slate-500 italic">Showing up to 100 recent records</p>
                                    <p className="text-xs text-slate-500">{systemUsers.length} users found</p>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'academic' ? (
                        <AcademicSettingsTab />
                    ) : activeTab === 'sessions' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-purple-500" />
                                    Live Monitoring
                                </h2>
                                <button
                                    onClick={() => fetchSessions()}
                                    className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition-colors"
                                    title="Refresh List"
                                >
                                    <RefreshCw className={`w-5 h-5 ${loadingSessions ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                                {loadingSessions ? (
                                    <div className="p-20 text-center">
                                        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-slate-400">Loading active sessions...</p>
                                    </div>
                                ) : activeSessions.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg font-semibold">No active sessions</p>
                                        <p className="text-slate-500 text-sm mt-2">All attendance sessions have ended.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Class</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Professor</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Session Type</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Started</th>
                                                    <th className="px-6 py-4 text-slate-400 font-semibold text-sm">Students</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {activeSessions.map((session) => (
                                                    <tr key={session.id} className="hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="text-white font-medium">{session.subject_code}</p>
                                                                <p className="text-xs text-slate-400">{session.subject_name} - {session.section}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-white text-sm">{session.professor_name}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${session.session_type === 'regular' ? 'bg-blue-500/10 text-blue-500' :
                                                                session.session_type === 'makeup' ? 'bg-amber-500/10 text-amber-500' :
                                                                    'bg-purple-500/10 text-purple-500'
                                                                }`}>
                                                                {session.session_name || session.session_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-400">
                                                            {new Date(session.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-slate-500" />
                                                                <span className="text-white font-medium">{session.student_count}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                                    <p className="text-xs text-slate-500 italic">Sessions with no end time or future end time</p>
                                    <p className="text-xs text-slate-500">{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                    Identity Theft Reports
                                </h2>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={reportStatusFilter}
                                        onChange={(e) => {
                                            setReportStatusFilter(e.target.value);
                                            setTimeout(() => fetchReports(), 100);
                                        }}
                                        className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-500"
                                    >
                                        <option value="all">All Reports</option>
                                        <option value="pending">Pending</option>
                                        <option value="investigating">Investigating</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="dismissed">Dismissed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
                                {reports.length === 0 ? (
                                    <div className="text-center py-12">
                                        <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg font-semibold">No identity theft reports found</p>
                                        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                                            Reports submitted through the registration pages will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reports.map((report) => (
                                            <div key={report.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-red-500/50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-white font-semibold">Report #{report.id}</h3>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                report.status === 'investigating' ? 'bg-blue-500/20 text-blue-400' :
                                                                    report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                                                        'bg-gray-500/20 text-gray-400'
                                                                }`}>
                                                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-slate-400">Reported User ID:</p>
                                                                <p className="text-white font-mono">{report.reported_user_id}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-400">Reporter:</p>
                                                                <p className="text-white">{report.reporter_name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ml-4"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Manage
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


                {
                    selectedReport && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                    Identity Theft Report #{selectedReport.id}
                                </h3>

                                <div className="space-y-4 mb-6">
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <h4 className="text-white font-semibold mb-3">Report Details</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400">Reported User ID:</p>
                                                <p className="text-white font-mono">{selectedReport.reported_user_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Current Status:</p>
                                                <p className="text-white">{selectedReport.status}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Reporter Name:</p>
                                                <p className="text-white">{selectedReport.reporter_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Reporter Email:</p>
                                                <p className="text-white">{selectedReport.reporter_email}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <h4 className="text-white font-semibold mb-3">Reported Account Details</h4>
                                            {(selectedReport.user_primary_id || selectedReport.first_name) ? (
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-slate-400">Account Name:</p>
                                                        <p className="text-white font-semibold">{selectedReport.first_name} {selectedReport.last_name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-400">Account Role:</p>
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedReport.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                                                            selectedReport.role === 'professor' ? 'bg-indigo-900 text-indigo-200' :
                                                                'bg-emerald-900 text-emerald-200'
                                                            }`}>
                                                            {selectedReport.role}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-400">Account Email:</p>
                                                        <p className="text-white">{selectedReport.email}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-400">Database ID:</p>
                                                        <p className="text-slate-500 font-mono">#{selectedReport.user_primary_id}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                                    <div>
                                                        <strong>User Not Found.</strong> The reported account may have been deleted or does not exist in the database.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {selectedReport.description && (
                                            <div className="mt-3">
                                                <p className="text-slate-400 text-sm">Description:</p>
                                                <p className="text-slate-300 text-sm mt-1">{selectedReport.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* COR Verification Document */}
                                <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
                                    <h4 className="text-white font-semibold mb-3">Verification Document (COR)</h4>
                                    {selectedReport.certificate_of_registration ? (
                                        <div className="aspect-video bg-slate-900 rounded border border-slate-700 overflow-hidden">
                                            <img
                                                src={`${getBackendUrl()}${selectedReport.certificate_of_registration}`}
                                                alt="Certificate of Registration"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-slate-700 border-dashed rounded text-center text-slate-500 text-sm">
                                            No Certificate of Registration uploaded.
                                        </div>
                                    )}
                                </div>

                                {/* ID Photo Verification Document */}
                                <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
                                    <h4 className="text-white font-semibold mb-3">Verification Document (ID Photo)</h4>
                                    {selectedReport.id_photo ? (
                                        <div className="aspect-video bg-slate-900 rounded border border-slate-700 overflow-hidden">
                                            <img
                                                src={`${getBackendUrl()}${selectedReport.id_photo}`}
                                                alt="ID Photo"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-slate-700 border-dashed rounded text-center text-slate-500 text-sm">
                                            No ID Photo uploaded.
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'investigating')}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Mark as Investigating
                                    </button>
                                    <button
                                        onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'resolved')}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Mark as Resolved
                                    </button>
                                    <button
                                        onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'dismissed')}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => setSelectedReport(null)}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div >
                    )
                }

                {
                    actionModal.isOpen && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
                                <h3 className="text-xl font-bold text-white mb-4">
                                    {actionModal.type === 'resolved' ? 'Resolve Report' : 'Dismiss Report'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2">
                                            {actionModal.type === 'resolved' ? 'Resolution Note (Email Content)' : 'Reason for Dismissal (Email Content)'}
                                        </label>
                                        <textarea
                                            value={actionNote}
                                            onChange={(e) => setActionNote(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:outline-none focus:border-brand-500 h-32"
                                            placeholder={actionModal.type === 'resolved' ? 'Explain how the issue was resolved...' : 'Explain why this report is being dismissed...'}
                                        />
                                    </div>

                                    {actionModal.type === 'resolved' && (
                                        <>
                                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                                <label className="block text-slate-300 text-sm font-semibold mb-3">
                                                    Resolution Outcome *
                                                </label>
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-brand-500/50 transition-colors">
                                                        <input
                                                            type="radio"
                                                            id="outcome-reported"
                                                            name="outcome"
                                                            value="reported_is_impostor"
                                                            checked={resolutionOutcome === 'reported_is_impostor'}
                                                            onChange={(e) => setResolutionOutcome(e.target.value)}
                                                            className="w-5 h-5 mt-0.5 text-brand-500 bg-slate-700 border-slate-600 focus:ring-brand-500"
                                                        />
                                                        <label htmlFor="outcome-reported" className="text-sm text-slate-200 cursor-pointer">
                                                            <div className="font-semibold text-white">Reported Account is the Impostor</div>
                                                            <div className="text-xs text-slate-400 mt-1">The account using "{selectedReport?.reported_user_id}" is fraudulent</div>
                                                        </label>
                                                    </div>
                                                    <div className="flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-brand-500/50 transition-colors">
                                                        <input
                                                            type="radio"
                                                            id="outcome-reporter"
                                                            name="outcome"
                                                            value="reporter_is_impostor"
                                                            checked={resolutionOutcome === 'reporter_is_impostor'}
                                                            onChange={(e) => setResolutionOutcome(e.target.value)}
                                                            className="w-5 h-5 mt-0.5 text-brand-500 bg-slate-700 border-slate-600 focus:ring-brand-500"
                                                        />
                                                        <label htmlFor="outcome-reporter" className="text-sm text-slate-200 cursor-pointer">
                                                            <div className="font-semibold text-white">Reporter Filed False Claim</div>
                                                            <div className="text-xs text-slate-400 mt-1">The report was unfounded or malicious</div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    id="deleteUser"
                                                    checked={deleteUser}
                                                    onChange={(e) => setDeleteUser(e.target.checked)}
                                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-red-600 focus:ring-red-500"
                                                />
                                                <label htmlFor="deleteUser" className="text-sm text-red-200 cursor-pointer">
                                                    Delete Fraudulent Account (Irreversible)
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={closeActionModal}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmAction}
                                        className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${actionModal.type === 'resolved'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-600 hover:bg-gray-700'
                                            }`}
                                    >
                                        Confirm {actionModal.type === 'resolved' ? 'Resolve' : 'Dismiss'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {
                    selectedProfessor && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <UserCheck className="w-6 h-6 text-brand-500" />
                                        Verify Professor
                                    </h3>
                                    <button
                                        onClick={() => setSelectedProfessor(null)}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex gap-6">
                                        <div className="w-1/3">
                                            <div className="aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative group">
                                                {selectedProfessor.id_photo ? (
                                                    <>
                                                        <img
                                                            src={getProfilePictureUrl(selectedProfessor.id_photo) || ''}
                                                            alt="ID Photo"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <a
                                                            href={getProfilePictureUrl(selectedProfessor.id_photo) || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white hover:text-brand-400 cursor-pointer"
                                                        >
                                                            <ExternalLink size={24} />
                                                            <span className="text-xs font-bold">View Full Image</span>
                                                        </a>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                        No Photo
                                                    </div>
                                                )}
                                            </div>
                                            {selectedProfessor.id_photo && (
                                                <a
                                                    href={getProfilePictureUrl(selectedProfessor.id_photo) || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full text-center mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-brand-400 py-2 rounded transition-colors"
                                                >
                                                    View Full Image
                                                </a>
                                            )}


                                        </div>
                                        <div className="w-2/3 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-slate-400 text-sm">First Name</p>
                                                    <p className="text-white font-medium text-lg">{selectedProfessor.first_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-sm">Last Name</p>
                                                    <p className="text-white font-medium text-lg">{selectedProfessor.last_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-sm">Middle Name</p>
                                                    <p className="text-white font-medium">{selectedProfessor.middle_name || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-sm">Professor ID</p>
                                                    <p className="text-white font-mono bg-slate-800 px-2 py-1 rounded inline-block">
                                                        {selectedProfessor.user_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-sm">Email Address</p>
                                                <p className="text-white font-medium">{selectedProfessor.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-sm">Registration Date</p>
                                                <p className="text-white">{new Date(selectedProfessor.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <p className="text-slate-400 text-sm mb-3">Verification Action</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(selectedProfessor)}
                                                disabled={actionLoading}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/20 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                Approve Registration
                                            </button>
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="Reason for rejection..."
                                                    className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-red-500"
                                                />
                                                <button
                                                    onClick={handleRejectClick}
                                                    disabled={actionLoading || !rejectReason}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

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
            </main >
        </div >
    );
}
