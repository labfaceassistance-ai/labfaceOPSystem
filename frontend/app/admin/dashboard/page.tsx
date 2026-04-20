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

const IdentityNode = ({ className = "", size = 120 }) => (
    <div className={`identity-node opacity-[0.15] ${className}`} style={{ width: size, height: size }}>
       <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g>
             <path d="M100,30 Q60,30 50,80 T100,170 T150,80 Q140,30 100,30 Z" fill="none" stroke="currentColor" className="text-identity-sky" strokeWidth="2" />
             <line x1="100" y1="30" x2="100" y2="170" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="55" y1="110" x2="145" y2="110" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <circle cx="75" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="125" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="110" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="30" r="2" fill="currentColor" className="text-identity-navy" />
             <circle cx="100" cy="170" r="2" fill="currentColor" className="text-identity-navy" />
             <line x1="75" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
             <line x1="125" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
          </g>
       </svg>
    </div>
 );

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

    // useSwipe removed â€” hook was deleted in Phase 2 cleanup

    const handleLogout = () => {
        logout('/admin/login');
    };

    const handleExtendSession = async () => {
        const token = localStorage.getItem('token');
        console.log('Extending session...');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
                    <IdentityNode className="top-[10%] left-[5%]" size={160} />
                    <IdentityNode className="bottom-[10%] right-[5%]" size={220} />
                    <div className="absolute inset-0 bg-blueprint opacity-[0.05]"></div>
                </div>
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-identity-sky/10"></div>
                    <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] animate-pulse">Initializing LabFace System...</p>
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative selection:bg-identity-sky/10 selection:text-identity-navy page-transition transition-colors duration-500">
             {/* System Identity Nodes - 4 Layer Background */}
             <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-identity-sky/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-identity-navy/5 rounded-full blur-[120px] animate-pulse" />
                <IdentityNode className="top-[10%] left-[5%]" size={160} />
                <IdentityNode className="bottom-[10%] right-[5%]" size={220} />
                <div className="absolute inset-0 bg-blueprint opacity-[0.05] pointer-events-none"></div>
            </div>

            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 relative z-10">
                {/* Standard Page Header */}
                <div className="flex items-center gap-6 mb-12 animate-fade-up">
                    <div className="p-4 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10 shadow-inner group">
                        <LayoutDashboard size={32} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-identity-navy tracking-tighter uppercase font-outfit italic">Control Center</h1>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-1">High-Authority System Administration</p>
                    </div>
                </div>

                {/* Standardized Tabs */}
                <DashboardTabs 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                />

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
                                    className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer bg-white/40"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-identity-sky/10 rounded-2xl flex items-center justify-center text-identity-sky border border-identity-sky/20 group-hover:scale-110 transition-transform">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Pending</p>
                                            <p className="text-2xl font-black text-identity-navy tracking-tighter italic">{stats?.pendingProfessors || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('admin');
                                        setUserStatusFilter('all');
                                    }}
                                    className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer bg-white/40"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:scale-110 transition-transform">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Admins</p>
                                            <p className="text-2xl font-black text-identity-navy tracking-tighter italic">{totalAdmins}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('student');
                                        setUserStatusFilter('all');
                                    }}
                                    className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer bg-white/40"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Students</p>
                                            <p className="text-2xl font-black text-identity-navy tracking-tighter italic">{totalStudents}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('users');
                                        setUserRoleFilter('professor');
                                        setUserStatusFilter('all');
                                    }}
                                    className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer bg-white/40"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-identity-sky/10 rounded-2xl flex items-center justify-center text-identity-sky border border-identity-sky/20 group-hover:scale-110 transition-transform">
                                            <Briefcase size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Professors</p>
                                            <p className="text-2xl font-black text-identity-navy tracking-tighter italic">{totalProfessors}</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setActiveTab('sessions');
                                        fetchSessions();
                                    }}
                                    className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all cursor-pointer bg-white/40"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20 group-hover:scale-110 transition-transform">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Sessions</p>
                                            <p className="text-2xl font-black text-identity-navy tracking-tighter italic">{activeSessionsCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-sm p-8 mb-8">
                                <h2 className="text-2xl font-black text-identity-navy mb-8 flex items-center gap-4 uppercase tracking-tighter italic font-outfit">
                                    <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                        <Clock className="w-6 h-6 text-identity-sky" />
                                    </div>
                                    Pending Approvals
                                    {filteredProfessors.length > 0 && (
                                        <span className="bg-identity-sky/10 text-identity-sky border border-identity-sky/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ml-auto">
                                            {filteredProfessors.length} PENDING
                                        </span>
                                    )}
                                </h2>

                                {filteredProfessors.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[24px] border border-slate-100">
                                        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <UserCheck className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="text-identity-navy text-lg font-black uppercase tracking-tight italic">Queue Depleted</p>
                                        <p className="text-slate-400 text-[10px] mt-3 uppercase tracking-[0.15em] font-black">All requests processed</p>
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
                                <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic font-outfit">
                                    <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                        <Camera className="w-6 h-6 text-identity-sky" />
                                    </div>
                                    Live Security Feed
                                </h2>
                                <Link 
                                    href="/admin/camera-test" 
                                    className="bg-identity-navy text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-4 transition-all hover:bg-identity-sky hover:scale-[1.02] active:scale-95 shadow-xl shadow-identity-navy/10"
                                >
                                    <Monitor className="w-4 h-4 text-white" />
                                    Test Face Recognition
                                </Link>
                            </div>                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                                <div className="identity-glass rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 p-4 shadow-xl group overflow-hidden relative overflow-hidden transition-all hover:shadow-2xl">
                                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-50" />
                                    <div className="px-6 py-4 flex justify-between items-center relative z-10">
                                        <h3 className="text-[10px] font-black text-identity-navy flex items-center gap-4 uppercase tracking-[0.15em] italic font-outfit">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                            CAMERA 01 <span className="text-identity-sky/60 font-bold ml-2">MAIN ENTRANCE</span>
                                        </h3>
                                        <div className="text-[8px] font-black text-slate-300 tracking-[0.15em] font-mono">192.168.1.220:554</div>
                                    </div>
                                    <div className="aspect-video w-full relative">
                                        <VideoFeed
                                            src="/api/ai/video_feed/1"
                                            alt="Camera 1"
                                            label="MAIN ENTRANCE"
                                            className="w-full h-full rounded-[2rem]"
                                        />
                                    </div>
                                </div>
                                <div className="identity-glass rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 p-4 shadow-xl group overflow-hidden relative overflow-hidden transition-all hover:shadow-2xl">
                                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-50" />
                                    <div className="px-6 py-4 flex justify-between items-center relative z-10">
                                        <h3 className="text-[10px] font-black text-identity-navy flex items-center gap-4 uppercase tracking-[0.15em] italic font-outfit">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                            CAMERA 02 <span className="text-identity-sky/60 font-bold ml-2">EXIT CORRIDOR</span>
                                        </h3>
                                        <div className="text-[8px] font-black text-slate-300 tracking-[0.15em] font-mono">192.168.1.221:554</div>
                                    </div>
                                    <div className="aspect-video w-full relative">
                                        <VideoFeed
                                            src="/api/ai/video_feed/2"
                                            alt="Camera 2"
                                            label="EXIT CORRIDOR"
                                            className="w-full h-full rounded-[2rem]"
                                        />
                                    </div>
                                </div>
                            </div>

                             <h2 className="text-2xl font-black text-identity-navy mb-8 flex items-center gap-4 uppercase tracking-tighter italic mt-16 font-outfit">
                                <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                    <History className="w-6 h-6 text-identity-sky" />
                                </div>
                                System Audit Log
                            </h2>
                             <div className="identity-glass border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl relative bg-white/40">
                                {stats?.recentActions && stats.recentActions.length > 0 ? (
                                    <div className="divide-y divide-slate-100 relative z-10">
                                        {stats.recentActions.slice(0, 10).map((action) => (
                                            <div key={action.id} className="p-6 flex items-center justify-between hover:bg-identity-navy/[0.02] transition-colors group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-identity-sky/10 flex items-center justify-center text-identity-sky border border-identity-sky/20 group-hover:bg-identity-navy group-hover:text-identity-navy transition-all font-black uppercase text-xs">
                                                        {action.action_type[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-identity-navy font-black text-xs uppercase tracking-[0.15em] group-hover:text-identity-sky transition-colors">
                                                            {action.action_type.replace('_', ' ')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">
                                                            MODERATOR: {action.first_name} {action.last_name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">
                                                        {new Date(action.created_at).toLocaleString()}
                                                    </p>
                                                    {action.details && (
                                                        <p className="text-[9px] font-bold text-slate-400 mt-2 max-w-xs truncate uppercase tracking-[0.15em]">
                                                            {action.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-20 text-center relative z-10">
                                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <History className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <p className="text-identity-navy text-lg font-black uppercase tracking-tight italic">System Log is Empty</p>
                                        <p className="text-slate-400 text-[10px] mt-3 uppercase tracking-[0.15em] font-black">No recent system interactions found</p>
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
                                    <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic font-outfit">
                                        <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                            <Users className="w-6 h-6 text-identity-sky" />
                                        </div>
                                        Registered Accounts
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="relative group min-w-[280px]">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-identity-sky transition-colors" />
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
                                                className="bg-white/60 border border-slate-100 text-identity-navy pl-12 pr-10 py-4 rounded-2xl focus:outline-none focus:border-identity-sky w-full placeholder:text-slate-200 font-bold uppercase text-[10px] tracking-[0.15em] transition-all shadow-sm"
                                            />
                                            {userSearch && (
                                                <button
                                                    onClick={() => {
                                                        setUserSearch('');
                                                        fetchUsers(userRoleFilter, '');
                                                    }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-identity-navy transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <select
                                            value={userRoleFilter}
                                            onChange={(e) => setUserRoleFilter(e.target.value)}
                                            className="bg-white/60 border border-slate-100 text-identity-navy px-6 py-4 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all appearance-none cursor-pointer hover:bg-white shadow-sm min-w-[140px]"
                                        >
                                            <option value="all">All Roles</option>
                                            <option value="student">Students</option>
                                            <option value="professor">Professors</option>
                                            <option value="admin">Admins</option>
                                        </select>
                                        <select
                                            value={userStatusFilter}
                                            onChange={(e) => setUserStatusFilter(e.target.value)}
                                            className="bg-white/60 border border-slate-100 text-identity-navy px-6 py-4 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all appearance-none cursor-pointer hover:bg-white shadow-sm min-w-[140px]"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="approved">Approved</option>
                                            <option value="pending">Pending</option>
                                            <option value="rejected">Rejected/Deactivated</option>
                                        </select>
                                        <button
                                            onClick={() => fetchUsers()}
                                            className="bg-identity-navy hover:bg-identity-sky text-white p-4 min-h-[44px] min-w-[44px] rounded-2xl transition-all shadow-xl shadow-identity-navy/10 active:scale-95 flex items-center justify-center group"
                                            title="Refresh List"
                                        >
                                            <RefreshCw className={`w-5 h-5 transition-transform group-hover:rotate-180 ${loadingUsers ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="identity-glass border border-slate-100 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl relative bg-white/40">
                                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                                    {loadingUsers ? (
                                        <div className="p-20 relative z-10 space-y-4">
                                            <Skeleton className="h-16 w-full rounded-2xl" />
                                            <Skeleton className="h-16 w-full rounded-2xl" />
                                            <Skeleton className="h-16 w-full rounded-2xl" />
                                            <Skeleton className="h-16 w-full rounded-2xl" />
                                            <Skeleton className="h-16 w-full rounded-2xl" />
                                        </div>
                                    ) : systemUsers.length === 0 ? (
                                        <div className="p-20 text-center relative z-10">
                                            <EmptyState
                                                icon={Users}
                                                title="No Match Found"
                                                description="Search criteria returned no validated records."
                                            />
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto relative z-10 table-responsive-wrapper">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/80 border-b border-identity-sky/10 italic">
                                                        <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px] font-outfit">Subject Identity</th>
                                                        <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Course Code</th>
                                                        <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">User Role</th>
                                                        <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Verification Status</th>
                                                        <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Establishment Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {systemUsers.map((u) => (
                                                        <tr key={u.id} className="hover:bg-identity-navy/[0.02] transition-colors group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-12 h-12 rounded-2xl bg-identity-sky/10 flex items-center justify-center text-identity-sky border border-identity-sky/20 font-black group-hover:bg-identity-navy group-hover:text-identity-navy transition-all shadow-sm uppercase text-xs">
                                                                        {u.first_name?.[0] || 'U'}{u.last_name?.[0] || 'N'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-identity-navy font-black text-xs uppercase tracking-[0.15em] italic">{u.first_name} {u.last_name}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5">{u.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <code className="text-[10px] bg-slate-50 px-3 py-1.5 rounded-2xl text-identity-sky font-mono border border-slate-100 font-bold tracking-[0.15em] group-hover:border-identity-sky/30 transition-colors">
                                                                    {u.user_id}
                                                                </code>
                                                            </td>
                                                            <td className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.15em]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                                        u.role === 'professor' ? 'bg-identity-sky shadow-[0_0_8px_rgba(92,180,228,0.5)]' :
                                                                            'bg-slate-400'
                                                                        }`} />
                                                                    <span className={`${u.role === 'admin' ? 'text-rose-500' :
                                                                        u.role === 'professor' ? 'text-identity-sky' :
                                                                            'text-slate-400'
                                                                        }`}>
                                                                        {u.role}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm italic ${u.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                    u.approval_status === 'pending' ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/20' :
                                                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                                                    }`}>
                                                                    {u.approval_status}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                                {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="px-8 py-6 bg-identity-navy/[0.02] border-t border-identity-sky/10 flex justify-between items-center relative z-10">
                                        <p className="text-[9px] text-slate-300 italic font-black uppercase tracking-[0.15em]">Database Â· Secure</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse" />
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
                                <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic font-outfit">
                                    <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                        <Activity className="w-6 h-6 text-identity-sky" />
                                    </div>
                                    Live Monitoring
                                </h2>
                                <button
                                    onClick={() => fetchSessions()}
                                    className="bg-identity-navy hover:bg-identity-navy/90 text-identity-navy p-3 min-h-[44px] min-w-[44px] rounded-2xl transition-all shadow-xl shadow-identity-navy/10 active:scale-95 flex items-center justify-center group"
                                    title="Refresh List"
                                >
                                    <RefreshCw className={`w-5 h-5 transition-transform group-hover:rotate-180 ${loadingSessions ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="identity-glass border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl relative bg-white/40">
                                {loadingSessions ? (
                                    <div className="p-20 relative z-10 space-y-4">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : activeSessions.length === 0 ? (
                                    <div className="p-20 text-center relative z-10">
                                        <EmptyState
                                            icon={Activity}
                                            title="No Active Sessions"
                                            description="No active attendance protocols are currently running."
                                        />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto relative z-10 table-responsive-wrapper">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-identity-navy/[0.02] border-b border-identity-sky/10">
                                                    <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Class Name</th>
                                                    <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Authorized Proctor</th>
                                                    <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Type</th>
                                                    <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Initialization</th>
                                                    <th className="px-8 py-6 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Active Units</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeSessions.map((session) => (
                                                    <tr key={session.id} className="hover:bg-identity-navy/[0.02] transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div>
                                                                <p className="text-identity-navy font-black text-xs uppercase tracking-[0.15em] italic">{session.subject_code}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5">{session.subject_name} â€” SECTION {session.section}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-identity-navy text-xs font-black uppercase tracking-[0.15em]">{session.professor_name}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm italic ${session.session_type === 'regular' ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/20' :
                                                                'bg-amber-100 text-amber-600 border-amber-200'
                                                                }`}>
                                                                {(session.session_name || session.session_type).toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                            {new Date(session.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(92,180,228,0.5)]" />
                                                                <span className="text-identity-navy font-black text-xs uppercase tracking-[0.15em]">{session.student_count} NODES</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="px-8 py-6 bg-identity-navy/[0.02] border-t border-identity-sky/10 flex justify-between items-center relative z-10">
                                    <p className="text-[9px] text-slate-300 italic font-black uppercase tracking-[0.15em]">Live Camera Feed</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse" />
                                        {activeSessions.length} MONITORING NODES
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic font-outfit">
                                    <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    Identity Verification Logs
                                </h2>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={reportStatusFilter}
                                        onChange={(e) => {
                                            setReportStatusFilter(e.target.value);
                                            setTimeout(() => fetchReports(), 100);
                                        }}
                                        className="bg-white/60 border border-slate-100 text-identity-navy px-6 py-3 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all appearance-none cursor-pointer shadow-sm min-w-[200px]"
                                    >
                                        <option value="all">Display All Cameras</option>
                                        <option value="pending">Awaiting Review</option>
                                        <option value="investigating">Under Investigation</option>
                                        <option value="resolved">Resolved / Secure</option>
                                        <option value="dismissed">Dismissed / Void</option>
                                    </select>
                                </div>
                            </div>

                            <div className="identity-glass border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] p-10 shadow-xl relative overflow-hidden bg-white/40">
                                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                                {reports.length === 0 ? (
                                    <div className="text-center py-24 relative z-10">
                                        <EmptyState
                                            icon={Shield}
                                            title="No Anomalies Detected"
                                            description="There are no security violations to report."
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6 relative z-10">
                                        {reports.map((report) => (
                                            <div key={report.id} className="identity-glass border border-identity-sky/10 rounded-[1.5rem] md:rounded-[2rem] p-8 hover:border-identity-sky/30 transition-all group shadow-xl relative overflow-hidden bg-white/50 backdrop-blur-sm">
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="bg-rose-500/5 text-rose-500 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/10 italic">
                                                                LOG_ENTRY #{report.id}
                                                            </div>
                                                            <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm italic ${
                                                                report.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                report.status === 'investigating' ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/20' :
                                                                report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                                {report.status === 'pending' ? 'LOG_AWAITING' : `LOG_${report.status.toUpperCase()}`}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div>
                                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mb-2">Target Face Profile</p>
                                                                <p className="text-identity-sky font-mono bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100 inline-block text-xs font-bold font-mono tracking-[0.15em]">{report.reported_user_id}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mb-2">Claimant Profile</p>
                                                                <p className="text-identity-navy font-black text-xs uppercase tracking-[0.15em] italic">{report.reporter_name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="w-full md:w-auto bg-identity-navy hover:bg-identity-sky text-white px-8 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-4 group active:scale-95 shadow-xl shadow-identity-navy/10"
                                                    >
                                                        <Eye className="w-4 h-4 text-identity-sky transition-transform group-hover:scale-125" />
                                                        Verify Case
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
                    <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-white border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] p-10 max-w-4xl w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <h3 className="text-3xl font-black text-rose-500 flex items-center gap-4 uppercase tracking-tighter italic">
                                    <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                                        <AlertTriangle className="w-8 h-8" />
                                    </div>
                                    Anomalous Flag
                                    <span className="text-slate-200 text-sm ml-4 font-mono tracking-[0.15em] text-[10px]">#{selectedReport.id}</span>
                                </h3>
                                <button onClick={() => setSelectedReport(null)} className="text-slate-300 hover:text-identity-navy transition-all hover:rotate-90">
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="space-y-8 mb-10 relative z-10">
                                <div className="bg-slate-50 rounded-[2rem] p-8 border border-identity-sky/5 shadow-inner">
                                    <h4 className="text-slate-400 font-black uppercase tracking-[0.15em] text-[9px] mb-6 flex items-center gap-4 italic">
                                        <div className="w-1.5 h-1.5 bg-identity-sky rounded-full" />
                                        Student Search
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-[9px] uppercase tracking-[0.15em] font-black italic">
                                        <div>
                                            <p className="text-slate-300 mb-2.5">Face Profile</p>
                                            <p className="text-identity-sky font-mono bg-white px-3 py-1.5 rounded-2xl border border-slate-100 inline-block text-xs font-bold">{selectedReport.reported_user_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-300 mb-2.5">Current Status</p>
                                            <p className="text-identity-navy bg-white px-3 py-1.5 rounded-2xl border border-slate-100 inline-block text-xs font-bold">{selectedReport.status.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-300 mb-2.5">Claimant Profile</p>
                                            <p className="text-identity-navy text-xs font-bold">{selectedReport.reporter_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-300 mb-2.5">Contact Link</p>
                                            <p className="text-identity-navy text-xs font-bold lowercase">{selectedReport.reporter_email}</p>
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-10 border-t border-white/5">
                                        <h4 className="text-rose-500 font-black uppercase tracking-[0.15em] text-[10px] mb-6 flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                            Reported Student Details
                                        </h4>
                                        {(selectedReport.user_primary_id || selectedReport.first_name) ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[10px] uppercase tracking-[0.15em] font-black">
                                                <div>
                                                    <p className="text-slate-400 mb-2.5">Legal Name</p>
                                                    <p className="text-identity-navy text-xs font-bold italic tracking-tight">{selectedReport.first_name} {selectedReport.last_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 mb-2.5">Class Access</p>
                                                    <span className={`inline-block px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm ${selectedReport.role === 'admin' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                                        selectedReport.role === 'professor' ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/20' :
                                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        }`}>
                                                        {selectedReport.role?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 mb-2.5">Main Contact</p>
                                                    <p className="text-identity-navy text-xs lowercase font-bold italic tracking-tight">{selectedReport.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 mb-2.5">Database ID</p>
                                                    <p className="text-slate-200 font-mono text-xs">#{selectedReport.user_primary_id}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-500 text-[10px] flex items-center gap-4 font-black uppercase tracking-[0.15em] shadow-inner">
                                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                                Student not found in the database. The account may have been deleted.
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.description && (
                                        <div className="mt-8 pt-8 border-t border-slate-100">
                                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-[0.15em] mb-4">Report Description</p>
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-identity-navy text-xs leading-relaxed font-bold">
                                                "{selectedReport.description}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-identity-sky/5 shadow-inner">
                                        <h4 className="text-slate-400 font-black uppercase tracking-[0.15em] text-[9px] mb-4 italic">Evidence: COR Proof</h4>
                                        {selectedReport.certificate_of_registration ? (
                                            <div className="aspect-video bg-white rounded-2xl border border-identity-sky/10 overflow-hidden relative group shadow-sm">
                                                {isPDF(selectedReport.certificate_of_registration) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-identity-sky bg-slate-50">
                                                        <FileText size={40} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.15em]">PDF ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedReport.certificate_of_registration) || ''}
                                                        alt="COR"
                                                        className="w-full h-full object-contain grayscale brightness-90 transition-all group-hover:grayscale-0 group-hover:brightness-100"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedReport.certificate_of_registration) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-identity-navy/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 text-identity-navy backdrop-blur-sm">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">EXPAND SOURCE</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="aspect-video flex items-center justify-center border border-slate-100 border-dashed rounded-2xl text-slate-200 text-[9px] font-black uppercase tracking-[0.15em] italic">MISSING_COR</div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-identity-sky/5 shadow-inner">
                                        <h4 className="text-slate-400 font-black uppercase tracking-[0.15em] text-[9px] mb-4 italic">Evidence: ID Profile</h4>
                                        {selectedReport.id_photo ? (
                                            <div className="aspect-video bg-white rounded-2xl border border-identity-sky/10 overflow-hidden relative group shadow-sm">
                                                {isPDF(selectedReport.id_photo) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-identity-sky bg-slate-50">
                                                        <FileText size={40} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.15em]">PDF ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedReport.id_photo) || ''}
                                                        alt="ID"
                                                        className="w-full h-full object-contain grayscale brightness-90 transition-all group-hover:grayscale-0 group-hover:brightness-100"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedReport.id_photo) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-identity-navy/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 text-identity-navy backdrop-blur-sm">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">EXPAND SOURCE</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="aspect-video flex items-center justify-center border border-slate-100 border-dashed rounded-2xl text-slate-200 text-[9px] font-black uppercase tracking-[0.15em] italic">MISSING_ID</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 relative z-10 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'resolved')}
                                    className="flex-1 bg-identity-navy hover:bg-identity-sky text-white px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] shadow-xl shadow-identity-navy/10 active:scale-95 italic"
                                >
                                    Initiate Investigation
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'resolved')}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] shadow-xl shadow-emerald-900/10 active:scale-95 italic"
                                >
                                    Resolve & Close
                                </button>
                                <button
                                    onClick={() => handleInitiateStatusUpdate(selectedReport.id, 'dismissed')}
                                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] active:scale-95 shadow-xl shadow-rose-900/10 italic"
                                >
                                    Void Report
                                </button>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] border border-slate-100 hover:text-identity-navy italic"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {actionModal.isOpen && (
                    <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-md flex items-center justify-center p-6 z-[60] animate-in fade-in zoom-in duration-300">
                        <div className="bg-white border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                            
                            <h3 className="text-2xl font-black text-identity-navy mb-8 uppercase tracking-tighter relative z-10 flex items-center gap-4 italic">
                                <div className="w-2 h-8 bg-identity-sky rounded-full" />
                                {actionModal.type === 'resolved' ? 'Resolution Protocol' : 'Dismissal Protocol'}
                            </h3>

                            <div className="space-y-8 relative z-10">
                                <div>
                                    <label className="block text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mb-4">
                                        {actionModal.type === 'resolved' ? 'Resolution Dispatch (Email Content)' : 'Rejection Rationale (Email Content)'}
                                    </label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 text-identity-navy rounded-[2rem] p-8 focus:outline-none focus:border-identity-sky h-40 placeholder:text-slate-200 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed shadow-inner italic"
                                        placeholder={actionModal.type === 'resolved' ? 'Define the mitigation steps taken...' : 'State the reason for voiding this claim...'}
                                    />
                                </div>

                                {actionModal.type === 'resolved' && (
                                    <>
                                        <div className="bg-slate-50 border border-identity-sky/5 rounded-[2rem] p-8 shadow-inner">
                                            <label className="block text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mb-6">
                                                Classification Outcome
                                            </label>
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-identity-sky/50 transition-all cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        id="outcome-reported"
                                                        name="outcome"
                                                        value="reported_is_impostor"
                                                        checked={resolutionOutcome === 'reported_is_impostor'}
                                                        onChange={(e) => setResolutionOutcome(e.target.value)}
                                                        className="w-5 h-5 mt-0.5 text-identity-sky bg-white border-slate-200 focus:ring-identity-sky cursor-pointer"
                                                    />
                                                    <label htmlFor="outcome-reported" className="cursor-pointer">
                                                        <div className="font-bold uppercase tracking-[0.15em] text-[10px] text-identity-navy italic">Target is Impostor</div>
                                                        <div className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.15em] mt-1 italic">Confirmed account misuse</div>
                                                    </label>
                                                </div>
                                                <div className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-identity-sky/50 transition-all cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        id="outcome-reporter"
                                                        name="outcome"
                                                        value="reporter_is_impostor"
                                                        checked={resolutionOutcome === 'reporter_is_impostor'}
                                                        onChange={(e) => setResolutionOutcome(e.target.value)}
                                                        className="w-5 h-5 mt-0.5 text-identity-sky bg-white border-slate-200 focus:ring-identity-sky cursor-pointer"
                                                    />
                                                    <label htmlFor="outcome-reporter" className="cursor-pointer">
                                                        <div className="font-bold uppercase tracking-[0.15em] text-[10px] text-identity-navy italic">False Claim Detected</div>
                                                        <div className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.15em] mt-1 italic">Claimant filed unfounded report</div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 bg-rose-50 border border-rose-100 rounded-2xl group cursor-pointer hover:bg-rose-100 transition-all shadow-sm">
                                            <input
                                                type="checkbox"
                                                id="deleteUser"
                                                checked={deleteUser}
                                                onChange={(e) => setDeleteUser(e.target.checked)}
                                                className="w-6 h-6 rounded-lg border-slate-300 bg-white text-rose-500 focus:ring-rose-500 cursor-pointer transition-all"
                                            />
                                            <label htmlFor="deleteUser" className="text-rose-500 font-black uppercase tracking-[0.15em] text-[9px] cursor-pointer group-hover:text-rose-600 italic">
                                                Permanently Delete Fraudulent Account
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-4 mt-10 relative z-10 pt-6 border-t border-slate-100">
                                <button
                                    onClick={closeActionModal}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-[0.15em] text-[10px] border border-slate-100 hover:text-identity-navy italic"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`flex-1 px-6 py-4 rounded-2xl text-white transition-all font-black uppercase tracking-[0.15em] text-[10px] shadow-xl active:scale-95 italic ${actionModal.type === 'resolved'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
                                        : 'bg-rose-500 hover:bg-rose-600 shadow-rose-900/10'
                                        }`}
                                >
                                    Execute {actionModal.type === 'resolved' ? 'Resolution' : 'Dismissal'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProfessor && (
                    <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in duration-300">
                        <div className="bg-white border border-identity-sky/10 rounded-[2rem] md:rounded-[3rem] p-10 max-w-3xl w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-50" />
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <h3 className="text-3xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic">
                                    <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                        <UserCheck className="w-8 h-8 text-identity-sky" />
                                    </div>
                                    Identity Verification
                                </h3>
                                <button onClick={() => setSelectedProfessor(null)} className="text-slate-300 hover:text-identity-navy transition-all hover:rotate-90">
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 relative z-10">
                                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                                    <div className="aspect-[3/4] bg-slate-50 rounded-[2rem] overflow-hidden border border-identity-sky/5 relative group shadow-inner">
                                        {selectedProfessor.id_photo ? (
                                            <>
                                                {isPDF(selectedProfessor.id_photo) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-identity-sky p-4 border border-slate-100 rounded-[24px]">
                                                        <FileText size={48} className="mb-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-center">PDF ENCRYPTED ARCHIVE</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getProfilePictureUrl(selectedProfessor.id_photo) || ''}
                                                        alt="Identity Badge"
                                                        className="w-full h-full object-cover grayscale brightness-90 transition-all group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105"
                                                    />
                                                )}
                                                <a href={getProfilePictureUrl(selectedProfessor.id_photo) || '#'} target="_blank" rel="noopener noreferrer" 
                                                   className="absolute inset-0 bg-identity-navy/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 text-identity-navy backdrop-blur-sm">
                                                    <ExternalLink size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">VERIFY SOURCE</span>
                                                </a>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 bg-slate-50">
                                                <Camera className="w-12 h-12 mb-3" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.4rem]">NO_DATA</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-8 lg:col-span-9 space-y-8">
                                    <div className="bg-slate-50 border border-identity-sky/10 rounded-[2rem] p-8 shadow-inner">
                                        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.15em] mb-2 italic">Subject Header</p>
                                                    <p className="text-identity-navy font-black text-xl uppercase tracking-tighter leading-none italic">{selectedProfessor.first_name} {selectedProfessor.last_name}</p>
                                                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mt-3 italic">PROCTOR LEVEL ACCESS</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.15em] mb-2 italic">Student Identification</p>
                                                    <code className="text-identity-sky font-mono bg-white px-4 py-2 rounded-2xl border border-slate-100 inline-block text-xs font-bold tracking-[0.15em]">
                                                        {selectedProfessor.user_id}
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.15em] mb-2 italic">Email Address</p>
                                                    <p className="text-identity-navy font-bold text-xs uppercase tracking-[0.15em] lowercase">{selectedProfessor.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.15em] mb-2 italic">Initialization Timestamp</p>
                                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] italic">
                                                        {new Date(selectedProfessor.created_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mb-6 flex items-center gap-4 italic">
                                            <div className="w-1 h-1 bg-identity-sky rounded-full" />
                                            Manual Verification Override
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => handleApprove(selectedProfessor)}
                                                disabled={actionLoading}
                                                className="flex-[2] bg-identity-sky hover:bg-identity-navy text-white px-8 py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-xl shadow-identity-sky/10 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 italic"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                Verify Account
                                            </button>
                                            <div className="flex-[3] flex gap-4">
                                                <input
                                                    type="text"
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="State rejection rationale..."
                                                    className="flex-1 bg-white border border-slate-200 text-identity-navy px-6 py-4 rounded-2xl focus:outline-none focus:border-rose-500 font-black uppercase text-[10px] tracking-[0.15em] placeholder:text-slate-300 transition-all shadow-sm italic"
                                                />
                                                <button
                                                    onClick={handleRejectClick}
                                                    disabled={actionLoading || !rejectReason}
                                                    className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-xl shadow-rose-900/10 disabled:opacity-50 active:scale-95 border border-rose-400/20"
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
