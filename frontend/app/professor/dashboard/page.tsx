'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { logout, getToken, getUser } from '@/utils/auth';
import SessionTimeout from '@/components/SessionTimeout';
import { Home, BookOpen, Monitor, BarChart3, Calendar } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ClassesTab from './tabs/ClassesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import MonitorTab from './tabs/MonitorTab';
import ScheduleTab from './tabs/ScheduleTab';

interface Class {
    id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    schedule_json: string;
    student_count: number;
    is_archived: number;
}

type TabType = 'home' | 'classes' | 'schedule' | 'monitor' | 'analytics';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('home');

    // Handle URL Tab Switching
    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabType;
        if (tabParam && ['home', 'classes', 'schedule', 'monitor', 'analytics'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Initial Data Fetch
    useEffect(() => {
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
        const currentIndex = tabOrder.indexOf(activeTab);
        if (currentIndex < tabOrder.length - 1) {
            handleTabChange(tabOrder[currentIndex + 1]);
        }
    };

    const handleSwipeRight = () => {
        const currentIndex = tabOrder.indexOf(activeTab);
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
        <div className="min-h-screen bg-maroon-950 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
            <div className="text-secondary/40 text-[10px] font-black uppercase tracking-widest animate-pulse">Establishing secure connection...</div>
        </div>
    );

    const tabs = [
        { id: 'home' as TabType, label: 'Home', icon: Home },
        { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
        { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
        { id: 'monitor' as TabType, label: 'Monitor', icon: Monitor },
        { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },

    ];

    return (
        <div className="min-h-screen bg-maroon-950 font-sans selection:bg-brand-gold/20 selection:text-brand-gold">
            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">

                {/* Tab Navigation */}
                <div className="sticky top-20 z-40 bg-maroon-950/90 backdrop-blur-xl border-b border-white/5 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-0 transition-all duration-300">
                    <div className="flex gap-2 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap group ${activeTab === tab.id
                                        ? 'text-brand-gold border-brand-gold bg-brand-gold/5'
                                        : 'text-secondary/40 border-transparent hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-brand-gold' : 'text-secondary/20'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div key={activeTab} className="tab-content-fade min-h-[60vh]">
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
            <div className="min-h-screen bg-maroon-950 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
                <div className="text-secondary/40 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Interface...</div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
