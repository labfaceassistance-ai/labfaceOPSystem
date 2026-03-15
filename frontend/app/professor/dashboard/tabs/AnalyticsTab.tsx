import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AttendanceChart from '@/components/charts/AttendanceChart';
import { getToken } from '@/utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface AnalyticsTabProps {
    user: any;
    classes: any[];
}

export default function AnalyticsTab({ user, classes }: AnalyticsTabProps) {
    const activeClasses = classes.filter(c => !c.is_archived);
    const [loading, setLoading] = useState(true);
    const [trends, setTrends] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeClasses: 0,
        avgAttendance: 0,
        attendanceGrowth: 0
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = getToken();

                // 1. Fetch Real Stats
                const statsResponse = await axios.get(`${API_URL}/api/classes/professor/${user.professorId || user.userId}/stats-overview`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // 2. Fetch Trends (Mock for now, can be real later)
                const mockTrends = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return {
                        period: d.toLocaleDateString('en-US', { weekday: 'short' }),
                        attendance_count: Math.floor(Math.random() * 50) + 20,
                        unique_students: Math.floor(Math.random() * 40) + 15
                    };
                });
                setTrends(mockTrends);

                // Set Stats from Backend
                setStats({
                    totalStudents: statsResponse.data.totalStudents,
                    activeClasses: statsResponse.data.activeClasses,
                    avgAttendance: statsResponse.data.avgAttendance,
                    attendanceGrowth: 2.5 // Still mocked for now
                });

            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return (
        <div className="space-y-6">
            {/* Main Chart Section */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-brand-400" size={28} />
                        <div>
                            <h2 className="text-2xl font-bold text-white">Class Analytics</h2>
                            <p className="text-slate-400 text-sm">Attendance overview for the last 7 days</p>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-500">Loading charts...</div>
                    ) : (
                        <AttendanceChart data={trends} />
                    )}
                </div>
            </div>

            {/* Quick Stats Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <Users className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
                            <div className="text-xs text-slate-400">Total Students</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Calendar className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.activeClasses}</div>
                            <div className="text-xs text-slate-400">Active Classes</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-white">{stats.avgAttendance}%</span>
                                <span className="text-xs font-medium text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                    <ArrowUpRight size={12} className="mr-0.5" />
                                    {stats.attendanceGrowth}%
                                </span>
                            </div>
                            <div className="text-xs text-slate-400">Avg. Attendance</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
