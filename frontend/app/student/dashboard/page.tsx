"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import SessionTimeout from '../../../components/SessionTimeout';

import { Home, Calendar, BarChart3, Brain, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react';
import HomeTab from './tabs/HomeTab';
import ScheduleTab from './tabs/ScheduleTab';
import AttendanceTab from './tabs/AttendanceTab';
import ClassesTab from './tabs/ClassesTab';
import AttendanceInsights from '../../../components/AttendanceInsights';
import { logout, getToken, getUser } from '../../../utils/auth';
import AcademicUpdateBanner from '../../../components/AcademicUpdateBanner';
import DashboardTabs from '@/components/ui/DashboardTabs';
import Skeleton from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

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

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as TabType);
        if (user?.id) fetchDashboardData((user as any).id, true);
    };

    const handleExtendSession = async () => { console.log('Extending session...'); };
    const handleLogout = () => { logout('/login'); };

    if (!user || loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-outfit">
            {/* Background Layers */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-blueprint opacity-[0.05] pointer-events-none"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-identity-sky/5 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-identity-navy/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="w-24 h-24 relative">
                    <div className="absolute inset-0 border-4 border-identity-sky/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 bg-identity-sky/10 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-identity-sky rounded-full animate-ping"></div>
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <p className="font-black uppercase tracking-[0.3em] text-xs text-identity-navy">LabFace Core</p>
                    <p className="font-black uppercase tracking-[0.5em] text-[10px] text-identity-sky animate-pulse">Synchronizing Neural Profile...</p>
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'classes', label: 'Classes', icon: BookOpen },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'attendance', label: 'Attendance', icon: BarChart3 },
        { id: 'ai-insights', label: 'Insights', icon: Brain },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-outfit text-slate-900 relative selection:bg-identity-sky/10 selection:text-identity-navy page-transition overflow-x-hidden">
            {/* 4-Layer System Identity Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Layer 1: Blueprint Grid */}
                <div className="absolute inset-0 bg-blueprint opacity-[0.05]"></div>
                
                {/* Layer 2: Mesh Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-identity-sky/[0.03] rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-identity-navy/[0.03] rounded-full blur-[120px] animate-pulse delay-700"></div>
                
                {/* Layer 3: Identity Nodes */}
                <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
                    <IdentityNode className="top-[15%] left-[8%]" size={180} />
                    <IdentityNode className="bottom-[15%] right-[8%]" size={240} />
                    <IdentityNode className="top-[40%] right-[15%]" size={120} />
                </div>
                
                {/* Layer 4: Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(248,250,252,0.4)_100%)]"></div>
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

                {/* Navigation Hierarchy */}
                <Breadcrumbs />

                {/* Warnings Banner */}
                {activeWarnings.length > 0 && (
                    <div className="mb-8 space-y-4">
                        {activeWarnings.map((w, idx) => (
                            <div key={idx} className={`identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 flex items-center gap-8 shadow-xl backdrop-blur-md transition-all hover:scale-[1.01] active:scale-100 ${
                                w.warning_type === 'dropout_warning' 
                                    ? 'bg-rose-50/40 border-rose-200 text-rose-900 shadow-rose-500/5' 
                                    : 'bg-amber-50/40 border-amber-200 text-amber-900 shadow-amber-500/5'
                            }`}>
                                <div className={`p-4 rounded-2xl shadow-inner border ${
                                    w.warning_type === 'dropout_warning' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-amber-100 border-amber-200 text-amber-600'
                                }`}>
                                    <AlertTriangle size={28} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                                            w.warning_type === 'dropout_warning' ? 'bg-rose-600/10 text-rose-600 border-rose-200' : 'bg-amber-600/10 text-amber-600 border-amber-200'
                                        }`}>
                                            {w.subject_code}
                                        </span>
                                        <h3 className="font-black text-xs uppercase tracking-[0.2em] italic">
                                            {w.warning_type === 'dropout_warning' ? 'Dropout Risk Detected' : 'Attendance Alert'}
                                        </h3>
                                    </div>
                                    <p className="text-[10px] font-black leading-relaxed opacity-80 uppercase tracking-[0.15em]">
                                        Equivalent Absences: <span className={w.warning_type === 'dropout_warning' ? 'text-rose-600' : 'text-amber-600'}>{w.equivalent_absences}</span> | 
                                        {w.warning_type === 'dropout_warning' ? ' Immediate contact required.' : ' Monitoring period active.'}
                                    </p>
                                </div>
                                <ChevronRight className="opacity-20 translate-x-2 group-hover:translate-x-4 transition-transform" size={24} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Navigation */}
                <DashboardTabs 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange} 
                />

                {/* Tab Content */}
                <div key={activeTab} className="mt-8 animate-fade-up">
                    {activeTab === 'home' && <HomeTab user={user} dashboardData={dashboardData} error={error} />}
                    {activeTab === 'classes' && <ClassesTab user={user} />}
                    {activeTab === 'schedule' && <ScheduleTab user={user} />}
                    {activeTab === 'attendance' && <AttendanceTab user={user} />}
                    {activeTab === 'ai-insights' && (
                        <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-xl relative overflow-hidden font-outfit">
                            <div className="flex items-center gap-6 mb-12">
                                <div className="p-4 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10">
                                    <Brain size={32} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-identity-navy tracking-tighter uppercase font-outfit italic">Attendance Insights</h1>
                                    <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-2">AI-Powered Analysis Module</p>
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
