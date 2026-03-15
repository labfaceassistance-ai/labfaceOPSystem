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
import { format, subDays } from 'date-fns';

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
        // Assuming getUser() returns the parsed user object directly
        // If getUser() is not available or returns string, adjust accordingly.
        // Based on previous files, getUser() is likely available in utils/auth.ts
        // Let's check if getUser is imported. It is not in the original file view.
        // I should stick to getToken() and if getUser is needed, I might need to import it or parse it.
        // However, looking at the code `const userData = JSON.parse(user);`, it expects a string.
        // Let's safe check. If I use getUser(), I need to know it returns an object.
        // SAFE APPROACH: keep using localStorage for 'user' IF I'm not 100% sure about getUser() behavior yet,
        // BUT the task is session isolation.
        // Actually, `getUser` in `utils/auth` likely parses it.
        // Let's use `getToken()` and manual `localStorage.getItem('user')` for now to be safe, OR import `getUser`.
        // I will import `getUser` as well.

        const userString = localStorage.getItem('user');

        if (!token || !userString) {
            router.push('/login');
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-white text-xl">Loading analytics...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
                    <p className="text-slate-400">Real-time insights and performance metrics</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Total Students</span>
                            <Users className="text-blue-400" size={20} />
                        </div>
                        <div className="text-3xl font-bold text-white">{overview?.totalStudents || 0}</div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Attendance Today</span>
                            <Calendar className="text-green-400" size={20} />
                        </div>
                        <div className="text-3xl font-bold text-white">{overview?.attendanceToday || 0}</div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Attendance Rate</span>
                            <TrendingUp className="text-emerald-400" size={20} />
                        </div>
                        <div className="text-3xl font-bold text-white">{overview?.avgAttendanceRate || 0}%</div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Active Sessions</span>
                            <Activity className="text-purple-400" size={20} />
                        </div>
                        <div className="text-3xl font-bold text-white">{overview?.activeSessions || 0}</div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Professors</span>
                            <Award className="text-yellow-400" size={20} />
                        </div>
                        <div className="text-3xl font-bold text-white">{overview?.totalProfessors || 0}</div>
                    </div>
                </div>

                {/* Attendance Trends Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Attendance Trends (Last 30 Days)</h2>
                    <AttendanceChart data={trends} />
                </div>

                {/* Course Statistics & Student Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Course Statistics */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={24} />
                            Course Statistics
                        </h2>
                        <div className="space-y-3">
                            {courseStats.slice(0, 5).map((course, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                    <div>
                                        <div className="font-medium text-white">{course.course_code}</div>
                                        <div className="text-sm text-slate-400">{course.course_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-400">{course.attendance_rate}%</div>
                                        <div className="text-xs text-slate-400">{course.total_students} students</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Student Insights */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Award size={24} />
                            Top Performers
                        </h2>
                        <div className="space-y-3">
                            {insights?.topPerformers.slice(0, 5).map((student, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{student.name}</div>
                                            <div className="text-sm text-slate-400">{student.student_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-400">{student.attendance_rate}%</div>
                                        <div className="text-xs text-slate-400">{student.attendance_count} sessions</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Activity size={24} />
                        System Health
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                            <div className="text-sm text-slate-400 mb-2">Face Recognition</div>
                            <div className="text-3xl font-bold text-green-400 mb-1">
                                {systemHealth?.faceRecognition.avgConfidence || 0}%
                            </div>
                            <div className="text-xs text-slate-500">
                                {systemHealth?.faceRecognition.successful || 0}/{systemHealth?.faceRecognition.totalAttempts || 0} successful
                            </div>
                        </div>

                        <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                            <div className="text-sm text-slate-400 mb-2">Liveness Detection</div>
                            <div className="text-3xl font-bold text-blue-400 mb-1">
                                {systemHealth?.liveness.passRate || 0}%
                            </div>
                            <div className="text-xs text-slate-500">
                                {systemHealth?.liveness.passed || 0}/{systemHealth?.liveness.totalChecks || 0} passed
                            </div>
                        </div>

                        <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                            <div className="text-sm text-slate-400 mb-2">Sync Queue</div>
                            <div className="text-3xl font-bold text-purple-400 mb-1">
                                {systemHealth?.syncQueue.pendingOperations || 0}
                            </div>
                            <div className="text-xs text-slate-500">pending operations</div>
                        </div>

                        <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                            <div className="text-sm text-slate-400 mb-2">Errors (24h)</div>
                            <div className={`text-3xl font-bold mb-1 ${(systemHealth?.errors.last24Hours || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {systemHealth?.errors.last24Hours || 0}
                            </div>
                            <div className="text-xs text-slate-500">
                                {(systemHealth?.errors.last24Hours || 0) === 0 ? 'All systems operational' : 'Check logs'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* At-Risk Students */}
                {insights && insights.atRiskStudents.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-red-900/50 rounded-xl p-6 mt-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-red-400" size={24} />
                            At-Risk Students (Low Attendance)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {insights.atRiskStudents.map((student, index) => (
                                <div key={index} className="p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                                    <div className="font-medium text-white mb-1">{student.name}</div>
                                    <div className="text-sm text-slate-400 mb-2">{student.student_id}</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{student.attendance_count} sessions</span>
                                        <span className="text-lg font-bold text-red-400">{student.attendance_rate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
