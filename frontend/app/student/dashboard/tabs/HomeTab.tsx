import { useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, AlertCircle, XCircle, Briefcase, Coffee, PartyPopper, CheckCircle, BookOpen, TrendingUp, User, Brain, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
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
        <>
            {/* Welcome Header */}
            <div className="bg-white/5 rounded-2xl shadow-sm border border-white/10 backdrop-blur-sm p-8 mb-8 flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white">Welcome back, {user.firstName}!</h1>
                    <p className="text-brand-cream/60 mt-2 font-medium tracking-wide">Here's what's happening with your classes today.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4 bg-yellow-500/10 px-6 py-3 rounded-xl border border-yellow-500/20">
                    <div className="text-right">
                        <div className="text-sm font-bold text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                            {(() => {
                                const today = new Date();
                                const dayOfWeek = today.getDay();
                                const dateStr = today.toISOString().split('T')[0];

                                // Check if today is a holiday
                                const holidayName = isHoliday(dateStr);

                                if (holidayName) {
                                    return (
                                        <>
                                            <PartyPopper size={14} className="text-purple-400" />
                                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Holiday</span>
                                        </>
                                    );
                                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    return (
                                        <>
                                            <Coffee size={14} className="text-yellow-400" />
                                            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Weekend</span>
                                        </>
                                    );
                                } else {
                                    return (
                                        <>
                                            <Briefcase size={14} className="text-yellow-500" />
                                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Weekday</span>
                                        </>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    <Calendar className="text-yellow-500" size={24} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats */}
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Attendance Rate - Hero Stat */}
                        <div className="col-span-2 bg-gradient-to-br from-white/10 to-white/5 p-6 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-bold text-white mb-1">{dashboardData?.stats?.attendanceRate || 0}%</div>
                                    <div className="text-[11px] text-brand-cream/60 font-bold uppercase tracking-widest">Attendance Rate</div>
                                </div>
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4 h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Status Grid */}
                        <div className="bg-white/5 p-4 rounded-2xl shadow-sm border border-white/5 backdrop-blur-sm hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] font-bold text-brand-cream/50 uppercase tracking-widest">Present</div>
                                <UserIcon size={16} className="text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.present || 0}</div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl shadow-sm border border-white/5 backdrop-blur-sm hover:border-orange-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] font-bold text-brand-cream/50 uppercase tracking-widest">Late</div>
                                <Clock size={16} className="text-orange-400/70 group-hover:text-orange-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.late || 0}</div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl shadow-sm border border-white/5 backdrop-blur-sm hover:border-blue-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] font-bold text-brand-cream/50 uppercase tracking-widest">Excused</div>
                                <AlertCircle size={16} className="text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.excused || 0}</div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl shadow-sm border border-white/5 backdrop-blur-sm hover:border-red-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] font-bold text-brand-cream/50 uppercase tracking-widest">Absences</div>
                                <XCircle size={16} className="text-red-400/70 group-hover:text-red-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.absences || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Schedule & Recent Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Next Class */}
                    <div className="bg-background rounded-2xl shadow-lg p-8 text-primary relative overflow-hidden border border-background">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-primary/70 mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
                                <Clock size={16} /> Next Class
                            </div>
                            {dashboardData?.nextClass ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-3xl font-black text-primary tracking-tight">{dashboardData.nextClass.subject}</h2>
                                        {dashboardData.nextClass.type && dashboardData.nextClass.type.toLowerCase().includes('makeup') && (
                                            <span className="bg-amber-500/20 text-amber-700 border border-amber-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                                                Make-up Class
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-primary/70 font-bold text-sm mb-6 uppercase tracking-wider">{dashboardData.nextClass.professor} • {dashboardData.nextClass.room}</p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-primary/5 backdrop-blur-md px-4 py-2 rounded-lg border border-primary/10">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-primary/50">Date</span>
                                            <span className="font-black text-primary mt-0.5 block tracking-wide">{dashboardData.nextClass.date || 'Today'}</span>
                                        </div>
                                        <div className="bg-primary/5 backdrop-blur-md px-4 py-2 rounded-lg border border-primary/10">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-primary/50">Time</span>
                                            <span className="font-black text-primary mt-0.5 block tracking-wide">{dashboardData.nextClass.time}</span>
                                        </div>
                                        <div className={`bg-primary/5 backdrop-blur-md px-4 py-2 rounded-lg border border-primary/10 ${dashboardData.nextClass.status === 'Cancelled' ? 'bg-red-500/10 border-red-500/20' : ''}`}>
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-primary/50">Status</span>
                                            <span className={`font-black mt-0.5 block tracking-wide ${dashboardData.nextClass.status === 'Cancelled' ? 'text-red-600' : 'text-emerald-700'}`}>
                                                {dashboardData.nextClass.status}
                                            </span>
                                        </div>
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                            <p className="text-[9px] text-red-600 uppercase font-black tracking-widest mb-1">Cancellation Reason</p>
                                            <p className="text-primary font-medium text-xs">{dashboardData.nextClass.reason}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-primary/70">
                                    <h2 className="text-2xl font-black mb-2 tracking-tight">No classes scheduled</h2>
                                    <p className="text-sm font-medium">You have no upcoming classes for today.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Classes List */}
                    {dashboardData?.classesSummary && dashboardData.classesSummary.length > 0 && (
                        <div className="bg-white/5 rounded-2xl shadow-sm border border-white/10 backdrop-blur-sm p-6">
                            <h3 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-yellow-500" /> Overall Attendance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => {
                                    const sortedClasses = dashboardData?.classesSummary
                                        ? [...dashboardData.classesSummary].sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
                                        : [];

                                    let displayClasses = [];
                                    if (sortedClasses.length >= 2) {
                                        displayClasses = [sortedClasses[0], sortedClasses[sortedClasses.length - 1]];
                                    } else {
                                        displayClasses = sortedClasses;
                                    }

                                    return displayClasses.map((cls: any, index: number) => {
                                        const isHighest = sortedClasses.length >= 2 && index === 0;
                                        const isLowest = sortedClasses.length >= 2 && index === 1;

                                        return (
                                            <div
                                                onClick={() => router.push(`/student/classes/${cls.id}`)}
                                                key={cls.id}
                                                className="block h-full group relative z-10 cursor-pointer"
                                            >
                                                <div className="p-5 bg-black/10 hover:bg-black/20 border border-white/5 hover:border-yellow-500/50 rounded-xl transition-all relative overflow-hidden h-full shadow-inner">

                                                    {/* Badge for Highest/Lowest */}
                                                    {(isHighest || isLowest) && (
                                                        <div className={`absolute top-0 right-0 px-2 py-1 text-[8px] font-black uppercase rounded-bl-lg border-b border-l tracking-widest ${isHighest
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            }`}>
                                                            {isHighest ? 'Highest Rate' : 'Lowest Rate'}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-black/30 text-brand-cream/80 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded border border-white/10">
                                                                    {cls.subjectCode}
                                                                </span>
                                                                <ChevronLeft size={14} className="rotate-180 text-brand-cream/30 group-hover:text-yellow-500 transition-colors opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                            <h4 className="font-bold text-white group-hover:text-yellow-400 transition-colors text-sm md:text-base pr-8">
                                                                {cls.subjectName}
                                                            </h4>
                                                        </div>
                                                        <div className="text-right pt-6">
                                                            <div className={`text-2xl font-black ${cls.attendanceRate >= 90 ? 'text-emerald-400' :
                                                                cls.attendanceRate >= 75 ? 'text-amber-400' :
                                                                    'text-red-400'
                                                                }`}>
                                                                {cls.attendanceRate}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden mb-4">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${cls.attendanceRate >= 90 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                                cls.attendanceRate >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                                    'bg-gradient-to-r from-red-500 to-red-400'
                                                                }`}
                                                            style={{ width: `${cls.attendanceRate}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                        <div className="bg-black/20 rounded py-1.5 border border-white/5">
                                                            <span className="block text-emerald-400 font-bold">{cls.present}</span>
                                                            <span className="text-brand-cream/40 text-[9px] font-bold uppercase tracking-widest">Pres</span>
                                                        </div>
                                                        <div className="bg-black/20 rounded py-1.5 border border-white/5">
                                                            <span className="block text-orange-400 font-bold">{cls.late}</span>
                                                            <span className="text-brand-cream/40 text-[9px] font-bold uppercase tracking-widest">Late</span>
                                                        </div>
                                                        <div className="bg-black/20 rounded py-1.5 border border-white/5">
                                                            <span className="block text-blue-400 font-bold">{cls.excused}</span>
                                                            <span className="text-brand-cream/40 text-[9px] font-bold uppercase tracking-widest">Exc</span>
                                                        </div>
                                                        <div className="bg-black/20 rounded py-1.5 border border-white/5">
                                                            <span className="block text-red-400 font-bold">{cls.absent}</span>
                                                            <span className="text-brand-cream/40 text-[9px] font-bold uppercase tracking-widest">Abs</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="bg-white/5 rounded-2xl shadow-sm border border-white/10 backdrop-blur-sm p-6">
                        <h3 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2">
                            <BookOpen size={20} className="text-yellow-500" /> Recent Attendance
                        </h3>
                        {/* ... recent activity list ... */}
                        <div className="space-y-4">
                            {error ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                                    <XCircle className="mx-auto mb-3 text-red-400" size={40} />
                                    <p className="text-red-400 font-bold text-lg mb-2">Failed to Load Data</p>
                                    <p className="text-slate-400 text-sm">{error}</p>
                                </div>
                            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                                dashboardData.recentActivities.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors border border-white/5 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-brand-cream/80 font-black border border-white/5">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm tracking-wide">{item.subject}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-cream/50 mt-0.5">{item.date}</div>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${item.color}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-brand-cream/50 font-medium text-sm">
                                    No recent attendance records found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
