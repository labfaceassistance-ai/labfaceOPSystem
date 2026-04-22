"use client";
import { useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, AlertCircle, XCircle, Briefcase, Coffee, PartyPopper, CheckCircle, BookOpen, TrendingUp, Zap, ChevronRight, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isHoliday } from '@/utils/holidays';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface HomeTabProps {
    user: any;
    dashboardData: any;
    error?: string | null;
}

export default function HomeTab({ user, dashboardData, error }: HomeTabProps) {
    const router = useRouter();

    if (!dashboardData && !error) {
        return (
            <div className="space-y-10 animate-fade-in">
                <Skeleton variant="card" height="250px" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="space-y-10">
                        <Skeleton variant="card" height="300px" />
                    </div>
                    <div className="lg:col-span-2 space-y-10">
                        <Skeleton variant="card" height="200px" />
                        <Skeleton variant="card" height="400px" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            {/* Welcome Header Hero */}
            <div className="identity-glass p-6 sm:p-8 rounded-2xl md:rounded-3xl shadow-lg border border-identity-sky/15 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden group font-outfit bg-white/40">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                <div className="corner-bracket-tl scale-90" />
                <div className="corner-bracket-br scale-90" />
                
                <div className="text-center md:text-left relative z-10 flex-1">
                    <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-lg bg-identity-navy text-white border border-identity-sky/20 mb-4 group-hover:scale-105 transition-all shadow-md italic">
                        <span className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-status-pulse shadow-[0_0_8px_rgba(92,180,228,1)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Verified Student</span>
                    </div>
                    <div>
                        <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] italic opacity-50 mb-2 flex items-center justify-center md:justify-start gap-2">
                            <div className="w-5 h-[1px] bg-identity-sky/30" />
                            WELCOME BACK,
                        </h1>
                        <h2 className="text-3xl md:text-4xl font-black text-identity-navy uppercase tracking-tighter leading-none mb-4 drop-shadow-sm italic">
                            {user?.firstName || 'User'} <span className="text-identity-sky">{user?.lastName || ''}</span>
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[11px] italic flex items-center gap-2 bg-white/40 px-4 py-2 rounded-xl border border-white/20 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-emerald-600">Active Account</span>
                            </p>
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px] italic flex items-center gap-2">
                                {user?.course || 'GENERAL'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 md:mt-0 flex items-center gap-6 bg-white/40 px-6 py-4 rounded-2xl border border-identity-sky/15 shadow-lg relative z-10 transition-all hover:bg-white group-hover:scale-105 h-fit backdrop-blur-md">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-[0.3em] italic mb-0.5">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                        </div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] italic mb-3">
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-1">
                            {(() => {
                                const today = new Date();
                                const dateStr = today.toISOString().split('T')[0];
                                const holidayName = isHoliday(dateStr);
                                if (holidayName) return <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20"><PartyPopper size={14} className="text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] italic">Holiday</span></div>;
                                if (today.getDay() === 0 || today.getDay() === 6) return <div className="flex items-center gap-2 px-4 py-2 bg-identity-sky/10 rounded-xl border border-identity-sky/20"><Coffee size={14} className="text-identity-sky" /><span className="text-[9px] font-black text-identity-sky uppercase tracking-[0.2em] italic">Weekend</span></div>;
                                return <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><Zap size={14} className="text-emerald-500 animate-pulse" /><span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">ACTIVE</span></div>;
                            })()}
                        </div>
                    </div>
                    <div className="p-4 bg-identity-navy text-identity-sky rounded-2xl shadow-lg border border-identity-sky/20 group-hover:bg-identity-sky group-hover:text-white transition-all duration-700">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Stats Overview */}
                <div className="space-y-8 font-outfit h-full">
                    <div className="identity-glass p-6 rounded-2xl md:rounded-3xl shadow-lg border border-identity-sky/15 relative overflow-hidden group flex flex-col justify-between h-full bg-white/40 backdrop-blur-xl transition-all hover:bg-white/60">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint-fine" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between border-b border-identity-sky/10 pb-4 mb-4">
                                <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.4em] italic">ACADEMIC METRICS</p>
                                <TrendingUp size={16} className="text-identity-sky/40" />
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Overall Attendance</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-4xl font-black text-identity-navy italic tracking-tighter">
                                            {(dashboardData?.stats?.attendanceRate || 0).toFixed(1)}%
                                        </p>
                                        <span className="text-[9px] font-black text-emerald-500 mb-1 uppercase italic">+2.4%</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-identity-sky transition-all duration-1000" style={{ width: `${dashboardData.overallAttendance}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border-2 border-emerald-500/20 shadow-xl group-hover:scale-110 transition-all duration-700 group-hover:rotate-6">
                                <ShieldCheck size={32} className="filter drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            </div>
                        </div>

                        <div className="relative z-10 flex-1 flex flex-col justify-end">
                            <div className="mt-4 h-5 w-full bg-slate-200/50 backdrop-blur-sm rounded-full overflow-hidden shadow-inner p-[4px] border-2 border-white/50">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1500 ease-out shadow-[0_0_20px_rgba(16,185,129,0.6)] relative overflow-hidden"
                                    style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-10">
                                {[
                                    { label: 'PRESENT', val: dashboardData?.stats?.present || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
                                    { label: 'LATE', val: dashboardData?.stats?.late || 0, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
                                    { label: 'EXCUSED', val: dashboardData?.stats?.excused || 0, color: 'text-identity-sky', bg: 'bg-identity-sky/10', icon: ShieldCheck },
                                    { label: 'ABSENT', val: dashboardData?.stats?.absences || 0, color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle }
                                ].map((stat, i) => (
                                    <div key={i} className={`p-6 rounded-2xl border border-transparent hover:border-identity-sky/20 transition-all ${stat.bg} group/item relative overflow-hidden active:scale-95 cursor-pointer shadow-indigo-500/5 shadow-lg`}>
                                        <stat.icon size={16} className={`absolute top-4 right-4 opacity-30 ${stat.color} group-hover/item:scale-125 transition-transform duration-500`} />
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 group-hover/item:text-identity-sky italic">{stat.label}</div>
                                        <div className={`text-3xl font-black font-outfit ${stat.color} italic leading-none`}>{stat.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Priority Queue & Activity */}
                <div className="lg:col-span-2 space-y-8 font-outfit h-full">
                    {/* Active Session - HUD HUD style */}
                    <div className="identity-glass rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-identity-sky/15 group relative h-fit bg-identity-navy/[0.02] backdrop-blur-xl">
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-br scale-90" />
                        
                        <div className="p-8 md:p-10 relative z-10">
                            <div className="flex items-center gap-4 text-identity-sky mb-8 text-[10px] font-black uppercase tracking-[0.5em] bg-identity-navy text-white w-fit px-6 py-2.5 rounded-full border border-identity-sky/20 italic shadow-xl">
                                <Zap size={18} className="animate-pulse filter drop-shadow-[0_0_8px_rgba(92,180,228,0.8)] text-identity-sky" /> Upcoming Class
                            </div>
                            
                            {dashboardData?.nextClass ? (
                                <div className="space-y-8">
                                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                                        <div className="flex-1">
                                            <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.5em] mb-3 italic opacity-60 flex items-center gap-2">
                                                <div className="w-8 h-[1px] bg-identity-sky/30" />
                                                Class Name
                                            </h1>
                                            <h2 className="text-4xl md:text-5xl font-black text-identity-navy tracking-tighter uppercase font-outfit leading-tight italic mb-6 drop-shadow-lg">{dashboardData.nextClass.subject}</h2>
                                            <div className="flex flex-wrap items-center gap-6 text-slate-500 font-black text-[12px] uppercase tracking-[0.25em] italic">
                                                <div className="flex items-center gap-2.5 px-4 py-2 bg-white/60 rounded-xl border border-slate-200">
                                                    <UserIcon size={16} className="text-identity-sky" />
                                                    {dashboardData.nextClass.professor}
                                                </div>
                                                <div className="flex items-center gap-2.5 px-4 py-2 bg-white/60 rounded-xl border border-slate-200">
                                                    <MapPin size={16} className="text-identity-sky" />
                                                    ROOM {dashboardData.nextClass.room}
                                                </div>
                                            </div>
                                        </div>
                                        {dashboardData.nextClass.type && (
                                            <div className="px-10 py-5 bg-identity-navy text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl border-b-[4px] border-identity-sky/40 italic group-hover:bg-identity-sky transition-all duration-700 hover:scale-105 active:scale-100 cursor-pointer">
                                                {dashboardData.nextClass.type}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-6 pt-8 border-t border-identity-sky/10">
                                        {[
                                            { label: 'Schedule', val: dashboardData.nextClass.time, icon: Clock },
                                            { label: 'Status', val: dashboardData.nextClass.status, alert: dashboardData.nextClass.status === 'Cancelled', icon: AlertCircle }
                                        ].map((item, i) => (
                                            <div key={i} className={`px-8 py-6 rounded-2xl border transition-all flex items-center gap-6 shadow-xl ${item.alert ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/80 border-identity-sky/15 hover:border-identity-sky/40 hover:-translate-y-1'}`}>
                                                <div className={`p-4 rounded-xl shadow-xl ${item.alert ? 'bg-rose-500 text-white' : 'bg-identity-navy text-white shadow-identity-navy/20'}`}>
                                                    <item.icon size={20} className="filter drop-shadow-md" />
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1 italic">{item.label}</span>
                                                    <span className={`font-black text-lg uppercase italic tracking-wider ${item.alert ? 'text-rose-600' : 'text-identity-navy'}`}>{item.val}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 flex items-start gap-6 shadow-xl relative overflow-hidden group/notice transition-all hover:bg-rose-500/15">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-rose-500/40" />
                                            <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl group-hover/notice:rotate-12 transition-transform duration-500">
                                                <AlertCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-rose-500 uppercase font-black tracking-[0.5em] mb-2 italic">Cancellation Notice</p>
                                                <p className="text-rose-950 font-black text-sm tracking-[0.1em] uppercase leading-relaxed italic opacity-85">{dashboardData.nextClass.reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Coffee}
                                    title="No Upcoming Classes"
                                    description="No upcoming classes detected at this time."
                                    className="py-12 bg-white/40 rounded-2xl border border-dashed border-identity-sky/20 backdrop-blur-sm"
                                />
                            )}
                        </div>
                    </div>

                    {/* Activity Logs - Industrial Terminal style */}
                    <div className="identity-glass p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-identity-sky/15 relative overflow-hidden group bg-white/40 backdrop-blur-xl">
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-tl opacity-60 scale-75 -top-2 -left-2" />
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 relative z-10">
                            <h3 className="text-[11px] font-black tracking-[0.5em] text-identity-navy uppercase flex items-center gap-4 italic">
                                <div className="p-3 bg-identity-navy text-white rounded-xl shadow-xl group-hover:bg-identity-sky transition-all duration-500 shadow-identity-navy/20">
                                    <BookOpen size={20} />
                                </div>
                                Recent Attendance
                            </h3>
                            <button onClick={() => router.push('/student/attendance')} className="px-6 py-3 rounded-2xl bg-identity-navy text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-identity-sky transition-all flex items-center gap-3 group/btn italic shadow-xl border-b-[4px] border-identity-sky/30 active:translate-y-1 active:border-b-0">
                                View Full Records <ChevronRight size={16} className="group-hover/btn:translate-x-2 transition-transform duration-500 text-identity-sky" />
                            </button>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {error ? (
                                <div className="p-12 text-center bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-lg backdrop-blur-md">
                                    <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30 shadow-xl animate-pulse">
                                        <XCircle className="text-rose-500" size={32} />
                                    </div>
                                    <p className="text-rose-950 font-black text-lg uppercase tracking-[0.4em] mb-3 italic">Connection Error</p>
                                    <p className="text-rose-700/60 text-[10px] uppercase font-black tracking-[0.25em] italic max-w-sm mx-auto leading-relaxed">{error}</p>
                                </div>
                            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                                dashboardData.recentActivities.map((item: any, i: number) => (
                                    <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/70 hover:bg-white rounded-2xl transition-all border border-identity-sky/5 hover:border-identity-sky/25 hover:shadow-2xl group/activity cursor-pointer active:scale-[0.99] relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky/10 group-hover/activity:bg-identity-sky transition-colors duration-500" />
                                        
                                        <div className="flex items-center gap-6 text-left w-full sm:w-auto mb-6 sm:mb-0">
                                            <div className="w-14 h-14 rounded-xl bg-identity-navy text-white border border-identity-sky/20 flex items-center justify-center text-2xl font-black shadow-xl group-hover/activity:bg-identity-sky group-hover/activity:rotate-6 transition-all duration-700 uppercase italic font-outfit shadow-identity-navy/20">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <h1 className="text-[9px] font-black text-identity-sky uppercase tracking-[0.5em] mb-1.5 italic opacity-60">DESIGNATION:</h1>
                                                <div className="font-black text-identity-navy text-base uppercase tracking-[0.1em] mb-1.5 group-hover/activity:text-identity-sky transition-colors italic leading-none">{item.subject}</div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic flex items-center gap-3">
                                                    <Calendar size={12} className="text-identity-sky/60" /> {item.date}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`px-8 py-2.5 rounded-xl text-[10px] font-black tracking-[0.4em] uppercase border shadow-xl italic transition-all group-hover/activity:scale-110 ${
                                            item.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                            item.status === 'Late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                            'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                        }`}>
                                            {item.status.toUpperCase()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={Clock}
                                    title="No Recent Activity"
                                    description="Your attendance history will appear here once you join a class."
                                    className="py-16 bg-white/40 rounded-2xl border border-dashed border-slate-200 backdrop-blur-sm"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
