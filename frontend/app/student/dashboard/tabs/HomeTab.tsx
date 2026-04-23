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
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-8">
            {/* Tab Title HUD */}
            <div className="flex items-center gap-4 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
                <div className="flex flex-col items-center px-8">
                    <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.6em] italic opacity-70 mb-1">
                        STUDENT DASHBOARD
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(0,186,255,0.8)]" />
                        <span className="text-[12px] font-black text-identity-navy uppercase tracking-[0.2em] italic">HOME OVERVIEW</span>
                    </div>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
            </div>

            {/* Welcome Header Hero */}
            <div className="identity-glass p-4 sm:p-6 rounded-2xl md:rounded-3xl shadow-lg border border-identity-sky/15 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden group font-outfit bg-white/40">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                <div className="corner-bracket-tl scale-90" />
                <div className="corner-bracket-br scale-90" />
                
                <div className="relative z-10 flex-1 flex flex-col items-start text-left">
                    <h1 className="text-[9px] sm:text-[10px] font-black text-identity-sky uppercase tracking-[0.3em] sm:tracking-[0.4em] italic opacity-50 mb-1 leading-none">
                        WELCOME BACK,
                    </h1>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-identity-navy uppercase tracking-tighter leading-none mb-2 sm:mb-3 drop-shadow-sm italic">
                        {user?.firstName || 'User'} <span className="text-identity-sky">{user?.lastName || ''}</span>
                    </h2>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px] italic leading-none">
                        {user?.course || 'GENERAL'}
                    </p>
                </div>
                
                <div className="mt-8 md:mt-0 flex items-center gap-6 bg-white/40 px-6 py-4 rounded-2xl border border-identity-sky/15 shadow-lg relative z-10 transition-all hover:bg-white h-full min-h-[90px] backdrop-blur-md hover:-translate-y-1">
                    <div className="text-right flex flex-col justify-center">
                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-[0.3em] italic leading-none mb-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                        </div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] italic leading-none">
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-1">
                            {(() => {
                                const today = new Date();
                                const dateStr = today.toISOString().split('T')[0];
                                const holidayName = isHoliday(dateStr);
                                if (holidayName) return <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20"><PartyPopper size={14} className="text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] italic">Holiday</span></div>;
                                if (today.getDay() === 0 || today.getDay() === 6) return <div className="flex items-center gap-2 px-4 py-2 bg-identity-sky/10 rounded-xl border border-identity-sky/20"><Coffee size={14} className="text-identity-sky" /><span className="text-[9px] font-black text-identity-sky uppercase tracking-[0.2em] italic">Weekend</span></div>;
                                return null;
                            })()}
                        </div>
                    </div>
                    <div className="p-4 bg-identity-navy text-identity-sky rounded-2xl shadow-lg border border-identity-sky/20 group-hover:bg-identity-sky group-hover:text-white transition-all duration-700 flex items-center justify-center">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            {/* Main Content Grid: Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8">
                
                {/* LEFT COLUMN: Metrics & Analytics Stack (1/3 Width) */}
                <div className="lg:col-span-1 space-y-6 sm:space-y-8 flex flex-col">
                    {/* Academic Metrics Card */}
                    <div className="identity-glass p-6 rounded-[2.5rem] shadow-lg border border-identity-sky/15 relative overflow-hidden group bg-white/40 backdrop-blur-xl flex flex-col justify-between">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint-fine" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between border-b border-identity-sky/10 pb-4">
                                <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] italic">Academic Metrics</p>
                                <TrendingUp size={16} className="text-identity-sky/40" />
                            </div>
                            
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Overall Attendance</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-4xl font-black text-identity-navy italic tracking-tighter leading-none">
                                        {(dashboardData?.stats?.attendanceRate || 0).toFixed(1)}%
                                    </p>
                                    <span className="text-[9px] font-black text-emerald-500 mb-1 uppercase italic tracking-widest">+2.4%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1 shadow-inner">
                                    <div className="h-full bg-identity-sky transition-all duration-1000 shadow-lg shadow-identity-sky/30" style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                {[
                                    { label: 'PRESENT', val: dashboardData?.stats?.present || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/5', icon: CheckCircle },
                                    { label: 'LATE', val: dashboardData?.stats?.late || 0, color: 'text-amber-500', bg: 'bg-amber-500/5', icon: Clock },
                                    { label: 'EXCUSED', val: dashboardData?.stats?.excused || 0, color: 'text-identity-sky', bg: 'bg-identity-sky/5', icon: ShieldCheck },
                                    { label: 'ABSENT', val: dashboardData?.stats?.absences || 0, color: 'text-rose-500', bg: 'bg-rose-500/5', icon: AlertCircle },
                                ].map((stat, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border border-transparent hover:border-identity-sky/20 transition-all ${stat.bg} group/item relative overflow-hidden active:bg-white cursor-pointer shadow-sm`}>
                                        <stat.icon size={12} className={`absolute top-2 right-2 opacity-20 ${stat.color} transition-transform group-hover/item:scale-125`} />
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 group-hover/item:text-identity-sky italic">{stat.label}</div>
                                        <div className={`text-xl font-black font-outfit ${stat.color} italic leading-none`}>{stat.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Performance Analytics Card */}
                    <div className="identity-glass p-6 rounded-[2.5rem] shadow-2xl border border-identity-sky/15 relative overflow-hidden group bg-white/40 backdrop-blur-xl flex flex-col h-fit">
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-tl opacity-60 scale-75 -top-2 -left-2" />
                        
                        <div className="mb-8 relative z-10">
                            <h3 className="text-[10px] font-black tracking-[0.4em] text-identity-navy uppercase flex items-center gap-3 italic mb-1.5">
                                <div className="p-2.5 bg-identity-navy text-white rounded-xl shadow-xl group-hover:bg-identity-sky transition-colors duration-500">
                                    <TrendingUp size={18} />
                                </div>
                                Weekly Analytics
                            </h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-12">Attendance Frequency (7D)</p>
                        </div>

                        <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 relative z-10 mb-4">
                            {(['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, i) => {
                                const heights = [65, 80, 45, 90, 70, 0, 0];
                                const isToday = i === (new Date().getDay() + 6) % 7; 
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                                        <div className="w-full relative h-28 bg-identity-sky/5 rounded-lg overflow-hidden border border-identity-sky/10 shadow-inner">
                                            <div 
                                                className={`absolute bottom-0 left-0 w-full transition-all duration-1000 ease-out shadow-lg ${isToday ? 'bg-identity-sky shadow-identity-sky/40' : 'bg-identity-navy/40 group-hover/bar:bg-identity-sky/60'}`}
                                                style={{ height: `${heights[i]}%` }}
                                            >
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/30" />
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase italic ${isToday ? 'text-identity-sky' : 'text-slate-400'}`}>{day}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-6 border-t border-identity-sky/10 relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Consistency Score</span>
                                <span className="text-xs font-black text-identity-navy italic tracking-widest">84%</span>
                            </div>
                            <div className="h-1.5 w-full bg-identity-sky/10 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-identity-sky w-[84%] rounded-full shadow-identity-sky/50 shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Upcoming Class & Recent Activity Stack (2/3 Width) */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8 flex flex-col">
                    
                    {/* Upcoming Class Hub */}
                    <div className="identity-glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-identity-sky/15 group relative bg-white/40 backdrop-blur-xl flex flex-col h-fit">
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-br scale-90" />
                        
                        <div className="p-6 md:p-8 relative z-10 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 text-identity-sky mb-8 text-[9px] font-black uppercase tracking-[0.4em] bg-identity-navy text-white w-fit px-6 py-2.5 rounded-full border border-identity-sky/20 italic shadow-xl">
                                <Zap size={14} className="text-identity-sky animate-pulse" /> Upcoming Class
                            </div>
                            
                            {dashboardData?.nextClass ? (
                                <div className="space-y-8 flex-1 flex flex-col">
                                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                                        <div className="flex-1">
                                            <h2 className="text-3xl md:text-5xl font-black text-identity-navy tracking-tighter uppercase font-outfit leading-none italic mb-5 drop-shadow-sm">{dashboardData.nextClass.subject}</h2>
                                            <div className="flex flex-wrap items-center gap-5 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] italic">
                                                <div className="flex items-center gap-3 px-4 py-2 bg-white/60 rounded-2xl border border-slate-200/50 shadow-sm">
                                                    <UserIcon size={16} className="text-identity-sky" />
                                                    {dashboardData.nextClass.professor}
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-2 bg-white/60 rounded-2xl border border-slate-200/50 shadow-sm">
                                                    <MapPin size={16} className="text-identity-sky" />
                                                    ROOM {dashboardData.nextClass.room}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-8 py-3.5 bg-identity-navy text-white rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase italic shadow-2xl border-b-[4px] border-identity-sky/40 transition-transform hover:-translate-y-1">
                                            {dashboardData.nextClass.type || 'Regular Session'}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-5 pt-8 border-t border-identity-sky/10">
                                        {[
                                            { label: 'Date', val: dashboardData.nextClass.date, icon: Calendar },
                                            { label: 'Schedule', val: dashboardData.nextClass.time, icon: Clock }
                                        ].map((item, i) => (
                                            <div key={i} className="px-6 py-5 rounded-2xl border bg-white/80 border-identity-sky/15 hover:border-identity-sky/40 transition-all flex items-center gap-5 shadow-lg flex-1 min-w-[200px] group/card">
                                                <div className="p-4 rounded-xl shadow-xl bg-identity-navy text-white group-hover/card:bg-identity-sky transition-colors duration-500">
                                                    <item.icon size={20} />
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1 italic">{item.label}</span>
                                                    <span className="font-black text-base uppercase italic tracking-widest text-identity-navy">{item.val}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-8 flex items-start gap-8 shadow-2xl relative overflow-hidden group/notice transition-all hover:bg-rose-500/15">
                                            <div className="absolute top-0 left-0 w-2.5 h-full bg-rose-500/40" />
                                            <div className="p-5 bg-rose-500 text-white rounded-2xl shadow-2xl transition-transform duration-500 group-hover/notice:rotate-12">
                                                <AlertCircle size={28} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-rose-500 uppercase font-black tracking-[0.5em] mb-3 italic">Session Notice</p>
                                                <p className="text-rose-950 font-black text-base tracking-[0.05em] uppercase leading-relaxed italic opacity-90">{dashboardData.nextClass.reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Coffee}
                                    title="No Upcoming Classes"
                                    description="You are all caught up. No classes scheduled for the immediate period."
                                    className="py-16 bg-white/40 rounded-[2rem] border border-dashed border-identity-sky/20 backdrop-blur-sm"
                                />
                            )}
                        </div>
                    </div>

                    {/* Recent Attendance Hub */}
                    <div className="identity-glass p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-identity-sky/15 relative overflow-hidden group bg-white/40 backdrop-blur-xl flex-1 flex flex-col">
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-tr opacity-60 scale-75 -top-2 -right-2" />
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
                            <h3 className="text-[10px] font-black tracking-[0.4em] text-identity-navy uppercase flex items-center gap-3 italic">
                                <div className="p-2.5 bg-identity-navy text-white rounded-xl shadow-xl group-hover:bg-identity-sky transition-all duration-500">
                                    <BookOpen size={18} />
                                </div>
                                Recent Attendance
                            </h3>
                            <button onClick={() => router.push('/student/attendance')} className="px-6 py-3 rounded-2xl bg-identity-navy text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-identity-sky transition-all flex items-center gap-3 group/btn italic shadow-xl border-b-[4px] border-identity-sky/30 active:translate-y-1 active:border-b-0">
                                View Records <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform duration-500 text-identity-sky" />
                            </button>
                        </div>

                        <div className="space-y-4 relative z-10 flex-1">
                            {error ? (
                                <div className="p-12 text-center bg-rose-500/10 rounded-[2rem] border border-rose-500/20 shadow-2xl backdrop-blur-md">
                                    <div className="w-20 h-20 bg-rose-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/30 shadow-2xl animate-pulse">
                                        <XCircle className="text-rose-500" size={40} />
                                    </div>
                                    <p className="text-rose-950 font-black text-xl uppercase tracking-[0.4em] mb-4 italic">Pipeline Error</p>
                                    <p className="text-rose-700/60 text-[11px] uppercase font-black tracking-[0.3em] italic max-w-md mx-auto leading-relaxed">{error}</p>
                                </div>
                            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                                dashboardData.recentActivities.slice(0, 4).map((item: any, i: number) => (
                                    <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white/70 hover:bg-white rounded-[1.8rem] transition-all border border-identity-sky/5 hover:border-identity-sky/30 hover:shadow-2xl group/activity cursor-pointer relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-identity-sky/10 group-hover/activity:bg-identity-sky transition-colors duration-500" />
                                        
                                        <div className="flex items-center gap-5 text-left w-full sm:w-auto mb-5 sm:mb-0">
                                            <div className="w-14 h-14 rounded-2xl bg-identity-navy text-white border border-identity-sky/20 flex items-center justify-center text-xl font-black shadow-xl group-hover/activity:bg-identity-sky transition-all duration-700 uppercase italic font-outfit">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <h1 className="text-[9px] font-black text-identity-sky uppercase tracking-[0.4em] mb-1 italic opacity-60">System Log:</h1>
                                                <div className="font-black text-identity-navy text-base uppercase tracking-[0.02em] mb-1.5 group-hover/activity:text-identity-sky transition-colors italic leading-none truncate max-w-[280px]">{item.subject}</div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 italic flex items-center gap-3">
                                                    <Calendar size={12} className="text-identity-sky/60" /> {item.date}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`px-7 py-2.5 rounded-xl text-[10px] font-black tracking-[0.4em] uppercase border shadow-lg italic transition-all ${
                                            item.status?.toLowerCase() === 'present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                            item.status?.toLowerCase() === 'late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                            'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                        }`}>
                                            {item.status?.toUpperCase()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={Clock}
                                    title="Activity Clear"
                                    description="No recent biometric events detected. Your logs will appear here upon next verification."
                                    className="py-16 bg-white/40 rounded-[2rem] border border-dashed border-slate-200 backdrop-blur-sm"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
