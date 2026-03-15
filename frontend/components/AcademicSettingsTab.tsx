'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { API_URL, getToken } from '@/utils/auth';
import { GraduationCap, Calendar, BookOpen, Users, RefreshCw, Edit2, Check, X, History } from 'lucide-react';

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
                    semester: editedSemester
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
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section - Current Academic Settings */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-brand-500" />
                    Academic Settings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* School Year */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Current School Year</label>
                        {isEditing ? (
                            <select
                                value={editedYear}
                                onChange={(e) => setEditedYear(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            >
                                {schoolYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg flex items-center justify-between">
                                <span className="text-2xl font-bold text-brand-400">{settings?.schoolYear}</span>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-slate-400 hover:text-brand-400 transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            {settings?.updatedByUser ? `Last updated by ${settings.updatedByUser.name}` : 'Set by admin'}
                        </p>
                    </div>

                    {/* Semester */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Current Semester</label>
                        {isEditing ? (
                            <select
                                value={editedSemester}
                                onChange={(e) => setEditedSemester(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            >
                                {semesters.map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                                <span className="text-2xl font-bold text-brand-400">{settings?.semester}</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            {settings?.updatedAt && `Updated ${new Date(settings.updatedAt).toLocaleDateString()}`}
                        </p>
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleSaveSettings}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            Save Changes
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Classes Section */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-brand-500" />
                        Classes ({settings?.schoolYear}, {settings?.semester})
                        <span className="bg-brand-500/20 text-brand-400 px-3 py-1 rounded-full text-sm font-semibold ml-2">
                            {filteredClasses.length}
                        </span>
                    </h3>
                    <button
                        onClick={fetchClasses}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingClasses ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                </div>

                {/* Classes List */}
                {loadingClasses ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="text-center py-12">
                        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No classes found for this period</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredClasses.map((cls) => (
                            <div
                                key={cls.id}
                                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-brand-500/50 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold">
                                            {cls.subjectCode} - {cls.subjectName}
                                        </h4>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {cls.section} | Prof. {cls.professorName}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Created: {new Date(cls.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-brand-400">
                                        <Users className="w-4 h-4" />
                                        <span className="font-semibold">{cls.studentCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Semester History */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-brand-500" />
                        Semester History
                    </h3>
                    <button
                        onClick={fetchHistory}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((sem) => (
                            <div
                                key={sem.id}
                                className={`p-4 rounded-lg border ${sem.isCurrent
                                    ? 'bg-brand-500/10 border-brand-500/50'
                                    : 'bg-slate-800/30 border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-white font-semibold flex items-center gap-2">
                                            {sem.schoolYear} - {sem.semester}
                                            {sem.isCurrent && (
                                                <span className="bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                    Current
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {sem.classCount} classes
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                        {new Date(sem.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
