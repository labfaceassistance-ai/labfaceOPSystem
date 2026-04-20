import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, Users, MapPin, Ban } from 'lucide-react';
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

interface ClassSchedule {
    id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    schedule_json: string;
    student_count: number;
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

    // Cancel modal state
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);

    // Helper function to get the start of the week (Monday)
    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    // Helper function to format time with AM/PM
    const formatTime = (time: string) => {
        if (!time) return time;
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Fetch cancellations
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

    // Build week schedule
    const buildWeekSchedule = () => {
        const sessions: { [key: string]: SessionInfo[] } = {};
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Initialize each day
        daysOfWeek.forEach(day => {
            sessions[day] = [];
        });

        // Process each class
        classes.forEach(cls => {
            try {
                const schedule: ScheduleSlot[] = JSON.parse(cls.schedule_json);

                schedule.forEach(slot => {
                    const dayIndex = daysOfWeek.indexOf(slot.day);
                    if (dayIndex === -1) return;

                    // Calculate the date for this day in the current week
                    const sessionDate = new Date(currentWeekStart);
                    sessionDate.setDate(currentWeekStart.getDate() + dayIndex);

                    const dateStr = sessionDate.toISOString().split('T')[0];

                    // Check if it's a holiday first
                    const holidayName = isHoliday(dateStr);

                    // Check if manually cancelled
                    const cancellation = cancellations.find(c => {
                        // Normalize cancellation date from DB (which might be full ISO or Date object)
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
                        room: 'Lab 1', // TODO: Get from database
                        date: sessionDate,
                        isCancelled: !!(holidayName || cancellation),
                        cancelReason: holidayName ? `Holiday: ${holidayName}` : cancellation?.reason
                    });
                });
            } catch (error) {
                console.error('Failed to parse schedule for class:', cls.id, error);
            }
        });

        // Sort sessions by start time
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
        return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <>
            <div className="space-y-6 font-outfit">
                {/* Header */}
                <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 shadow-xl backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                <Calendar className="text-identity-sky" size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-identity-navy uppercase tracking-tight italic">
                                    Weekly Schedule
                                </h1>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Class timing and structural planning</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/40 p-2 rounded-2xl border border-identity-sky/5 shadow-inner">
                            <button
                                onClick={handlePreviousWeek}
                                className="w-12 h-12 flex items-center justify-center bg-white hover:bg-identity-sky/5 text-identity-navy border border-identity-sky/10 rounded-2xl transition-all active:scale-95 shadow-sm"
                                title="Previous Week"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-identity-sky min-w-[200px] text-center">
                                {getWeekRange()}
                            </span>
                            <button
                                onClick={handleNextWeek}
                                className="w-12 h-12 flex items-center justify-center bg-white hover:bg-identity-sky/5 text-identity-navy border border-identity-sky/10 rounded-2xl transition-all active:scale-95 shadow-sm"
                                title="Next Week"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Schedule Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 relative">
                            <div className="absolute inset-0 border-4 border-identity-sky/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.2em] animate-pulse">Retrieving Weekly Plans...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {daysOfWeek.map((day, index) => {
                            const dayDate = new Date(currentWeekStart);
                            dayDate.setDate(currentWeekStart.getDate() + index);
                            const isToday = dayDate.toDateString() === new Date().toDateString();

                            return (
                                <div
                                    key={day}
                                    className={`identity-glass p-8 rounded-[2rem] md:rounded-[3rem] border transition-all ${isToday
                                        ? 'border-identity-sky/50 shadow-2xl shadow-identity-sky/10 bg-identity-sky/[0.02]'
                                        : 'border-identity-sky/10 shadow-xl'
                                        }`}
                                >
                                    <div className="mb-6">
                                        <h3 className={`font-black uppercase tracking-[0.2em] text-sm italic ${isToday ? 'text-identity-sky' : 'text-identity-navy'}`}>
                                            {day}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1 opacity-70">
                                            {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {weekSessions[day]?.length > 0 ? (
                                            weekSessions[day].map((session, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-5 rounded-2xl border transition-all overflow-hidden relative group ${session.isCancelled
                                                        ? 'bg-rose-500/5 border-rose-500/20'
                                                        : 'bg-white/40 border-identity-sky/10 hover:border-identity-sky/30 shadow-sm'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {session.isCancelled && (
                                                                    <Ban className="text-rose-500 flex-shrink-0" size={14} />
                                                                )}
                                                                <p className={`font-black text-xs uppercase tracking-tight ${session.isCancelled ? 'text-rose-500 line-through decoration-2' : 'text-identity-navy'}`}>
                                                                    {session.subjectCode}
                                                                </p>
                                                            </div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                                Section {session.section}
                                                            </p>
                                                        </div>
                                                        {session.isCancelled && (
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-rose-500/20 text-rose-500 px-2.5 py-1 rounded-full border border-rose-500/20 absolute -top-1 -right-1 rotate-12 group-hover:rotate-0 transition-transform">
                                                                Void
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={12} className="text-identity-sky" />
                                                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={12} className="text-identity-sky" />
                                                            {session.room}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Users size={12} className="text-identity-sky" />
                                                            {session.studentCount} students
                                                        </div>
                                                    </div>

                                                    {session.isCancelled ? (
                                                        <div className="mt-4 text-[9px] font-black uppercase tracking-[0.15em] text-rose-500 bg-rose-500/5 p-3 rounded-2xl border border-rose-500/10 italic">
                                                            Reason: {session.cancelReason?.toUpperCase() || 'EXTERNAL OVERRIDE'}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCancelClick(session)}
                                                            className="mt-4 w-full px-4 py-2.5 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-rose-500/10 active:scale-95"
                                                        >
                                                            <Ban size={14} />
                                                            Suspend Session
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-secondary/20 text-[10px] font-black uppercase tracking-[0.15em] py-4">
                                                No classes
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cancel Session Modal */}
            {selectedSession && (
                <CancelSessionModal
                    isOpen={cancelModalOpen}
                    onClose={() => setCancelModalOpen(false)}
                    classId={selectedSession.classId}
                    className={`${selectedSession.subjectCode} - ${selectedSession.className}`}
                    sessionDate={selectedSession.date.toISOString()}
                    sessionTime={`${formatTime(selectedSession.startTime)} - ${formatTime(selectedSession.endTime)}`}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </>
    );
}
