'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { logout, getToken, getUser } from '@/utils/auth';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import SessionTimeout from '@/components/SessionTimeout';
import { Home, BookOpen, Monitor, BarChart3, Calendar } from 'lucide-react';
import { useSwipe } from '@/hooks/useSwipe';
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
            setError(null); // Clear previous errors
        }
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/professor/${professorId}`);
            setClasses(response.data);
            setError(null); // Clear error on success
        } catch (error: any) {
            console.error("Failed to fetch classes", error);
            const errorMsg = error.response?.status === 500
                ? "Server error - Unable to load class data. Please try again later."
                : error.code === 'ECONNABORTED' || error.message?.includes('timeout')
                    ? "Request timed out - Please check your connection and try again."
                    : "Network error - Unable to connect to server. Please check your connection.";
            setError(errorMsg);
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

    useSwipe(handleSwipeLeft, handleSwipeRight);

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

    const handleRefresh = () => {
        if (user?.professorId) {
            fetchClasses(user.professorId, true);
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

    if (!user || loading) return <DashboardSkeleton />;

    const tabs = [
        { id: 'home' as TabType, label: 'Home', icon: Home },
        { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
        { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
        { id: 'monitor' as TabType, label: 'Monitor', icon: Monitor },
        { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },

    ];

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

                {/* Tab Navigation */}
                <div className="sticky top-20 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 transition-all duration-300">
                    <div className="flex gap-4 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-6 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                        ? 'text-brand-500 border-brand-500'
                                        : 'text-slate-400 border-transparent hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div key={activeTab} className="tab-content-fade">
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
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
}
