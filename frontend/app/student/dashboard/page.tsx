"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import SessionTimeout from '../../../components/SessionTimeout';

import { Home, Calendar, BarChart3, User, Brain, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ScheduleTab from './tabs/ScheduleTab';
import AttendanceTab from './tabs/AttendanceTab';
import ClassesTab from './tabs/ClassesTab';
import AttendanceInsights from '../../../components/AttendanceInsights';
import { logout, getToken, getUser } from '../../../utils/auth';
import AcademicUpdateBanner from '../../../components/AcademicUpdateBanner';

const IdentityNode = ({ className = "", size = 120 }) => (
    <div className={`identity-node opacity-40 ${className}`} style={{ width: size, height: size }}>
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

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (user?.id) fetchDashboardData((user as any).id, true);
    };

    const handleExtendSession = async () => { console.log('Extending session...'); };
    const handleLogout = () => { logout('/login'); };

    if (!user || loading) return (
        <div className="min-h-screen bg-identity-bg flex flex-col items-center justify-center relative overflow-hidden">
            <IdentityNode className="absolute top-[20%] right-[10%] opacity-20" size={180} />
            <div className="relative z-10 text-center">
                <div className="w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-identity-sky/10"></div>
                <p className="font-black uppercase tracking-[0.4em] text-[10px] text-identity-navy animate-pulse">Initializing Identity Hub...</p>
            </div>
        </div>
    );

    const tabs = [
        { id: 'home' as TabType, label: 'Home', icon: Home },
        { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
        { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
        { id: 'attendance' as TabType, label: 'Attendance', icon: BarChart3 },
        { id: 'ai-insights' as TabType, label: 'AI Insights', icon: Brain },
    ];

    return (
        <div className="min-h-screen bg-identity-bg font-sans text-slate-900 relative selection:bg-identity-sky/10 selection:text-identity-navy">
            {/* System Identity Nodes */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.05] overflow-hidden">
                <IdentityNode className="top-[10%] left-[5%]" size={160} />
                <IdentityNode className="bottom-[10%] right-[5%]" size={220} />
                <IdentityNode className="top-[40%] right-[15%]" size={110} />
                <IdentityNode className="bottom-[30%] left-[20%]" size={140} />
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

                {/* Academic Update Banner */}
                <AcademicUpdateBanner user={user} />

                {/* Warnings Banner */}
                {activeWarnings.length > 0 && (
                    <div className="mb-8 space-y-4">
                        {activeWarnings.map((w, idx) => (
                            <div key={idx} className={`p-6 rounded-[2rem] border-2 flex items-center gap-6 shadow-2xl backdrop-blur-sm transition-all hover:scale-[1.01] ${
                                w.warning_type === 'dropout_warning' 
                                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}>
                                <div className={`p-4 rounded-2xl shadow-inner ${
                                    w.warning_type === 'dropout_warning' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                    <AlertTriangle size={28} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                                            w.warning_type === 'dropout_warning' ? 'bg-rose-600/10 text-rose-600' : 'bg-amber-600/10 text-amber-600'
                                        }`}>
                                            {w.subject_code}
                                        </span>
                                        <h3 className="font-black text-xs uppercase tracking-[0.2em]">
                                            {w.warning_type === 'dropout_warning' ? 'Dropout Risk Detected' : 'Attendance Alert'}
                                        </h3>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed opacity-80 uppercase tracking-widest">
                                        Absences: <span className="text-rose-600">{w.equivalent_absences}</span> | 
                                        {w.warning_type === 'dropout_warning' ? ' Immediate contact required.' : ' Monitoring period active.'}
                                    </p>
                                </div>
                                <ChevronRight className="opacity-20" size={24} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="sticky top-20 z-40 bg-identity-bg/90 backdrop-blur-xl border-b border-identity-sky/10 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-0 transition-all duration-300">
                    <div className="flex gap-2 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap group ${activeTab === tab.id
                                        ? 'text-identity-navy border-identity-navy bg-identity-navy/5'
                                        : 'text-slate-400 border-transparent hover:text-identity-navy hover:bg-identity-navy/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-identity-navy' : 'text-slate-300'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div key={activeTab} className="animate-fade-up">
                    {activeTab === 'home' && <HomeTab user={user} dashboardData={dashboardData} error={error} />}
                    {activeTab === 'classes' && <ClassesTab user={user} />}
                    {activeTab === 'schedule' && <ScheduleTab user={user} />}
                    {activeTab === 'attendance' && <AttendanceTab user={user} />}
                    {activeTab === 'ai-insights' && (
                        <div className="identity-glass rounded-[3rem] border border-identity-sky/10 p-10 shadow-3xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-identity-navy via-identity-sky to-identity-navy opacity-50"></div>
                            <div className="flex items-center gap-6 mb-12">
                                <div className="p-4 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10">
                                    <Brain size={32} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-identity-navy tracking-tighter uppercase font-outfit italic">Neural Insights</h1>
                                    <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-1">AI-Powered Attendance Matrix Analysis</p>
                                </div>
                            </div>
                            <AttendanceInsights studentId={user.id.toString() || ''} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
