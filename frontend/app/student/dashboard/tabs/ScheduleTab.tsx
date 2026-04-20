"use client";
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
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mb-4"></div>
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.4em]">Optimizing Time Matrix...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="identity-glass rounded-2xl shadow-sm border border-identity-sky/10 backdrop-blur-sm p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-identity-sky/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-identity-sky/10 transition-colors"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-identity-sky/10 text-identity-navy rounded-xl border border-identity-sky/10 shadow-lg shadow-identity-sky/5 group-hover:scale-110 transition-transform">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter font-outfit italic">Temporal Synchronization</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-1">Operational Schedule • Lab 1</p>
                    </div>
                </div>
            </div>

            {/* No Classes Enrolled Message */}
            {classes.length === 0 && (
                <div className="identity-glass rounded-[2rem] border-2 border-identity-sky/10 border-dashed p-16 text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-slate-200 opacity-20" />
                    <p className="font-black text-lg text-slate-300 uppercase tracking-tighter italic">No nodes synchronized</p>
                    <p className="text-[10px] font-black text-slate-200 mt-2 uppercase tracking-[0.3em]">
                        Your academic matrix is currently empty.
                    </p>
                </div>
            )}

            {/* Weekly Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {days.map(day => {
                    const dayClasses = scheduleByDay[day] || [];
                    const hasClasses = dayClasses.length > 0;

                    return (
                        <div
                            key={day}
                            className={`rounded-2xl border transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl ${
                                hasClasses 
                                    ? 'bg-white/40 border-identity-sky/10 identity-glass' 
                                    : 'bg-white/10 border-identity-sky/5 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 identity-glass'
                            }`}
                        >
                            <div className={`px-8 py-5 flex items-center justify-between border-b ${hasClasses ? 'bg-identity-sky/5 border-identity-sky/10' : 'bg-transparent border-transparent'}`}>
                                <h3 className="text-lg font-black text-identity-navy uppercase tracking-tighter font-outfit italic">{day}</h3>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${hasClasses ? 'bg-identity-navy text-white' : 'bg-white/40 text-slate-300'}`}>
                                    {dayClasses.length} {dayClasses.length === 1 ? 'Node' : 'Nodes'}
                                </span>
                            </div>

                            <div className="p-8 space-y-4">
                                {hasClasses ? (
                                    dayClasses.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedClass(item.class)}
                                            className="bg-white/40 rounded-xl p-6 border border-identity-sky/5 hover:border-identity-sky/30 hover:bg-white transition-all duration-500 cursor-pointer group/card shadow-sm hover:shadow-xl shadow-inner"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h4 className="font-black text-identity-navy text-sm uppercase tracking-widest group-hover/card:text-identity-sky transition-colors italic">
                                                        {item.class.subject_code}
                                                    </h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 line-clamp-1 pr-10">
                                                        {item.class.subject_name}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-black text-identity-sky bg-white/60 px-3 py-1 rounded-full border border-identity-sky/10 shadow-sm uppercase tracking-[0.2em]">
                                                    {item.class.section}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-6 pt-6 border-t border-identity-sky/5">
                                                <div className="flex items-center gap-2 group-hover/card:text-identity-navy transition-colors">
                                                    <Clock size={16} className="text-identity-sky opacity-40" />
                                                    <span>{item.slot.startTime} - {item.slot.endTime}</span>
                                                </div>
                                                <div className="flex items-center gap-2 group-hover/card:text-identity-navy transition-colors">
                                                    <UserIcon size={16} className="text-identity-sky opacity-40" />
                                                    <span className="truncate max-w-[150px]">Prof. {item.class.professor_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-60">
                                        <div className="w-12 h-12 bg-white/40 border border-identity-sky/5 rounded-xl flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-inner">
                                            <Clock size={20} />
                                        </div>
                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-[0.5em]">System Idle</p>
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
                    className="fixed inset-0 bg-identity-navy/20 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
                    onClick={() => setSelectedClass(null)}
                >
                    <div
                        className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-2xl border border-identity-sky/20 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-identity-sky/5 p-8 border-b border-identity-sky/10 flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-identity-sky/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 font-outfit">
                                <h3 className="text-2xl font-black text-identity-navy mb-1 uppercase tracking-tighter italic">{selectedClass.subject_code}</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">{selectedClass.subject_name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="p-3 bg-white hover:bg-rose-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all shadow-sm border border-identity-sky/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-identity-sky/5 p-5 rounded-xl border border-identity-sky/10 shadow-inner">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-[0.4em] font-black block mb-2">Section</span>
                                    <span className="text-identity-navy font-black tracking-tight text-sm uppercase">{selectedClass.section}</span>
                                </div>
                                <div className="bg-identity-sky/5 p-5 rounded-xl border border-identity-sky/10 shadow-inner overflow-hidden">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-[0.4em] font-black block mb-2">Professor</span>
                                    <span className="text-identity-navy font-black tracking-tight text-sm truncate block font-outfit" title={selectedClass.professor_id}>
                                        {selectedClass.professor_id}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                                    <span className="h-px bg-identity-sky/10 flex-1"></span>
                                    Schedule Matrix
                                    <span className="h-px bg-identity-sky/10 flex-1"></span>
                                </h4>
                                <div className="space-y-3">
                                    {parseSchedule(selectedClass.schedule_json).map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-white/60 p-4 rounded-xl border border-identity-sky/5 shadow-sm hover:border-identity-sky/30 transition-colors">
                                            <span className="text-identity-navy font-black uppercase tracking-widest italic">{slot.day}</span>
                                            <div className="flex items-center gap-3">
                                                <Clock size={14} className="text-identity-sky" />
                                                <span className="text-slate-500 font-black">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-identity-sky/5 border-t border-identity-sky/10 text-center">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="px-10 py-3 bg-identity-navy text-white hover:bg-identity-navy/90 hover:shadow-lg rounded-xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg shadow-identity-navy/10"
                            >
                                Terminate Connection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
