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
        <div className="space-y-12 font-outfit animate-in fade-in duration-1000">
            {/* Welcome Header */}
            <div className="identity-glass p-10 md:p-14 rounded-[3rem] shadow-2xl border border-white/40 relative overflow-hidden group transition-all duration-1000 bg-white/40 backdrop-blur-xl">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                    <div className="text-center lg:text-left space-y-4 group-hover:translate-x-2 transition-transform duration-700">
                        <div className="inline-flex items-center gap-3 py-2 px-4 bg-identity-navy text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-xl shadow-xl font-outfit italic">
                            <span className="w-2 h-2 rounded-full bg-identity-sky animate-status-pulse" />
                            Verified Faculty
                        </div>
                        <h1 className="text-xl md:text-3xl font-black text-identity-navy uppercase tracking-widest italic leading-none opacity-50 font-outfit">
                            WELCOME BACK,
                        </h1>
                        <h2 className="text-3xl md:text-5xl font-black text-identity-navy uppercase tracking-tight italic leading-none font-outfit">
                            Professor <span className="text-identity-sky group-hover:text-identity-navy transition-colors duration-700 underline underline-offset-8 decoration-identity-sky/30">{user.lastName}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-8 bg-white/60 p-8 rounded-[2.5rem] border border-white/50 shadow-xl backdrop-blur-3xl relative z-10 group/date hover:border-identity-sky/30 transition-all duration-700">
                        <div className="text-right font-outfit space-y-1">
                            <div className="text-[11px] font-black text-identity-navy uppercase tracking-[0.3em] mb-2">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                            </div>
                            <div className="flex items-center justify-end gap-4">
                                {(() => {
                                    const dateStr = new Date().toISOString().split('T')[0];
                                    const holidayName = isHoliday(dateStr);
                                    if (holidayName) return (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500 shadow-sm">
                                            <PartyPopper size={16} />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{holidayName.toUpperCase()}</span>
                                        </div>
                                    );
                                    return (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500 shadow-sm">
                                            <Activity size={16} className="animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">ACTIVE</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="bg-identity-navy text-identity-sky p-5 rounded-[1.8rem] shadow-xl group-hover/date:rotate-6 transition-all duration-700 border border-identity-sky/20">
                            <Calendar size={32} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Stats */}
                <div className="space-y-10">
                    <div className="grid grid-cols-1 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white/40 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/20 relative overflow-hidden group hover:scale-[1.01] transition-all duration-700">
                                <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-blueprint" />
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-6 group-hover:scale-110 transition-all duration-1000">
                                    <stat.icon size={64} />
                                </div>
                                <div className="relative z-10 space-y-3">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2.5">
                                        <div className={`w-1 h-1 rounded-full ${stat.color.replace('text-', 'bg-')} animate-pulse`} />
                                        {stat.label}
                                    </div>
                                    <div className={`text-4xl font-black ${stat.color} tracking-tighter leading-none italic`}>
                                        {stat.value}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.1em]">{stat.suffix}</span>
                                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-md border ${stat.trendUp ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right/Middle Column: Next Class & Schedule */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Hero: Next Class */}
                    <div className="bg-identity-navy p-6 md:p-8 rounded-2xl shadow-xl text-white relative overflow-hidden border border-identity-sky/20 group/hero transition-all duration-1000">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                        
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-3 text-identity-sky text-[9px] font-black uppercase tracking-[0.3em] italic">
                                <div className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_10px_rgba(92,180,228,0.8)]" />
                                {nextClass && nextClass.status === 'Now' ? 'IN PROGRESS' : 'UPCOMING SESSION'}
                            </div>

                            {nextClass ? (
                                <>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div className="space-y-3">
                                            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none">
                                                {nextClass.subject_code}
                                            </h3>
                                            <p className="text-white/60 text-sm font-black uppercase tracking-tight italic max-w-xl leading-relaxed">
                                                {nextClass.subject_name}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-lg self-start md:self-center text-center">
                                            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-identity-sky mb-0.5 italic">SECTION</p>
                                            <p className="text-lg font-black text-white italic tracking-tighter uppercase">{nextClass.section}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/5 group/meta transition-all hover:bg-white/10 shadow-inner">
                                            <div className="flex items-center gap-3 mb-3 text-white/40">
                                                <Clock size={16} className="text-identity-sky" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] italic">SCHEDULE</span>
                                            </div>
                                            <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                                                {formatTime(nextClass.startTime)} — {formatTime(nextClass.endTime)}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/5 group/meta transition-all hover:bg-white/10 shadow-inner">
                                            <div className="flex items-center gap-3 mb-3 text-white/40">
                                                <MapPin size={16} className="text-identity-sky" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] italic">LOCATION</span>
                                            </div>
                                            <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                                                {nextClass.room || 'LABORATORY 01'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-8 border-t border-white/10">
                                        <div className="flex items-center gap-5">
                                            <div className="flex -space-x-3">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-10 h-10 rounded-lg border-2 border-identity-navy bg-white/10 flex items-center justify-center text-[9px] font-black text-white shadow-xl backdrop-blur-md">
                                                        {i}
                                                    </div>
                                                ))}
                                                <div className="w-10 h-10 rounded-lg border-2 border-identity-navy bg-identity-sky flex items-center justify-center text-[9px] font-black text-identity-navy shadow-xl">
                                                    +{Math.max(0, (nextClass.student_count || 0) - 3)}
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-identity-sky italic">{nextClass.student_count || 0} ENROLLED</p>
                                                <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] italic">STREAMS READY</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/professor/classes/${nextClass.id}`)}
                                            className="w-full lg:w-auto bg-identity-sky hover:bg-white text-identity-navy px-8 py-4 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] italic transition-all duration-500 group/btn shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            LAUNCH CLASS <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-24 text-center space-y-12 bg-white/5 rounded-[4rem] border border-white/10 shadow-inner">
                                    <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl border border-white/10 text-[#5CB4E4]/30">
                                        <RefreshCw size={64} className="animate-spin duration-[6000ms]" />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">DAY COMPLETE</h2>
                                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.5em] italic">ALL CLASSES FOR TODAY ARE FINISHED</p>
                                    </div>
                                    <div className="inline-flex items-center gap-4 px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                        <ShieldCheck size={18} /> SYSTEM ACTIVE AND STABLE
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule List */}
                    <div className="bg-white/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden group/list transition-all duration-1000">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                        
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-identity-navy text-identity-sky p-3 rounded-xl shadow-lg group-hover/list:rotate-[-8deg] transition-all duration-700 border border-identity-sky/20">
                                    <Calendar size={20} />
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">DAILY SCHEDULE</h3>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] italic mb-0.5">ACTIVE SESSIONS</p>
                                <p className="text-base font-black text-identity-navy uppercase italic tracking-tighter">{todayClasses.length} SESSIONS TODAY</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {error ? (
                                <div className="p-14 text-center bg-rose-500/5 rounded-[2.5rem] border border-rose-500/20">
                                    <AlertCircle size={48} className="text-rose-500 mx-auto mb-6 opacity-50" />
                                    <h4 className="text-xl font-black text-rose-500 uppercase italic mb-2">CONNECTION ERROR</h4>
                                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] italic">{error.toUpperCase()}</p>
                                </div>
                            ) : todayClasses.length > 0 ? (
                                todayClasses.map((cls) => {
                                    const schedule = JSON.parse(cls.schedule_json);
                                    const todaySlot = schedule.find((s: any) => s.day === today);
                                    return (
                                        <div
                                            key={cls.id}
                                            onClick={() => router.push(`/professor/classes/${cls.id}`)}
                                            className="bg-white/60 hover:bg-white rounded-2xl p-6 border border-slate-100 hover:border-identity-sky/30 transition-all duration-500 cursor-pointer group/row shadow-sm hover:shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-identity-navy text-identity-sky rounded-xl flex items-center justify-center font-black text-[9px] border border-identity-sky/20 group-hover/row:scale-105 transition-all shadow-lg">
                                                    {cls.subject_code}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <h4 className="text-lg font-black text-identity-navy uppercase italic leading-none group-hover/row:text-identity-sky transition-colors">
                                                        {cls.subject_name}
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Users size={12} className="text-identity-sky/40" /> SECTION {cls.section}
                                                        </span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[9px] font-black text-identity-sky uppercase tracking-[0.2em]">ID: #{cls.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {todaySlot && (
                                                <div className="flex flex-col lg:items-end gap-2 lg:border-l border-slate-100 lg:pl-8">
                                                    <div className="flex items-center gap-3 text-lg font-black text-identity-navy uppercase italic">
                                                        <div className="p-2 bg-identity-sky/10 rounded-lg text-identity-sky border border-identity-sky/20 group-hover/row:bg-identity-navy group-hover/row:text-white transition-all">
                                                            <Clock size={14} />
                                                        </div>
                                                        {todaySlot.startTime} — {todaySlot.endTime}
                                                    </div>
                                                    <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                                        {cls.student_count || 0} ENROLLED
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-20 text-center rounded-[3rem] border-2 border-dashed border-identity-sky/10 bg-white/10 group/empty">
                                    <div className="w-24 h-24 bg-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-50 group-hover/empty:scale-110 transition-all duration-700">
                                        <BookOpen size={42} className="text-identity-navy/10" />
                                    </div>
                                    <h4 className="text-2xl font-black text-identity-navy uppercase italic mb-4">NO CLASSES</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">NOTHING SCHEDULED FOR TODAY.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
