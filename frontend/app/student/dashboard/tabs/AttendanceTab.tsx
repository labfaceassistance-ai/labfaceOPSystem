"use client";
import { useEffect, useState } from 'react';
import { BarChart3, Clock, XCircle, ChevronDown, Activity, ShieldCheck, CheckCircle, Calendar } from 'lucide-react';
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
            <div className="space-y-12 animate-fade-in">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} variant="card" height="150px" />
                    ))}
                </div>
                <Skeleton variant="card" height="500px" />
            </div>
        );
    }

    const groupedActivity = recentActivity.reduce((acc, activity) => {
        if (!acc[activity.className]) { acc[activity.className] = []; }
        acc[activity.className].push(activity);
        return acc;
    }, {} as Record<string, RecentActivity[]>);

    return (
        <div className="space-y-8 animate-fade-up pb-8 font-outfit">
            {/* Tab Title HUD */}
            <div className="flex items-center gap-4 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
                <div className="flex flex-col items-center px-8">
                    <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.6em] italic opacity-70 mb-1">
                        STUDENT DASHBOARD
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(0,186,255,0.8)]" />
                        <span className="text-[12px] font-black text-identity-navy uppercase tracking-[0.2em] italic">HISTORICAL RECORDS</span>
                    </div>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
            </div>

            {/* Attendance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'ATTENDANCE RATE', val: `${attendanceData?.attendanceRate || 0}%`, icon: BarChart3, color: 'text-identity-sky', bg: 'bg-identity-sky/10' },
                    { label: 'PRESENT', val: attendanceData?.presentCount || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'LATE', val: attendanceData?.lateCount || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'EXCUSED', val: attendanceData?.excusedCount || 0, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'ABSENT', val: attendanceData?.absentCount || 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                ].map((stat, i) => (
                    <div key={i} className="identity-glass p-6 sm:p-7 rounded-[2rem] md:rounded-[2.5rem] border-2 border-identity-sky/15 shadow-xl transition-all group hover:scale-[1.05] active:scale-100 flex flex-col items-center text-center gap-4 relative overflow-hidden bg-white/40 backdrop-blur-xl">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center border-2 border-identity-sky/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl relative z-10`}>
                            <stat.icon size={28} className="filter drop-shadow-md" />
                        </div>
                        <div className="relative z-10 w-full">
                            <div className="text-3xl sm:text-4xl font-black text-identity-navy italic tracking-tighter leading-none mb-3 drop-shadow-sm">{stat.val}</div>
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] italic opacity-60 flex items-center justify-center gap-2">
                                <div className="w-1.5 h-[1px] bg-slate-400" />
                                {stat.label}
                                <div className="w-1.5 h-[1px] bg-slate-400" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Protocol Logs Section */}
            <div className="identity-glass p-8 sm:p-10 md:p-12 rounded-[3rem] md:rounded-[4rem] border-2 border-identity-sky/15 shadow-3xl relative overflow-hidden group bg-white/40 backdrop-blur-2xl">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                <div className="corner-bracket-tl scale-110 -top-4 -left-4" />
                <div className="corner-bracket-br scale-110 -bottom-4 -right-4" />

                <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 relative z-10">
                    <div className="p-5 bg-identity-navy text-white rounded-2xl border-2 border-identity-sky/25 shadow-3xl group-hover:bg-identity-sky transition-all duration-700 shadow-identity-navy/20">
                        <Activity size={36} className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mb-2 italic flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-identity-sky animate-status-pulse shadow-[0_0_10px_rgba(92,180,228,0.8)]" />
                            Biometric Attendance Records
                        </p>
                        <h2 className="text-3xl md:text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">ATTENDANCE HISTORY</h2>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {Object.entries(groupedActivity).length > 0 ? (
                        Object.entries(groupedActivity).map(([className, activities]) => (
                            <div key={className} className="border-2 border-identity-sky/15 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl bg-white/60 hover:border-identity-sky/35 transition-all duration-700 group/module relative backdrop-blur-md">
                                <div className="absolute inset-x-0 top-0 h-1.5 bg-identity-sky/20 group-hover/module:bg-identity-sky transition-colors duration-500" />
                                <details className="group/details" open={Object.entries(groupedActivity).length === 1}>
                                    <summary className="flex items-center justify-between p-8 cursor-pointer hover:bg-white/40 transition-all list-none select-none">
                                        <div className="flex items-center gap-8">
                                            <div className="w-14 h-14 rounded-[1.25rem] bg-identity-navy text-white border-2 border-identity-sky/25 flex items-center justify-center text-2xl font-black shadow-3xl italic group-hover/details:bg-identity-sky group-hover/details:rotate-6 transition-all duration-700 uppercase font-outfit shadow-identity-navy/20">
                                                {className.split(' - ')[0].replace(/[^A-Za-z]/g, '').substring(0, 2) || className[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-identity-navy text-xl uppercase tracking-tight italic group-hover/details:text-identity-sky transition-colors">{className}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 italic flex items-center gap-3">
                                                    <span className="text-identity-sky shadow-sm px-3 py-1 bg-identity-sky/10 rounded-full border border-identity-sky/20">RECORDS: {activities.length}</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                    <span className="text-identity-navy/60">STATUS: ACTIVE</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-open/details:rotate-180 transition-all duration-700 text-identity-navy p-4 bg-white shadow-3xl border-2 border-identity-sky/15 rounded-2xl group-hover/details:bg-identity-navy group-hover/details:text-white">
                                            <ChevronDown size={22} className="filter drop-shadow-sm" />
                                        </div>
                                    </summary>

                                    <div className="px-8 pb-10 space-y-4">
                                        {activities.map((activity, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/90 rounded-3xl border-2 border-identity-sky/5 hover:border-identity-sky/30 group/item shadow-xl hover:shadow-4xl transition-all relative overflow-hidden group/row"
                                            >
                                                <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky/10 group-hover/row:bg-identity-sky transition-colors duration-500" />
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-8 relative z-10 mb-6 md:mb-0">
                                                    <div className="text-center min-w-[100px] px-6 py-4 bg-identity-navy text-white rounded-2xl border-2 border-identity-sky/30 shadow-3xl group-hover/item:rotate-3 transition-all duration-700 shadow-identity-navy/20">
                                                        <div className="text-[10px] text-identity-sky uppercase font-black tracking-[0.3em] mb-1 italic">
                                                            {new Date(activity.timeIn).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                                        </div>
                                                        <div className="text-3xl font-black italic tracking-tighter">
                                                            {new Date(activity.timeIn).getDate()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-identity-sky uppercase tracking-[0.4em] mb-2 italic opacity-80 flex items-center gap-3">
                                                            <div className="w-6 h-[1px] bg-identity-sky/30" />
                                                            ATTENDANCE LOGGED
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-6">
                                                            <div className="flex items-center gap-3 text-[13px] font-black text-identity-navy uppercase tracking-[0.1em] italic">
                                                                <Calendar size={18} className="text-identity-sky" />
                                                                {new Date(activity.timeIn).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                                                            </div>
                                                            <div className="hidden sm:block w-2 h-2 rounded-full bg-slate-300" />
                                                            <div className="flex items-center gap-3 text-[13px] font-black text-slate-500 uppercase tracking-[0.1em] italic">
                                                                <Clock size={18} className="text-identity-sky animate-pulse" />
                                                                {new Date(activity.timeIn).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 relative z-10">
                                                    {(activity as any).recognition_method && (
                                                        <div className="hidden lg:flex items-center gap-4 text-[10px] text-slate-500 bg-white px-6 py-3 rounded-2xl border-2 border-identity-sky/10 font-black uppercase tracking-[0.25em] italic shadow-inner group-hover/row:border-identity-sky/30 transition-all duration-700">
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' 
                                                                ? <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse"></div>
                                                                : <div className="w-2.5 h-2.5 rounded-full bg-identity-sky shadow-[0_0_10px_rgba(92,180,228,0.6)] animate-status-pulse"></div>}
                                                            {(activity as any).recognition_method.toLowerCase() === 'manual' ? 'MANUAL' : 'BIOMETRIC'}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] border-2 shadow-2xl italic transition-all group-hover/row:scale-110 ${
                                                            activity.status.toLowerCase() === 'present' ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' : 
                                                            activity.status.toLowerCase() === 'late' ? 'text-amber-700 bg-amber-500/10 border-amber-500/30' : 
                                                            activity.status.toLowerCase() === 'excused' ? 'text-identity-sky bg-identity-sky/10 border-identity-sky/30' : 
                                                            'text-rose-700 bg-rose-500/10 border-rose-500/30'
                                                        }`}
                                                    >
                                                        {activity.status.toLowerCase() === 'present' ? 'PRESENT' : activity.status.toLowerCase() === 'late' ? 'LATE' : activity.status.toLowerCase() === 'excused' ? 'EXCUSED' : 'ABSENT'}
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
                            title="NO ATTENDANCE RECORDS"
                            description="No attendance records found. Your history will appear here once you attend classes."
                            className="py-32 bg-white/40 rounded-[4.5rem] border-2 border-dashed border-identity-sky/20"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
