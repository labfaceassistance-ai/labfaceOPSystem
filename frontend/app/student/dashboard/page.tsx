"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { DashboardSkeleton } from '../../../components/SkeletonLoaders';
import SessionTimeout from '../../../components/SessionTimeout';

import { Home, Calendar, BarChart3, User, Brain, AlertTriangle, BookOpen } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ScheduleTab from './tabs/ScheduleTab';
import AttendanceTab from './tabs/AttendanceTab';
import ClassesTab from './tabs/ClassesTab';
import AttendanceInsights from '../../../components/AttendanceInsights';
import { logout, getToken, getUser } from '../../../utils/auth';
import { useSwipe } from '@/hooks/useSwipe';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    studentId?: string;
    course?: string;
    yearLevel?: string;
}

type TabType = 'home' | 'classes' | 'schedule' | 'attendance' | 'ai-insights';

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [activeWarnings, setActiveWarnings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const fetchDashboardData = async (userId: number, isBackground = false) => {
        if (!isBackground) {
            setLoading(true);
            setError(null); // Clear previous errors
        }
        try {
            const token = getToken();
            if (!token) {
                console.error("No token found for dashboard fetch");
                return;
            }

            const axios = (await import('axios')).default;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            const dashboardResponse = await axios.get(`${API_URL}/api/student/dashboard/${userId}`, config);
            setDashboardData(dashboardResponse.data);

            // Fetch warnings separately - don't fail if this errors
            try {
                const warningsResponse = await axios.get(`${API_URL}/api/warnings/student/${userId}`, config);
                setActiveWarnings(warningsResponse.data);
            } catch (warnError) {
                console.error("Failed to fetch warnings (non-critical):", warnError);
                setActiveWarnings([]); // Set empty array if warnings fail
            }

            setError(null); // Clear error on success
        } catch (error: any) {
            console.error("Failed to fetch dashboard data", error);
            const errorMsg = error.response?.status === 500
                ? "Server error - Unable to load dashboard data. Please try again later."
                : error.code === 'ECONNABORTED' || error.message?.includes('timeout')
                    ? "Request timed out - Please check your connection and try again."
                    : "Network error - Unable to connect to server. Please check your connection.";
            setError(errorMsg);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            try {
                const axios = (await import('axios')).default;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

                // Fetch current user from token
                const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const userData = userResponse.data;

                // Role Guard: Ensure user is a student in this session
                if (userData.role !== 'student') {
                    console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting to appropriate workspace.`);
                    if (userData.role === 'professor') window.location.href = '/professor/dashboard';
                    else if (userData.role === 'admin') window.location.href = '/admin/dashboard';
                    else window.location.href = '/login';
                    return;
                }

                setUser(userData);
                // Update session storage to keep this tab isolated
                sessionStorage.setItem('user', JSON.stringify(userData));

                // Fetch initial dashboard data
                if (userData.id) {
                    await fetchDashboardData(userData.id);
                }
            } catch (error: any) {
                console.error('Failed to fetch data:', error);

                // If token is invalid, redirect to login
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                    return;
                }

                // Fallback to stored user data if API fails
                const storedUser = getUser();
                if (storedUser) {
                    const parsedUser = storedUser;
                    setUser(parsedUser);
                    if (parsedUser.id) {
                        await fetchDashboardData(parsedUser.id);
                    }
                } else {
                    window.location.href = '/login';
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Auto-refresh interval
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (user?.id) {
            // Refresh every 30 seconds in the background
            intervalId = setInterval(() => {
                fetchDashboardData((user as any).id, true);
            }, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user?.id]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        // Refresh data on tab change
        if (user?.id) {
            fetchDashboardData((user as any).id, true);
        }
    };

    // Swipe Navigation Logic
    const tabOrder: TabType[] = ['home', 'classes', 'schedule', 'attendance', 'ai-insights'];
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

    const handleExtendSession = async () => {
        const token = localStorage.getItem('token');
        // Implement token refresh logic here
        console.log('Extending session...');
    };

    const handleLogout = () => {
        logout('/login');
    };

    if (!user || loading) return <DashboardSkeleton />;

    const tabs = [
        { id: 'home' as TabType, label: 'Home', icon: Home },
        { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
        { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
        { id: 'attendance' as TabType, label: 'Attendance', icon: BarChart3 },
        { id: 'ai-insights' as TabType, label: 'AI Insights', icon: Brain },
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

                {/* Warnings Banner */}
                {activeWarnings.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {activeWarnings.map((w, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border flex items-center gap-4 ${w.warning_type === 'dropout_warning' ? 'bg-red-500/10 border-red-500/50 text-red-200' :
                                w.warning_type === 'absence_warning' ? 'bg-orange-500/10 border-orange-500/50 text-orange-200' :
                                    'bg-yellow-500/10 border-yellow-500/50 text-yellow-200'
                                } shadow-lg shadow-black/20 animate-in slide-in-from-top-2 duration-300`}>
                                <div className={`p-3 rounded-full ${w.warning_type === 'dropout_warning' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                                    }`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg flex items-center gap-2">
                                        <span className="uppercase tracking-wider text-sm bg-black/20 px-2 py-0.5 rounded">{w.subject_code}</span>
                                        {w.warning_type === 'dropout_warning' ? 'DROPOUT RISK DETECTED' : 'ATTENDANCE WARNING'}
                                    </div>
                                    <div className="text-sm opacity-90 mt-1">
                                        You have reached <span className="font-bold">{w.equivalent_absences} equivalent absences</span>
                                        ({w.absent_count} absent + {Math.floor(w.late_count / 3)} derived from {w.late_count} lates).
                                        {w.warning_type === 'dropout_warning' ? ' Please contact your professor immediately.' : ' One more absence may result in a dropout warning.'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
                    {activeTab === 'home' && <HomeTab user={user} dashboardData={dashboardData} error={error} />}
                    {activeTab === 'classes' && <ClassesTab user={user} />}
                    {activeTab === 'schedule' && <ScheduleTab user={user} />}
                    {activeTab === 'attendance' && <AttendanceTab user={user} />}
                    {activeTab === 'ai-insights' && (
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-6">Your Attendance Insights</h1>
                            <AttendanceInsights studentId={user.id.toString() || ''} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
