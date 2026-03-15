import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, X } from 'lucide-react';

interface ScheduleTabProps {
    user: {
        id?: number;
        firstName: string;
        lastName: string;
        studentId?: string;
        course?: string;
        yearLevel?: string;
    };
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
    professor_id: string;
}

export default function ScheduleTab({ user }: ScheduleTabProps) {
    const [classes, setClasses] = useState<ClassSchedule[]>([]);
    const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSchedule = async (isBackground = false) => {
        if (!user.id) return;
        if (!isBackground) setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const axios = (await import('axios')).default;

            // Fetch enrolled classes
            const response = await axios.get(`${API_URL}/api/student/classes/${user.id}`);
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [user.id]);

    // Auto-refresh interval
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (user.id) {
            // Refresh every 30 seconds in the background
            intervalId = setInterval(() => {
                fetchSchedule(true);
            }, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user.id]);

    const parseSchedule = (scheduleJson: string | any[]): ScheduleSlot[] => {
        if (typeof scheduleJson === 'string') {
            try {
                return JSON.parse(scheduleJson);
            } catch {
                return [];
            }
        }
        return Array.isArray(scheduleJson) ? scheduleJson : [];
    };

    const formatTime = (time: string) => {
        return time;
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Group classes by day
    const scheduleByDay: { [key: string]: Array<{ class: ClassSchedule; slot: ScheduleSlot }> } = {};

    classes.forEach(cls => {
        const slots = parseSchedule(cls.schedule_json);
        slots.forEach(slot => {
            if (!scheduleByDay[slot.day]) {
                scheduleByDay[slot.day] = [];
            }
            scheduleByDay[slot.day].push({ class: cls, slot });
        });
    });

    // Sort classes by start time for each day
    Object.keys(scheduleByDay).forEach(day => {
        scheduleByDay[day].sort((a, b) => {
            const timeA = a.slot.startTime;
            const timeB = b.slot.startTime;
            return timeA.localeCompare(timeB);
        });
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="text-brand-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Weekly Schedule</h2>
                </div>
                <p className="text-slate-400 text-sm">Your class schedule for the week</p>
            </div>

            {/* No Classes Enrolled Message */}
            {classes.length === 0 && (
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">No classes enrolled</p>
                    <p className="text-sm text-slate-500 mt-2">
                        You haven't enrolled in any classes yet.
                    </p>
                </div>
            )}

            {/* Weekly Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {days.map(day => {
                    const dayClasses = scheduleByDay[day] || [];
                    const hasClasses = dayClasses.length > 0;

                    return (
                        <div
                            key={day}
                            className={`bg-slate-900/50 rounded-2xl border border-slate-800 p-6 ${hasClasses ? '' : 'opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">{day}</h3>
                                <span className="text-xs text-slate-400">
                                    {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {hasClasses ? (
                                    dayClasses.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedClass(item.class)}
                                            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-brand-500/50 transition-all hover:bg-slate-800 cursor-pointer group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">
                                                        {item.class.subject_code}
                                                    </h4>
                                                    <p className="text-xs text-slate-400">
                                                        {item.class.subject_name}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-medium text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
                                                    {item.class.section}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-slate-300 mt-3">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} className="text-slate-500" />
                                                    <span>{formatTime(item.slot.startTime)} - {formatTime(item.slot.endTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <UserIcon size={14} className="text-slate-500" />
                                                    <span>Prof. {item.class.professor_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <p className="text-sm">No classes scheduled</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Class Details Modal */}
            {selectedClass && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedClass(null)}
                >
                    <div
                        className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedClass.subject_code}</h3>
                                <p className="text-slate-400 text-sm">{selectedClass.subject_name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Section & Professor */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1">Section</span>
                                    <span className="text-white font-medium">{selectedClass.section}</span>
                                </div>
                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1">Professor</span>
                                    <span className="text-white font-medium truncate" title={selectedClass.professor_id}>
                                        {selectedClass.professor_id}
                                    </span>
                                </div>
                            </div>

                            {/* Schedule Details */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <Clock size={16} className="text-brand-400" />
                                    Class Schedule
                                </h4>
                                <div className="space-y-2">
                                    {parseSchedule(selectedClass.schedule_json).map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                                            <span className="text-slate-200 font-medium">{slot.day}</span>
                                            <span className="text-slate-400 font-mono">
                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-800/30 border-t border-slate-700 text-center">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                            >
                                Close Values
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
