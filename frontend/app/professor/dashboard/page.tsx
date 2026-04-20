'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import DashboardTabs from '@/components/ui/DashboardTabs';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
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

const IdentityNode = ({ className = "", size = 120 }) => (
    <div className={`identity-node opacity-[0.15] ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M50 5L95 27.5V72.5L50 95L5 72.5V27.5L50 5Z" stroke="currentColor" strokeWidth="0.5" />
            <path d="M50 25L71.6506 37.5V62.5L50 75L28.3494 62.5V37.5L50 25Z" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="2" fill="currentColor" />
            <path d="M50 5V25M95 27.5L71.6506 37.5M95 72.5L71.6506 62.5M50 95V75M5 72.5L28.3494 62.5M5 27.5L28.3494 37.5" stroke="currentColor" strokeWidth="0.5" />
        </svg>
    </div>
);

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
        <div className="min-h-screen bg-identity-navy flex flex-col items-center justify-center gap-8 relative overflow-hidden">
            {/* Background layers for loading state */}
            <div className="absolute inset-0 opacity-20">
                <IdentityNode className="absolute top-10 left-10 text-identity-sky animate-pulse" size={200} />
                <IdentityNode className="absolute bottom-10 right-10 text-identity-sky animate-pulse" size={240} />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 mb-6 relative">
                    <div className="absolute inset-0 border-4 border-identity-sky/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-identity-sky text-[10px] font-black uppercase tracking-[0.2em] animate-pulse font-outfit">Synchronizing Credentials...</div>
            </div>
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
        <div className="min-h-screen bg-identity-navy text-slate-200 relative overflow-hidden font-outfit">
            {/* LAYER 1: Core Blueprints */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.05]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-identity-navy via-transparent to-identity-navy/20" />
            </div>

            {/* LAYER 2: Identity Nodes */}
            <div className="absolute inset-0 pointer-events-none">
                <IdentityNode className="absolute -top-20 -left-20 text-identity-sky" size={400} />
                <IdentityNode className="absolute top-1/3 -right-32 text-identity-navy" size={500} />
                <IdentityNode className="absolute -bottom-40 left-1/4 text-identity-sky" size={600} />
            </div>

            {/* LAYER 3: Mesh Glows */}
            <div className="absolute inset-x-0 top-0 h-[50vh] bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-identity-sky/5 blur-[120px] rounded-full pointer-events-none" />

            <SessionTimeout
                sessionDuration={30 * 60 * 1000}
                warningTime={5 * 60 * 1000}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
            />
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 md:pb-8">
                <Breadcrumbs />

                {/* Tab Navigation */}
                <div className="mb-8">
                    <DashboardTabs 
                        tabs={tabs} 
                        activeTab={activeTab} 
                        onTabChange={(tabId) => handleTabChange(tabId as TabType)} 
                    />
                </div>

                {/* Tab Content */}
                <div key={activeTab} className="tab-content-fade min-h-[60vh] mt-8">
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
            <div className="min-h-screen bg-identity-navy flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <IdentityNode className="absolute top-10 left-10 text-identity-sky animate-pulse" size={200} />
                    <IdentityNode className="absolute bottom-10 right-10 text-identity-sky animate-pulse" size={240} />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-identity-sky/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-identity-sky text-[10px] font-black uppercase tracking-[0.2em] animate-pulse font-outfit">Loading Workspace...</div>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
