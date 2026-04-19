"use client";
import { useEffect, useState } from 'react';
import { BookOpen, Archive, Calendar, User, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    professor_id: string; // This is actually the name from the SQL concat
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

                // Fetch ALL classes (including archived)
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
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mb-4"></div>
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.4em]">Querying Node Records...</p>
            </div>
        );
    }

    const activeClasses = classes.filter(c => !c.is_archived);
    const archivedClasses = classes.filter(c => c.is_archived === 1);

    const ClassCard = ({ cls, isArchived }: { cls: ClassItem; isArchived?: boolean }) => {
        return (
            <div
                onClick={() => router.push(`/student/classes/${cls.id}`)}
                className={`
                    group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all cursor-pointer shadow-sm hover:shadow-2xl
                    ${isArchived
                        ? 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                        : 'bg-white border-slate-100 hover:border-identity-sky/30'
                    }
                `}
            >
                <div className="flex justify-between items-start mb-6">
                    <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-colors duration-500
                        ${isArchived
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-identity-sky/5 text-identity-sky group-hover:bg-identity-navy group-hover:text-white'
                        }
                    `}>
                        {cls.subject_code.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-right">
                        <h3 className={`font-black uppercase tracking-tighter text-lg ${isArchived ? 'text-slate-400' : 'text-identity-navy'}`}>
                            {cls.subject_code}
                        </h3>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{cls.section}</p>
                    </div>
                </div>

                {isArchived && (
                    <span className="inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase bg-slate-200 text-slate-500 mb-4 tracking-widest border border-slate-300">
                        Node Archived
                    </span>
                )}

                <h4 className={`text-sm font-black uppercase tracking-tight mb-8 line-clamp-2 leading-relaxed ${isArchived ? 'text-slate-400' : 'text-slate-700'}`}>
                    {cls.subject_name}
                </h4>

                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mt-auto pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                        <User size={14} className="opacity-40" />
                        <span>{cls.professor_id || 'Professor Assigned'}</span>
                    </div>
                    <ChevronRight size={18} className={`transition-transform group-hover:translate-x-2 ${isArchived ? 'text-slate-200' : 'text-identity-sky'}`} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Active Classes Section */}
            <div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-identity-sky text-white rounded-2xl shadow-lg shadow-identity-sky/20">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-identity-navy uppercase tracking-tighter font-outfit">Active Node Sessions</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.3em] mt-1">Operational Environment: Lab 1</p>
                    </div>
                    <span className="ml-auto bg-slate-50 text-slate-400 text-[10px] font-black px-4 py-2 rounded-xl border border-slate-100">{activeClasses.length} Total</span>
                </div>

                {activeClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-[3rem] border-2 border-slate-100 border-dashed p-16 text-center">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-6">
                            <BookOpen size={32} />
                        </div>
                        <p className="font-black text-[10px] text-slate-300 uppercase tracking-[0.4em]">No active sessions found.</p>
                    </div>
                )}
            </div>

            {/* Archived Classes Section */}
            {archivedClasses.length > 0 && (
                <div className="pt-12 border-t border-slate-100">
                    <div className="flex items-center gap-4 mb-8 opacity-60">
                        <div className="p-3 bg-slate-200 text-slate-500 rounded-2xl">
                            <Archive size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-500 uppercase tracking-tighter font-outfit">Archived Matrix Entries</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Historical Synchronizations</p>
                        </div>
                        <span className="ml-auto bg-slate-50 text-slate-300 text-[10px] font-black px-4 py-2 rounded-xl border border-slate-100">{archivedClasses.length} Historical</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {archivedClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} isArchived={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
