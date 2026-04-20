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
            <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-sm mb-8 flex flex-col md:flex-row items-center justify-between font-outfit">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-black text-identity-navy uppercase tracking-tight italic">Welcome back,</h1>
                    <h2 className="text-3xl md:text-4xl font-black text-identity-sky uppercase tracking-tighter">Prof. {user.lastName}</h2>
                    <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">Manage your classes and monitor attendance.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4 bg-identity-sky/10 px-6 py-4 rounded-2xl border border-identity-sky/20 shadow-lg shadow-identity-sky/5">
                    <div className="text-right">
                        <div className="text-xs font-black text-identity-navy uppercase tracking-[0.15em]">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                            {(() => {
                                const todayDate = new Date();
                                const dayOfWeek = todayDate.getDay();
                                const dateStr = todayDate.toISOString().split('T')[0];
                                const holidayName = isHoliday(dateStr);

                                if (holidayName) {
                                    return (
                                        <>
                                            <PartyPopper size={14} className="text-purple-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-500">Holiday</span>
                                        </>
                                    );
                                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    return (
                                        <>
                                            <Coffee size={14} className="text-identity-sky" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-identity-sky">Weekend</span>
                                        </>
                                    );
                                } else {
                                    return (
                                        <>
                                            <Briefcase size={14} className="text-identity-sky" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-identity-sky">Current Session</span>
                                        </>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    <Calendar className="text-identity-sky" size={24} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats */}
                <div className="space-y-8">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hero Stat - Total Students */}
                        <div className="col-span-2 identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 relative overflow-hidden group font-outfit">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-identity-sky/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-identity-sky/20 transition-colors"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-3xl md:text-4xl font-black text-identity-navy mb-1 tracking-tighter">{totalStudents}</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Total Students</div>
                                </div>
                                <div className="w-14 h-14 bg-identity-sky/10 rounded-2xl flex items-center justify-center text-identity-sky border border-identity-sky/20 group-hover:scale-110 transition-transform">
                                    <Users size={28} />
                                </div>
                            </div>
                        </div>

                        {/* Mini Stats */}
                        <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-sm hover:border-identity-sky/30 transition-all group font-outfit">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Active Classes</div>
                                <BookOpen size={16} className="text-identity-sky group-hover:text-identity-sky transition-colors" />
                            </div>
                            <div className="text-2xl font-black text-identity-navy tracking-tighter">{activeClasses.length}</div>
                        </div>

                        <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-sm hover:border-identity-sky/30 transition-all group font-outfit">
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Classes Today</div>
                                <Calendar size={16} className="text-identity-sky group-hover:text-identity-sky transition-colors" />
                            </div>
                            <div className="text-2xl font-black text-identity-navy tracking-tighter">{todayClasses.length}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Next Class & Schedule */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Next Class Card (Matching Student Design) */}
                    <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl text-identity-navy relative overflow-hidden border border-identity-sky/10 font-outfit">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-identity-sky mb-4 text-[10px] font-black uppercase tracking-[0.15em]">
                                <Clock size={16} /> {nextClass && nextClass.status === 'Now' ? 'Current Class' : 'Next Class'}
                            </div>
                            {nextClass ? (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-3xl font-black uppercase tracking-tighter">{nextClass.subject_code}</h2>
                                        <span className="bg-identity-sky/10 text-identity-sky border border-identity-sky/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em]">
                                            {nextClass.section}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-lg mb-6 font-bold uppercase tracking-tight">{nextClass.subject_name} â€¢ {nextClass.room || 'Lab 1'}</p>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="bg-white/40 backdrop-blur-md px-4 py-3 rounded-lg border border-identity-sky/5 shadow-inner">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Time</span>
                                            <span className="font-black text-identity-navy">{nextClass.startTime} - {nextClass.endTime}</span>
                                        </div>
                                        <div className="bg-white/40 backdrop-blur-md px-4 py-3 rounded-lg border border-identity-sky/5 shadow-inner">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Students</span>
                                            <span className="font-black text-identity-navy">{nextClass.student_count || 0} Enrolled</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={() => router.push(`/professor/classes/${nextClass.id}`)}
                                            className="bg-identity-sky hover:bg-identity-navy text-white px-8 py-3 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] transition-all flex items-center gap-2 shadow-xl shadow-identity-sky/10 active:scale-95"
                                        >
                                            View Class <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-300">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">No upcoming classes</h2>
                                    <p className="text-sm font-bold uppercase tracking-[0.15em]">You have no more classes scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today's Schedule List (To replace Recent Activity) */}
                    <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-sm font-outfit">
                        <h3 className="text-lg font-black text-identity-navy mb-8 flex items-center gap-4 uppercase tracking-tight">
                            <div className="bg-identity-sky/10 p-2 rounded-2xl">
                                <Calendar size={20} className="text-identity-sky" />
                            </div>
                            Today's Schedule
                        </h3>
                        <div className="space-y-4">
                            {error ? (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                                    <XCircle className="mx-auto mb-3 text-red-500" size={40} />
                                    <p className="text-red-500 font-black uppercase tracking-[0.15em] text-lg mb-2">Failed to Load Data</p>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.15em]">{error}</p>
                                </div>
                            ) : todayClasses.length > 0 ? (
                                todayClasses.map((cls) => {
                                    const schedule = JSON.parse(cls.schedule_json);
                                    const todaySchedule = schedule.find((s: any) => s.day === today);

                                    return (
                                        <div
                                            key={cls.id}
                                            onClick={() => router.push(`/professor/classes/${cls.id}`)}
                                            className="bg-white/40 rounded-2xl p-4 border border-identity-sky/5 hover:border-identity-sky/50 transition-all cursor-pointer group shadow-sm"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-black text-identity-navy group-hover:text-identity-sky transition-colors uppercase tracking-tight">{cls.subject_code}</h4>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em]">{cls.subject_name}</p>
                                                    <p className="text-[10px] text-identity-sky font-black uppercase tracking-[0.15em] mt-1">Section {cls.section}</p>
                                                </div>
                                                {todaySchedule && (
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-identity-navy uppercase tracking-[0.15em]">{todaySchedule.startTime} - {todaySchedule.endTime}</div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">{cls.student_count || 0} students</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-slate-300">
                                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-black uppercase tracking-tighter">No classes today</p>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1">Enjoy your break!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
