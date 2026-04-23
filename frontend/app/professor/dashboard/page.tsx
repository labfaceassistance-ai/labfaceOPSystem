'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { useNavigation } from '@/context/NavigationContext';
import { logout, getToken, getUser } from '@/utils/auth';
import SessionTimeout from '@/components/SessionTimeout';
import { Home, BookOpen, Monitor, BarChart3, Calendar } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ClassesTab from './tabs/ClassesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import MonitorTab from './tabs/MonitorTab';
import ScheduleTab from './tabs/ScheduleTab';
import IdentityBackground from '@/components/IdentityBackground';

type TabType = 'home' | 'classes' | 'schedule' | 'monitor' | 'analytics';

interface Class {
    id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    schedule_json: string;
    student_count: number;
    is_archived: number;
    active_session_type?: string;
    active_session_id?: number;
    school_year?: string;
    semester?: string;
    created_at?: string;
}

const DASHBOARD_TABS = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'monitor' as TabType, label: 'Monitor', icon: Monitor },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
];

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { setTabs, activeTab, setActiveTab } = useNavigation();

    // Initial Data Fetch
    useEffect(() => {
        setTabs(DASHBOARD_TABS);
        setActiveTab('home');

        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await axios.get(`${API_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

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
                // No need for manual localStorage.setItem, getUser() hydrates sessionStorage

                if (userData.professorId) {
                    fetchClasses(userData.professorId);
                } else {
                    setLoading(false);
                }
            } catch (error: any) {
                console.error('Failed to fetch user data:', error);

                if (error.response?.status === 401 || error.response?.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }

                const storedUser = getUser();
                if (storedUser) {
                    console.log('Using cached user data from storage');
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    if (parsedUser.professorId) {
                        fetchClasses(parsedUser.professorId);
                    } else {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                    window.location.href = '/login';
                }
            }
        };

        fetchUserData();

        // Load saved tab from localStorage ONLY if no URL param exists
        if (!searchParams.get('tab')) {
            const savedTab = localStorage.getItem('professorDashboardTab') as TabType;
            if (savedTab && ['home', 'classes', 'schedule', 'monitor', 'analytics'].includes(savedTab)) {
                setActiveTab(savedTab);
            }
        }

        // Cleanup tabs on unmount
        return () => setTabs([]);
    }, []);

    const fetchClasses = async (professorId: string, isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoading(true);
            setError(null);
        }
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/professor/${professorId}`);
            setClasses(response.data);
            setError(null);
        } catch (error: any) {
            console.error("Failed to fetch classes", error);
            setError("Failed to load classes. Please try again.");
        } finally {
            if (!isBackgroundRefresh) setLoading(false);
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        localStorage.setItem('professorDashboardTab', tab);

        // Immediate refresh on tab change to ensure data is current
        if (user?.professorId) {
            fetchClasses(user.professorId, true);
        }
    };

    // Swipe Navigation Logic
    const tabOrder: TabType[] = ['home', 'classes', 'schedule', 'monitor', 'analytics'];
    const handleSwipeLeft = () => {
        const currentIndex = tabOrder.indexOf(activeTab as TabType);
        if (currentIndex < tabOrder.length - 1) {
            handleTabChange(tabOrder[currentIndex + 1]);
        }
    };

    const handleSwipeRight = () => {
        const currentIndex = tabOrder.indexOf(activeTab as TabType);
        if (currentIndex > 0) {
            handleTabChange(tabOrder[currentIndex - 1]);
        }
    };

    // useSwipe removed — hook deleted in Phase 2 cleanup

    // Auto-refresh interval
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (user?.professorId) {
            // Refresh every 30 seconds in the background
            intervalId = setInterval(() => {
                fetchClasses(user.professorId, true);
            }, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user?.professorId]);

    const handleRefresh = (isBackground = true) => {
        if (user?.professorId) {
            fetchClasses(user.professorId, isBackground);
        }
    };

    const handleExtendSession = useCallback(async () => {
        const token = getToken();
        console.log('Extending session...');
        try {
            // Ping backend to keep session alive
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            if (token) {
                await axios.get(`${API_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error("Failed to ping backend session:", error);
        }
    }, []);

    const handleLogout = useCallback(() => {
        logout('/login');
    }, []);

    if (!user || loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-12 relative overflow-hidden bg-[#F8FAFC]">
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-blueprint" />
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-32 h-32 mb-10 relative">
                    <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-[2.5rem] rotate-45"></div>
                    <div className="absolute inset-0 border-4 border-[#041C3C] border-t-transparent rounded-[2.5rem] rotate-45 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img src="/logo.png" alt="LabFace" className="w-12 h-12 object-contain opacity-50 -rotate-45" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="text-[#041C3C] text-[11px] font-black uppercase tracking-[0.4em] animate-pulse font-outfit italic">Loading Faculty Workspace...</div>
                    <div className="h-1 w-48 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#5CB4E4] animate-loading-bar" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent font-outfit select-none relative overflow-hidden">
            <IdentityBackground />
            
            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 pt-28 pb-12 relative z-10">
                {/* Tab Content */}
                <div key={activeTab} className="tab-content-fade min-h-[70vh] mt-8">
                    {activeTab === 'home' && <HomeTab user={user} classes={classes} error={error} />}
                    {activeTab === 'classes' && <ClassesTab user={user} classes={classes} loading={loading} onRefresh={handleRefresh} onTabChange={handleTabChange} />}
                    {activeTab === 'schedule' && <ScheduleTab user={user} classes={classes} />}
                    {activeTab === 'monitor' && <MonitorTab />}
                    {activeTab === 'analytics' && <AnalyticsTab user={user} classes={classes} />}
                </div>
            </main>

        </div>
    );
}

export default function ProfessorDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <div className="w-16 h-16 border-4 border-[#041C3C]/10 border-t-[#041C3C] rounded-2xl rotate-45 animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
