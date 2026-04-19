'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { API_URL, getToken } from '@/utils/auth';
import { GraduationCap, Calendar, BookOpen, Users, RefreshCw, Edit2, Check, X, History, Clock, AlertTriangle, Search } from 'lucide-react';

interface AcademicSettings {
    id: number;
    schoolYear: string;
    semester: string;
    isCurrent: boolean;
    startDate: string | null;
    endDate: string | null;
    updatedByUser?: {
        id: number;
        name: string;
    };
    updatedAt: string;
    effectiveDate: string | null;
}

interface ClassInfo {
    id: number;
    subjectCode: string;
    subjectName: string;
    section: string;
    schoolYear: string;
    semester: string;
    professorName: string;
    createdAt: string;
    studentCount: number;
}

interface SemesterHistory {
    id: number;
    schoolYear: string;
    semester: string;
    isCurrent: boolean;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    classCount: number;
    effectiveDate: string | null;
}

export default function AcademicSettingsTab() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<AcademicSettings | null>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [history, setHistory] = useState<SemesterHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedYear, setEditedYear] = useState('');
    const [editedSemester, setEditedSemester] = useState('');
    const [editedEffectiveDate, setEditedEffectiveDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Generate school year options (current year ± 5 years)
    const generateSchoolYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -5; i <= 5; i++) {
            const startYear = currentYear + i;
            years.push(`${startYear}-${startYear + 1}`);
        }
        return years;
    };

    const schoolYears = generateSchoolYears();
    const semesters = ['1st Semester', '2nd Semester', 'Summer'];

    useEffect(() => {
        fetchSettings();
        fetchClasses();
        fetchHistory();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            const response = await axios.get(`${API_URL}/api/admin/academic-settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSettings(response.data);
            setEditedYear(response.data.schoolYear);
            setEditedSemester(response.data.semester);
            // Format for datetime-local input (YYYY-MM-DDTHH:mm)
            if (response.data.effectiveDate) {
                setEditedEffectiveDate(new Date(response.data.effectiveDate).toISOString().slice(0, 16));
            } else {
                setEditedEffectiveDate(new Date().toISOString().slice(0, 16));
            }
        } catch (error: any) {
            console.error('Error fetching settings:', error);
            showToast(error.response?.data?.message || 'Failed to fetch academic settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            const response = await axios.get(`${API_URL}/api/admin/classes/current`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setClasses(response.data);
        } catch (error: any) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoadingClasses(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            const response = await axios.get(`${API_URL}/api/admin/semesters/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setHistory(response.data);
        } catch (error: any) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            const token = getToken();
            const axios = (await import('axios')).default;

            await axios.patch(
                `${API_URL}/api/admin/academic-settings`,
                {
                    schoolYear: editedYear,
                    semester: editedSemester,
                    effectiveDate: editedEffectiveDate
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast('Academic settings updated successfully!', 'success');
            setIsEditing(false);
            fetchSettings();
            fetchClasses();
            fetchHistory();
        } catch (error: any) {
            console.error('Error updating settings:', error);
            showToast(error.response?.data?.message || 'Failed to update settings', 'error');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (settings) {
            setEditedYear(settings.schoolYear);
            setEditedSemester(settings.semester);
            if (settings.effectiveDate) {
                setEditedEffectiveDate(new Date(settings.effectiveDate).toISOString().slice(0, 16));
            }
        }
    };

    const filteredClasses = classes.filter(c =>
        c.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.professorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-brand-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section - Current Academic Settings */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-3xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-gold/10 to-transparent pointer-events-none opacity-30" />
                
                <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4 uppercase tracking-tighter relative z-10">
                    <div className="bg-brand-gold/20 p-2 rounded-xl">
                        <GraduationCap className="w-8 h-8 text-brand-gold" />
                    </div>
                    Academic Period Control
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    {/* School Year */}
                    <div className="space-y-4">
                        <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                            Operational Period
                        </label>
                        {isEditing ? (
                            <div className="relative group">
                                <select
                                    value={editedYear}
                                    onChange={(e) => setEditedYear(e.target.value)}
                                    className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-brand-gold font-black uppercase tracking-widest focus:outline-none focus:border-brand-gold transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    {schoolYears.map(year => (
                                        <option key={year} value={year} className="bg-maroon-950">{year}</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-brand-gold/40 group-hover:text-brand-gold transition-colors">
                                    <Calendar size={18} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-8 py-6 bg-black/60 border border-white/5 rounded-3xl flex items-center justify-between shadow-inner group transition-all hover:border-white/10">
                                <div>
                                    <span className="text-3xl font-black text-brand-gold tracking-tighter block leading-none">{settings?.schoolYear}</span>
                                    <span className="text-[8px] text-secondary/40 font-black uppercase tracking-[0.4em] mt-3 block italic">ACADEMIC_CYCLE_PRIMARY</span>
                                </div>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-4 bg-white/5 text-secondary/40 hover:text-brand-gold hover:bg-black rounded-2xl transition-all shadow-2xl active:scale-95 border border-white/5 hover:border-brand-gold/50"
                                    title="Edit Protocol"
                                >
                                    <Edit2 className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                        <p className="text-[9px] text-secondary/20 font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <RefreshCw size={10} className="text-brand-gold/30" />
                            {settings?.updatedByUser ? `RATIFIED BY ${settings.updatedByUser.name.toUpperCase()}` : 'SYSTEM_DEFAULT'}
                        </p>
                    </div>

                    {/* Semester */}
                    <div className="space-y-4">
                        <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                            Active Segment
                        </label>
                        {isEditing ? (
                            <div className="relative group">
                                <select
                                    value={editedSemester}
                                    onChange={(e) => setEditedSemester(e.target.value)}
                                    className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-brand-gold font-black uppercase tracking-widest focus:outline-none focus:border-brand-gold transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    {semesters.map(sem => (
                                        <option key={sem} value={sem} className="bg-maroon-950">{sem}</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-brand-gold/40 group-hover:text-brand-gold transition-colors">
                                    <BookOpen size={18} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-8 py-6 bg-black/60 border border-white/5 rounded-3xl flex items-center shadow-inner hover:border-white/10 transition-all">
                                <div>
                                    <span className="text-3xl font-black text-brand-gold tracking-tighter block leading-none">{settings?.semester}</span>
                                    <span className="text-[8px] text-secondary/40 font-black uppercase tracking-[0.4em] mt-3 block italic">SESSION_TERM_ALPHA</span>
                                </div>
                            </div>
                        )}
                        <p className="text-[9px] text-secondary/20 font-black uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <Clock size={10} className="text-brand-gold/30" />
                            {settings?.updatedAt && `LOGGED ${new Date(settings.updatedAt).toLocaleDateString()}`}
                        </p>
                    </div>

                    {/* Effective Date */}
                    <div className="space-y-4 md:col-span-2">
                        <label className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                            Transition Protocol (Effective Timestamp)
                        </label>
                        {isEditing ? (
                            <div className="flex flex-col gap-4">
                                <input
                                    type="datetime-local"
                                    value={editedEffectiveDate}
                                    onChange={(e) => setEditedEffectiveDate(e.target.value)}
                                    className="w-full px-8 py-5 bg-black/60 border border-white/10 rounded-2xl text-brand-gold font-black uppercase tracking-widest focus:outline-none focus:border-brand-gold transition-all shadow-inner"
                                    style={{ colorScheme: 'dark' }}
                                />
                                <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 flex items-center gap-4">
                                    <AlertTriangle className="text-rose-500 w-5 h-5 shrink-0" />
                                    <p className="text-[9px] text-rose-500/60 uppercase tracking-widest font-black leading-relaxed italic">
                                        Manual override will trigger automatic period transitions at the specified temporal marker.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-8 py-6 bg-black/60 border border-white/5 rounded-3xl flex items-center gap-8 shadow-inner hover:border-white/10 transition-all">
                                <div className="bg-brand-gold/20 p-4 rounded-2xl border border-brand-gold/20">
                                    <Calendar className="w-8 h-8 text-brand-gold" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-xl text-white font-black uppercase tracking-tighter block leading-none mb-2">
                                        {settings?.effectiveDate 
                                            ? new Date(settings.effectiveDate).toLocaleString('en-PH', { 
                                                dateStyle: 'medium', 
                                                timeStyle: 'short' 
                                            })
                                            : 'SYSTEM_IMMEDIATE_EXECUTION'}
                                    </span>
                                    <span className="text-[8px] text-secondary/30 font-black uppercase tracking-[0.4em] block italic">PROTOCOL_EFFECTIVE_TIMESTAMP</span>
                                </div>
                                {settings?.effectiveDate && new Date(settings.effectiveDate) > new Date() && (
                                    <div className="px-6 py-2 bg-brand-gold/10 text-brand-gold text-[9px] font-black rounded-full uppercase tracking-[0.3em] border border-brand-gold/20 shadow-2xl animate-pulse">
                                        QUEUED
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex gap-6 mt-12 pt-10 border-t border-white/10 relative z-10">
                        <button
                            onClick={handleSaveSettings}
                            className="flex-1 bg-brand-gold hover:bg-black hover:text-brand-gold text-black px-10 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-2xl shadow-brand-gold/10 transition-all active:scale-95 border border-brand-gold"
                        >
                            <Check className="w-5 h-5" />
                            Ratify Protocol
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-10 py-5 bg-black/40 text-secondary/40 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] transition-all rounded-3xl border border-white/10 hover:bg-black shadow-inner"
                        >
                            Abort Changes
                        </button>
                    </div>
                )}
                
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
            </div>

            {/* Classes Section */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none opacity-20" />
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                        <div className="bg-brand-gold/10 p-2 rounded-lg">
                            <BookOpen className="w-6 h-6 text-brand-gold" />
                        </div>
                        Subject Registry
                        <span className="bg-brand-gold text-black px-4 py-1 rounded-full text-[10px] font-black ml-4 shadow-2xl">
                            {filteredClasses.length}
                        </span>
                    </h3>
                    <button
                        onClick={fetchClasses}
                        className="p-3 bg-white/5 text-secondary/40 hover:text-brand-gold hover:bg-black rounded-2xl transition-all border border-white/5 active:scale-95"
                        title="Sync Registry"
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingClasses ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="mb-10 relative z-10">
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/20 group-focus-within:text-brand-gold transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="QUERY SUBJECT MATRIX..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-5 bg-black/60 border border-white/10 rounded-2xl text-[11px] font-black text-white placeholder-secondary/10 uppercase tracking-[0.3em] focus:outline-none focus:border-brand-gold shadow-inner transition-all"
                        />
                    </div>
                </div>

                {/* Classes List */}
                {loadingClasses ? (
                    <div className="flex flex-col items-center justify-center py-24 relative z-10">
                        <div className="animate-spin w-10 h-10 border-[3px] border-brand-gold border-t-transparent rounded-full mb-6"></div>
                        <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.3em]">Querying Class Nodes...</p>
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="text-center py-24 bg-black/40 rounded-3xl border border-white/5 shadow-inner relative z-10">
                        <BookOpen className="w-16 h-16 text-secondary/5 mx-auto mb-6" />
                        <p className="text-[10px] font-black text-secondary/20 uppercase tracking-[0.3em] italic">Zero subject records detected for the selected period.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                        {filteredClasses.map((cls) => (
                            <div
                                key={cls.id}
                                className="bg-black/40 border border-white/5 rounded-3xl p-8 hover:border-brand-gold/30 transition-all shadow-inner group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-[9px] font-black text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-lg border border-brand-gold/20 tracking-widest uppercase">
                                                {cls.subjectCode}
                                            </span>
                                            <span className="text-[8px] text-secondary/30 font-black uppercase tracking-[0.2em] italic">
                                                ID: {cls.id}
                                            </span>
                                        </div>
                                        <h4 className="text-xl font-black text-white truncate uppercase tracking-tighter group-hover:text-brand-gold transition-colors mb-2">
                                            {cls.subjectName}
                                        </h4>
                                        <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Users size={12} className="text-brand-gold/40" />
                                            {cls.section} · <span className="text-white">{cls.professorName}</span>
                                        </p>
                                        <div className="mt-6 flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-[8px] font-black text-secondary/20 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-lg bg-black/20">
                                                <Calendar size={10} />
                                                LOGGED: {new Date(cls.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 text-brand-gold bg-black/60 px-5 py-4 rounded-2xl border border-white/5 shadow-2xl group-hover:scale-105 transition-transform">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-secondary/40">Nodes</span>
                                        <span className="text-2xl font-black tracking-tighter leading-none">{cls.studentCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Semester History */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/5 via-transparent to-transparent pointer-events-none opacity-20" />
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                        <div className="bg-brand-gold/10 p-2 rounded-lg">
                            <History className="w-6 h-6 text-brand-gold" />
                        </div>
                        Archival Timeline
                    </h3>
                    <button
                        onClick={fetchHistory}
                        className="p-3 bg-white/5 text-secondary/40 hover:text-brand-gold hover:bg-black rounded-2xl transition-all border border-white/5 active:scale-95"
                        title="Access Archive"
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-24 relative z-10">
                        <div className="animate-spin w-10 h-10 border-[3px] border-brand-gold border-t-transparent rounded-full mb-6"></div>
                        <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.3em]">Accessing History Matrix...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {history.map((sem) => (
                            <div
                                key={sem.id}
                                className={`p-8 rounded-[32px] border transition-all shadow-inner group relative overflow-hidden ${sem.isCurrent
                                    ? 'bg-brand-gold/5 border-brand-gold/40 shadow-brand-gold/5 ring-1 ring-brand-gold/10'
                                    : 'bg-black/40 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-brand-gold transition-colors">
                                                {sem.schoolYear}
                                            </h4>
                                            {sem.isCurrent && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                                                    ACTIVE_TX
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.3em] mb-6 italic">
                                            {sem.semester.toUpperCase()}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 text-[9px] font-black text-brand-gold rounded-xl border border-brand-gold/10 shadow-inner tracking-widest">
                                                <BookOpen size={12} />
                                                {sem.classCount} SUBJECTS
                                            </div>
                                            {sem.effectiveDate && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 text-[8px] font-black text-secondary/40 rounded-xl border border-white/5 uppercase tracking-[0.2em]">
                                                    <Calendar size={10} className="text-brand-gold/50" />
                                                    {new Date(sem.effectiveDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-white/5 flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-secondary/10 uppercase tracking-[0.4em] italic mb-1">DATA_LOG_RATIFIED</span>
                                        <span className="text-[10px] font-black text-white/40 font-mono tracking-widest">
                                            {new Date(sem.createdAt).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
            </div>
        </div>
    );
}
