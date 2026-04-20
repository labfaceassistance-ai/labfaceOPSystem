'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    TrendingUp, TrendingDown, Users, Calendar, Award,
    AlertTriangle, Activity, BarChart3, Clock, CheckCircle, ChevronLeft
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AttendanceChart from '@/components/charts/AttendanceChart';
import { getToken } from '@/utils/auth';
import { format, subDays } from 'date-fns';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface OverviewStats {
    totalStudents: number;
    totalProfessors: number;
    attendanceToday: number;
    avgAttendanceRate: number;
    activeSessions: number;
}

interface AttendanceTrend {
    period: string;
    attendance_count: number;
    unique_students: number;
}

interface CourseStats {
    course_code: string;
    course_name: string;
    total_students: number;
    total_attendance: number;
    attendance_rate: number;
}

interface StudentInsights {
    topPerformers: any[];
    atRiskStudents: any[];
    perfectAttendance: any[];
}

interface SystemHealth {
    faceRecognition: {
        totalAttempts: number;
        successful: number;
        avgConfidence: number;
    };
    liveness: {
        totalChecks: number;
        passed: number;
        passRate: number;
    };
    syncQueue: {
        pendingOperations: number;
    };
    errors: {
        last24Hours: number;
    };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [trends, setTrends] = useState<AttendanceTrend[]>([]);
    const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
    const [insights, setInsights] = useState<StudentInsights | null>(null);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        const token = getToken();

        const userString = localStorage.getItem('user');

        if (!token || !userString) {
            router.push('/admin/login');
            return;
        }

        const userData = JSON.parse(userString);
        if (userData.role !== 'admin' && userData.role !== 'professor') {
            router.push('/');
            return;
        }

        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all analytics data in parallel
            const [
                overviewRes,
                trendsRes,
                courseStatsRes,
                insightsRes,
                healthRes
            ] = await Promise.all([
                axios.get(`${API_URL}/api/analytics/overview`, { headers }),
                axios.get(`${API_URL}/api/analytics/attendance-trends`, {
                    headers,
                    params: { ...dateRange, groupBy: 'day' }
                }),
                axios.get(`${API_URL}/api/analytics/course-stats`, {
                    headers,
                    params: dateRange
                }),
                axios.get(`${API_URL}/api/analytics/student-insights`, {
                    headers,
                    params: { limit: 5 }
                }),
                axios.get(`${API_URL}/api/analytics/system-health`, { headers })
            ]);

            setOverview(overviewRes.data);
            setTrends(trendsRes.data);
            setCourseStats(courseStatsRes.data);
            setInsights(insightsRes.data);
            setSystemHealth(healthRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
                <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Loading Dashboard Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-identity-sky/20">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
                <div className="mb-8">
                    <Link href="/admin/dashboard" className="inline-flex items-center text-slate-400 hover:text-identity-navy font-black uppercase text-[10px] tracking-[0.15em] transition-colors group bg-white/50 px-5 py-3 rounded-2xl border border-slate-200">
                        <ChevronLeft size={16} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Admin Portal
                    </Link>
                </div>

                <div className="mb-12 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-black text-identity-navy mb-3 uppercase tracking-tighter italic flex items-center gap-4">
                        <div className="bg-identity-sky/10 p-3 rounded-2xl">
                            <BarChart3 className="text-identity-sky w-8 h-8" />
                        </div>
                        Evaluate Performance Analytics
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] ml-2">Real-time Dashboard</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12 animate-fade-in">
                    <div className="identity-glass p-6 rounded-[32px] shadow-xl border border-identity-sky/10 group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Registered Students</span>
                            <div className="p-3 bg-identity-navy/5 rounded-2xl text-identity-navy group-hover:scale-110 transition-transform"><Users size={20} /></div>
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-identity-navy tracking-tighter">{overview?.totalStudents || 0}</div>
                    </div>

                    <div className="identity-glass p-6 rounded-[32px] shadow-xl border border-identity-sky/10 group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Daily Identifications</span>
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform"><Calendar size={20} /></div>
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-emerald-500 tracking-tighter">{overview?.attendanceToday || 0}</div>
                    </div>

                    <div className="identity-glass p-6 rounded-[32px] shadow-xl border border-identity-sky/10 group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Global Compliance</span>
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform"><TrendingUp size={20} /></div>
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-amber-500 tracking-tighter">{overview?.avgAttendanceRate || 0}%</div>
                    </div>

                    <div className="identity-glass p-6 rounded-[32px] shadow-xl border border-identity-sky/10 group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Active Nodes</span>
                            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform"><Activity size={20} /></div>
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-purple-500 tracking-tighter">{overview?.activeSessions || 0}</div>
                    </div>

                    <div className="identity-glass p-6 rounded-[32px] shadow-xl border border-identity-sky/10 group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Authorized Proctors</span>
                            <div className="p-3 bg-identity-sky/10 rounded-2xl text-identity-sky group-hover:scale-110 transition-transform"><Award size={20} /></div>
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-identity-sky tracking-tighter">{overview?.totalProfessors || 0}</div>
                    </div>
                </div>

                <div className="identity-glass rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 mb-12 shadow-2xl border border-identity-sky/10 bg-white/40 animate-fade-in relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-50" />
                    <h2 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter italic relative z-10 flex items-center gap-4">
                        <TrendingUp className="text-identity-sky w-6 h-6" />
                        Analyze Historical Trends <span className="text-[10px] text-slate-400 font-normal tracking-[0.15em] ml-4 font-mono">(PREVIOUS 30 DAYS)</span>
                    </h2>
                    <div className="relative z-10">
                        <AttendanceChart data={trends} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-fade-in">
                    <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-identity-sky/10 bg-white/40 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        <h2 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10">
                            <BarChart3 className="text-identity-sky w-6 h-6" />
                            Review Class Name Stats
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {courseStats.slice(0, 5).map((course, index) => (
                                <div key={index} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-identity-sky/30 transition-all group">
                                    <div>
                                        <div className="font-black text-identity-navy uppercase tracking-[0.15em] text-xs mb-1 group-hover:text-identity-sky transition-colors">{course.course_code}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">{course.course_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-500 italic tracking-tighter">{course.attendance_rate}%</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-black">{course.total_students} IDENTITIES</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-identity-sky/10 bg-white/40 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        <h2 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10">
                            <Award className="text-emerald-500 w-6 h-6" />
                            Acknowledge High Compliance
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {insights?.topPerformers.slice(0, 5).map((student, index) => (
                                <div key={index} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-emerald-500/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-sm uppercase tracking-[0.15em] shadow-sm border border-emerald-100">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <div className="font-black text-identity-navy uppercase tracking-[0.15em] text-xs mb-1 italic group-hover:text-emerald-600 transition-colors">{student.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-[0.15em]">{student.student_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-500 italic tracking-tighter">{student.attendance_rate}%</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-black">{student.attendance_count} LOGS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-200 mb-12 relative overflow-hidden animate-fade-in bg-white/80">
                    <h2 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter italic flex items-center gap-4">
                        <Activity className="text-identity-sky w-6 h-6" />
                        System Health Monitoring
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] shadow-sm flex flex-col items-center">
                            <div className="text-[9px] text-slate-400 mb-3 font-black uppercase tracking-[0.15em]">Recognition Confidence</div>
                            <div className="text-3xl md:text-4xl font-black text-emerald-500 mb-2 tracking-tighter italic">
                                {systemHealth?.faceRecognition.avgConfidence || 0}%
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                                {systemHealth?.faceRecognition.successful || 0}/{systemHealth?.faceRecognition.totalAttempts || 0} SECURE
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] shadow-sm flex flex-col items-center">
                            <div className="text-[9px] text-slate-400 mb-3 font-black uppercase tracking-[0.15em]">Liveness Detection Rate</div>
                            <div className="text-3xl md:text-4xl font-black text-amber-500 mb-2 tracking-tighter italic">
                                {systemHealth?.liveness.passRate || 0}%
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                                {systemHealth?.liveness.passed || 0}/{systemHealth?.liveness.totalChecks || 0} CONFIRMED
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] shadow-sm flex flex-col items-center">
                            <div className="text-[9px] text-slate-400 mb-3 font-black uppercase tracking-[0.15em]">Cloud Storage</div>
                            <div className="text-3xl md:text-4xl font-black text-identity-sky mb-2 tracking-tighter italic">
                                {systemHealth?.syncQueue.pendingOperations || 0}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">PENDING PACKETS</div>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] shadow-sm flex flex-col items-center">
                            <div className="text-[9px] text-slate-400 mb-3 font-black uppercase tracking-[0.15em]">Recent Anomalies</div>
                            <div className={`text-3xl md:text-4xl font-black mb-2 tracking-tighter italic ${(systemHealth?.errors.last24Hours || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {systemHealth?.errors.last24Hours || 0}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                                {(systemHealth?.errors.last24Hours || 0) === 0 ? 'SYSTEM OPTIMAL' : 'INVESTIGATION REQUIRED'}
                            </div>
                        </div>
                    </div>
                </div>

                {insights && insights.atRiskStudents.length > 0 && (
                    <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-rose-500/20 bg-rose-50/20 animate-fade-in relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                        <h2 className="text-xl font-black text-rose-500 mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10">
                            <AlertTriangle className="text-rose-500 w-6 h-6" />
                            Investigate Low Compliance Nodes
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {insights.atRiskStudents.map((student, index) => (
                                <div key={index} className="p-5 bg-white border border-rose-100 rounded-3xl shadow-sm hover:border-rose-300 transition-colors">
                                    <div className="font-black text-identity-navy mb-1 uppercase tracking-[0.15em] italic">{student.name}</div>
                                    <div className="text-[10px] text-slate-400 mb-3 font-mono">{student.student_id}</div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{student.attendance_count} PROTOCOLS</span>
                                        <span className="text-lg font-black text-rose-500 italic tracking-tighter">{student.attendance_rate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
