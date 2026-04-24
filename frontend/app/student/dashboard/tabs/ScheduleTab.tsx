"use client";
import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User as UserIcon, X, Zap, BookOpen, ChevronRight } from 'lucide-react';
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
            {/* Tab Title HUD */}
            <div className="flex items-center gap-4 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
                <div className="flex flex-col items-center px-8">
                    <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.6em] italic opacity-70 mb-1">
                        STUDENT DASHBOARD
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(0,186,255,0.8)]" />
                        <span className="text-[12px] font-black text-identity-navy uppercase tracking-[0.2em] italic">WEEKLY CLASS SCHEDULE</span>
                    </div>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
            </div>

            {/* Compact Header Area */}
            <div className="identity-glass p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-identity-sky/15 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint-fine" />
                
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <div className="p-4 bg-identity-navy text-white rounded-2xl border border-identity-sky/10 shadow-lg group-hover:bg-identity-sky transition-colors duration-500">
                        <Calendar size={24} className="filter drop-shadow-md" />
                    </div>
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-2">WEEKLY SCHEDULE</h1>
                        <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.3em] italic flex items-center justify-center sm:justify-start gap-3">
                            {/* Decorative text removed for clarity */}
                        </p>
                    </div>
                    <div className="ml-auto hidden lg:flex items-center justify-center p-3 bg-white/40 rounded-xl border border-identity-sky/10">
                        <Zap size={14} className="text-identity-sky/40" />
                    </div>
                </div>
            </div>

            {/* Empty Configuration */}
            {classes.length === 0 && (
                <EmptyState
                    icon={Calendar}
                    title="No Schedule Found"
                    description="Your academic schedule is currently empty. Enroll in classes to see your schedule here."
                    className="py-24"
                />
            )}

            {/* Weekly Schedule Grid */}
            <div className="table-responsive-wrapper pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 min-w-[1200px] xl:min-w-0">
                    {days.map(day => {
                    const dayClasses = scheduleByDay[day] || [];
                    const hasClasses = dayClasses.length > 0;

                    return (
                        <div
                            key={day}
                            className="identity-glass rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-700 border border-identity-sky/15 h-full min-h-[350px] flex flex-col group/day"
                        >
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                            <div className="px-3 py-2 flex items-center justify-between border-b border-identity-sky/10 bg-identity-sky/[0.03] group-hover/day:bg-identity-sky/[0.05] transition-colors relative">
                                <h3 className="text-xs font-black text-identity-navy uppercase tracking-tighter italic leading-none">{day}</h3>
                                <div className="text-[7px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md bg-identity-navy text-white shadow-lg border border-identity-sky/20 italic">
                                    {dayClasses.length}
                                </div>
                            </div>

                            <div className="p-2 space-y-2 flex-1 flex flex-col">
                                {hasClasses ? dayClasses.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedClass(item.class)}
                                        className="bg-white/80 hover:bg-white rounded-[1rem] p-3 border-2 border-slate-100 hover:border-identity-sky/50 transition-all duration-500 cursor-pointer group shadow-lg hover:-translate-y-1 relative active:translate-y-0 overflow-hidden group/item flex flex-col"
                                    >
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-identity-sky/20 group-hover/item:bg-identity-sky transition-colors" />
                                        
                                        <div className="flex flex-col gap-2 mb-4 relative z-10">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-black text-identity-navy text-sm uppercase tracking-tight group-hover/item:text-identity-sky transition-colors italic leading-none">
                                                    {item.class.subject_code}
                                                </h4>
                                                <div className="text-[8px] font-black text-white bg-identity-navy px-2 py-1 rounded shadow-sm italic">
                                                    {item.class.section}
                                                </div>
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate italic">
                                                {item.class.subject_name}
                                            </p>
                                        </div>
 
                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 relative z-10">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-slate-500 group-hover/item:text-identity-navy transition-colors italic">
                                                <Clock size={12} className="text-identity-sky" />
                                                <span>{item.slot.startTime}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-identity-sky group-hover/item:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 group-hover/day:opacity-40 transition-all duration-700">
                                        <div className="w-12 h-12 bg-identity-navy/5 rounded-full flex items-center justify-center mb-4 border border-identity-navy/10">
                                            <Zap size={20} className="text-identity-navy" />
                                        </div>
                                        <p className="text-[9px] font-black text-identity-navy uppercase tracking-[0.3em] italic">No Classes</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>

            {/* Class Details Modal */}
            {selectedClass && (
                <div
                    className="fixed inset-0 bg-identity-navy/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500 overflow-y-auto"
                    onClick={() => setSelectedClass(null)}
                >
                    <div
                        className="identity-glass bg-white/95 rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-2xl border-2 border-identity-sky/20 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500 font-outfit relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                        <div className="corner-bracket-tl opacity-40 scale-75 -top-4 -left-4" />
                        
                        {/* Header */}
                        <div className="bg-identity-sky/[0.03] p-8 sm:p-10 border-b border-identity-sky/10 flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                                <div className="p-4 bg-identity-navy text-white rounded-2xl border-2 border-identity-sky/20 shadow-2xl">
                                    <BookOpen size={32} className="filter drop-shadow-md" />
                                </div>
                                <div>
                                    <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mb-2 italic opacity-60">Subject Details:</h1>
                                    <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-3">{selectedClass.subject_code}</h3>
                                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] italic max-w-md">{selectedClass.subject_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="p-3 bg-white/80 hover:bg-rose-500 hover:text-white rounded-2xl text-slate-400 transition-all shadow-2xl border-2 border-slate-100 active:bg-rose-600 relative z-20 group"
                            >
                                <X size={20} className="transition-transform duration-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 sm:p-10 space-y-10 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-identity-sky/[0.03] p-10 rounded-[2.5rem] border-2 border-identity-sky/10 shadow-inner group/stat relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint-fine" />
                                    <span className="text-[11px] text-slate-400 uppercase tracking-[0.3em] font-black block mb-4 italic">Class Section</span>
                                    <div className="flex items-center gap-6">
                                        <div className="p-3 bg-identity-navy text-white rounded-xl shadow-xl group-hover/stat:bg-identity-sky transition-colors">
                                            <Zap size={20} />
                                        </div>
                                        <span className="text-identity-navy font-black tracking-tighter text-3xl uppercase italic leading-none">{selectedClass.section}</span>
                                    </div>
                                </div>
                                <div className="bg-identity-sky/[0.03] p-10 rounded-[2.5rem] border-2 border-identity-sky/10 shadow-inner group/stat relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint-fine" />
                                    <span className="text-[11px] text-slate-400 uppercase tracking-[0.3em] font-black block mb-4 italic">Class Professor</span>
                                    <div className="flex items-center gap-6">
                                        <div className="p-3 bg-identity-navy text-white rounded-xl shadow-xl group-hover/stat:bg-identity-sky transition-colors">
                                            <UserIcon size={20} />
                                        </div>
                                        <span className="text-identity-navy font-black tracking-tighter text-2xl truncate block italic leading-none" title={selectedClass.professor_id}>
                                            {selectedClass.professor_id}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-black text-identity-sky uppercase tracking-[0.5em] mb-12 flex items-center gap-8 italic">
                                    <span className="h-0.5 bg-gradient-to-r from-transparent to-identity-sky/20 flex-1"></span>
                                    CLASS SCHEDULE
                                    <span className="h-0.5 bg-gradient-to-l from-transparent to-identity-sky/20 flex-1"></span>
                                </h4>
                                <div className="space-y-5">
                                    {parseSchedule(selectedClass.schedule_json).map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/60 p-8 rounded-[2.5rem] border-2 border-identity-sky/10 group hover:border-identity-sky/40 transition-all shadow-md hover:shadow-2xl relative group/slot">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky/5 group-hover/slot:bg-identity-sky transition-colors" />
                                            <div className="font-black text-identity-navy uppercase tracking-tight text-lg italic">{slot.day}</div>
                                            <div className="flex items-center gap-6">
                                                <div className="p-3 bg-identity-sky/5 text-identity-sky rounded-2xl border border-identity-sky/10 group-hover/slot:bg-identity-navy group-hover/slot:text-white transition-all shadow-inner">
                                                    <Clock size={20} className="anim-pulse" />
                                                </div>
                                                <span className="text-slate-600 font-black tracking-[0.2em] uppercase text-sm italic">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-10 sm:p-12 bg-identity-sky/[0.03] border-t-2 border-identity-sky/10 text-center relative z-10">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="w-full py-6 bg-identity-navy text-white hover:bg-identity-sky rounded-2.5xl text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-3xl shadow-identity-navy/20 active:translate-y-0 border border-identity-sky/20 italic group"
                            >
                                CONFIRM & CLOSE <ChevronRight className="inline ml-2 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
