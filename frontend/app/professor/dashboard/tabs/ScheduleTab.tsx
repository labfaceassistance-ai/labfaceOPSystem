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
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calendar className="text-brand-400" size={28} />
                            Weekly Schedule
                        </h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePreviousWeek}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-white font-medium min-w-[200px] text-center">
                                {getWeekRange()}
                            </span>
                            <button
                                onClick={handleNextWeek}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Schedule Grid */}
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading schedule...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {daysOfWeek.map((day, index) => {
                            const dayDate = new Date(currentWeekStart);
                            dayDate.setDate(currentWeekStart.getDate() + index);
                            const isToday = dayDate.toDateString() === new Date().toDateString();

                            return (
                                <div
                                    key={day}
                                    className={`bg-slate-900/50 rounded-xl border ${isToday ? 'border-brand-500' : 'border-slate-800'
                                        } p-4`}
                                >
                                    <div className="mb-3">
                                        <h3 className={`font-bold ${isToday ? 'text-brand-400' : 'text-white'}`}>
                                            {day}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        {weekSessions[day]?.length > 0 ? (
                                            weekSessions[day].map((session, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg border ${session.isCancelled
                                                        ? 'bg-red-500/10 border-red-500/30'
                                                        : 'bg-slate-800/50 border-slate-700'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 flex items-center gap-2">
                                                            {session.isCancelled && (
                                                                <Ban className="text-red-400 flex-shrink-0" size={16} />
                                                            )}
                                                            <div>
                                                                <p className={`font-bold text-sm ${session.isCancelled ? 'text-red-400 line-through' : 'text-white'}`}>
                                                                    {session.subjectCode}
                                                                </p>
                                                                <p className="text-xs text-slate-400">
                                                                    Section {session.section}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {session.isCancelled && (
                                                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded flex items-center gap-1">
                                                                <Ban size={12} />
                                                                Cancelled
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1 text-xs text-slate-300">
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {session.room}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Users size={12} />
                                                            {session.studentCount} students
                                                        </div>
                                                    </div>

                                                    {session.isCancelled ? (
                                                        <div className="mt-2 text-xs text-red-400">
                                                            Reason: {session.cancelReason}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCancelClick(session)}
                                                            className="mt-2 w-full px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <X size={14} />
                                                            Cancel Session
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-slate-500 text-sm py-4">
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
