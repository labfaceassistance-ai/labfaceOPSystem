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

                // 2. Fetch Real Trends
                const trendsResponse = await axios.get(`${API_URL}/api/analytics/professor/${user.professorId || user.userId}/trends`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTrends(trendsResponse.data);

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
            <div className="bg-maroon-950/40 rounded-2xl border border-white/10 p-8 shadow-3xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-brand-gold" size={28} />
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Class Analytics</h2>
                            <p className="text-secondary/40 text-[10px] font-black uppercase tracking-widest">Attendance overview for the last 7 days</p>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-secondary/20 font-black uppercase tracking-widest">Loading charts...</div>
                    ) : (
                        <AttendanceChart data={trends} />
                    )}
                </div>
            </div>

            {/* Quick Stats Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-maroon-950/40 rounded-2xl border border-white/10 p-6 shadow-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
                            <Users className="text-brand-gold" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white tracking-tighter">{stats.totalStudents}</div>
                            <div className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Total Students</div>
                        </div>
                    </div>
                </div>

                <div className="bg-maroon-950/40 rounded-2xl border border-white/10 p-6 shadow-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                            <Calendar className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white tracking-tighter">{stats.activeClasses}</div>
                            <div className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Active Classes</div>
                        </div>
                    </div>
                </div>

                <div className="bg-maroon-950/40 rounded-2xl border border-white/10 p-6 shadow-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center border border-brand-gold/20">
                            <TrendingUp className="text-brand-gold" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white tracking-tighter">{stats.avgAttendance}%</span>
                                <span className="text-[10px] font-black text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <ArrowUpRight size={12} className="mr-0.5" />
                                    {stats.attendanceGrowth}%
                                </span>
                            </div>
                            <div className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Avg. Attendance</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
