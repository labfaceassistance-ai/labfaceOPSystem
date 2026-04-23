"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import SessionTimeout from '../../../components/SessionTimeout';
import IdentityBackground from '../../../components/IdentityBackground';

import { Home, Calendar, BarChart3, Brain, AlertTriangle, BookOpen, ChevronRight, TrendingUp } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ScheduleTab from './tabs/ScheduleTab';
import AttendanceTab from './tabs/AttendanceTab';
import ClassesTab from './tabs/ClassesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import AttendanceInsights from '../../../components/AttendanceInsights';
import DashboardTabs from '@/components/ui/DashboardTabs';
import { logout, getToken, getUser } from '../../../utils/auth';
import AcademicUpdateBanner from '../../../components/AcademicUpdateBanner';
import { useNavigation } from '@/context/NavigationContext';
import Skeleton from '@/components/ui/Skeleton';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    studentId?: string;
    course?: string;
    yearLevel?: string;
}

type TabType = 'home' | 'classes' | 'schedule' | 'attendance' | 'performance';

const DASHBOARD_TABS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
];

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [activeWarnings, setActiveWarnings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { setTabs, activeTab, setActiveTab } = useNavigation();

    const fetchDashboardData = async (userId: number, isBackground = false) => {
        if (!isBackground) {
            setLoading(true);
            setError(null);
        }
        try {
            const token = getToken();
            if (!token) return;

            const axios = (await import('axios')).default;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const config = { headers: { Authorization: `Bearer ${token}` } };

            const dashboardResponse = await axios.get(`${API_URL}/api/student/dashboard/${userId}`, config);
            setDashboardData(dashboardResponse.data);

            try {
                const warningsResponse = await axios.get(`${API_URL}/api/warnings/student/${userId}`, config);
                setActiveWarnings(warningsResponse.data);
            } catch (warnError) {
                console.error("Failed to fetch warnings:", warnError);
                setActiveWarnings([]);
            }

            setError(null);
        } catch (error: any) {
            console.error("Failed to fetch dashboard data", error);
            setError("Unable to load dashboard data. Please check your connection.");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        setTabs(DASHBOARD_TABS);
        setActiveTab('home');

        const fetchUserData = async () => {
            const token = getToken();
            if (!token) { window.location.href = '/login'; return; }

            try {
                const axios = (await import('axios')).default;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

                const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const userData = userResponse.data;

                if (userData.role !== 'student') {
                    if (userData.role === 'professor') window.location.href = '/professor/dashboard';
                    else if (userData.role === 'admin') window.location.href = '/admin/dashboard';
                    else window.location.href = '/login';
                    return;
                }

                setUser(userData);
                sessionStorage.setItem('user', JSON.stringify(userData));
                if (userData.id) await fetchDashboardData(userData.id);
            } catch (error: any) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout(); return;
                }
                const storedUser = getUser();
                if (storedUser) {
                    setUser(storedUser);
                    if (storedUser.id) await fetchDashboardData(storedUser.id);
                } else {
                    window.location.href = '/login';
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();

        return () => setTabs([]);
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (user?.id) {
            intervalId = setInterval(() => {
                fetchDashboardData((user as any).id, true);
            }, 30000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [user?.id]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as TabType);
        if (user?.id) fetchDashboardData((user as any).id, true);
    };

    const handleExtendSession = async () => { console.log('Extending session...'); };
    const handleLogout = () => { logout('/login'); };

    if (!user || loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-outfit bg-bg-base">
            <IdentityBackground />
            
            <div className="relative z-10 flex flex-col items-center gap-8 translate-y-[-2rem]">
                <div className="w-24 h-24 relative">
                    <div className="absolute inset-0 border-[6px] border-identity-sky/10 rounded-full shadow-[0_0_30px_rgba(92,180,228,0.1)]"></div>
                    <div className="absolute inset-0 border-[6px] border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 bg-identity-sky/[0.03] rounded-full flex items-center justify-center backdrop-blur-sm border border-identity-sky/10">
                        <div className="w-3 h-3 bg-identity-sky rounded-full animate-pulse shadow-[0_0_15px_rgba(92,180,228,0.8)]"></div>
                    </div>
                </div>
                <div className="space-y-3 text-center">
                    <p className="font-black uppercase tracking-[0.5em] text-[11px] text-identity-navy/40 italic">LabFace Account Dashboard</p>
                    <p className="font-black uppercase tracking-[0.3em] text-[13px] text-identity-sky animate-pulse italic">Loading profile...</p>
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
                {/* Academic Update Banner */}
                <AcademicUpdateBanner user={user} />

                {/* Warnings Banner */}
                {activeWarnings.length > 0 && (
                    <div className="mb-6 space-y-4">
                        {activeWarnings.map((w, idx) => (
                            <div key={idx} className={`identity-glass p-6 rounded-2xl md:rounded-3xl border flex items-center gap-6 shadow-xl backdrop-blur-xl transition-all hover:scale-[1.01] active:scale-100 relative overflow-hidden group ${
                                w.warning_type === 'dropout_warning' 
                                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-900' 
                                    : 'bg-amber-500/5 border-amber-500/20 text-amber-900'
                            }`}>
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                                <div className="corner-bracket-tl opacity-40 scale-75" />
                                <div className="corner-bracket-br opacity-40 scale-75" />
                                
                                <div className={`p-4 rounded-2xl shadow-xl border transition-colors group-hover:scale-110 duration-500 ${
                                    w.warning_type === 'dropout_warning' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-amber-500 border-amber-400 text-white'
                                }`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex-1 relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                        <span className={`w-fit text-[9px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-lg border italic shadow-sm ${
                                            w.warning_type === 'dropout_warning' ? 'bg-rose-600/10 text-rose-600 border-rose-200' : 'bg-amber-600/10 text-amber-600 border-amber-200'
                                        }`}>
                                            Subject: {w.subject_code}
                                        </span>
                                        <h3 className="font-black text-xs uppercase tracking-[0.4em] italic text-identity-navy">
                                            {w.warning_type === 'dropout_warning' ? 'ACADEMIC SUPPORT REQUIRED' : 'ATTENDANCE WARNING'}
                                        </h3>
                                    </div>
                                    <p className="text-[10px] font-black leading-relaxed opacity-60 uppercase tracking-[0.2em] italic">
                                        Equivalent Absences: <span className={w.warning_type === 'dropout_warning' ? 'text-rose-600' : 'text-amber-600'}>{w.equivalent_absences} / 3.0</span> | 
                                        {w.warning_type === 'dropout_warning' ? ' Immediate consultation with your instructor is required.' : ' Your attendance for this subject is being monitored.'}
                                    </p>
                                </div>
                                <div className="group-hover:translate-x-2 transition-transform duration-500 p-3 bg-white/40 rounded-xl border border-white/20 shadow-sm opacity-40 group-hover:opacity-100">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Content */}
                <div key={activeTab} className="animate-fade-up">
                    {activeTab === 'home' && <HomeTab user={user} dashboardData={dashboardData} error={error} />}
                    {activeTab === 'classes' && <ClassesTab user={user} />}
                    {activeTab === 'schedule' && <ScheduleTab user={user} />}
                    {activeTab === 'attendance' && <AttendanceTab user={user} />}
                    {activeTab === 'performance' && (
                        <div className="space-y-12 animate-fade-up">
                            {/* Section 1: Raw Metrics & Analytics */}
                            <div className="space-y-6">
                                <AnalyticsTab user={user} />
                            </div>

                            {/* Divider with Icon */}
                            <div className="relative py-10">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-identity-sky/10"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <div className="bg-bg-base px-6 flex items-center gap-4 text-identity-sky/30">
                                        <Brain size={24} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] italic">AI Neural Analysis Link</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: AI Insights Engine */}
                            <div className="identity-glass p-8 sm:p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] border border-identity-sky/15 shadow-3xl relative overflow-hidden font-outfit group">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                                <div className="corner-bracket-tl opacity-60 group-hover:scale-110 transition-transform duration-700 -top-4 -left-4" />
                                <div className="corner-bracket-br opacity-60 group-hover:scale-110 transition-transform duration-700 -bottom-4 -right-4" />
                                
                                {/* Decorative Glow */}
                                <div className="absolute -top-24 -right-24 w-96 h-96 bg-identity-sky/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-identity-sky/20 transition-colors duration-1000" />
                                
                                <div className="flex items-center gap-8 mb-16 relative z-10">
                                    <div className="p-6 bg-identity-navy text-white rounded-3xl border-2 border-identity-sky/20 shadow-2xl group-hover:bg-identity-sky transition-colors duration-500">
                                        <Brain size={48} className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-black text-identity-sky uppercase tracking-[0.5em] mb-4 italic flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(92,180,228,0.8)]" />
                                            ATTENDANCE INSIGHTS SYSTEM
                                        </p>
                                        <h1 className="text-4xl md:text-5xl font-black text-identity-navy tracking-tighter uppercase italic leading-none">Performance AI Insights</h1>
                                    </div>
                                </div>
                                
                                <div className="relative z-10 bg-white/40 rounded-[2.5rem] p-8 border border-white/20 backdrop-blur-sm shadow-inner group-hover:bg-white/60 transition-all duration-700">
                                    <AttendanceInsights studentId={user.id.toString() || ''} />
                                </div>
                                
                                <div className="mt-12 pt-8 border-t border-identity-sky/10 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-identity-sky/30 animate-pulse" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-identity-sky/30 animate-pulse delay-75" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-identity-sky/30 animate-pulse delay-150" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] italic">Analyzing attendance records...</p>
                                    </div>
                                    <div className="text-[10px] font-black text-identity-sky uppercase tracking-[0.2em] italic bg-identity-sky/5 px-4 py-2 rounded-full border border-identity-sky/10">
                                        Status: Optimal
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

        </div>
    );
}
