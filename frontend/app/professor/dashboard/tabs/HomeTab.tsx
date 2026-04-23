"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import { Calendar, BookOpen, Users, XCircle, Clock, MapPin, ChevronRight, TrendingUp, AlertCircle, CheckCircle, Briefcase, Coffee, PartyPopper, Activity, Zap, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isHoliday } from '@/utils/holidays';

interface HomeTabProps {
    user: any;
    classes: any[];
    error?: string | null;
}

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12' && modifier === 'AM') hours = '00';
        if (modifier === 'PM' && hours !== '12') hours = (parseInt(hours, 10) + 12).toString();
        
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        }).toUpperCase();
    } catch {
        return timeStr;
    }
};

export default function HomeTab({ user, classes, error }: HomeTabProps) {
    const router = useRouter();
    const [totalStudents, setTotalStudents] = useState(0);
    const [nextClass, setNextClass] = useState<any>(null);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const activeClasses = classes.filter(c => !c.is_archived);

    // Filter today's classes
    const todayClasses = activeClasses.filter(c => {
        try {
            const schedule = JSON.parse(c.schedule_json);
            return Array.isArray(schedule) && schedule.some((s: any) => s.day === today);
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const calculateNextClass = () => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            let nearest: any = null;
            let minDiff = Infinity;

            todayClasses.forEach(cls => {
                try {
                    const schedule = JSON.parse(cls.schedule_json);
                    const todaySlot = schedule.find((s: any) => s.day === today);

                    if (todaySlot) {
                        const [time, modifier] = todaySlot.startTime.split(' ');
                        let [hours, minutes] = time.split(':');
                        hours = parseInt(hours);
                        minutes = parseInt(minutes);

                        if (hours === 12 && modifier === 'AM') hours = 0;
                        if (hours !== 12 && modifier === 'PM') hours += 12;

                        const classTime = hours * 60 + minutes;
                        const diff = classTime - currentTime;

                        if (diff > -15 && diff < minDiff) {
                            minDiff = diff;
                            nearest = {
                                ...cls,
                                ...todaySlot,
                                startTime: todaySlot.startTime,
                                endTime: todaySlot.endTime,
                                room: todaySlot.room || 'Lab 1',
                                status: diff <= 0 ? 'Now' : 'Upcoming'
                            };
                        }
                    }
                } catch (e) {
                    console.error("Schedule parse error", e);
                }
            });
            setNextClass(nearest);
        };

        calculateNextClass();

        const fetchStats = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const token = getToken();
                const response = await axios.get(`${API_URL}/api/classes/professor/${user.professorId || user.userId}/stats-overview`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTotalStudents(response.data.totalStudents || 0);
            } catch (err) {
                const simpleSum = activeClasses.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
                setTotalStudents(simpleSum);
            }
        };
        fetchStats();

        const interval = setInterval(calculateNextClass, 60000);
        return () => clearInterval(interval);

    }, [user, classes, today, todayClasses, activeClasses]);

    const stats = [
        { label: 'Total Students', value: totalStudents, suffix: 'STUDENTS', icon: Users, color: 'text-[#041C3C]', trend: '+12%', trendUp: true },
        { label: 'Active Classes', value: activeClasses.length, suffix: 'CLASSES', icon: Zap, color: 'text-[#5CB4E4]', trend: 'ACTIVE', trendUp: true },
        { label: 'Classes Today', value: todayClasses.length, suffix: 'SESSIONS', icon: Activity, color: 'text-emerald-500', trend: 'ACTIVE', trendUp: true },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 font-outfit animate-in fade-in duration-1000">
            {/* HUD COMMAND BAR - Consolidated Header */}
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/20 p-4 sm:p-6 shadow-xl relative overflow-hidden group transition-all duration-700">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1 text-center sm:text-left">
                        <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] sm:tracking-[0.4em] italic leading-none">PROFESSOR_COMMAND_CENTER</div>
                        <h2 className="text-xl sm:text-2xl font-black text-identity-navy uppercase tracking-tight italic leading-none">
                            WELCOME, <span className="text-identity-sky">{user.lastName}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-right">
                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1 italic">SYSTEM_TIME_STAMP</div>
                            <div className="text-[11px] font-black text-identity-navy uppercase tracking-widest italic">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
                            </div>
                        </div>
                        <div className="w-px h-10 bg-slate-200/50" />
                        <div className="bg-identity-navy text-identity-sky p-2.5 rounded-lg border border-identity-sky/20">
                            <Calendar size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK MONITOR - KPI Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white/40 backdrop-blur-xl p-4 sm:p-5 rounded-xl shadow-lg border border-white/20 relative overflow-hidden group">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="space-y-1">
                                <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                    <div className={`w-1 h-1 rounded-full ${stat.color.replace('text-', 'bg-')}`} />
                                    {stat.label}
                                </div>
                                <div className={`text-xl sm:text-2xl font-black ${stat.color} tracking-tighter leading-none italic`}>
                                    {stat.value}
                                </div>
                            </div>
                            <stat.icon size={20} className="sm:w-6 sm:h-6 text-slate-200 opacity-50 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                ))}
            </div>

            {/* OPERATIONS VIEW - Schedule Matrix */}
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden shadow-xl relative min-h-[400px]">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                
                <div className="p-3 sm:p-4 border-b border-white/40 flex items-center justify-between bg-white/20 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="bg-identity-navy text-identity-sky p-1.5 sm:p-2 rounded-lg">
                            <Clock size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <h3 className="text-[10px] sm:text-[11px] font-black text-identity-navy uppercase tracking-[0.3em] sm:tracking-[0.4em] italic">DAILY_OPERATIONS_MATRIX</h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">LIVE_STATUS_ACTIVE</span>
                    </div>
                </div>

                <div className="relative z-10">
                    {nextClass ? (
                        <div className="bg-identity-navy/5 p-4 border-b border-identity-sky/10 flex flex-wrap items-center justify-between gap-6 group">
                            <div className="flex items-center gap-6">
                                <div className="w-2 h-10 bg-identity-sky rounded-full shadow-[0_0_15px_rgba(92,180,228,0.5)]" />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-identity-sky text-identity-navy text-[8px] font-black px-2 py-0.5 rounded italic">UPCOMING_NOW</span>
                                        <span className="text-sm font-black text-identity-navy uppercase italic">{nextClass.subject_code}</span>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight italic truncate max-w-xs">{nextClass.subject_name}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-10">
                                <div className="text-right">
                                    <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic mb-0.5">TIME_SLOT</div>
                                    <div className="text-[12px] font-black text-identity-navy italic">{formatTime(nextClass.startTime)} — {formatTime(nextClass.endTime)}</div>
                                </div>
                                <button
                                    onClick={() => router.push(`/professor/classes/${nextClass.id}`)}
                                    className="bg-identity-sky hover:bg-identity-navy hover:text-white text-identity-navy px-6 py-2.5 rounded-lg font-black uppercase tracking-[0.2em] text-[9px] italic transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    LAUNCH <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    ) : todayClasses.length > 0 ? (
                        <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-center gap-4">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.5em] italic">[ OP_STATUS: STANDBY // ALL_SESSIONS_COMPLETE ]</span>
                        </div>
                    ) : null}

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {['SUBJECT', 'SECTION', 'SCHEDULE', 'LOCATION', 'CAPACITY', 'ACTION'].map(h => (
                                        <th key={h} className="px-6 py-3 text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] italic">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {todayClasses.length > 0 ? todayClasses.map((cls) => {
                                    const schedule = JSON.parse(cls.schedule_json);
                                    const todaySlot = schedule.find((s: any) => s.day === today);
                                    const isNext = nextClass?.id === cls.id;
                                    return (
                                        <tr key={cls.id} className={`group hover:bg-slate-50/50 transition-colors ${isNext ? 'bg-identity-sky/5' : ''}`}>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-identity-navy text-identity-sky rounded-lg flex items-center justify-center font-black text-[7px] border border-identity-sky/10">
                                                        {cls.subject_code.slice(0, 4)}
                                                    </div>
                                                    <div className="text-[11px] font-black text-identity-navy uppercase italic">{cls.subject_name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">#{cls.section}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-[10px] font-black text-identity-navy italic">{todaySlot?.startTime} - {todaySlot?.endTime}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-[10px] font-black text-slate-400 italic">{cls.room || 'LAB_01'}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-[10px] font-black text-slate-400 italic">{cls.student_count || 0} ENROLLED</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <button
                                                    onClick={() => router.push(`/professor/classes/${cls.id}`)}
                                                    className="p-2 text-slate-300 hover:text-identity-sky transition-colors"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <BookOpen size={48} />
                                                <div className="text-[10px] font-black uppercase tracking-[0.5em] italic">NO_OPERATIONS_SCHEDULED</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
