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
                <RefreshCw className="w-8 h-8 text-identity-sky animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in font-outfit">
            {/* Header Section - Current Academic Settings */}
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden bg-white/40 border border-identity-sky/5">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                
                <h2 className="text-3xl font-black text-identity-navy mb-12 flex items-center gap-6 uppercase tracking-tighter relative z-10 italic">
                    <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/20">
                        <GraduationCap className="w-10 h-10 text-identity-sky" />
                    </div>
                    Academic Period Control
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                    {/* School Year */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(92,180,228,0.4)]" />
                            School Year
                        </label>
                        {isEditing ? (
                            <div className="relative group">
                                <select
                                    value={editedYear}
                                    onChange={(e) => setEditedYear(e.target.value)}
                                    className="w-full px-8 py-5 bg-white/60 border-2 border-slate-100 rounded-2xl text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-sm appearance-none cursor-pointer italic"
                                >
                                    {schoolYears.map(year => (
                                        <option key={year} value={year} className="bg-white">{year}</option>
                                    ))}
                                </select>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-identity-sky transition-colors">
                                    <Calendar size={20} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-10 py-8 bg-white/60 border border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm group transition-all hover:border-identity-sky/30 hover:shadow-xl hover:shadow-identity-sky/5">
                                <div>
                                    <span className="text-4xl font-black text-identity-navy tracking-tighter block leading-none italic">{settings?.schoolYear}</span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] mt-4 block italic opacity-60">ACADEMIC_CYCLE_PRIMARY</span>
                                </div>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-5 min-h-[52px] min-w-[52px] flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-identity-sky hover:border-identity-sky/50 rounded-2xl transition-all shadow-sm active:scale-90"
                                    title="Edit Period"
                                >
                                    <Edit2 className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] ml-4 flex items-center gap-3 italic">
                            <RefreshCw size={12} className="text-identity-sky/40" />
                            {settings?.updatedByUser ? `RATIFIED BY ${settings.updatedByUser.name.toUpperCase()}` : 'SYSTEM_DEFAULT_PROTOCOL'}
                        </p>
                    </div>

                    {/* Semester */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(92,180,228,0.4)]" />
                            Active Segment
                        </label>
                        {isEditing ? (
                            <div className="relative group">
                                <select
                                    value={editedSemester}
                                    onChange={(e) => setEditedSemester(e.target.value)}
                                    className="w-full px-8 py-5 bg-white/60 border-2 border-slate-100 rounded-2xl text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-sm appearance-none cursor-pointer italic"
                                >
                                    {semesters.map(sem => (
                                        <option key={sem} value={sem} className="bg-white">{sem}</option>
                                    ))}
                                </select>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-identity-sky transition-colors">
                                    <BookOpen size={20} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-10 py-8 bg-white/60 border border-slate-100 rounded-[2rem] flex items-center shadow-sm group transition-all hover:border-identity-sky/30 hover:shadow-xl hover:shadow-identity-sky/5">
                                <div>
                                    <span className="text-4xl font-black text-identity-navy tracking-tighter block leading-none italic">{settings?.semester}</span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] mt-4 block italic opacity-60">SESSION_TERM_ALPHA</span>
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] ml-4 flex items-center gap-3 italic">
                            <Clock size={12} className="text-identity-sky/40" />
                            {settings?.updatedAt && `LOGGED ${new Date(settings.updatedAt).toLocaleDateString()}`}
                        </p>
                    </div>

                    {/* Effective Date */}
                    <div className="space-y-6 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-identity-sky rounded-full shadow-[0_0_8px_rgba(92,180,228,0.4)]" />
                            Protocol Effective Timestamp
                        </label>
                        {isEditing ? (
                            <div className="flex flex-col gap-6">
                                <input
                                    type="datetime-local"
                                    value={editedEffectiveDate}
                                    onChange={(e) => setEditedEffectiveDate(e.target.value)}
                                    className="w-full px-10 py-6 bg-white/60 border-2 border-slate-100 rounded-3xl text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-sm italic"
                                    style={{ colorScheme: 'light' }}
                                />
                                <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 flex items-center gap-6 shadow-sm">
                                    <AlertTriangle className="text-rose-500 w-6 h-6 shrink-0" />
                                    <p className="text-[10px] text-rose-500/80 uppercase tracking-[0.15em] font-black leading-relaxed italic">
                                        Manual override will trigger automatic period transitions at the specified temporal marker across all system nodes.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full px-10 py-8 bg-white/60 border border-slate-100 rounded-[2rem] flex items-center gap-10 shadow-sm hover:border-identity-sky/30 transition-all hover:shadow-xl hover:shadow-identity-sky/5">
                                <div className="bg-identity-sky/10 p-5 rounded-2xl border border-identity-sky/20 shadow-inner">
                                    <Calendar className="w-10 h-10 text-identity-sky" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-2xl text-identity-navy font-black uppercase tracking-tighter block leading-none mb-3 italic">
                                        {settings?.effectiveDate 
                                            ? new Date(settings.effectiveDate).toLocaleString('en-PH', { 
                                                dateStyle: 'medium', 
                                                timeStyle: 'short' 
                                            })
                                            : 'SYSTEM_IMMEDIATE_EXECUTION'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] block italic opacity-60">SCHEDULED_TRANSITION_MARKER</span>
                                </div>
                                {settings?.effectiveDate && new Date(settings.effectiveDate) > new Date() && (
                                    <div className="px-8 py-3 bg-identity-sky text-white text-[10px] font-black rounded-full uppercase tracking-[0.3em] border border-identity-sky/20 shadow-xl shadow-identity-sky/20 animate-pulse">
                                        QUEUED
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex gap-6 mt-16 pt-12 border-t border-slate-100/50 relative z-10">
                        <button
                            onClick={handleSaveSettings}
                            className="flex-1 bg-identity-sky hover:bg-identity-navy text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 shadow-xl shadow-identity-sky/10 transition-all active:scale-95 italic"
                        >
                            <Check className="w-6 h-6" />
                            Commit Protocol
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-10 py-5 bg-white text-slate-400 hover:text-identity-navy font-black uppercase tracking-[0.2em] text-[10px] transition-all rounded-2xl border border-slate-100 hover:bg-slate-50 shadow-sm italic"
                        >
                            Abort Changes
                        </button>
                    </div>
                )}
                
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent opacity-50" />
            </div>

            {/* Classes Section */}
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden bg-white/40 border border-identity-sky/5">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <h3 className="text-2xl font-black text-identity-navy flex items-center gap-6 uppercase tracking-tighter italic">
                        <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/20">
                            <BookOpen className="w-8 h-8 text-identity-sky" />
                        </div>
                        Subject Registry
                        <span className="bg-identity-navy text-white px-6 py-1.5 rounded-full text-[10px] font-black ml-6 shadow-xl italic tracking-[0.1em]">
                            {filteredClasses.length} NODES
                        </span>
                    </h3>
                    <button
                        onClick={fetchClasses}
                        className="p-4 min-h-[48px] min-w-[48px] flex items-center justify-center bg-white text-slate-300 hover:text-identity-sky hover:border-identity-sky/50 rounded-2xl transition-all border border-slate-100 shadow-sm active:scale-90"
                        title="Verify Master List"
                    >
                        <RefreshCw className={`w-6 h-6 ${loadingClasses ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="mb-12 relative z-10">
                    <div className="relative group">
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="SCAN REGISTRY FOR NODES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-20 pr-10 py-6 bg-white border border-slate-100 rounded-3xl text-[11px] font-black text-identity-navy placeholder-slate-200 uppercase tracking-[0.3em] focus:outline-none focus:border-identity-sky/50 shadow-sm transition-all italic"
                        />
                    </div>
                </div>

                {/* Classes List */}
                {loadingClasses ? (
                    <div className="flex flex-col items-center justify-center py-28 relative z-10">
                        <div className="animate-spin w-12 h-12 border-[3px] border-identity-sky border-t-transparent rounded-full mb-8 shadow-sm"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Querying Class Clusters...</p>
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="text-center py-28 bg-white/40 rounded-[2rem] border border-slate-100 shadow-sm relative z-10">
                        <BookOpen className="w-20 h-20 text-slate-100 mx-auto mb-8" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Zero subject records detected for the current period.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {filteredClasses.map((cls) => (
                            <div
                                key={cls.id}
                                className="identity-glass border border-slate-100 rounded-[2rem] p-10 hover:border-identity-sky/30 transition-all shadow-sm group relative overflow-hidden bg-white/60 hover:shadow-xl hover:shadow-identity-sky/5"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-identity-sky/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4 mb-5">
                                            <span className="text-[10px] font-black text-identity-sky bg-identity-sky/10 px-4 py-1.5 rounded-xl border border-identity-sky/20 tracking-[0.15em] uppercase italic">
                                                {cls.subjectCode}
                                            </span>
                                            <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] italic">
                                                PRTL: {cls.id}
                                            </span>
                                        </div>
                                        <h4 className="text-2xl font-black text-identity-navy truncate uppercase tracking-tighter group-hover:text-identity-sky transition-colors mb-3 italic">
                                            {cls.subjectName}
                                        </h4>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4 italic">
                                            <Users size={14} className="text-identity-sky/50" />
                                            {cls.section} · <span className="text-identity-navy font-extrabold">{cls.professorName}</span>
                                        </p>
                                        <div className="mt-8 flex items-center gap-6">
                                            <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.15em] border border-slate-100 px-4 py-2 rounded-xl bg-white shadow-sm">
                                                <Calendar size={12} className="text-identity-sky/40" />
                                                LOGGED: {new Date(cls.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-identity-sky bg-white px-8 py-6 rounded-3xl border border-slate-100 shadow-sm group-hover:scale-105 transition-transform">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Nodes</span>
                                        <span className="text-4xl font-black tracking-tighter leading-none italic">{cls.studentCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Semester History */}
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden bg-white/40 border border-identity-sky/5">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <h3 className="text-2xl font-black text-identity-navy flex items-center gap-6 uppercase tracking-tighter italic">
                        <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/20">
                            <History className="w-8 h-8 text-identity-sky" />
                        </div>
                        Archival Sequential Timeline
                    </h3>
                    <button
                        onClick={fetchHistory}
                        className="p-4 min-h-[48px] min-w-[48px] flex items-center justify-center bg-white text-slate-300 hover:text-identity-sky hover:border-identity-sky/50 rounded-2xl transition-all border border-slate-100 shadow-sm active:scale-90"
                        title="Access Archive"
                    >
                        <RefreshCw className={`w-6 h-6 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-28 relative z-10">
                        <div className="animate-spin w-12 h-12 border-[3px] border-identity-sky border-t-transparent rounded-full mb-8 shadow-sm"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Accessing Timeline Logs...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                        {history.map((sem) => (
                            <div
                                key={sem.id}
                                className={`p-10 rounded-[2.5rem] border transition-all shadow-sm group relative overflow-hidden flex flex-col justify-between min-h-[300px] ${sem.isCurrent
                                    ? 'bg-white border-identity-sky/40 shadow-xl shadow-identity-sky/10 ring-2 ring-identity-sky/5'
                                    : 'bg-white/60 border-slate-100 hover:border-identity-sky/30 hover:bg-white hover:shadow-lg'
                                    }`}
                            >
                                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-identity-sky/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-2xl font-black text-identity-navy uppercase tracking-tighter group-hover:text-identity-sky transition-colors italic">
                                            {sem.schoolYear}
                                        </h4>
                                        {sem.isCurrent && (
                                            <div className="flex items-center gap-3 px-4 py-1.5 bg-identity-sky text-white text-[9px] font-black rounded-xl border border-identity-sky/20 uppercase tracking-[0.15em] animate-pulse shadow-lg shadow-identity-sky/20">
                                                ACTIVE_PRTL
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">
                                        {sem.semester.toUpperCase()}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-3 px-4 py-2 bg-white/80 text-[10px] font-black text-identity-sky rounded-2xl border border-slate-100 shadow-sm tracking-[0.15em] italic">
                                            <BookOpen size={14} />
                                            {sem.classCount} NODES
                                        </div>
                                        {sem.effectiveDate && (
                                            <div className="flex items-center gap-3 px-4 py-2 bg-white/80 text-[9px] font-black text-slate-400 rounded-2xl border border-slate-100 uppercase tracking-[0.15em] italic">
                                                <Calendar size={12} className="text-identity-sky/50" />
                                                {new Date(sem.effectiveDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-slate-100/50 flex flex-col gap-2 relative z-10">
                                    <span className="text-[9px] font-black text-slate-200 uppercase tracking-[0.5em] italic mb-1">TX_LOG_RATIFIED</span>
                                    <span className="text-xs font-black text-slate-400 font-mono tracking-[0.15em]">
                                        {new Date(sem.createdAt).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent opacity-50" />
            </div>
        </div>
    );

}
