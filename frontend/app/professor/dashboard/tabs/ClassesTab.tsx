"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateClassModal from '@/components/CreateClassModal';
import SessionModal from '@/components/SessionModal';
import ClassDetailsModal from '@/components/ClassDetailsModal';
import EditClassModal from '@/components/EditClassModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Calendar, BookOpen, Users, Archive, RefreshCw, MoreVertical, Play, Plus, Search, Eye, Edit, Square, Activity, ChevronDown, Filter, Trash2, AlertTriangle, RotateCcw, Monitor, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

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
    onRefresh: (isBackground?: boolean) => void;
    onTabChange?: (tab: 'home' | 'classes' | 'monitor' | 'analytics' | 'schedule') => void;
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
    const [initialView, setInitialView] = useState<'list' | 'history'>('list');

    const [stoppingSessionId, setStoppingSessionId] = useState<number | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYearLevel, setSelectedYearLevel] = useState('All');

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

    const filteredClasses = classes.filter(c => {
        const isArchived = Number(c.is_archived) === 1;
        const matchesTab = activeSubTab === 'active' ? !isArchived : isArchived;
        const matchesSearch = c.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.section && c.section.toLowerCase().includes(searchTerm.toLowerCase()));

        const sectionYearLevel = c.section?.match(/(\d)/)?.[1] || '';
        const matchesYearLevel = selectedYearLevel === 'All' || sectionYearLevel === selectedYearLevel;

        return matchesTab && matchesSearch && matchesYearLevel;
    });

    const formatSchedule = (scheduleJson: string) => {
        try {
            const schedule = JSON.parse(scheduleJson);
            if (!Array.isArray(schedule) || schedule.length === 0) return 'NO SCHEDULE SET';
            const days = schedule.map((s: any) => s.day.substring(0, 3)).join(', ');
            const times = schedule[0];
            return `${days.toUpperCase()} · ${times.startTime} - ${times.endTime}`;
        } catch {
            return 'INVALID SCHEDULE';
        }
    };

    useEffect(() => {
        onRefresh();
    }, []);

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
                    const token = localStorage.getItem('token');
                    await axios.put(`${API_URL}/api/classes/${classId}/archive`, {
                        is_archived: isArchived ? 0 : 1
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    await onRefresh();
                    setConfirmModal({
                        isOpen: true,
                        title: 'Action Successful',
                        message: `Class ${isArchived ? 'restored' : 'archived'} successfully.`,
                        type: 'success',
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                        confirmText: 'OK',
                        isAlert: true
                    });
                } catch (error: any) {
                    console.error('Failed to archive/restore class:', error);
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
            onRefresh();
        } catch (error: any) {
            console.error('Failed to stop monitoring:', error);
        } finally {
            setStoppingSessionId(null);
        }
    };

    const handleDelete = async (classId: number, className: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Class',
            message: `Are you sure you want to permanently delete "${className}"? This cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: async () => {
                try {
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/classes/${classId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setConfirmModal({
                        isOpen: true,
                        title: 'Delete Complete',
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
                }
            }
        });
    };

    return (
        <div className="space-y-8 font-outfit animate-in fade-in duration-1000">
            {/* Unified Command Center */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-blueprint opacity-[0.03] pointer-events-none" />
                
                <div className="flex flex-col gap-6 relative z-10">
                    {/* Top Row: Title & Actions */}
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#041C3C] text-[#5CB4E4] p-3 rounded-xl shadow-lg border border-[#5CB4E4]/20">
                                <BookOpen size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-xl font-black text-[#041C3C] uppercase tracking-[0.1em] italic leading-none">
                                    CLASS MANAGEMENT
                                </h1>
                                <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] italic">
                                    ACTIVE SESSIONS: {classes.filter(c => c.active_session_id).length}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="bg-white/60 p-1 rounded-xl border border-white/50 flex gap-1 shadow-inner">
                                <button
                                    onClick={() => setActiveSubTab('active')}
                                    className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-500 flex items-center gap-2 ${activeSubTab === 'active' ? 'bg-[#041C3C] text-white shadow-lg' : 'text-slate-400 hover:text-[#041C3C]'}`}
                                >
                                    <Activity size={12} /> ACTIVE
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('archived')}
                                    className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-500 flex items-center gap-2 ${activeSubTab === 'archived' ? 'bg-[#041C3C] text-white shadow-lg' : 'text-slate-400 hover:text-[#041C3C]'}`}
                                >
                                    <Archive size={12} /> ARCHIVE
                                </button>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-[#5CB4E4] hover:bg-[#041C3C] text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl transition-all border border-white/10 active:scale-95 italic"
                            >
                                <Plus size={16} />
                                CREATE CLASS
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Search & Filters */}
                    <div className="flex flex-col lg:flex-row items-center gap-4 pt-4 border-t border-slate-100/30">
                        <div className="relative flex-1 w-full group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search by code or name..."
                                className="w-full bg-white/80 border border-slate-100 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#5CB4E4]/40 transition-all text-[10px] font-black uppercase tracking-[0.1em] placeholder:text-slate-200 italic"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <select
                                value={selectedYearLevel}
                                onChange={(e) => setSelectedYearLevel(e.target.value)}
                                className="appearance-none bg-white/80 border border-slate-100 rounded-lg py-3 px-6 focus:outline-none focus:border-[#5CB4E4]/40 transition-all text-[9px] font-black uppercase tracking-[0.1em] text-[#041C3C] cursor-pointer italic min-w-[140px]"
                            >
                                <option value="All">ALL YEARS</option>
                                <option value="1">1ST YEAR</option>
                                <option value="2">2ND YEAR</option>
                                <option value="3">3RD YEAR</option>
                                <option value="4">4TH YEAR</option>
                            </select>
                            <button
                                onClick={() => onRefresh()}
                                className={`p-3 bg-[#041C3C] text-[#5CB4E4] rounded-lg border border-[#5CB4E4]/20 hover:bg-[#5CB4E4] hover:text-white shadow-lg transition-all ${loading ? 'animate-spin' : ''}`}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="w-20 h-20 relative">
                        <div className="absolute inset-0 border-2 border-[#5CB4E4]/10 rounded-2xl rotate-45" />
                        <div className="absolute inset-0 border-2 border-[#041C3C] border-t-transparent rounded-2xl rotate-45 animate-spin shadow-xl" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] animate-pulse italic">LOADING CLASSES...</p>
                    </div>
                </div>
            ) : filteredClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map((cls) => (
                        <div
                            key={cls.id}
                            className="bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/20 overflow-hidden group shadow-lg hover:shadow-[#5CB4E4]/10 transition-all duration-700 flex flex-col relative"
                        >
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full mr-1 ${cls.active_session_id ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                                <button
                                    onClick={() => {
                                        setSelectedClassId(cls.id);
                                        setSelectedClassName(cls.subject_name);
                                        setSelectedClassIsArchived(activeSubTab === 'archived');
                                        setIsEditModalOpen(true);
                                    }}
                                    className="p-1.5 bg-white/80 hover:bg-[#041C3C] hover:text-white text-slate-400 rounded-lg transition-all border border-slate-100 shadow-sm"
                                    title="Settings"
                                >
                                    <Edit size={12} />
                                </button>
                                <button
                                    onClick={() => handleArchive(cls.id, activeSubTab === 'archived' ? 1 : 0, cls.subject_name)}
                                    className="p-1.5 bg-white/80 hover:bg-[#041C3C] hover:text-white text-slate-400 rounded-lg transition-all border border-slate-100 shadow-sm"
                                    title={activeSubTab === 'archived' ? 'Restore' : 'Archive'}
                                >
                                    <Archive size={12} />
                                </button>
                                <button
                                    onClick={() => handleDelete(cls.id, cls.subject_name)}
                                    className="p-1.5 bg-rose-50/50 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all border border-rose-100 shadow-sm"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>

                            <div className="p-6 pb-2 space-y-4 relative z-10">
                                <div className="space-y-3">
                                    <div className="inline-flex gap-2 items-center px-3 py-1 bg-[#041C3C] text-white text-[7px] font-black uppercase tracking-[0.1em] rounded-md shadow-md italic">
                                        SECTION: {cls.section}
                                    </div>
                                    <h2 className="text-lg font-black text-[#041C3C] uppercase tracking-tight leading-none group-hover:text-[#5CB4E4] transition-colors italic line-clamp-1">
                                        {cls.subject_name}
                                    </h2>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{cls.subject_code}</div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 bg-white/40 p-3 rounded-xl border border-white shadow-inner">
                                    <div className="flex items-center gap-3 text-slate-500 min-h-[20px]">
                                        <Calendar size={12} className="text-[#5CB4E4]" />
                                        {formatSchedule(cls.schedule_json) === 'NO SCHEDULE SET' ? (
                                            <button 
                                                onClick={() => onTabChange?.('schedule')}
                                                className="text-[8px] font-black text-[#5CB4E4] uppercase tracking-widest hover:underline italic flex items-center gap-1 group/sch"
                                            >
                                                SET SCHEDULE <ArrowRight size={10} className="group-hover/sch:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <p className="text-[9px] font-black text-[#041C3C] uppercase tracking-tight italic truncate">{formatSchedule(cls.schedule_json)}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Users size={12} className="text-[#041C3C]" />
                                        <p className="text-[9px] font-black text-[#041C3C] uppercase tracking-tight italic">{cls.student_count} STUDENTS</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 pt-2 space-y-3 relative z-10">
                                <button
                                    onClick={() => {
                                        setSelectedClassId(cls.id);
                                        setSelectedClassName(cls.subject_name);
                                        setSelectedClassIsArchived(activeSubTab === 'archived');
                                        setInitialView('list');
                                        setIsViewModalOpen(true);
                                    }}
                                    className="w-full h-10 bg-white hover:bg-[#041C3C] hover:text-white text-[#041C3C] rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm active:scale-95 italic"
                                >
                                    <Eye size={14} /> VIEW DETAILS
                                </button>

                                {cls.active_session_id ? (
                                    <button
                                        onClick={() => onTabChange?.('monitor')}
                                        className="w-full h-12 bg-emerald-500 hover:bg-[#041C3C] text-white rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 italic"
                                    >
                                        <Monitor size={16} className="animate-pulse" /> LIVE NOW
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSelectedClassId(cls.id);
                                            setSelectedClassName(cls.subject_name);
                                            setIsSessionModalOpen(true);
                                        }}
                                        disabled={activeSubTab === 'archived'}
                                        className={`w-full h-12 bg-[#041C3C] hover:bg-[#5CB4E4] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 italic ${activeSubTab === 'archived' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        <Play size={16} /> START CLASS
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-white/40 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-[#5CB4E4]/20 group relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-blueprint" />
                    <h3 className="text-3xl font-black text-[#041C3C] uppercase tracking-tighter italic mb-4">NO CLASSES FOUND</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-50">YOU HAVE NOT CREATED ANY CLASSES YET.</p>
                </div>
            )}

            {/* Modals */}
            <CreateClassModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setTimeout(() => onRefresh(false), 500);
                }}
                professorId={user.professorId || user.userId}
            />

            <SessionModal
                isOpen={isSessionModalOpen}
                onClose={() => setIsSessionModalOpen(false)}
                classId={selectedClassId}
                className={selectedClassName}
                onSuccess={() => onRefresh(false)}
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
                onSuccess={() => onRefresh(false)}
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
        </div>
    );
}

// Helper icons
function History(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
