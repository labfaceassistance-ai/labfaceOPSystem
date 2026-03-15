import { useEffect, useState } from 'react';
import { BarChart3, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface AttendanceTabProps {
    user: {
        id?: number;
        firstName: string;
        lastName: string;
        studentId?: string;
        course?: string;
        yearLevel?: string;
    };
}

interface AttendanceData {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    totalSessions: number;
    attendedSessions: number;
    attendanceRate: number;
}

interface RecentActivity {
    className: string;
    status: string;
    date: string;
    timeIn: string;
    timeOut: string | null;
    timestamp: string;
}

export default function AttendanceTab({ user }: AttendanceTabProps) {
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttendanceData = async (isBackground = false) => {
        if (!user.id) return;
        if (!isBackground) setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const axios = (await import('axios')).default;

            // Fetch attendance summary
            const summaryResponse = await axios.get(`${API_URL}/api/student/attendance-summary/${user.id}`);
            setAttendanceData(summaryResponse.data);

            // Fetch recent activity
            const activityResponse = await axios.get(`${API_URL}/api/student/recent-activity/${user.id}?limit=20`);
            setRecentActivity(activityResponse.data);
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendanceData();
    }, [user.id]);

    // Auto-refresh interval
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (user.id) {
            // Refresh every 30 seconds in the background
            intervalId = setInterval(() => {
                fetchAttendanceData(true);
            }, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    // Group activity by class
    const groupedActivity = recentActivity.reduce((acc, activity) => {
        if (!acc[activity.className]) {
            acc[activity.className] = [];
        }
        acc[activity.className].push(activity);
        return acc;
    }, {} as Record<string, RecentActivity[]>);

    return (
        <div className="space-y-6">
            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center">
                            <BarChart3 className="text-brand-400" size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{attendanceData?.attendanceRate || 0}%</div>
                            <div className="text-xs text-slate-400">Attendance Rate</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <CheckCircle className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{attendanceData?.presentCount || 0}</div>
                            <div className="text-xs text-slate-400">Present</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <Clock className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{attendanceData?.lateCount || 0}</div>
                            <div className="text-xs text-slate-400">Late</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <CheckCircle className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{attendanceData?.excusedCount || 0}</div>
                            <div className="text-xs text-slate-400">Excused</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                            <XCircle className="text-red-400" size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{attendanceData?.absentCount || 0}</div>
                            <div className="text-xs text-slate-400">Absent</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Attendance History - Grouped by Class */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Calendar className="text-brand-400" size={24} />
                    <h2 className="text-xl font-bold text-white">Attendance History</h2>
                </div>

                <div className="space-y-4">
                    {Object.entries(groupedActivity).length > 0 ? (
                        Object.entries(groupedActivity).map(([className, activities]) => (
                            <div key={className} className="border border-slate-700 rounded-xl overflow-hidden">
                                <details className="group open:bg-slate-800/20 transition-all">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors list-none select-none bg-slate-800/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold shadow-sm border border-slate-600">
                                                {className.split(' - ')[0].replace(/[^A-Za-z]/g, '').substring(0, 2) || className[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{className}</div>
                                                <div className="text-xs text-slate-400 font-medium">
                                                    {activities.length} Records • Recent: {activities[0].status}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-open:rotate-180 transition-transform duration-200 text-slate-400">
                                            ▼
                                        </div>
                                    </summary>

                                    <div className="p-2 space-y-2 bg-slate-900/30">
                                        {activities.map((activity, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 ml-4 mr-2 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-700/50"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Date Block */}
                                                    <div className="text-center min-w-[60px] px-2 py-1 bg-slate-900 rounded-md border border-slate-700">
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                                                            {new Date(activity.timeIn).toLocaleDateString('en-US', { weekday: 'short' })}
                                                        </div>
                                                        <div className="text-sm font-bold text-white">
                                                            {new Date(activity.timeIn).getDate()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-200">
                                                            {new Date(activity.timeIn).toLocaleString('en-US', {
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {new Date(activity.timeIn).toLocaleString('en-US', {
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {(activity as any).recognition_method && (
                                                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' ? <span>✎ Manual</span> : <span>📷 CCTV</span>}
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${activity.status.toLowerCase() === 'present'
                                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                            : activity.status.toLowerCase() === 'late'
                                                                ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                                                : activity.status.toLowerCase() === 'excused'
                                                                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                                                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                                                            }`}
                                                    >
                                                        {activity.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No attendance records yet</p>
                            <p className="text-sm mt-2">Your attendance history will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
