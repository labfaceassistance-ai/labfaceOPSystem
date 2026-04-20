"use client";
import { useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, AlertCircle, XCircle, Briefcase, Coffee, PartyPopper, CheckCircle, BookOpen, TrendingUp, Zap, ChevronRight } from 'lucide-react';
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
            <div className="space-y-8 animate-fade-in">
                <Skeleton variant="card" height="200px" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-8">
                        <Skeleton variant="card" height="150px" />
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton variant="card" height="100px" />
                            <Skeleton variant="card" height="100px" />
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-8">
                        <Skeleton variant="card" height="200px" />
                        <Skeleton variant="card" height="300px" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between relative overflow-hidden group font-outfit">
                <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky/20"></div>
                <div className="text-center md:text-left relative z-10">
                    <h1 className="text-2xl font-black text-identity-navy uppercase tracking-tight italic opacity-40">Identity Terminal:</h1>
                    <h2 className="text-4xl md:text-5xl font-black text-identity-navy uppercase tracking-tighter">{user?.firstName || 'User'}</h2>
                    <p className="text-identity-sky mt-3 font-black uppercase tracking-[0.2em] text-[10px]">Registry Status: <span className="text-emerald-500 animate-pulse">Secure</span> â€¢ Tracking Active</p>
                </div>
                <div className="mt-8 md:mt-0 flex items-center gap-6 bg-white/40 px-6 py-4 rounded-3xl border border-identity-sky/10 shadow-lg relative z-10 transition-all hover:bg-white group-hover:scale-[1.02]">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-identity-navy uppercase tracking-[0.2em]">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2">
                            {(() => {
                                const today = new Date();
                                const dateStr = today.toISOString().split('T')[0];
                                const holidayName = isHoliday(dateStr);
                                if (holidayName) return <><PartyPopper size={14} className="text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.15em]">Holiday Loop</span></>;
                                if (today.getDay() === 0 || today.getDay() === 6) return <><Coffee size={14} className="text-identity-sky" /><span className="text-[9px] font-black text-identity-sky uppercase tracking-[0.15em]">Standby Mode</span></>;
                                return <><Zap size={14} className="text-identity-sky" /><span className="text-[9px] font-black text-identity-sky uppercase tracking-[0.15em]">Active Operations</span></>;
                            })()}
                        </div>
                    </div>
                    <div className="p-4 bg-identity-sky text-white rounded-2xl shadow-xl shadow-identity-sky/20 border border-identity-sky/20">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Matrix */}
                <div className="space-y-8 font-outfit">
                    <div className="identity-glass p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 relative overflow-hidden group h-full">
                        <div className="relative z-10 flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Success Velocity</p>
                                <div className="text-5xl font-black text-identity-navy italic tracking-tighter">{dashboardData?.stats?.attendanceRate || 0}%</div>
                            </div>
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={32} />
                            </div>
                        </div>
                        <div className="mt-8 h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-[2px]">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }}
                            ></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-12">
                            {[
                                { label: 'Present', val: dashboardData?.stats?.present || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                                { label: 'Late', val: dashboardData?.stats?.late || 0, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                                { label: 'Excused', val: dashboardData?.stats?.excused || 0, color: 'text-identity-sky', bg: 'bg-identity-sky/5' },
                                { label: 'Absences', val: dashboardData?.stats?.absences || 0, color: 'text-rose-500', bg: 'bg-rose-500/5' }
                            ].map((stat, i) => (
                                <div key={i} className={`p-6 rounded-[2rem] border border-identity-sky/5 hover:border-identity-sky/20 transition-all ${stat.bg} group/item`}>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover/item:text-identity-sky">{stat.label}</div>
                                    <div className={`text-2xl font-black font-outfit ${stat.color}`}>{stat.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Priority Queue & Activity */}
                <div className="lg:col-span-2 space-y-8 font-outfit">
                    {/* Active Session */}
                    <div className="identity-glass rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-identity-sky/10 group relative h-fit">
                        <div className="p-8 md:p-14 relative z-10">
                            <div className="flex items-center gap-4 text-identity-sky mb-8 text-[10px] font-black uppercase tracking-[0.15em]">
                                <Zap size={18} className="animate-pulse" /> Active Protocol Node
                            </div>
                            
                            {dashboardData?.nextClass ? (
                                <div className="space-y-10">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div className="flex-1">
                                            <h2 className="text-4xl md:text-6xl font-black text-identity-navy tracking-tighter uppercase font-outfit leading-none mb-3 italic">{dashboardData.nextClass.subject}</h2>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.15em]">{dashboardData.nextClass.professor} â€¢ Lab Terminal {dashboardData.nextClass.room}</p>
                                        </div>
                                        {dashboardData.nextClass.type && (
                                            <div className="px-6 py-2 bg-identity-navy text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-xl">
                                                {dashboardData.nextClass.type}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { label: 'Time Window', val: dashboardData.nextClass.time },
                                            { label: 'Status', val: dashboardData.nextClass.status, alert: dashboardData.nextClass.status === 'Cancelled' }
                                        ].map((item, i) => (
                                            <div key={i} className={`px-8 py-5 rounded-2xl border ${item.alert ? 'bg-rose-500/10 border-rose-500/20 shadow-rose-500/5' : 'bg-white/40 border-identity-sky/10 font-black tracking-[0.15em]'} shadow-sm`}>
                                                <span className="block text-[8px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">{item.label}</span>
                                                <span className={`font-black text-sm uppercase ${item.alert ? 'text-rose-500' : 'text-identity-navy'}`}>{item.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-8 flex items-start gap-6">
                                            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                                                <AlertCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-rose-500 uppercase font-black tracking-[0.3em] mb-2">Interruption Log</p>
                                                <p className="text-rose-900 font-black text-xs tracking-[0.15em] mt-1 uppercase leading-loose opacity-80">{dashboardData.nextClass.reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Coffee}
                                    title="System on Standby"
                                    description="No active attendance sessions detected in your current schedule window."
                                    className="py-12"
                                />
                            )}
                        </div>
                    </div>

                    {/* Activity Registry */}
                    <div className="identity-glass p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/5 shadow-inner">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-[11px] font-black tracking-[0.2em] text-identity-navy uppercase flex items-center gap-4">
                                <div className="p-2 bg-identity-sky/10 rounded-2xl">
                                    <BookOpen size={20} className="text-identity-sky" />
                                </div>
                                Activity Registry
                            </h3>
                            <button onClick={() => router.push('/student/attendance')} className="text-[9px] font-black text-identity-sky uppercase tracking-[0.2em] hover:text-identity-navy transition-all flex items-center gap-2 group/btn">
                                Access Full Logs <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {error ? (
                                <div className="p-12 text-center bg-rose-50 rounded-[3rem] border border-rose-100">
                                    <XCircle className="mx-auto mb-4 text-rose-400" size={48} />
                                    <p className="text-rose-900 font-black text-xs uppercase tracking-[0.15em] mb-2">Registry Link Broken</p>
                                    <p className="text-rose-600/60 text-[10px] uppercase font-black tracking-[0.15em]">{error}</p>
                                </div>
                            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                                dashboardData.recentActivities.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-6 bg-white/40 hover:bg-white rounded-[2rem] transition-all border border-identity-sky/5 hover:border-identity-sky/10 hover:shadow-2xl group cursor-pointer active:scale-95">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-identity-sky/10 flex items-center justify-center text-identity-navy font-black shadow-sm group-hover:bg-identity-navy group-hover:text-white transition-all duration-500 uppercase italic">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-identity-navy text-xs uppercase tracking-tight mb-2 group-hover:text-identity-sky transition-colors">{item.subject}</div>
                                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">{item.date}</div>
                                            </div>
                                        </div>
                                        <div className={`px-5 py-2 rounded-full text-[8px] font-black tracking-[0.2em] uppercase border transition-all ${
                                            item.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                            item.status === 'Late' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        }`}>
                                            {item.status}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={Clock}
                                    title="No Recent History"
                                    description="Your attendance activity logs will manifest here once processing begins."
                                    className="py-12"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
