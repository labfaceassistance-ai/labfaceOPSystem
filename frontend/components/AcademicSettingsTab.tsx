'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { API_URL, getToken } from '@/utils/auth';
import { GraduationCap, Calendar, BookOpen, Users, RefreshCw, Edit2, Check, History, Clock, AlertTriangle, Search } from 'lucide-react';

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
            <div className="flex flex-col items-center justify-center h-64 gap-6">
                <RefreshCw className="w-12 h-12 text-identity-sky animate-spin" />
                <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] animate-pulse italic">Initalizing_Academic_Registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in font-outfit select-none pb-20">
            {/* Header Section - Current Academic Settings */}
            <div className="identity-glass rounded-[3.5rem] p-10 md:p-12 shadow-3xl relative overflow-hidden border-2 border-white/40">
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-identity-sky/10 to-transparent pointer-events-none opacity-50" />
                
                {/* Corner Accents */}
                <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-identity-sky/30 pointer-events-none" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-identity-sky/30 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="bg-identity-sky/20 p-5 rounded-[2rem] border-2 border-identity-sky/30 shadow-inner">
                            <GraduationCap className="w-10 h-10 text-identity-sky" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                                Academic Period
                            </h2>
                            <p className="text-[10px] text-identity-sky font-black uppercase tracking-[0.4em] mt-3 italic opacity-70">Regulatory_Session_Configuration</p>
                        </div>
                    </div>

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-identity-navy text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-4 shadow-2xl shadow-identity-navy/20 hover:bg-identity-sky hover:scale-105 transition-all active:scale-95 italic border border-white/20"
                        >
                            <Edit2 size={16} />
                            Modify_Period
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                    {/* School Year Node */}
                    <div className="space-y-6 group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6 flex items-center gap-4 italic">
                            <div className="w-3 h-3 bg-identity-sky rounded-full shadow-[0_0_12px_rgba(92,180,228,0.6)]" />
                            Academic_Year_Tag
                        </label>
                        {isEditing ? (
                            <div className="relative">
                                <select
                                    value={editedYear}
                                    onChange={(e) => setEditedYear(e.target.value)}
                                    className="w-full px-10 py-6 bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2rem] text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-xl appearance-none cursor-pointer italic"
                                >
                                    {schoolYears.map(year => (
                                        <option key={year} value={year} className="bg-white">{year}</option>
                                    ))}
                                </select>
                                <Calendar className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-identity-sky opacity-40" size={20} />
                            </div>
                        ) : (
                            <div className="w-full px-10 py-10 bg-white/20 backdrop-blur-xl border-2 border-white/40 rounded-[2.5rem] flex flex-col shadow-inner group-hover:border-identity-sky/40 transition-all">
                                <span className="text-5xl font-black text-identity-navy tracking-tighter leading-none italic">{settings?.schoolYear}</span>
                                <span className="text-[9px] text-identity-sky/60 font-black uppercase tracking-[0.5em] mt-6 italic">Registry_Index</span>
                            </div>
                        )}
                    </div>

                    {/* Semester Node */}
                    <div className="space-y-6 group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6 flex items-center gap-4 italic">
                            <div className="w-3 h-3 bg-identity-sky rounded-full shadow-[0_0_12px_rgba(92,180,228,0.6)]" />
                            Temporal_Term
                        </label>
                        {isEditing ? (
                            <div className="relative">
                                <select
                                    value={editedSemester}
                                    onChange={(e) => setEditedSemester(e.target.value)}
                                    className="w-full px-10 py-6 bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2rem] text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-xl appearance-none cursor-pointer italic"
                                >
                                    {semesters.map(sem => (
                                        <option key={sem} value={sem} className="bg-white">{sem}</option>
                                    ))}
                                </select>
                                <BookOpen className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-identity-sky opacity-40" size={20} />
                            </div>
                        ) : (
                            <div className="w-full px-10 py-10 bg-white/20 backdrop-blur-xl border-2 border-white/40 rounded-[2.5rem] flex flex-col shadow-inner group-hover:border-identity-sky/40 transition-all">
                                <span className="text-4xl font-black text-identity-navy tracking-tighter leading-none italic uppercase">{settings?.semester}</span>
                                <span className="text-[9px] text-identity-sky/60 font-black uppercase tracking-[0.5em] mt-6 italic">Phase_Identifier</span>
                            </div>
                        )}
                    </div>

                    {/* Effective Date Node */}
                    <div className="space-y-6 md:col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6 flex items-center gap-4 italic">
                            <div className="w-3 h-3 bg-identity-sky rounded-full shadow-[0_0_12px_rgba(92,180,228,0.6)]" />
                            Deployment_Trigger
                        </label>
                        {isEditing ? (
                            <div className="space-y-6">
                                <input
                                    type="datetime-local"
                                    value={editedEffectiveDate}
                                    onChange={(e) => setEditedEffectiveDate(e.target.value)}
                                    className="w-full px-10 py-6 bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2rem] text-identity-navy font-black uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky transition-all shadow-xl italic"
                                    style={{ colorScheme: 'light' }}
                                />
                                <div className="bg-rose-500/10 p-6 rounded-2xl border-2 border-rose-500/20 flex items-center gap-6 shadow-lg shadow-rose-900/5">
                                    <AlertTriangle className="text-rose-500 w-8 h-8 shrink-0" />
                                    <p className="text-[9px] text-rose-500/80 uppercase tracking-[0.2em] font-black leading-relaxed italic">
                                        Warning: This modification will redirect all authentication protocols to the target period.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full px-10 py-8 bg-white/20 backdrop-blur-xl border-2 border-white/40 rounded-[2.5rem] flex items-center gap-8 shadow-inner group-hover:border-identity-sky/40 transition-all">
                                <div className="bg-identity-sky/10 p-5 rounded-2xl border border-identity-sky/20">
                                    <Clock className="w-8 h-8 text-identity-sky" />
                                </div>
                                <div>
                                    <span className="text-xl text-identity-navy font-black uppercase tracking-tighter block leading-none mb-3 italic">
                                        {settings?.effectiveDate 
                                            ? new Date(settings.effectiveDate).toLocaleString('en-PH', { 
                                                dateStyle: 'medium', 
                                                timeStyle: 'short' 
                                            }).toUpperCase()
                                            : 'IMMEDIATE_SYNC'}
                                    </span>
                                    <span className="text-[9px] text-identity-sky/60 font-black uppercase tracking-[0.5em] block italic">Activation_Window</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex gap-6 mt-16 pt-12 border-t-2 border-white/20 relative z-10 animate-in slide-in-from-bottom-5 duration-500">
                        <button
                            onClick={handleSaveSettings}
                            className="flex-1 bg-identity-sky text-white px-12 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-6 shadow-2xl shadow-identity-sky/20 hover:bg-identity-navy transition-all active:scale-95 italic min-h-[72px]"
                        >
                            <Check className="w-6 h-6" />
                            Authorize_Settings_Update
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-12 py-6 bg-white/10 text-slate-400 hover:text-identity-navy font-black uppercase tracking-[0.3em] text-[11px] transition-all rounded-2xl border-2 border-white/40 hover:bg-white/20 shadow-xl active:scale-95 italic min-h-[72px]"
                        >
                            Abort_Operation
                        </button>
                    </div>
                )}
            </div>

            {/* Classes Section */}
            <div className="identity-glass rounded-[3.5rem] p-10 md:p-12 shadow-3xl relative overflow-hidden border-2 border-white/40">
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="bg-identity-navy/5 p-5 rounded-[2rem] border-2 border-identity-navy/10">
                            <BookOpen className="w-10 h-10 text-identity-navy" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                                Registry Logs
                            </h3>
                            <div className="flex items-center gap-4 mt-3">
                                <span className="bg-identity-navy text-white px-5 py-1.5 rounded-full text-[9px] font-black italic tracking-[0.2em] shadow-lg">
                                    {filteredClasses.length}_RECORDS_IDENTIFIED
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-identity-sky opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
                            <input
                                type="text"
                                placeholder="FILTER_RECORDS..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-20 pr-10 py-5 bg-white/40 border-2 border-white/60 rounded-2xl text-[11px] font-black text-identity-navy placeholder-slate-300 uppercase tracking-[0.3em] focus:outline-none focus:border-identity-sky transition-all italic shadow-xl"
                            />
                        </div>
                        <button
                            onClick={fetchClasses}
                            className="bg-white/40 text-identity-navy p-5 rounded-2xl transition-all border-2 border-white/60 shadow-xl hover:bg-identity-sky hover:text-white active:scale-90 group"
                        >
                            <RefreshCw className={`w-6 h-6 transition-transform group-hover:rotate-180 ${loadingClasses ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Classes Scrollable List */}
                <div className="max-h-[800px] overflow-y-auto pr-4 custom-scrollbar relative z-10 scroll-smooth">
                    {loadingClasses ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8">
                            <div className="w-16 h-16 border-4 border-identity-sky border-t-transparent rounded-full animate-spin shadow-xl" />
                            <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] italic animate-pulse">Syncing_Records...</p>
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="text-center py-40 bg-[#041C3C]/5 rounded-[3rem] border-2 border-dashed border-white/40 shadow-inner">
                            <BookOpen className="w-24 h-24 text-slate-100 mx-auto mb-10 opacity-50" />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic">No_Terminal_Logs_Found_In_This_Sector</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            {filteredClasses.map((cls) => (
                                <div
                                    key={cls.id}
                                    className="identity-glass border-2 border-white/40 rounded-[2.5rem] p-10 hover:border-identity-sky/40 transition-all shadow-xl group relative overflow-hidden bg-white/10 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-identity-sky/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-6 mb-6">
                                                <span className="text-[10px] font-black text-identity-sky bg-identity-sky/10 px-5 py-2 rounded-xl border border-identity-sky/20 tracking-[0.2em] uppercase italic">
                                                    {cls.subjectCode}
                                                </span>
                                                <span className="text-[10px] text-slate-300 font-mono font-bold tracking-[0.2em] italic">
                                                    NODE_ID: {cls.id.toString().padStart(4, '0')}
                                                </span>
                                            </div>
                                            <h4 className="text-3xl font-black text-identity-navy truncate uppercase tracking-tighter group-hover:text-identity-sky transition-colors mb-4 italic leading-tight">
                                                {cls.subjectName}
                                            </h4>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-6 italic">
                                                <Users size={16} className="text-identity-sky/60" />
                                                SECTOR {cls.section} · <span className="text-identity-navy font-black italic">{cls.professorName}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-10">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] mb-2 italic">Creation_Stamp</span>
                                                <span className="text-xs font-black text-identity-navy uppercase tracking-[0.1em] italic">{new Date(cls.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-3 text-identity-sky bg-[#041C3C]/95 px-10 py-8 rounded-[2rem] border-2 border-white/20 shadow-2xl transition-all group-hover:scale-105 group-hover:shadow-identity-sky/20">
                                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 italic">Entities</span>
                                                <span className="text-5xl font-black tracking-tighter leading-none italic text-white">{cls.studentCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Semester History */}
            <div className="identity-glass rounded-[3.5rem] p-10 md:p-12 shadow-3xl relative overflow-hidden border-2 border-white/40">
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-identity-sky/5 to-transparent pointer-events-none opacity-30" />
                
                <div className="flex items-center justify-between mb-16 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="bg-identity-sky/10 p-5 rounded-[2rem] border-2 border-identity-sky/20">
                            <History className="w-10 h-10 text-identity-sky" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                                Historical Logs
                            </h3>
                            <p className="text-[10px] text-identity-sky font-black uppercase tracking-[0.4em] mt-3 italic opacity-60">Archive_State_Telemetry</p>
                        </div>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-8">
                        <div className="w-16 h-16 border-4 border-identity-sky border-t-transparent rounded-full animate-spin shadow-xl" />
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] italic animate-pulse">Pulling_Historical_Data...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 relative z-10">
                        {history.map((sem) => (
                            <div
                                key={sem.id}
                                className={`p-12 rounded-[3.5rem] border-2 transition-all shadow-xl group relative overflow-hidden flex flex-col justify-between min-h-[360px] ${sem.isCurrent
                                    ? 'bg-[#041C3C] border-identity-sky shadow-identity-sky/20 ring-4 ring-identity-sky/5'
                                    : 'bg-white/10 border-white/40 hover:border-identity-sky/30 hover:bg-white/20'
                                    }`}
                            >
                                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-identity-sky/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-10">
                                        <h4 className={`text-4xl font-black uppercase tracking-tighter italic ${sem.isCurrent ? 'text-white' : 'text-identity-navy'}`}>
                                            {sem.schoolYear}
                                        </h4>
                                        {sem.isCurrent && (
                                            <div className="flex items-center gap-4 px-5 py-2.5 bg-identity-sky text-white text-[10px] font-black rounded-xl border border-white/20 uppercase tracking-[0.2em] animate-pulse shadow-xl shadow-identity-sky/40">
                                                SYNC_ACTIVE
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-[12px] font-black uppercase tracking-[0.4em] mb-12 italic ${sem.isCurrent ? 'text-identity-sky' : 'text-slate-400'}`}>
                                        {sem.semester.toUpperCase()}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border transition-all text-[11px] font-black tracking-[0.1em] italic ${
                                            sem.isCurrent 
                                                ? 'bg-white/10 border-white/10 text-white' 
                                                : 'bg-white/40 border-white/60 text-identity-navy'
                                        }`}>
                                            <BookOpen size={16} />
                                            {sem.classCount}_CHANNELS
                                        </div>
                                    </div>
                                </div>

                                <div className={`pt-10 mt-10 border-t-2 flex flex-col gap-3 relative z-10 ${sem.isCurrent ? 'border-white/10' : 'border-white/20'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.5em] italic ${sem.isCurrent ? 'text-white/40' : 'text-slate-200'}`}>Creation_Index</span>
                                    <span className={`text-sm font-black font-mono tracking-[0.2em] italic ${sem.isCurrent ? 'text-identity-sky' : 'text-slate-400'}`}>
                                        {new Date(sem.createdAt).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="mt-20 pt-10 border-t-2 border-white/20 flex justify-center opacity-40">
                    <p className="text-[10px] text-slate-300 italic font-black uppercase tracking-[0.6em]">LabFace_End_Of_History_Sentinel</p>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(4, 28, 60, 0.05);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(92, 180, 228, 0.2);
                    border-radius: 20px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(92, 180, 228, 0.4);
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
            `}</style>
        </div>
    );
}
