"use client";
import { useEffect, useState } from 'react';
import { BookOpen, Archive, User, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface ClassesTabProps {
    user: {
        id?: number;
        firstName: string;
        lastName: string;
        studentId?: string;
    };
}

interface ClassItem {
    id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    professor_id: string;
    is_archived: number;
    schedule_json: string;
}

export default function ClassesTab({ user }: ClassesTabProps) {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!user.id) return;
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const axios = (await import('axios')).default;
                const response = await axios.get(`${API_URL}/api/student/classes/${user.id}?include_archived=true`);
                setClasses(response.data);
            } catch (error) {
                console.error('Failed to fetch classes:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [user.id]);

    if (loading) {
        return (
            <div className="space-y-12 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} variant="card" height="250px" />
                    ))}
                </div>
            </div>
        );
    }

    const activeClasses = classes.filter(c => !c.is_archived);
    const archivedClasses = classes.filter(c => c.is_archived === 1);

    const ClassCard = ({ cls, isArchived }: { cls: ClassItem; isArchived?: boolean }) => {
        const router = useRouter();
        return (
            <div
                onClick={() => router.push(`/student/classes/${cls.id}`)}
                className={`
                    identity-glass group relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] p-10 sm:p-12 transition-all cursor-pointer shadow-2xl hover:shadow-3xl active:scale-[0.98] border-2 group/card
                    ${isArchived
                        ? 'bg-slate-50 opacity-60 saturate-50 hover:opacity-100 hover:saturate-100 border-slate-200'
                        : 'border-identity-sky/15 hover:border-identity-sky/40 bg-white/40'
                    }
                `}
            >
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                <div className="corner-bracket-tl opacity-40 scale-75 -top-2 -left-2" />
                
                <div className="flex justify-between items-start mb-12 relative z-10">
                    <div className={`
                        w-16 h-16 rounded-2.5xl flex items-center justify-center font-black text-2xl shadow-3xl transition-all duration-700 border-2 italic font-outfit
                        ${isArchived
                            ? 'bg-slate-200 border-slate-300 text-slate-500'
                            : 'bg-identity-navy text-white border-identity-sky/20 group-hover/card:bg-identity-sky group-hover/card:rotate-6 group-hover/card:scale-110'
                        }
                    `}>
                        {cls.subject_code.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-right font-outfit">
                        <h3 className={`font-black uppercase tracking-[0.15em] text-xl italic leading-none mb-2 ${isArchived ? 'text-slate-400' : 'text-identity-navy shadow-sky-400/10'}`}>
                            {cls.subject_code}
                        </h3>
                        <div className={`text-[11px] font-black uppercase tracking-[0.3em] italic px-3 py-1.5 rounded-xl border-2 w-fit ml-auto ${isArchived ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-identity-sky/5 text-identity-sky border-identity-sky/10'}`}>
                            Section {cls.section}
                        </div>
                    </div>
                </div>

                <h4 className={`text-lg font-black uppercase tracking-tight mb-14 line-clamp-2 leading-tight italic font-outfit relative z-10 transition-colors group-hover/card:text-identity-navy ${isArchived ? 'text-slate-400' : 'text-slate-600'}`}>
                    {cls.subject_name}
                </h4>

                <div className="flex items-center justify-between mt-auto pt-10 border-t-2 border-identity-sky/5 font-outfit relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-100 group-hover/card:bg-white transition-colors">
                            <User size={18} className="text-identity-sky/60" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic">Instructor:</span>
                            <span className="text-[11px] font-black text-identity-navy uppercase tracking-[0.15em] italic truncate max-w-[140px]">{cls.professor_id || 'Professor Pending'}</span>
                        </div>
                    </div>
                    <div className={`p-4 rounded-2.5xl transition-all shadow-xl ${isArchived ? 'bg-slate-100 text-slate-300' : 'bg-identity-navy text-white group-hover/card:bg-identity-sky group-hover/card:px-8'} border border-identity-sky/20`}>
                        <ChevronRight size={22} className="transition-transform group-hover/card:translate-x-1" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-outfit">
            {/* Active Classes Section */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-16 px-4">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-identity-navy text-white rounded-2.5xl border-2 border-identity-sky/20 shadow-2xl relative group">
                            <BookOpen size={36} className="filter drop-shadow-lg group-hover:scale-110 transition-transform" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-3">Enrolled Blocks</h2>
                            <p className="text-[11px] font-black text-identity-sky uppercase tracking-[0.4em] italic flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-identity-sky/40" />
                                ACTIVE MODULE TRACKING: {activeClasses.length} UNITS
                            </p>
                        </div>
                    </div>
                </div>

                {activeClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {activeClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} />
                        ))}
                    </div>
                ) : (
                    <div className="identity-glass p-12 rounded-[2rem] sm:rounded-[3rem] border border-identity-sky/10 shadow-xl">
                        <EmptyState
                            icon={BookOpen}
                            title="No Classes Found"
                            description="No active classes detected in your record."
                            className="py-12"
                        />
                    </div>
                )}
            </div>

            {/* Archived Classes Section */}
            {archivedClasses.length > 0 && (
                <div className="pt-20">
                    <div className="flex items-center gap-6 mb-12 opacity-60">
                        <div className="p-3 bg-slate-200 text-slate-500 rounded-2xl border border-slate-300">
                            <Archive size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-600 uppercase tracking-tighter italic">Past Classes</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Archived Classes</p>
                        </div>
                        <div className="ml-auto bg-slate-100 text-slate-400 text-[10px] font-black px-6 py-3 rounded-full border border-slate-200 shadow-inner">
                            {archivedClasses.length} Archived
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {archivedClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} isArchived={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
