"use client";
import { useEffect, useState } from 'react';
import { BarChart3, Calendar, CheckCircle, Clock, XCircle, ChevronDown, Activity, ShieldCheck } from 'lucide-react';

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

            const summaryResponse = await axios.get(`${API_URL}/api/student/attendance-summary/${user.id}`);
            setAttendanceData(summaryResponse.data);

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

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (user.id) {
            intervalId = setInterval(() => {
                fetchAttendanceData(true);
            }, 30000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [user.id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mb-4"></div>
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.4em]">Aggregating Matrix Data...</p>
            </div>
        );
    }

    const groupedActivity = recentActivity.reduce((acc, activity) => {
        if (!acc[activity.className]) { acc[activity.className] = []; }
        acc[activity.className].push(activity);
        return acc;
    }, {} as Record<string, RecentActivity[]>);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: 'Sync Rate', val: `${attendanceData?.attendanceRate || 0}%`, icon: BarChart3, color: 'text-identity-sky', bg: 'bg-identity-sky/10' },
                    { label: 'Present', val: attendanceData?.presentCount || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Late', val: attendanceData?.lateCount || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Excused', val: attendanceData?.excusedCount || 0, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Absent', val: attendanceData?.absentCount || 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50 group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-identity-navy font-outfit leading-none mb-1">{stat.val}</div>
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Attendance History - Grouped by Class */}
            <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="p-3 bg-identity-navy text-white rounded-2xl">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-identity-navy uppercase tracking-tighter font-outfit">Historical Synchronization</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.3em] mt-1">Operational Logs • Academic Matrix</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {Object.entries(groupedActivity).length > 0 ? (
                        Object.entries(groupedActivity).map(([className, activities]) => (
                            <div key={className} className="border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                                <details className="group">
                                    <summary className="flex items-center justify-between p-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all list-none select-none">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-identity-navy font-black shadow-inner uppercase text-xl">
                                                {className.split(' - ')[0].replace(/[^A-Za-z]/g, '').substring(0, 2) || className[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-identity-navy text-base uppercase tracking-tighter">{className}</div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                                                    {activities.length} Entries Detected • Last: <span className="text-identity-sky">{activities[0].status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-open:rotate-180 transition-transform duration-500 text-slate-300 p-2 bg-white rounded-full shadow-sm border border-slate-100">
                                            <ChevronDown size={20} />
                                        </div>
                                    </summary>

                                    <div className="p-4 space-y-3 bg-white">
                                        {activities.map((activity, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-5 bg-slate-50/30 hover:bg-slate-50 rounded-2xl transition-all border border-slate-50 hover:border-slate-100 group"
                                            >
                                                <div className="flex items-center gap-6">
                                                    {/* Date Block */}
                                                    <div className="text-center min-w-[70px] px-3 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:bg-identity-navy group-hover:text-white transition-all duration-500">
                                                        <div className="text-[9px] text-slate-400 group-hover:text-white/40 uppercase font-black tracking-widest mb-1">
                                                            {new Date(activity.timeIn).toLocaleDateString('en-US', { weekday: 'short' })}
                                                        </div>
                                                        <div className="text-lg font-black font-outfit">
                                                            {new Date(activity.timeIn).getDate()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-widest mb-1 opacity-80">
                                                            {new Date(activity.timeIn).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                            <Clock size={12} className="text-identity-sky/50" />
                                                            {new Date(activity.timeIn).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {(activity as any).recognition_method && (
                                                        <div className="hidden sm:flex items-center gap-2 text-[8px] text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 font-black uppercase tracking-widest shadow-sm">
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' 
                                                                ? <><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Manual Entry</> 
                                                                : <><div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse"></div> CCTV Sync</>}
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                            activity.status.toLowerCase() === 'present' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                                                            activity.status.toLowerCase() === 'late' ? 'text-amber-600 bg-amber-50 border-amber-100' : 
                                                            activity.status.toLowerCase() === 'excused' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 
                                                            'text-rose-600 bg-rose-50 border-rose-100'
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
                        <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 border-dashed">
                            <Calendar size={64} className="mx-auto mb-6 opacity-10 text-identity-navy" />
                            <p className="text-xl font-black text-slate-300 uppercase tracking-tighter">History Empty</p>
                            <p className="text-[10px] mt-2 font-black text-slate-200 uppercase tracking-[0.3em]">No node sync records detected in this academic period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
