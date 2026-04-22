"use client";
import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, Users, MapPin, Ban, CalendarX, Zap, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';
import CancelSessionModal from '@/components/CancelSessionModal';
import { isHoliday } from '@/utils/holidays';

interface ScheduleTabProps {
    user: any;
    classes: any[];
}

interface ScheduleSlot {
    day: string;
    startTime: string;
    endTime: string;
}

interface SessionInfo {
    classId: number;
    className: string;
    subjectCode: string;
    section: string;
    startTime: string;
    endTime: string;
    studentCount: number;
    room: string;
    date: Date;
    isCancelled: boolean;
    cancelReason?: string;
}

export default function ScheduleTab({ user, classes }: ScheduleTabProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
    const [weekSessions, setWeekSessions] = useState<{ [key: string]: SessionInfo[] }>({});
    const [cancellations, setCancellations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);

    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    const formatTime = (time: string) => {
        if (!time) return time;
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const fetchCancellations = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/cancellations`);
            setCancellations(response.data || []);
        } catch (error) {
            console.error('Failed to fetch cancellations:', error);
            setCancellations([]);
        }
    };

    const buildWeekSchedule = () => {
        const sessions: { [key: string]: SessionInfo[] } = {};
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        daysOfWeek.forEach(day => {
            sessions[day] = [];
        });

        classes.forEach(cls => {
            try {
                const schedule: ScheduleSlot[] = JSON.parse(cls.schedule_json);

                schedule.forEach(slot => {
                    const dayIndex = daysOfWeek.indexOf(slot.day);
                    if (dayIndex === -1) return;

                    const sessionDate = new Date(currentWeekStart);
                    sessionDate.setDate(currentWeekStart.getDate() + dayIndex);
                    const dateStr = sessionDate.toISOString().split('T')[0];
                    const holidayName = isHoliday(dateStr);

                    const cancellation = cancellations.find(c => {
                        const cDate = typeof c.session_date === 'string'
                            ? c.session_date.split('T')[0]
                            : new Date(c.session_date).toISOString().split('T')[0];
                        return c.class_id === cls.id && cDate === dateStr;
                    });

                    sessions[slot.day].push({
                        classId: cls.id,
                        className: cls.subject_name,
                        subjectCode: cls.subject_code,
                        section: cls.section,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        studentCount: cls.student_count || 0,
                        room: 'LABORATORY 01',
                        date: sessionDate,
                        isCancelled: !!(holidayName || cancellation),
                        cancelReason: holidayName ? `HOLIDAY: ${holidayName.toUpperCase()}` : cancellation?.reason?.toUpperCase()
                    });
                });
            } catch (error) {
                console.error('Failed to parse schedule for class:', cls.id, error);
            }
        });

        Object.keys(sessions).forEach(day => {
            sessions[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        setWeekSessions(sessions);
        setLoading(false);
    };

    useEffect(() => {
        fetchCancellations();
    }, []);

    useEffect(() => {
        if (cancellations) {
            buildWeekSchedule();
        }
    }, [classes, currentWeekStart, cancellations]);

    const handlePreviousWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart);
    };

    const handleNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart);
    };

    const handleCancelClick = (session: SessionInfo) => {
        setSelectedSession(session);
        setCancelModalOpen(true);
    };

    const handleCancelSuccess = () => {
        fetchCancellations();
    };

    const getWeekRange = () => {
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 6);
        return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="space-y-12 font-outfit animate-in fade-in duration-1000">
            {/* Compact Header Area */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-6 mb-8 border border-white/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-blueprint opacity-[0.03] pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#5CB4E4] rounded-2xl shadow-lg shadow-[#5CB4E4]/20 group-hover:scale-110 transition-transform duration-700">
                            <Calendar className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#041C3C] uppercase tracking-[0.2em] italic leading-none mb-2">
                                WEEKLY SCHEDULE
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#5CB4E4] animate-pulse" />
                                <p className="text-[9px] font-black text-[#5CB4E4] uppercase tracking-[0.3em] italic">
                                    SYNCHRONIZED • ONLINE STATUS VERIFIED
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-4 bg-white/60 p-3 px-6 rounded-2xl border border-white/40 shadow-sm">
                        <Zap size={14} className="text-[#5CB4E4] animate-pulse" />
                        <p className="text-[9px] font-black text-[#041C3C] uppercase tracking-[0.3em] italic">REAL-TIME SYNC ACTIVE</p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/60 p-3 rounded-2xl border border-white/50 shadow-3xl backdrop-blur-3xl font-outfit">
                        <button onClick={handlePreviousWeek} className="w-12 h-12 flex items-center justify-center bg-[#041C3C] hover:bg-[#5CB4E4] text-white rounded-xl transition-all shadow-xl active:scale-95 border border-white/10">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="px-6 text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 italic">DATE RANGE</p>
                            <p className="text-md font-black uppercase tracking-tighter text-[#041C3C] italic">
                                {getWeekRange().toUpperCase()}
                            </p>
                        </div>
                        <button onClick={handleNextWeek} className="w-12 h-12 flex items-center justify-center bg-[#041C3C] hover:bg-[#5CB4E4] text-white rounded-xl transition-all shadow-xl active:scale-95 border border-white/10">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-[240px] gap-12 bg-white/40 backdrop-blur-xl rounded-[6rem] border-4 border-dashed border-[#5CB4E4]/10">
                    <div className="w-40 h-40 relative">
                        <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-[3rem] rotate-45" />
                        <div className="absolute inset-0 border-4 border-[#041C3C] border-t-transparent rounded-[3rem] rotate-45 animate-spin shadow-4xl" />
                    </div>
                    <div className="text-center space-y-4">
                        <p className="text-[16px] font-black text-[#041C3C] uppercase tracking-[0.6em] animate-pulse italic">LOADING SCHEDULE...</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-40">Fetching your weekly sessions...</p>
                    </div>
                </div>
            ) : (
                <div className="table-responsive-wrapper pb-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 min-w-[1200px] xl:min-w-0">
                        {daysOfWeek.map((day, index) => {
                        const dayDate = new Date(currentWeekStart);
                        dayDate.setDate(currentWeekStart.getDate() + index);
                        const isToday = dayDate.toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={day}
                                className={`bg-white/40 backdrop-blur-xl p-3.5 rounded-[1.5rem] border transition-all duration-700 relative overflow-hidden group h-full shadow-xl font-outfit min-h-[400px] flex flex-col ${isToday
                                    ? 'border-[#5CB4E4] ring-[4px] ring-[#5CB4E4]/5 z-10 scale-[1.02]'
                                    : 'border-white/20 hover:border-[#5CB4E4]/40 hover:-translate-y-1'
                                    }`}
                            >
                                <div className="absolute inset-x-0 top-0 h-full z-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                                {isToday && (
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-[#5CB4E4] animate-pulse shadow-[0_0_20px_rgba(92,180,228,0.8)]" />
                                )}

                                <div className="mb-4 border-b border-white/20 pb-4 relative z-10 text-center">
                                    <h3 className={`font-black uppercase tracking-tight text-sm italic mb-1 leading-none ${isToday ? 'text-[#5CB4E4]' : 'text-[#041C3C]'}`}>
                                        {day.toUpperCase()}
                                    </h3>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] italic ${isToday ? 'text-[#041C3C]' : 'text-slate-400'}`}>
                                        {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                    </p>
                                </div>

                                <div className="space-y-6 relative z-10 flex-1">
                                    {weekSessions[day]?.length > 0 ? (
                                        weekSessions[day].map((session, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-[1.2rem] border transition-all duration-700 relative group/row overflow-hidden flex flex-col shadow-lg min-h-[200px] ${session.isCancelled
                                                    ? 'bg-rose-500/[0.05] border-rose-500/20 grayscale scale-[0.98]'
                                                    : 'bg-white border-slate-100 hover:border-[#5CB4E4]/40'
                                                    }`}
                                            >
                                                <div className="mb-4 relative z-10 flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {session.isCancelled && <Ban size={12} className="text-rose-500 animate-pulse" />}
                                                        <p className={`font-black text-sm md:text-base uppercase tracking-tighter italic leading-none ${session.isCancelled ? 'text-rose-400 line-through opacity-50' : 'text-[#041C3C]'}`}>
                                                            {session.subjectCode}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.1em] italic">
                                                            SEC: {session.section}
                                                        </p>
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter italic truncate pr-1">
                                                            {session.className}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 relative z-10 mb-4 pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-3 text-[8px] font-black text-[#041C3C] uppercase tracking-tight italic">
                                                        <Clock size={12} className="text-[#5CB4E4]" />
                                                        {formatTime(session.startTime)}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[8px] font-black text-[#041C3C] uppercase tracking-tight italic">
                                                        <MapPin size={12} className="text-[#041C3C]" />
                                                        {session.room}
                                                    </div>
                                                </div>

                                                {session.isCancelled ? (
                                                    <div className="mt-auto p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center">
                                                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest italic animate-pulse">
                                                            CANCELLED
                                                        </p>
                                                    </div>
                                                ) : (
                                                        <button
                                                            onClick={() => handleCancelClick(session)}
                                                            className="mt-auto w-full px-3 py-2 bg-white hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[7px] font-black uppercase tracking-wider transition-all duration-700 flex items-center justify-center gap-2 border border-rose-500/20 italic group/cancel"
                                                        >
                                                            <Ban size={10} /> CANCEL
                                                        </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-12 opacity-30 group-hover:opacity-100 transition-all duration-1000">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 border border-white/50 shadow-inner group-hover:scale-110 transition-transform">
                                                <CalendarX size={28} className="text-[#041C3C]/10" />
                                            </div>
                                            <p className="text-center text-[10px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic">
                                                EMPTY
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {selectedSession && (
                <CancelSessionModal
                    isOpen={cancelModalOpen}
                    onClose={() => setCancelModalOpen(false)}
                    classId={selectedSession.classId}
                    className={`${selectedSession.subjectCode} — ${selectedSession.className}`}
                    sessionDate={selectedSession.date.toISOString()}
                    sessionTime={`${formatTime(selectedSession.startTime)} — ${formatTime(selectedSession.endTime)}`}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </div>
    );
}
