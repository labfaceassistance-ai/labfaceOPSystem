'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    TrendingUp, TrendingDown, Users, Calendar, Award,
    AlertTriangle, Activity, BarChart3, Clock, CheckCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AttendanceChart from '@/components/charts/AttendanceChart';
import { getToken } from '@/utils/auth';
import IdentityBackground from '@/components/IdentityBackground';
import { format, subDays } from 'date-fns';
import Link from 'next/link';
import BackButton from '@/components/ui/BackButton';

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
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <IdentityBackground />
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
                    <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Processing Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-outfit select-none relative overflow-hidden">
            <IdentityBackground />
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
                <div className="mb-8">
                    <BackButton 
                        href="/admin/dashboard" 
                        label="Back to Dashboard" 
                        className="bg-white/50 px-5 py-3 rounded-2xl border border-slate-200 italic" 
                    />
                </div>

                <div className="mb-12 animate-fade-in px-2">
                    <h1 className="text-4xl md:text-5xl font-black text-[#041C3C] mb-3 uppercase tracking-tighter font-outfit flex flex-wrap items-center gap-4">
                        <div className="bg-[#5CB4E4]/10 rounded-2xl p-3 text-[#5CB4E4]">
                            <BarChart3 className="w-10 h-10" />
                        </div>
                        <span>Institutional Analytics</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] md:text-sm font-black uppercase tracking-[0.4em] ml-2">Real-time data visualization engine.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12 animate-fade-in">
                    <div className="identity-glass p-8 rounded-[2.5rem] shadow-xl border border-[#5CB4E4]/10 group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Total Students</span>
                            <div className="bg-[#041C3C]/5 rounded-2xl p-3 text-[#041C3C] group-hover:scale-110 transition-transform"><Users size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-[#041C3C] tracking-tighter font-outfit">{overview?.totalStudents || 0}</div>
                    </div>

                    <div className="identity-glass p-8 rounded-[2.5rem] shadow-xl border border-[#5CB4E4]/10 group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Attendance Today</span>
                            <div className="bg-emerald-500/10 rounded-2xl p-3 text-emerald-500 group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-emerald-500 tracking-tighter font-outfit">{overview?.attendanceToday || 0}</div>
                    </div>

                    <div className="identity-glass p-8 rounded-[2.5rem] shadow-xl border border-[#5CB4E4]/10 group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Average Attendance Rate</span>
                            <div className="bg-amber-500/10 rounded-2xl p-3 text-amber-500 group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-amber-500 tracking-tighter font-outfit">{overview?.avgAttendanceRate || 0}%</div>
                    </div>

                    <div className="identity-glass p-8 rounded-[2.5rem] shadow-xl border border-[#5CB4E4]/10 group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Active Sessions</span>
                            <div className="bg-purple-500/10 rounded-2xl p-3 text-purple-500 group-hover:scale-110 transition-transform"><Activity size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-purple-500 tracking-tighter font-outfit">{overview?.activeSessions || 0}</div>
                    </div>

                    <div className="identity-glass p-8 rounded-[2.5rem] shadow-xl border border-[#5CB4E4]/10 group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Total Faculty</span>
                            <div className="bg-[#5CB4E4]/10 rounded-2xl p-3 text-[#5CB4E4] group-hover:scale-110 transition-transform"><Award size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-[#5CB4E4] tracking-tighter font-outfit">{overview?.totalProfessors || 0}</div>
                    </div>
                </div>

                <div className="identity-glass rounded-[3rem] p-10 mb-12 shadow-2xl border border-[#5CB4E4]/10 bg-white/40 animate-fade-in relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#5CB4E4]/5 to-transparent pointer-events-none opacity-50" />
                    <h2 className="text-2xl font-black text-[#041C3C] mb-8 uppercase tracking-tighter font-outfit relative z-10 flex items-center gap-4">
                        <div className="bg-[#5CB4E4]/10 rounded-2xl p-2">
                             <TrendingUp className="text-[#5CB4E4] w-6 h-6" />
                        </div>
                        ATTENDANCE TRENDS <span className="text-[10px] text-slate-400 font-bold tracking-[0.15em] ml-4 font-mono">(PAST 30 DAYS)</span>
                    </h2>
                    <div className="relative z-10">
                        <AttendanceChart data={trends} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-fade-in text-center md:text-left">
                    <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-[#5CB4E4]/10 bg-white/40 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#5CB4E4]/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        <h2 className="text-2xl font-black text-[#041C3C] mb-8 uppercase tracking-tighter font-outfit flex items-center justify-center md:justify-start gap-4 relative z-10">
                            <div className="bg-[#5CB4E4]/10 rounded-2xl p-2">
                                <BarChart3 className="text-[#5CB4E4] w-6 h-6" />
                            </div>
                            ATTENDANCE BY ACADEMIC PROGRAM
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {courseStats.slice(0, 5).map((course, index) => (
                                <div key={index} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-[#5CB4E4]/30 transition-all group">
                                    <div className="text-left">
                                        <div className="font-black text-[#041C3C] uppercase tracking-[0.15em] text-xs mb-1 group-hover:text-[#5CB4E4] transition-colors">{course.course_code}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">{course.course_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-emerald-500 italic tracking-tighter font-outfit">{course.attendance_rate}%</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-black">{course.total_students} STUDENTS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-[#5CB4E4]/10 bg-white/40 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        <h2 className="text-2xl font-black text-[#041C3C] mb-8 uppercase tracking-tighter font-outfit flex items-center justify-center md:justify-start gap-4 relative z-10">
                            <div className="bg-emerald-500/10 rounded-2xl p-2">
                                <Award className="text-emerald-500 w-6 h-6" />
                            </div>
                            LEADING STUDENTS
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {insights?.topPerformers.slice(0, 5).map((student, index) => (
                                <div key={index} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-emerald-500/30 transition-all group">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-sm uppercase tracking-[0.15em] shadow-sm border border-emerald-100">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <div className="font-black text-[#041C3C] uppercase tracking-[0.15em] text-xs mb-1 italic group-hover:text-emerald-600 transition-colors">{student.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-[0.15em]">{student.student_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-emerald-500 italic tracking-tighter font-outfit">{student.attendance_rate}%</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-black">{student.attendance_count} RECORDS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-slate-200 mb-12 relative overflow-hidden animate-fade-in bg-white/80">
                    <h2 className="text-2xl font-black text-[#041C3C] mb-10 uppercase tracking-tighter font-outfit flex items-center gap-4">
                        <div className="bg-[#5CB4E4]/10 rounded-2xl p-2">
                             <Activity className="text-[#5CB4E4] w-6 h-6" />
                        </div>
                        SYSTEM OPERATIONAL HEALTH
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <div className="p-8 bg-[#F8FAFC] border border-slate-100 rounded-[2rem] shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] text-slate-400 mb-4 font-black uppercase tracking-[0.15em]">BIOMETRIC VERIFICATION INDEX</div>
                            <div className="text-4xl font-black text-emerald-500 mb-2 tracking-tighter font-outfit italic">
                                {systemHealth?.faceRecognition.avgConfidence || 0}%
                            </div>
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">
                                {systemHealth?.faceRecognition.successful || 0}/{systemHealth?.faceRecognition.totalAttempts || 0} SUCCESS RATE
                            </div>
                        </div>

                        <div className="p-8 bg-[#F8FAFC] border border-slate-100 rounded-[2rem] shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] text-slate-400 mb-4 font-black uppercase tracking-[0.15em]">LIVENESS DETECTION ACCURACY</div>
                            <div className="text-4xl font-black text-amber-500 mb-2 tracking-tighter font-outfit italic">
                                {systemHealth?.liveness.passRate || 0}%
                            </div>
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">
                                {systemHealth?.liveness.passed || 0}/{systemHealth?.liveness.totalChecks || 0} PASSED
                            </div>
                        </div>

                        <div className="p-8 bg-[#F8FAFC] border border-slate-100 rounded-[2rem] shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] text-slate-400 mb-4 font-black uppercase tracking-[0.15em]">SERVER SYNCHRONIZATION QUEUE</div>
                            <div className="text-4xl font-black text-[#5CB4E4] mb-2 tracking-tighter font-outfit italic">
                                {systemHealth?.syncQueue.pendingOperations || 0}
                            </div>
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">PENDING OPERATIONS</div>
                        </div>

                        <div className="p-8 bg-[#F8FAFC] border border-slate-100 rounded-[2rem] shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] text-slate-400 mb-4 font-black uppercase tracking-[0.15em]">SYSTEM INCIDENT LOG</div>
                            <div className={`text-4xl font-black mb-2 tracking-tighter font-outfit italic ${(systemHealth?.errors.last24Hours || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {systemHealth?.errors.last24Hours || 0}
                            </div>
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">
                                {(systemHealth?.errors.last24Hours || 0) === 0 ? 'STATUS: OPERATIONAL' : 'STATUS: ATTENTION REQUIRED'}
                            </div>
                        </div>
                    </div>
                </div>

                {insights && insights.atRiskStudents.length > 0 && (
                    <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-rose-500/20 bg-rose-50/20 animate-fade-in relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                        <h2 className="text-2xl font-black text-rose-500 mb-10 uppercase tracking-tighter font-outfit relative z-10 flex items-center gap-4">
                            <div className="bg-rose-500/10 rounded-2xl p-2">
                                <AlertTriangle className="text-rose-500 w-6 h-6" />
                            </div>
                            STUDENTS AT RISK
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                            {insights.atRiskStudents.map((student, index) => (
                                <div key={index} className="p-8 bg-white border border-rose-100 rounded-[2.5rem] shadow-sm hover:border-rose-300 transition-colors">
                                    <div className="font-black text-[#041C3C] mb-2 uppercase tracking-[0.15em] italic font-outfit">{student.name}</div>
                                    <div className="text-[10px] text-slate-400 mb-6 font-mono tracking-[0.15em]">{student.student_id}</div>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{student.attendance_count} RECORDS</span>
                                        <span className="text-xl font-black text-rose-500 italic tracking-tighter font-outfit">{student.attendance_rate}%</span>
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
