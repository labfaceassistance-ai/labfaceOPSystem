import { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import { Calendar, BookOpen, Users, XCircle, Clock, MapPin, ChevronRight, TrendingUp, AlertCircle, CheckCircle, Briefcase, Coffee, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isHoliday } from '@/utils/holidays';

interface HomeTabProps {
    user: any;
    classes: any[];
    error?: string | null;
}

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
        // Calculate Next Class
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

                        // Only consider future classes (or strictly current)
                        // We allow classes that started within the last 15 mins to be "Next" (Current)
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

        // Fetch stats
        const fetchStats = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const token = getToken();
                const response = await axios.get(`${API_URL}/api/classes/professor/${user.professorId || user.userId}/stats-overview`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTotalStudents(response.data.totalStudents || 0);
            } catch (err) {
                // Fallback
                const simpleSum = activeClasses.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
                setTotalStudents(simpleSum);
            }
        };
        fetchStats();

        // Refresh next class every minute
        const interval = setInterval(calculateNextClass, 60000);
        return () => clearInterval(interval);

    }, [user, classes, today]);


    return (
        <>
            {/* Welcome Header */}
            <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-8 mb-8 flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white">Welcome back, Prof. {user.lastName}!</h1>
                    <p className="text-slate-400 mt-2">Manage your classes and monitor attendance.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4 bg-brand-500/10 px-6 py-3 rounded-xl border border-brand-500/20">
                    <div className="text-right">
                        <div className="text-sm font-bold text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                            {(() => {
                                const todayDate = new Date();
                                const dayOfWeek = todayDate.getDay();
                                const dateStr = todayDate.toISOString().split('T')[0];
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
                                            <span className="text-xs font-semibold text-brand-400">Current Session</span>
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
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Hero Stat - Total Students */}
                        <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-bold text-white mb-1">{totalStudents}</div>
                                    <div className="text-sm text-slate-400 font-medium">Total Details</div>
                                </div>
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                            </div>
                        </div>

                        {/* Mini Stats */}
                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Active Classes</div>
                                <BookOpen size={16} className="text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{activeClasses.length}</div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm hover:border-purple-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-slate-400">Classes Today</div>
                                <Calendar size={16} className="text-purple-400/70 group-hover:text-purple-400 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-white">{todayClasses.length}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Next Class & Schedule */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Next Class Card (Matching Student Design) */}
                    <div className="bg-brand-900 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-brand-300 mb-4 text-sm font-bold uppercase tracking-wider">
                                <Clock size={16} /> {nextClass && nextClass.status === 'Now' ? 'Current Class' : 'Next Class'}
                            </div>
                            {nextClass ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-3xl font-bold">{nextClass.subject_code}</h2>
                                        <span className="bg-brand-500/20 text-brand-200 border border-brand-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {nextClass.section}
                                        </span>
                                    </div>
                                    <p className="text-brand-200 text-lg mb-6">{nextClass.subject_name} • {nextClass.room || 'Lab 1'}</p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                                            <span className="block text-xs text-brand-300">Time</span>
                                            <span className="font-bold">{nextClass.startTime} - {nextClass.endTime}</span>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                                            <span className="block text-xs text-brand-300">Students</span>
                                            <span className="font-bold">{nextClass.student_count || 0} Enrolled</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={() => router.push(`/professor/classes/${nextClass.id}`)}
                                            className="bg-white text-brand-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-brand-50 transition-colors flex items-center gap-2"
                                        >
                                            View Class <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-brand-200">
                                    <h2 className="text-2xl font-bold mb-2">No upcoming classes</h2>
                                    <p>You have no more classes scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today's Schedule List (To replace Recent Activity) */}
                    <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar size={20} className="text-brand-400" /> Today's Schedule
                        </h3>
                        <div className="space-y-4">
                            {error ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                                    <XCircle className="mx-auto mb-3 text-red-400" size={40} />
                                    <p className="text-red-400 font-bold text-lg mb-2">Failed to Load Data</p>
                                    <p className="text-slate-400 text-sm">{error}</p>
                                </div>
                            ) : todayClasses.length > 0 ? (
                                todayClasses.map((cls) => {
                                    const schedule = JSON.parse(cls.schedule_json);
                                    const todaySchedule = schedule.find((s: any) => s.day === today);

                                    return (
                                        <div
                                            key={cls.id}
                                            onClick={() => router.push(`/professor/classes/${cls.id}`)}
                                            className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 hover:border-brand-500/50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-bold text-white group-hover:text-brand-400 transition-colors">{cls.subject_code}</h4>
                                                    <p className="text-sm text-slate-400">{cls.subject_name}</p>
                                                    <p className="text-xs text-brand-400 mt-1">Section {cls.section}</p>
                                                </div>
                                                {todaySchedule && (
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-white">{todaySchedule.startTime} - {todaySchedule.endTime}</div>
                                                        <div className="text-xs text-slate-400">{cls.student_count || 0} students</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No classes scheduled for today</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
