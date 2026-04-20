"use client";
import { useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, AlertCircle, XCircle, Briefcase, Coffee, PartyPopper, CheckCircle, BookOpen, TrendingUp, User, Brain, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isHoliday } from '@/utils/holidays';

interface HomeTabProps {
    user: any;
    dashboardData: any;
    error?: string | null;
}

export default function HomeTab({ user, dashboardData, error }: HomeTabProps) {
    const router = useRouter();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="identity-glass rounded-2xl shadow-sm border border-identity-sky/10 backdrop-blur-sm p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-identity-sky opacity-80"></div>
                <div className="text-center md:text-left relative z-10 font-outfit">
                    <h1 className="text-3xl font-black text-identity-navy uppercase tracking-tight italic">Identity:</h1>
                    <h2 className="text-4xl font-black text-identity-sky uppercase tracking-tighter">{user.firstName || 'User'}</h2>
                    <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">Portal synchronization active • Lab 1</p>
                </div>
                <div className="mt-6 md:mt-0 flex items-center gap-6 bg-identity-sky/10 px-8 py-4 rounded-xl border border-identity-sky/20 shadow-lg shadow-identity-sky/5 relative z-10 transition-all hover:bg-white group-hover:scale-[1.02]">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="flex items-center justify-end gap-2 mt-2">
                            {(() => {
                                const today = new Date();
                                const dayOfWeek = today.getDay();
                                const dateStr = today.toISOString().split('T')[0];
                                const holidayName = isHoliday(dateStr);

                                if (holidayName) {
                                    return (
                                        <>
                                            <PartyPopper size={14} className="text-rose-500" />
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Holiday Status</span>
                                        </>
                                    );
                                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    return (
                                        <>
                                            <Coffee size={14} className="text-identity-sky" />
                                            <span className="text-[9px] font-black text-identity-sky uppercase tracking-widest">Weekend Mode</span>
                                        </>
                                    );
                                } else {
                                    return (
                                        <>
                                            <Briefcase size={14} className="text-identity-sky" />
                                            <span className="text-[9px] font-black text-identity-sky uppercase tracking-widest">Active Operations</span>
                                        </>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    <div className="p-3 bg-white shadow-inner rounded-xl text-identity-sky border border-identity-sky/5">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats */}
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Attendance Rate - Hero Stat */}
                        <div className="col-span-2 identity-glass p-8 rounded-2xl shadow-lg border border-identity-sky/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-identity-sky/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-identity-sky/20 transition-all duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between mb-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Sync Rate</p>
                                    <div className="text-5xl font-black text-identity-navy tracking-tighter uppercase font-outfit">{dashboardData?.stats?.attendanceRate || 0}%</div>
                                </div>
                                <div className="w-14 h-14 bg-identity-sky/10 rounded-xl flex items-center justify-center text-identity-sky border border-identity-sky/20 group-hover:scale-110 transition-transform shadow-sm">
                                    <TrendingUp size={28} />
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-8 h-2.5 w-full bg-slate-100/50 rounded-full overflow-hidden shadow-inner border border-slate-50">
                                <div
                                    className="h-full bg-identity-sky rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                    style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Status Grid */}
                        {[
                            { label: 'Present', val: dashboardData?.stats?.present || 0, icon: UserIcon, color: 'text-emerald-500', bg: 'hover:border-emerald-500/30' },
                            { label: 'Late', val: dashboardData?.stats?.late || 0, icon: Clock, color: 'text-amber-500', bg: 'hover:border-amber-500/30' },
                            { label: 'Excused', val: dashboardData?.stats?.excused || 0, icon: AlertCircle, color: 'text-identity-sky', bg: 'hover:border-identity-sky/30' },
                            { label: 'Absences', val: dashboardData?.stats?.absences || 0, icon: XCircle, color: 'text-rose-500', bg: 'hover:border-rose-500/30' }
                        ].map((stat, i) => (
                            <div key={i} className={`identity-glass p-6 rounded-2xl shadow-sm border border-identity-sky/10 backdrop-blur-sm transition-all group ${stat.bg} hover:shadow-xl`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
                                    <stat.icon size={18} className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                </div>
                                <div className="text-3xl font-black text-identity-navy font-outfit">{stat.val}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Schedule & Recent Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Next Class */}
                    <div className="identity-glass rounded-2xl shadow-lg p-10 text-identity-navy relative overflow-hidden border border-identity-sky/10 group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-identity-sky/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-30 group-hover:opacity-50 transition-opacity duration-1000"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-identity-sky mb-6 text-[10px] font-black uppercase tracking-[0.4em]">
                                <Zap size={16} className="text-identity-sky" /> Next Priority Node
                            </div>
                            {dashboardData?.nextClass ? (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-4xl md:text-5xl font-black text-identity-navy tracking-tighter uppercase font-outfit leading-none italic">{dashboardData.nextClass.subject}</h2>
                                        {dashboardData.nextClass.type && dashboardData.nextClass.type.toLowerCase().includes('makeup') && (
                                            <span className="bg-identity-sky/10 text-identity-sky border border-identity-sky/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                                                Special Session
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 font-bold text-[10px] mb-10 uppercase tracking-[0.3em]">{dashboardData.nextClass.professor} • Portal {dashboardData.nextClass.room}</p>

                                    <div className="flex flex-wrap items-center gap-4">
                                        {[
                                            { label: 'Sync Date', val: dashboardData.nextClass.date || 'Today' },
                                            { label: 'Time Window', val: dashboardData.nextClass.time },
                                            { label: 'Matrix Status', val: dashboardData.nextClass.status, special: dashboardData.nextClass.status === 'Cancelled' }
                                        ].map((item, i) => (
                                            <div key={i} className={`bg-white/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-identity-sky/5 shadow-inner ${item.special ? 'border-rose-500/20' : ''}`}>
                                                <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{item.label}</span>
                                                <span className={`font-black text-sm tracking-widest uppercase ${item.special ? 'text-rose-500' : 'text-identity-navy'}`}>{item.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="mt-8 bg-rose-50 border border-rose-100 rounded-2xl p-6 backdrop-blur-sm shadow-inner shadow-rose-100/50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <AlertCircle size={14} className="text-rose-500" />
                                                <p className="text-[9px] text-rose-500 uppercase font-black tracking-[0.3em]">System Interruption Log</p>
                                            </div>
                                            <p className="text-rose-900 font-bold text-xs uppercase tracking-widest leading-relaxed opacity-80">{dashboardData.nextClass.reason}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-10">
                                    <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase font-outfit italic text-slate-300">Matrix Idle</h2>
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No active sessions scheduled for this node.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Performance Overview (Classes Summary) */}
                    {dashboardData?.classesSummary && dashboardData.classesSummary.length > 0 && (
                        <div className="identity-glass rounded-2xl shadow-sm border border-identity-sky/10 backdrop-blur-sm p-8 shadow-inner">
                            <h3 className="text-[10px] font-black tracking-[0.4em] text-identity-navy mb-8 uppercase flex items-center gap-4">
                                <TrendingUp size={18} className="text-identity-sky" /> 
                                Performance Matrix
                                <span className="h-px bg-identity-sky/10 flex-1"></span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(() => {
                                    const sortedClasses = [...(dashboardData.classesSummary || [])].sort((a: any, b: any) => b.attendanceRate - a.attendanceRate);
                                    let displayClasses = sortedClasses.length >= 2 ? [sortedClasses[0], sortedClasses[sortedClasses.length - 1]] : sortedClasses;

                                    return displayClasses.map((cls: any, index: number) => {
                                        const isHighest = sortedClasses.length >= 2 && index === 0;
                                        const isLowest = sortedClasses.length >= 2 && index === 1;

                                        return (
                                            <div
                                                onClick={() => router.push(`/student/classes/${cls.id}`)}
                                                key={cls.id}
                                                className="block h-full group relative z-10 cursor-pointer"
                                            >
                                                <div className="p-6 bg-white/40 border border-identity-sky/10 hover:border-identity-sky/50 rounded-2xl transition-all duration-500 relative overflow-hidden h-full shadow-sm hover:shadow-2xl">
                                                    {(isHighest || isLowest) && (
                                                        <div className={`absolute top-0 right-0 px-4 py-2 text-[8px] font-black uppercase rounded-bl-xl border-b border-l tracking-widest ${isHighest
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                                                            : 'bg-rose-50 text-rose-600 border-rose-100/50'
                                                            }`}>
                                                            {isHighest ? 'Optimal Performance' : 'Recovery Required'}
                                                        </div>
                                                    )}

                                                    <div className="mb-6">
                                                        <span className="bg-white/60 text-slate-400 text-[8px] font-black tracking-widest uppercase px-3 py-1 rounded-lg border border-slate-100 mb-4 inline-block font-outfit">
                                                            {cls.subjectCode}
                                                        </span>
                                                        <h4 className="font-black text-identity-navy group-hover:text-identity-sky transition-colors text-base uppercase tracking-tighter pr-12 line-clamp-2 italic">
                                                            {cls.subjectName}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-end justify-between mb-4">
                                                        <div className={`text-4xl font-black font-outfit ${cls.attendanceRate >= 90 ? 'text-emerald-500' : cls.attendanceRate >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                            {cls.attendanceRate}<span className="text-xl opacity-40">%</span>
                                                        </div>
                                                    </div>

                                                    <div className="h-2 w-full bg-slate-100/50 rounded-full overflow-hidden mb-6 shadow-inner border border-slate-50">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${cls.attendanceRate >= 90 ? 'bg-emerald-500' : cls.attendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                            style={{ width: `${cls.attendanceRate}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-3">
                                                        {[
                                                            { val: cls.present, label: 'PR', color: 'text-emerald-500' },
                                                            { val: cls.late, label: 'LT', color: 'text-amber-500' },
                                                            { val: cls.excused, label: 'EX', color: 'text-identity-sky' },
                                                            { val: cls.absent, label: 'AB', color: 'text-rose-500' }
                                                        ].map((s, i) => (
                                                            <div key={i} className="bg-white/60 rounded-xl py-2 border border-identity-sky/5 shadow-sm text-center">
                                                                <span className={`block font-black text-[13px] ${s.color}`}>{s.val}</span>
                                                                <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Recent Sync Logs */}
                    <div className="identity-glass rounded-2xl shadow-sm border border-identity-sky/10 backdrop-blur-sm p-8 shadow-inner">
                        <h3 className="text-[10px] font-black tracking-[0.4em] text-identity-navy mb-8 uppercase flex items-center gap-4">
                            <BookOpen size={18} className="text-identity-sky" /> 
                            Recent Node Syncs
                            <span className="h-px bg-identity-sky/10 flex-1"></span>
                        </h3>
                        <div className="space-y-4">
                            {error ? (
                                <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-10 text-center">
                                    <XCircle className="mx-auto mb-4 text-rose-400" size={48} />
                                    <p className="text-rose-900 font-black text-sm uppercase tracking-widest mb-2">Sync Error Detected</p>
                                    <p className="text-rose-600/60 text-[10px] uppercase font-black tracking-widest leading-relaxed">{error}</p>
                                </div>
                            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                                dashboardData.recentActivities.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-5 bg-white/40 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-identity-sky/30 hover:shadow-lg group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white border border-identity-sky/5 flex items-center justify-center text-identity-navy font-black shadow-sm group-hover:bg-identity-navy group-hover:text-white transition-all duration-500 uppercase tracking-tighter">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-identity-navy text-xs uppercase tracking-widest mb-1">{item.subject}</div>
                                                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-identity-sky transition-colors">{item.date}</div>
                                            </div>
                                        </div>
                                        <span className={`px-5 py-2 rounded-full text-[9px] font-black tracking-widest uppercase border transition-all ${
                                            item.status === 'Present' ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50' :
                                            item.status === 'Late' ? 'bg-amber-50/50 text-amber-600 border-amber-100/50' :
                                            'bg-rose-50/50 text-rose-600 border-rose-100/50'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-white border border-identity-sky/5 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-inner">
                                        <Clock size={28} />
                                    </div>
                                    <p className="font-black text-[9px] text-slate-300 uppercase tracking-[0.4em]">Matrix History Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
