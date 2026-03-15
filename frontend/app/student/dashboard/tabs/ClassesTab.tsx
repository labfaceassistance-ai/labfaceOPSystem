
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
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    const activeClasses = classes.filter(c => !c.is_archived);
    const archivedClasses = classes.filter(c => c.is_archived === 1);

    const ClassCard = ({ cls, isArchived }: { cls: ClassItem; isArchived?: boolean }) => (
        <div
            onClick={() => router.push(`/student/classes/${cls.id}`)}
            className={`
                group relative overflow-hidden rounded-xl border p-5 transition-all cursor-pointer
                ${isArchived
                    ? 'bg-slate-900/30 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                    : 'bg-slate-900/50 border-slate-800 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10'
                }
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                        ${isArchived
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-brand-500/10 text-brand-400'
                        }
                    `}>
                        {cls.subject_code.substring(0, 2)}
                    </div>
                    <div>
                        <h3 className={`font-bold ${isArchived ? 'text-slate-300' : 'text-white'}`}>
                            {cls.subject_code}
                        </h3>
                        <p className="text-xs text-slate-500">{cls.section}</p>
                    </div>
                </div>
                {isArchived && (
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        Archived
                    </span>
                )}
            </div>

            <h4 className={`text-sm font-medium mb-4 line-clamp-2 ${isArchived ? 'text-slate-400' : 'text-slate-200'}`}>
                {cls.subject_name}
            </h4>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                    <User size={14} />
                    <span>{cls.professor_id || 'Unknown Prof'}</span>
                </div>
                <ChevronRight size={16} className={`transition-transform group-hover:translate-x-1 ${isArchived ? 'text-slate-600' : 'text-brand-500'}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Active Classes Section */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <BookOpen className="text-brand-400" size={24} />
                    <h2 className="text-2xl font-bold text-white">Active Classes</h2>
                    <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full">{activeClasses.length}</span>
                </div>

                {activeClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed p-8 text-center text-slate-500">
                        <p>No active classes found.</p>
                    </div>
                )}
            </div>

            {/* Archived Classes Section */}
            {archivedClasses.length > 0 && (
                <div className="pt-8 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 mb-6 opacity-75">
                        <Archive className="text-slate-400" size={24} />
                        <h2 className="text-xl font-bold text-slate-300">Archived Classes</h2>
                        <span className="bg-slate-800 text-slate-500 text-xs px-2 py-1 rounded-full">{archivedClasses.length}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {archivedClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} isArchived={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
