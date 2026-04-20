"use client";
import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, X, Zap, BookOpen } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

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

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (user.id) {
            intervalId = setInterval(() => {
                fetchSchedule(true);
            }, 30000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [user.id]);

    const parseSchedule = (scheduleJson: string | any[]): ScheduleSlot[] => {
        if (typeof scheduleJson === 'string') {
            try { return JSON.parse(scheduleJson); } catch { return []; }
        }
        return Array.isArray(scheduleJson) ? scheduleJson : [];
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const scheduleByDay: { [key: string]: Array<{ class: ClassSchedule; slot: ScheduleSlot }> } = {};
    classes.forEach(cls => {
        const slots = parseSchedule(cls.schedule_json);
        slots.forEach(slot => {
            if (!scheduleByDay[slot.day]) scheduleByDay[slot.day] = [];
            scheduleByDay[slot.day].push({ class: cls, slot });
        });
    });

    Object.keys(scheduleByDay).forEach(day => {
        scheduleByDay[day].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    if (loading) {
        return (
            <div className="space-y-8 animate-fade-in">
                <Skeleton variant="card" height="150px" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} variant="card" height="300px" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-outfit">
            {/* Header Area */}
            <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-identity-sky/10 backdrop-blur-md relative overflow-hidden group">
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <div className="p-3 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10 shadow-sm">
                        <Calendar size={32} className="text-identity-sky" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Temporal Registry</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-2">Schedule Matrix â€¢ Terminal Active</p>
                    </div>
                    <div className="ml-auto hidden md:flex items-center gap-4 bg-white/40 px-6 py-3 rounded-full border border-identity-sky/10 shadow-inner">
                        <Zap size={16} className="text-identity-sky animate-pulse" />
                        <span className="text-[9px] font-black text-identity-navy uppercase tracking-[0.15em]">Real-time Sync Active</span>
                    </div>
                </div>
            </div>

            {/* Empty Configuration */}
            {classes.length === 0 && (
                <EmptyState
                    icon={Calendar}
                    title="No Registry Fragments"
                    description="Your academic schedule is currently unpopulated. Enroll in class modules to manifesting your timeline."
                    className="py-24"
                />
            )}

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {days.map(day => {
                    const dayClasses = scheduleByDay[day] || [];
                    const hasClasses = dayClasses.length > 0;

                    if (!hasClasses) return null; // Only show days with classes to save space

                    return (
                        <div
                            key={day}
                            className="identity-glass rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-identity-sky/10 h-fit"
                        >
                            <div className="px-8 sm:px-10 py-6 flex items-center justify-between border-b border-identity-sky/5 bg-identity-sky/5">
                                <h3 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic">{day}</h3>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full bg-identity-navy text-white shadow-xl shadow-identity-navy/10">
                                    {dayClasses.length} Modules
                                </span>
                            </div>

                            <div className="p-6 sm:p-10 space-y-6">
                                {dayClasses.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedClass(item.class)}
                                        className="bg-white/60 rounded-[1.5rem] p-6 sm:p-8 border border-identity-sky/5 hover:border-identity-sky/20 hover:bg-white transition-all duration-500 cursor-pointer group shadow-sm hover:shadow-2xl relative active:scale-[0.97]"
                                    >
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="flex-1">
                                                <h4 className="font-black text-identity-navy text-lg uppercase tracking-tight group-hover:text-identity-sky transition-colors italic leading-none mb-2">
                                                    {item.class.subject_code}
                                                </h4>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 line-clamp-1 pr-10 opacity-70">
                                                    {item.class.subject_name}
                                                </p>
                                            </div>
                                            <div className="text-[8px] font-black text-identity-sky bg-identity-sky/[0.03] px-3 py-1.5 rounded-lg border border-identity-sky/10 shadow-sm uppercase tracking-[0.2em]">
                                                {item.class.section}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-8 pt-8 border-t border-identity-sky/5">
                                            <div className="flex items-center gap-4 group-hover:text-identity-navy transition-colors">
                                                <div className="p-2 bg-identity-sky/5 rounded-lg text-identity-sky">
                                                    <Clock size={16} />
                                                </div>
                                                <span>{item.slot.startTime} - {item.slot.endTime}</span>
                                            </div>
                                            <div className="flex items-center gap-4 group-hover:text-identity-navy transition-colors">
                                                <div className="p-2 bg-identity-sky/5 rounded-lg text-identity-sky">
                                                    <UserIcon size={16} />
                                                </div>
                                                <span className="truncate max-w-[150px]">Prof. {item.class.professor_id}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Inspect Protocol Modal */}
            {selectedClass && (
                <div
                    className="fixed inset-0 bg-identity-navy/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500 overflow-y-auto"
                    onClick={() => setSelectedClass(null)}
                >
                    <div
                        className="identity-glass bg-white/95 rounded-[2rem] md:rounded-[3rem] w-full max-w-xl border border-identity-sky/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 font-outfit"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-identity-sky/[0.03] p-8 sm:p-12 border-b border-identity-sky/5 flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="p-4 bg-identity-sky/10 rounded-2xl border border-identity-sky/10 text-identity-sky shadow-sm">
                                    <BookOpen size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">{selectedClass.subject_code}</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{selectedClass.subject_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="p-3 bg-white hover:bg-rose-500 hover:text-white rounded-2xl text-slate-400 transition-all shadow-xl border border-slate-100 active:scale-90 relative z-20"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 sm:p-12 space-y-10">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-identity-sky/[0.02] p-8 rounded-3xl border border-identity-sky/5 shadow-inner">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black block mb-2 opacity-60">Section Node</span>
                                    <span className="text-identity-navy font-black tracking-tighter text-xl uppercase italic">{selectedClass.section}</span>
                                </div>
                                <div className="bg-identity-sky/[0.02] p-8 rounded-3xl border border-identity-sky/5 shadow-inner overflow-hidden">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black block mb-2 opacity-60">Primary Proctor</span>
                                    <span className="text-identity-navy font-black tracking-tighter text-xl truncate block italic" title={selectedClass.professor_id}>
                                        {selectedClass.professor_id}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mb-10 flex items-center gap-6">
                                    <span className="h-px bg-identity-sky/10 flex-1"></span>
                                    Temporal Slots
                                    <span className="h-px bg-identity-sky/10 flex-1"></span>
                                </h4>
                                <div className="space-y-4">
                                    {parseSchedule(selectedClass.schedule_json).map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/40 p-6 rounded-3xl border border-identity-sky/10 group hover:border-identity-sky/30 transition-all shadow-sm">
                                            <span className="text-identity-navy font-black uppercase tracking-tight text-sm italic">{slot.day}</span>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-identity-sky/5 rounded-2xl text-identity-sky">
                                                    <Clock size={16} />
                                                </div>
                                                <span className="text-slate-600 font-black tracking-[0.1em] uppercase text-[11px]">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 sm:p-10 bg-identity-sky/[0.03] border-t border-identity-sky/5 text-center">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="w-full py-5 bg-identity-navy text-white hover:bg-identity-sky rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-identity-navy/20 active:scale-95"
                            >
                                Dismiss Protocol Detail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
