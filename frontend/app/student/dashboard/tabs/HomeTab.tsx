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
            <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-8 mb-8 flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white">Welcome back, {user.firstName}!</h1>
                    <p className="text-slate-400 mt-2">Here's what's happening with your classes today.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4 bg-brand-500/10 px-6 py-3 rounded-xl border border-brand-500/20">
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
                                            <span className="text-xs font-semibold text-purple-400">Holiday</span>
                                        </>
                                    );
                                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    return (
                                        <>
                                            <Coffee size={14} className="text-amber-400" />
                                            <span className="text-xs font-semibold text-amber-400">Weekend</span>
                                        </>
                                    );
                                } else {
                                    return (
                                        <>
                                            <Briefcase size={14} className="text-brand-400" />
                                            <span className="text-xs font-semibold text-brand-400">Weekday</span>
                                        </>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    <Calendar className="text-brand-400" size={24} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats */}
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Attendance Rate - Hero Stat */}
                        <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-bold text-white mb-1">{dashboardData?.stats?.attendanceRate || 0}%</div>
                                    <div className="text-sm text-slate-400 font-medium">Attendance Rate</div>
                                </div>
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4 h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${dashboardData?.stats?.attendanceRate || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Status Grid */}
                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Present</div>
                                <UserIcon size={16} className="text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.present || 0}</div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-orange-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Late</div>
                                <Clock size={16} className="text-orange-400/70 group-hover:text-orange-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.late || 0}</div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-blue-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Excused</div>
                                <AlertCircle size={16} className="text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.excused || 0}</div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-red-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Absences</div>
                                <XCircle size={16} className="text-red-400/70 group-hover:text-red-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{dashboardData?.stats?.absences || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Schedule & Recent Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Next Class */}
                    <div className="bg-brand-900 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-brand-300 mb-4 text-sm font-bold uppercase tracking-wider">
                                <Clock size={16} /> Next Class
                            </div>
                            {dashboardData?.nextClass ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-3xl font-bold">{dashboardData.nextClass.subject}</h2>
                                        {dashboardData.nextClass.type && dashboardData.nextClass.type.toLowerCase().includes('makeup') && (
                                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                Make-up Class
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-brand-200 text-lg mb-6">{dashboardData.nextClass.professor} • {dashboardData.nextClass.room}</p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                                            <span className="block text-xs text-brand-300">Date</span>
                                            <span className="font-bold">{dashboardData.nextClass.date || 'Today'}</span>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                                            <span className="block text-xs text-brand-300">Time</span>
                                            <span className="font-bold">{dashboardData.nextClass.time}</span>
                                        </div>
                                        <div className={`bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 ${dashboardData.nextClass.status === 'Cancelled' ? 'bg-red-500/20 border-red-500/30' : ''}`}>
                                            <span className="block text-xs text-brand-300">Status</span>
                                            <span className={`font-bold ${dashboardData.nextClass.status === 'Cancelled' ? 'text-red-300' : 'text-green-400'}`}>
                                                {dashboardData.nextClass.status}
                                            </span>
                                        </div>
                                    </div>

                                    {dashboardData.nextClass.reason && (
                                        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                            <p className="text-xs text-red-300 uppercase font-bold mb-1">Cancellation Reason</p>
                                            <p className="text-white text-sm">{dashboardData.nextClass.reason}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-brand-200">
                                    <h2 className="text-2xl font-bold mb-2">No classes scheduled</h2>
                                    <p>You have no upcoming classes for today.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Classes List (Restoring the breakdown or recent activity) */}
                    {/* The original had 'Classes Attendance Breakdown' and 'Recent Attendance' */}
                    {/* I will restore 'Classes Attendance Breakdown' */}
                    {dashboardData?.classesSummary && dashboardData.classesSummary.length > 0 && (
                        <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-6">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-400" /> Overall Attendance
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
                                                <div className="p-5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-brand-500/50 rounded-xl transition-all relative overflow-hidden h-full">

                                                    {/* Badge for Highest/Lowest */}
                                                    {(isHighest || isLowest) && (
                                                        <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold uppercase rounded-bl-lg border-b border-l ${isHighest
                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                            }`}>
                                                            {isHighest ? 'Highest Rate' : 'Lowest Rate'}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-slate-700/50 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600">
                                                                    {cls.subjectCode}
                                                                </span>
                                                                <ChevronLeft size={14} className="rotate-180 text-slate-500 group-hover:text-brand-400 transition-colors opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                            <h4 className="font-bold text-white group-hover:text-brand-300 transition-colors text-sm md:text-base pr-8">
                                                                {cls.subjectName}
                                                            </h4>
                                                        </div>
                                                        <div className="text-right pt-6">
                                                            <div className={`text-2xl font-bold ${cls.attendanceRate >= 90 ? 'text-emerald-400' :
                                                                cls.attendanceRate >= 75 ? 'text-amber-400' :
                                                                    'text-red-400'
                                                                }`}>
                                                                {cls.attendanceRate}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden mb-4">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${cls.attendanceRate >= 90 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                                cls.attendanceRate >= 75 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                                    'bg-gradient-to-r from-red-500 to-red-400'
                                                                }`}
                                                            style={{ width: `${cls.attendanceRate}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                        <div className="bg-slate-900/50 rounded py-1.5 border border-slate-700/50">
                                                            <span className="block text-emerald-400 font-bold">{cls.present}</span>
                                                            <span className="text-slate-500 text-[10px]">Pres</span>
                                                        </div>
                                                        <div className="bg-slate-900/50 rounded py-1.5 border border-slate-700/50">
                                                            <span className="block text-orange-400 font-bold">{cls.late}</span>
                                                            <span className="text-slate-500 text-[10px]">Late</span>
                                                        </div>
                                                        <div className="bg-slate-900/50 rounded py-1.5 border border-slate-700/50">
                                                            <span className="block text-blue-400 font-bold">{cls.excused}</span>
                                                            <span className="text-slate-500 text-[10px]">Exc</span>
                                                        </div>
                                                        <div className="bg-slate-900/50 rounded py-1.5 border border-slate-700/50">
                                                            <span className="block text-red-400 font-bold">{cls.absent}</span>
                                                            <span className="text-slate-500 text-[10px]">Abs</span>
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
                    <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <BookOpen size={20} className="text-brand-400" /> Recent Attendance
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
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                                                {item.subject[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{item.subject}</div>
                                                <div className="text-xs text-slate-400">{item.date}</div>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${item.color}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400">
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
