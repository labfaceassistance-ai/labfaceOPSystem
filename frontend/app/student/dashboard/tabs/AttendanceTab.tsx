"use client";
import { useEffect, useState } from 'react';
import { BarChart3, Clock, XCircle, ChevronDown, Activity, ShieldCheck, CheckCircle } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

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
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} variant="card" height="100px" />
                    ))}
                </div>
                <Skeleton variant="card" height="400px" />
            </div>
        );
    }

    const groupedActivity = recentActivity.reduce((acc, activity) => {
        if (!acc[activity.className]) { acc[activity.className] = []; }
        acc[activity.className].push(activity);
        return acc;
    }, {} as Record<string, RecentActivity[]>);

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-outfit">
            {/* Summary Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {[
                    { label: 'Overall Rate', val: `${attendanceData?.attendanceRate || 0}%`, icon: BarChart3, color: 'text-identity-sky', bg: 'bg-identity-sky/10' },
                    { label: 'Present', val: attendanceData?.presentCount || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Late', val: attendanceData?.lateCount || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Excused', val: attendanceData?.excusedCount || 0, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Absent', val: attendanceData?.absentCount || 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                ].map((stat, i) => (
                    <div key={i} className="identity-glass p-8 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-xl transition-all group hover:scale-[1.02] active:scale-100 flex flex-col items-center text-center gap-4">
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center border border-identity-sky/5 group-hover:scale-110 transition-transform duration-500`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-identity-navy italic tracking-tighter leading-none mb-2">{stat.val}</div>
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Protocol Logs Section */}
            <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-xl relative overflow-hidden group">
                <div className="flex items-center gap-6 mb-12">
                    <div className="p-3 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10 shadow-sm">
                        <Activity size={28} className="text-identity-sky" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Protocol Logs</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-2">Registry Synchronization History</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {Object.entries(groupedActivity).length > 0 ? (
                        Object.entries(groupedActivity).map(([className, activities]) => (
                            <div key={className} className="border border-identity-sky/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-sm bg-white/40 hover:border-identity-sky/20 transition-all duration-500">
                                <details className="group/details">
                                    <summary className="flex items-center justify-between p-8 cursor-pointer hover:bg-white transition-all list-none select-none">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-identity-sky/10 flex items-center justify-center text-identity-navy font-black shadow-sm uppercase text-2xl italic group-hover/details:bg-identity-navy group-hover/details:text-white transition-all duration-500">
                                                {className.split(' - ')[0].replace(/[^A-Za-z]/g, '').substring(0, 2) || className[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-identity-navy text-lg uppercase tracking-tight italic">{className}</div>
                                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">
                                                    {activities.length} Node Fragments â€¢ Status: <span className="text-identity-sky">{activities[0].status.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-open/details:rotate-180 transition-transform duration-500 text-identity-sky p-3 bg-white/80 rounded-2xl shadow-xl border border-identity-sky/10">
                                            <ChevronDown size={20} />
                                        </div>
                                    </summary>

                                    <div className="px-6 pb-6 space-y-4">
                                        {activities.map((activity, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-6 bg-white/60 rounded-2xl border border-identity-sky/5 hover:border-identity-sky/20 group/item shadow-sm hover:shadow-2xl transition-all"
                                            >
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center min-w-[80px] px-4 py-3 bg-identity-sky/5 rounded-2xl border border-identity-sky/10 group-hover/item:bg-identity-navy group-hover/item:text-white transition-all duration-500">
                                                        <div className="text-[9px] text-slate-500 group-hover/item:text-white/60 uppercase font-black tracking-[0.2em] mb-1">
                                                            {new Date(activity.timeIn).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                                        </div>
                                                        <div className="text-2xl font-black italic tracking-tighter">
                                                            {new Date(activity.timeIn).getDate()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-[0.2em] mb-2 opacity-60 italic">
                                                            {new Date(activity.timeIn).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                            <Clock size={16} className="text-identity-sky" />
                                                            {new Date(activity.timeIn).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {(activity as any).recognition_method && (
                                                        <div className="hidden sm:flex items-center gap-4 text-[9px] text-slate-500 bg-white/80 px-5 py-2.5 rounded-full border border-identity-sky/10 font-black uppercase tracking-[0.2em] shadow-inner">
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' 
                                                                ? <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                                                                : <div className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(92,180,228,0.5)]"></div>}
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' ? 'Manual Sync' : 'Biometric Auth'}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                                                            activity.status.toLowerCase() === 'present' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5' : 
                                                            activity.status.toLowerCase() === 'late' ? 'text-amber-600 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5' : 
                                                            activity.status.toLowerCase() === 'excused' ? 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5' : 
                                                            'text-rose-600 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5'
                                                        }`}
                                                    >
                                                        {activity.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon={Activity}
                            title="Registry History Empty"
                            description="No attendance protocol fragments detected in this academic cycle."
                            className="py-24"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
