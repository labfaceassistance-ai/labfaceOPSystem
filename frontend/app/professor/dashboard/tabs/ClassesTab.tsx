import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateClassModal from '@/components/CreateClassModal';
import SessionModal from '@/components/SessionModal';
import ClassDetailsModal from '@/components/ClassDetailsModal';
import EditClassModal from '@/components/EditClassModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Calendar, BookOpen, Users, Archive, RefreshCw, MoreVertical, Play, Plus, Search, Eye, Edit, Square, Activity, ChevronDown, Filter, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';

import axios from 'axios';
import { getToken } from '@/utils/auth';

interface Class {
    id: number;
    subject_code: string;
    subject_name: string;
    section: string;
    schedule_json: string;
    student_count: number;
    is_archived: number;
    active_session_type?: string;
    active_session_id?: number;
    school_year?: string;
    semester?: string;
    created_at?: string;
}

interface ClassesTabProps {
    user: any;
    classes: Class[];
    loading: boolean;
    onRefresh: () => void;
    onTabChange?: (tab: 'home' | 'classes' | 'monitor' | 'analytics') => void;
}

export default function ClassesTab({ user, classes, loading, onRefresh, onTabChange }: ClassesTabProps) {
    const router = useRouter();
    const [activeSubTab, setActiveSubTab] = useState<'active' | 'archived'>('active');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [selectedClassName, setSelectedClassName] = useState('');
    const [selectedClassIsArchived, setSelectedClassIsArchived] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [initialView, setInitialView] = useState<'list' | 'history'>('list');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    const [stoppingSessionId, setStoppingSessionId] = useState<number | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYearLevel, setSelectedYearLevel] = useState('All');

    // Current school year for display only (not a filter)
    const [currentSchoolYear, setCurrentSchoolYear] = useState<string>('Loading...');
    const [currentSemester, setCurrentSemester] = useState<string>('');

    // Date Filters
    const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('all');
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [deleteSelection, setDeleteSelection] = useState<{
        isOpen: boolean;
        classId: number;
        className: string;
        isArchived: number;
    } | null>(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'success' | 'info';
        onConfirm: () => void;
        confirmText?: string;
        isAlert?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    // Base availability on the current tab context
    const tabClasses = classes.filter(c => {
        const isArchived = Number(c.is_archived) === 1;
        return activeSubTab === 'active' ? !isArchived : isArchived;
    });

    // No longer need availableYears or availableSemesters for filtering

    const filteredClasses = classes.filter(c => {
        const isArchived = Number(c.is_archived) === 1;
        const matchesTab = activeSubTab === 'active' ? !isArchived : isArchived;
        const matchesSearch = c.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.section && c.section.toLowerCase().includes(searchTerm.toLowerCase()));

        // Extract year level from section - support multiple formats:
        // "BSIT-3A" -> "3", "BSIT 3A" -> "3", "3A" -> "3", "3" -> "3"
        const sectionYearLevel = c.section?.match(/(\d)/)?.[1] || '';
        const matchesYearLevel = selectedYearLevel === 'All' || sectionYearLevel === selectedYearLevel;

        // Date filtering logic
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (selectedDateFilter !== 'all') {
            switch (selectedDateFilter) {
                case 'day':
                    if (selectedDay) {
                        startDate = new Date(selectedDay + 'T00:00:00');
                        endDate = new Date(selectedDay + 'T23:59:59');
                    }
                    break;

                case 'week':
                    if (selectedWeek) {
                        // selectedWeek format: "2026-W05" (year-week)
                        const [year, week] = selectedWeek.split('-W');
                        const firstDayOfYear = new Date(parseInt(year), 0, 1);
                        const daysOffset = (parseInt(week) - 1) * 7;
                        const dayOfWeek = firstDayOfYear.getDay();
                        const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

                        startDate = new Date(parseInt(year), 0, 1 + daysToMonday + daysOffset);
                        startDate.setHours(0, 0, 0, 0);

                        endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 6);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    break;

                case 'month':
                    if (selectedMonth) {
                        // selectedMonth format: "2026-01" (year-month)
                        const [year, month] = selectedMonth.split('-');
                        startDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0);
                        endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
                    }
                    break;

                case 'custom':
                    if (customStartDate) startDate = new Date(customStartDate + 'T00:00:00');
                    if (customEndDate) endDate = new Date(customEndDate + 'T23:59:59');
                    break;
            }
        }

        const matchesDateRange = !startDate || !endDate || (() => {
            if (!c.created_at) return true; // If no created_at, show the class
            const createdAt = new Date(c.created_at);
            return createdAt >= startDate && createdAt <= endDate;
        })();

        return matchesTab && matchesSearch && matchesYearLevel && matchesDateRange;
    });

    const formatSchedule = (scheduleJson: string) => {
        try {
            const schedule = JSON.parse(scheduleJson);
            if (!Array.isArray(schedule) || schedule.length === 0) return 'No schedule set';

            const days = schedule.map((s: any) => s.day.substring(0, 3)).join(', ');
            const times = schedule[0];
            return `${days} • ${times.startTime} - ${times.endTime}`;
        } catch {
            return 'Invalid schedule';
        }
    };

    const fetchAcademicSettings = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const token = getToken();
            const axios = (await import('axios')).default;
            const response = await axios.get(`${API_URL}/api/users/academic-settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentSchoolYear(response.data.schoolYear);
            setCurrentSemester(response.data.semester);
        } catch (error) {
            console.error('Error fetching academic settings:', error);
            // Fallback to calculating from available classes if API fails
            const years = Array.from(new Set(classes.map(c => c.school_year).filter(Boolean))).sort().reverse();
            setCurrentSchoolYear(years[0] || 'N/A');
            setCurrentSemester('N/A'); // Fallback for semester
        }
    };

    useEffect(() => {
        // Assuming onRefresh also fetches classes, or you have a separate fetchClasses
        onRefresh();
        fetchAcademicSettings();
    }, []); // Empty dependency array means this runs once on mount


    const handleArchive = (classId: number, isArchived: number, className: string) => {
        setConfirmModal({
            isOpen: true,
            title: isArchived ? 'Restore Class' : 'Archive Class',
            message: `Are you sure you want to ${isArchived ? 'restore' : 'archive'} "${className}"?`,
            type: isArchived ? 'info' : 'warning',
            confirmText: isArchived ? 'Restore' : 'Archive',
            onConfirm: async () => {
                try {
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const axios = (await import('axios')).default;
                    const token = localStorage.getItem('token');

                    await axios.put(`${API_URL}/api/classes/${classId}/archive`, {
                        is_archived: isArchived ? 0 : 1
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    await onRefresh();

                    // Small delay to let refresh settle, though state update should be atomic
                    // Force a new object reference to ensure re-render
                    setTimeout(() => {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Success',
                            message: `Class ${isArchived ? 'restored' : 'archived'} successfully.`,
                            type: 'success',
                            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                            confirmText: 'OK',
                            isAlert: true
                        });
                    }, 100);
                } catch (error: any) {
                    console.error('Failed to archive/restore class:', error);
                    const msg = error.response?.data?.message || error.message || 'Unknown error';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: `Failed to update class status: ${msg}`,
                        type: 'danger',
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                        confirmText: 'OK',
                        isAlert: true
                    });
                }
            }
        });
    };

    const handleStopMonitoring = async (sessionId: number) => {
        setStoppingSessionId(sessionId);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            await axios.post(`${API_URL}/api/attendance/sessions/${sessionId}/stop`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Delay for UX (1 second)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh the class list to update button state
            onRefresh();

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Monitoring stopped successfully',
                type: 'success',
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                confirmText: 'OK',
                isAlert: true
            });
        } catch (error: any) {
            console.error('Failed to stop monitoring:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to stop monitoring',
                type: 'danger',
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                confirmText: 'OK',
                isAlert: true
            });
        } finally {
            setStoppingSessionId(null);
        }
    };


    const handleDelete = async (classId: number, className: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Class',
            message: `Are you sure you want to permanently delete "${className}"? This action cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Class',
            onConfirm: async () => {
                try {
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const axios = (await import('axios')).default;
                    const token = localStorage.getItem('token');

                    await axios.delete(`${API_URL}/api/classes/${classId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    setConfirmModal({
                        isOpen: true,
                        title: 'Deleted',
                        message: 'Class deleted successfully',
                        type: 'success',
                        onConfirm: () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            onRefresh();
                        },
                        confirmText: 'OK',
                        isAlert: true
                    });
                } catch (error: any) {
                    console.error('Failed to delete class:', error);
                    const msg = error.response?.data?.message || error.message || 'Unknown error';
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: `Failed to delete class: ${msg}`,
                        type: 'danger',
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                        confirmText: 'OK',
                        isAlert: true
                    });
                }
            }
        });
    };

    return (
        <>
            <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm overflow-hidden min-h-[600px]">
                <div className="p-4 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                        {/* Tabs */}
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-1 inline-flex shrink-0 self-start sm:self-auto">
                            <button
                                onClick={() => {
                                    setActiveSubTab('active');
                                    setSearchTerm('');
                                    setIsFilterMenuOpen(false);
                                }}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeSubTab === 'active'
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => {
                                    setActiveSubTab('archived');
                                    setSearchTerm('');
                                    setSelectedYearLevel('All');
                                }}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeSubTab === 'archived'
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                            >
                                Archived
                            </button>
                        </div>

                        {/* Search + Create Container (Sticky on Mobile, Separate on Desktop) */}
                        <div className="flex flex-1 items-center gap-3 w-full sm:contents">
                            {/* Search Bar - Compact & Embedded Filter */}
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors" size={16} />

                                <input
                                    type="text"
                                    placeholder={`Search ${activeSubTab} classes...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-16 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-slate-500 transition-all shadow-sm"
                                />

                                {/* Embedded Filter Button */}
                                <div className="absolute right-1.5 top-1.5 bottom-1.5">
                                    <button
                                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                        className={`h-full flex items-center justify-center gap-1 w-10 rounded-lg border text-xs font-semibold transition-all ${selectedYearLevel !== 'All' || selectedDateFilter !== 'all'
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                            : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                                            }`}
                                        title="Filter"
                                    >
                                        <Filter size={14} fill={selectedYearLevel !== 'All' || selectedDateFilter !== 'all' ? "currentColor" : "none"} />
                                    </button>
                                </div>

                                {/* Filter Dropdown */}
                                {isFilterMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100 z-50 origin-top-right">
                                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Filter size={12} /> Filter Options
                                            </span>
                                            {(selectedYearLevel !== 'All' || selectedDateFilter !== 'all') && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedYearLevel('All');
                                                        setSelectedDateFilter('all');
                                                        setSelectedDay('');
                                                        setSelectedWeek('');
                                                        setSelectedMonth('');
                                                        setCustomStartDate('');
                                                        setCustomEndDate('');
                                                    }}
                                                    className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                                                >
                                                    Reset All
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* School Year Display - Read Only */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-400 ml-1">Current School Year</label>
                                                <div className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm">
                                                    <span className="font-semibold text-brand-400">{currentSchoolYear}</span>
                                                </div>
                                            </div>

                                            {/* Year Level Filter */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-400 ml-1">Year Level</label>
                                                <select
                                                    value={selectedYearLevel}
                                                    onChange={(e) => setSelectedYearLevel(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                                                >
                                                    <option value="All">All</option>
                                                    <option value="1">1st Year</option>
                                                    <option value="2">2nd Year</option>
                                                    <option value="3">3rd Year</option>
                                                    <option value="4">4th Year</option>
                                                </select>
                                            </div>
                                        </div>


                                        {/* Date Filter Section */}
                                        <div className="space-y-3 pt-3 border-t border-slate-800">
                                            <label className="text-xs font-medium text-slate-400 ml-1">Date Filter</label>

                                            {/* Single Filter Dropdown */}
                                            <div className="space-y-2">
                                                <select
                                                    value={selectedDateFilter}
                                                    onChange={(e) => {
                                                        const value = e.target.value as any;
                                                        setSelectedDateFilter(value);

                                                        // Clear all date values first
                                                        setSelectedDay('');
                                                        setSelectedWeek('');
                                                        setSelectedMonth('');
                                                        setCustomStartDate('');
                                                        setCustomEndDate('');

                                                        // Set the appropriate date value based on selection
                                                        const now = new Date();
                                                        switch (value) {
                                                            case 'today':
                                                                setSelectedDay(now.toISOString().split('T')[0]);
                                                                break;
                                                            case 'yesterday':
                                                                setSelectedDay(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
                                                                break;
                                                            case '2days':
                                                                setSelectedDay(new Date(Date.now() - 172800000).toISOString().split('T')[0]);
                                                                break;
                                                            case '3days':
                                                                setSelectedDay(new Date(Date.now() - 259200000).toISOString().split('T')[0]);
                                                                break;
                                                            case 'thisweek':
                                                                const getWeekNumber = (date: Date) => {
                                                                    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                                                                    const dayNum = d.getUTCDay() || 7;
                                                                    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                                                                    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                                                                    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                                                                };
                                                                const currentWeek = getWeekNumber(now);
                                                                setSelectedWeek(`${now.getFullYear()}-W${String(currentWeek).padStart(2, '0')}`);
                                                                break;
                                                            case 'lastweek':
                                                                const getWeekNumber2 = (date: Date) => {
                                                                    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                                                                    const dayNum = d.getUTCDay() || 7;
                                                                    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                                                                    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                                                                    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                                                                };
                                                                const currentWeek2 = getWeekNumber2(now);
                                                                setSelectedWeek(`${now.getFullYear()}-W${String(currentWeek2 - 1).padStart(2, '0')}`);
                                                                break;
                                                            case 'thismonth':
                                                                setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                                                                break;
                                                            case 'lastmonth':
                                                                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                                setSelectedMonth(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
                                                                break;
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                                                >
                                                    <option value="all">All Time</option>
                                                    <option value="today">Today</option>
                                                    <option value="yesterday">Yesterday</option>
                                                    <option value="2days">2 Days Ago</option>
                                                    <option value="3days">3 Days Ago</option>
                                                    <option value="thisweek">This Week</option>
                                                    <option value="lastweek">Last Week</option>
                                                    <option value="thismonth">This Month</option>
                                                    <option value="lastmonth">Last Month</option>
                                                    <option value="custom">Custom Range</option>
                                                </select>

                                                {/* Custom Range Date Pickers - Only show when Custom Range is selected */}
                                                {selectedDateFilter === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-slate-500 ml-1">Start Date</label>
                                                            <input
                                                                type="date"
                                                                value={customStartDate}
                                                                onChange={(e) => {
                                                                    setCustomStartDate(e.target.value);
                                                                    if (!e.target.value && !customEndDate) {
                                                                        setSelectedDateFilter('all');
                                                                    }
                                                                }}
                                                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all [color-scheme:dark]"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-slate-500 ml-1">End Date</label>
                                                            <input
                                                                type="date"
                                                                value={customEndDate}
                                                                onChange={(e) => {
                                                                    setCustomEndDate(e.target.value);
                                                                    if (!customStartDate && !e.target.value) {
                                                                        setSelectedDateFilter('all');
                                                                    }
                                                                }}
                                                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all [color-scheme:dark]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Actions - Create Class Button */}
                            <div className="flex items-center shrink-0">
                                {activeSubTab === 'active' && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-brand-500 hover:bg-brand-400 text-white p-2.5 sm:px-6 sm:py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-brand-500/30 flex items-center gap-2 transition-all whitespace-nowrap"
                                        title="Create Class"
                                    >
                                        <span className="hidden sm:inline">Create Class</span>
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filter Button (Archived Only) - REMOVED since it's embedded now */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                        </div>
                    ) : (
                        <>
                            {filteredClasses.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                                        {activeSubTab === 'archived' ? <Archive size={32} /> : <BookOpen size={32} />}
                                    </div>
                                    <p className="text-lg font-medium">No {activeSubTab === 'archived' ? 'archived' : ''} classes found.</p>
                                </div>
                            )}

                            {filteredClasses.map((cls) => (
                                <div key={cls.id} className={`bg-slate-800 rounded-xl border transition-all group relative ${cls.active_session_type ? 'border-brand-500/50 shadow-brand-500/10 shadow-lg' : 'border-slate-700 hover:border-brand-500/30 hover:shadow-xl hover:shadow-black/20'}`}>
                                    <div className={`h-1.5 rounded-t-xl transition-colors ${cls.is_archived ? 'bg-slate-600' : cls.active_session_type ? 'bg-brand-500 animate-pulse' : 'bg-brand-500 group-hover:bg-brand-400'}`}></div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors mb-1">{cls.subject_code}</h3>
                                                <p className="text-sm font-medium text-slate-300">{cls.subject_name}</p>
                                                <p className="text-xs font-bold text-brand-400 mt-2 bg-brand-950/30 px-2 py-0.5 rounded border border-brand-500/20 w-fit">{cls.section}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedClassId(cls.id);
                                                            setSelectedClassName(cls.subject_name);
                                                            setSelectedClassIsArchived(!!cls.is_archived);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="text-slate-400 hover:text-brand-400 p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                                        title="Edit Class"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleArchive(cls.id, cls.is_archived, cls.subject_name);
                                                        }}
                                                        className={`p-2 rounded-lg transition-colors ${cls.is_archived
                                                            ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                                                            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'}`}
                                                        title={cls.is_archived ? "Restore Class" : "Archive Class"}
                                                    >
                                                        {cls.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                    </button>
                                                    {!cls.is_archived && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(cls.id, cls.subject_name);
                                                            }}
                                                            className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                                            title="Delete Class"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {!!cls.active_session_type && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                                                        </span>
                                                        <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">{cls.active_session_type} Session</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                                            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                <Calendar size={14} className="text-brand-500" />
                                                <span>{formatSchedule(cls.schedule_json)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                <Users size={14} className="text-brand-500" />
                                                <span>{cls.student_count} Students</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-auto pt-4 border-t border-slate-700/50">
                                            <button
                                                onClick={() => {
                                                    setSelectedClassId(cls.id);
                                                    setSelectedClassName(cls.subject_name);
                                                    setSelectedClassIsArchived(!!cls.is_archived);
                                                    setInitialView('list');
                                                    setIsViewModalOpen(true);
                                                }}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-slate-500 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg lg:opacity-90 lg:group-hover:opacity-100"
                                            >
                                                <Eye size={16} /> View
                                            </button>

                                            {cls.active_session_id ? (
                                                <>
                                                    <button
                                                        onClick={() => router.push(`/professor/dashboard?tab=monitor&sessionId=${cls.active_session_id}`)}
                                                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Activity size={16} /> Monitor
                                                    </button>
                                                    <button
                                                        onClick={() => cls.active_session_id && handleStopMonitoring(cls.active_session_id)}
                                                        disabled={stoppingSessionId === cls.active_session_id}
                                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {stoppingSessionId === cls.active_session_id ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Square size={16} fill="currentColor" />
                                                        )}
                                                        Stop
                                                    </button>
                                                </>
                                            ) : (
                                                !cls.is_archived && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClassId(cls.id);
                                                            setSelectedClassName(cls.subject_name);
                                                            setIsSessionModalOpen(true);
                                                        }}
                                                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-900/20"
                                                    >
                                                        <Play size={16} fill="currentColor" /> Start
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div >

            {/* ... other modals ... */}

            {/* Create Class Modal - FIXED */}
            <CreateClassModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    onRefresh();
                }}
                professorId={user.professorId || user.userId}
            />

            {/* Session Modal */}
            <SessionModal
                isOpen={isSessionModalOpen}
                onClose={() => setIsSessionModalOpen(false)}
                classId={selectedClassId}
                className={selectedClassName}
                onSuccess={onRefresh}
            />

            <ClassDetailsModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                classId={selectedClassId}
                className={selectedClassName}
                initialView={initialView}
                isArchived={selectedClassIsArchived}
            />

            <EditClassModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                classId={selectedClassId}
                className={selectedClassName}
                isArchived={selectedClassIsArchived}
                onSuccess={() => {
                    onRefresh();
                }}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                isAlert={confirmModal.isAlert}
            />
        </>
    );
}
