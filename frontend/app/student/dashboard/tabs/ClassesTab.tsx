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
        return (
            <div
                onClick={() => router.push(`/student/classes/${cls.id}`)}
                className={`
                    identity-glass group relative overflow-hidden rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 transition-all cursor-pointer shadow-xl hover:shadow-2xl active:scale-[0.98]
                    ${isArchived
                        ? 'opacity-60 saturate-50 hover:opacity-100 hover:saturate-100 border-slate-200/50'
                        : 'border-identity-sky/10 hover:border-identity-sky/30'
                    }
                `}
            >
                <div className="flex justify-between items-start mb-10">
                    <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl transition-all duration-500 border italic font-outfit
                        ${isArchived
                            ? 'bg-slate-200 border-slate-300 text-slate-500'
                            : 'bg-identity-sky text-white border-identity-sky/10 group-hover:scale-110 shadow-identity-sky/20'
                        }
                    `}>
                        {cls.subject_code.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-right font-outfit">
                        <h3 className={`font-black uppercase tracking-tight text-lg italic ${isArchived ? 'text-slate-400' : 'text-identity-navy'}`}>
                            {cls.subject_code}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{cls.section}</p>
                    </div>
                </div>

                <h4 className={`text-base font-black uppercase tracking-tight mb-12 line-clamp-2 leading-tight italic font-outfit ${isArchived ? 'text-slate-400' : 'text-slate-700'}`}>
                    {cls.subject_name}
                </h4>

                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-auto pt-6 border-t border-identity-sky/5 font-outfit">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <User size={14} className="opacity-60" />
                        </div>
                        <span className="truncate max-w-[120px]">{cls.professor_id || 'Professor Pending'}</span>
                    </div>
                    <div className={`p-2 rounded-2xl transition-all ${isArchived ? 'bg-slate-100 text-slate-300' : 'bg-identity-sky/10 text-identity-sky group-hover:px-4'}`}>
                        <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-outfit">
            {/* Active Classes Section */}
            <div>
                <div className="flex items-center gap-6 mb-12">
                    <div className="p-3 bg-identity-sky/10 text-identity-navy rounded-2xl border border-identity-sky/10">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Active Nodes</h2>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-2">Registry Environment: Academic Ops</p>
                    </div>
                    <div className="ml-auto bg-white/40 text-identity-sky text-[10px] font-black px-6 py-3 rounded-full border border-identity-sky/10 shadow-sm backdrop-blur-sm">
                        {activeClasses.length} Active Modules
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
                            title="No Active Modules"
                            description="Your academic registry is currently clear. Active class modules will manifest here upon synchronization."
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
                            <h2 className="text-2xl font-black text-slate-600 uppercase tracking-tighter italic">Historical Archives</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">End-of-Life Cryptographic Logs</p>
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
