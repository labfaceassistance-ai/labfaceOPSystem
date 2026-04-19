import { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Edit2, Save, RotateCcw, Download, Users, History, Camera, Upload, Ban } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';

interface ClassDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number | null;
    className: string;
    initialView?: 'list' | 'history';
    isArchived?: boolean;
}

export default function ClassDetailsModal({ isOpen, onClose, classId, className, initialView = 'list', isArchived }: ClassDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'history'>(initialView);
    const [filterDate, setFilterDate] = useState('');
    const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<any>({});
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        confirmText: string;
        isAlert: boolean;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'info', confirmText: 'OK', isAlert: false, onConfirm: () => { } });

    // Excuse Modal State
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [excuseTarget, setExcuseTarget] = useState<any>(null);
    const [excuseReason, setExcuseReason] = useState('');
    const [excuseFile, setExcuseFile] = useState<File | null>(null);
    const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

    // Cancellation Modal State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelDate, setCancelDate] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Snapshot Modal State
    const [snapshotModal, setSnapshotModal] = useState<{
        isOpen: boolean;
        url: string;
        studentName: string;
        date: string;
    }>({ isOpen: false, url: '', studentName: '', date: '' });

    useEffect(() => {
        if (isOpen && classId) {
            fetchClassDetails();
        } else {
            setStudents([]);
            setSessions([]);
            setIsEditing(false);
            setPendingChanges({});
        }
    }, [isOpen, classId]);

    const fetchClassDetails = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/attendance-grid`);
            setStudents(res.data.students || []);
            setSessions(res.data.sessions || []);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClass = async () => {
        if (!cancelDate || !cancelReason) return alert('Please provide both date and reason');
        setIsCancelling(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/cancellations`, {
                date: cancelDate,
                reason: cancelReason
            });
            alert('Class Cancelled Successfully. Notifications sent.');
            setIsCancelModalOpen(false);
            setCancelDate('');
            setCancelReason('');
            // Maybe refresh sessions if we show cancellations?
        } catch (e) {
            console.error('Cancellation failed:', e);
            alert('Failed to cancel class');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleStatusChange = (enrollmentId: number, studentId: number, sessionId: number, status: string) => {
        if (status === 'Excused') {
            const student = students.find(s => s.enrollmentId === enrollmentId);
            const session = sessions.find(s => s.id === sessionId);
            setExcuseTarget({
                student,
                session,
                logId: student.attendance.find((a: any) => a.sessionId === sessionId)?.id
            });
            setExcuseReason('');
            setExcuseFile(null);
            setIsExcuseModalOpen(true);
            return;
        }

        setPendingChanges((prev: any) => ({
            ...prev,
            [`${enrollmentId}-${sessionId}`]: { enrollmentId, studentId, sessionId, status }
        }));

        // Optimistic update
        setStudents(prev => prev.map(s => {
            if (s.enrollmentId !== enrollmentId) return s;
            return {
                ...s,
                attendance: s.attendance.map((sess: any) => {
                    if (sess.sessionId !== sessionId) return sess;
                    return { ...sess, status, recognitionMethod: 'Manual' };
                })
            };
        }));
    };

    const submitExcuse = async () => {
        if (!excuseReason) return alert('Please provide a reason');
        setIsSubmittingExcuse(true);
        try {
            let letterUrl = '';
            if (excuseFile) {
                const formData = new FormData();
                formData.append('file', excuseFile);
                const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/upload-excuse`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                letterUrl = uploadRes.data.url;
            }

            let targetLogId = excuseTarget.logId;

            if (!targetLogId) {
                // Create a log first via manual update endpoint
                const createRes = await axios.put(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/manual-update`, {
                    enrollmentId: excuseTarget.student.enrollmentId,
                    studentId: excuseTarget.student.studentId,
                    sessionId: excuseTarget.session.id,
                    status: 'Absent'
                });

                if (createRes.data && createRes.data.id) {
                    targetLogId = createRes.data.id;
                } else {
                    throw new Error('Failed to create attendance record');
                }
            }

            if (targetLogId) {
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/excuse`, {
                    attendanceLogId: targetLogId,
                    reason: excuseReason,
                    letterUrl
                });
            }

            // Refresh
            setIsExcuseModalOpen(false);
            fetchClassDetails();
        } catch (e) {
            console.error(e);
            alert('Failed to submit excuse');
        } finally {
            setIsSubmittingExcuse(false);
        }
    };

    const saveChanges = async () => {
        try {
            const updates = Object.values(pendingChanges);
            await Promise.all(updates.map((update: any) =>
                axios.put(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/manual-update`, update)
            ));
            setIsEditing(false);
            setPendingChanges({});
            fetchClassDetails();
        } catch (e) {
            console.error(e);
            alert('Failed to save some changes');
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setPendingChanges({});
        fetchClassDetails(); // Revert optimistic updates
    };

    const downloadAttendance = () => {
        if (!classId) return;
        window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/export-attendance`, '_blank');
    };

    const filteredSessions = sessions.filter(s => {
        if (!filterDate) return true;
        return s.date.startsWith(filterDate);
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-maroon-950 w-full max-w-[95vw] h-[90vh] rounded-2xl border border-white/10 shadow-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/2">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                            <FileText className="text-brand-gold" size={28} />
                            {className}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">Attendance Ledger</span>
                            <span className="text-white/10">|</span>
                            <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">{viewMode === 'list' ? 'Cohort Overview' : 'Detailed Session History'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-black/40 p-1.5 rounded-xl border border-white/5 flex gap-1 shadow-inner">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/10' : 'text-secondary/40 hover:text-white'}`}
                            >
                                <Users size={14} /> List View
                            </button>
                            <button
                                onClick={() => setViewMode('history')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'history' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/10' : 'text-secondary/40 hover:text-white'}`}
                            >
                                <History size={14} /> History View
                            </button>
                        </div>

                        {viewMode === 'history' && (
                            <button
                                onClick={downloadAttendance}
                                disabled={selectedEnrollmentIds.length === 0 && students.length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10"
                            >
                                <Download size={16} /> Export Data {selectedEnrollmentIds.length > 0 && selectedEnrollmentIds.length < students.length ? `(${selectedEnrollmentIds.length})` : ''}
                            </button>
                        )}
                        {!isEditing ? (
                            !isArchived && viewMode === 'history' && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-gold/10"
                                >
                                    <Edit2 size={16} /> Update Ledger
                                </button>
                            )
                        ) : (
                            <>
                                <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-black/40 hover:bg-white/5 text-secondary/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 shadow-inner"
                                >
                                    <RotateCcw size={16} /> Revert
                                </button>
                                <button
                                    onClick={saveChanges}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </>
                        )}
                        {/* Cancellation Button */}
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="p-3 hover:bg-red-500/10 rounded-xl text-secondary/40 hover:text-red-400 transition-all ml-2 border border-transparent hover:border-red-500/20"
                            title="Cancel Class (Advance Notice)"
                        >
                            <Ban size={22} />
                        </button>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl text-secondary/40 hover:text-white transition-all ml-2 border border-transparent hover:border-white/10">
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden p-6">
                    {
                        loading ? (
                            <div className="flex items-center justify-center h-full" >
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
                            </div>
                        ) : (
                            <div className="min-w-[800px] flex flex-col h-full">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-2">Cohort Engagement</div>
                                        <div className="text-3xl font-black text-white tracking-tight">{students.length} <span className="text-sm font-bold text-secondary/20 uppercase tracking-widest ml-1">Students</span></div>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-2">Session Log</div>
                                        <div className="text-3xl font-black text-brand-gold tracking-tight">{sessions.length} <span className="text-sm font-bold text-brand-gold/20 uppercase tracking-widest ml-1">Entries</span></div>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-secondary/40 mb-2">Engagement Rate</div>
                                        <div className="text-3xl font-black text-emerald-400 tracking-tight">
                                            {sessions.length > 0 ? Math.round(
                                                (students.reduce((acc, s) => acc + s.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length, 0) /
                                                    (students.length * sessions.length)) * 100
                                            ) : 0}%
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Table Wrapper */}
                                <div className={`flex-1 flex flex-col min-h-0 border border-white/5 rounded-2xl overflow-hidden bg-black/20 shadow-inner ${isEditing ? 'ring-2 ring-brand-gold/50 border-brand-gold/50' : ''}`}>
                                    {viewMode === 'list' ? (
                                        <div className="flex-1 overflow-auto relative no-scrollbar">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[10px] uppercase bg-black/40 text-secondary/40 tracking-[0.2em]">
                                                    <tr>
                                                        <th className="px-8 py-5 font-black border-b border-white/5">Student Reference</th>
                                                        <th className="px-8 py-5 font-black border-b border-white/5">Identity Number</th>
                                                        <th className="px-8 py-5 font-black border-b border-white/5">Security Status</th>
                                                        <th className="px-8 py-5 font-black border-b border-white/5 text-right">Engagement</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 bg-white/1">
                                                    {students.map((student) => {
                                                        const presentCount = student.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
                                                        const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
                                                        return (
                                                            <tr key={student.enrollmentId} className="hover:bg-slate-900/50 transition-colors">
                                                                <td className="px-6 py-4 font-medium text-slate-200">{student.studentName}</td>
                                                                <td className="px-6 py-4 text-slate-400 font-mono">{student.studentNumber || 'N/A'}</td>
                                                                <td className="px-6 py-4">
                                                                    {student.studentId ? (
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">Registered</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">No Account</span>
                                                                    )}
                                                                </td>
                                                                <td className={`px-6 py-4 font-bold text-right ${rate < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{rate}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <>
                                            {/* History View Filter */}
                                            <div className="bg-black/40 border-b border-white/5 p-6 z-40 backdrop-blur-xl shrink-0">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className="p-3 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-inner">
                                                            <Calendar className="text-brand-gold" size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-black tracking-[0.2em] text-secondary/40 mb-2">Chronological Filter</div>
                                                            <div className="flex items-center gap-3">
                                                                <select
                                                                    value={filterDate ? (new Date(filterDate + 'T00:00:00').getMonth()).toString() : ''}
                                                                    onChange={(e) => {
                                                                        if (e.target.value === '') {
                                                                            setFilterDate('');
                                                                            setSelectedSessionId(null);
                                                                            return;
                                                                        }
                                                                        const currentYear = new Date().getFullYear();
                                                                        const month = parseInt(e.target.value) + 1;
                                                                        const day = filterDate ? new Date(filterDate + 'T00:00:00').getDate() : 1;
                                                                        const dateStr = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                                                        setFilterDate(dateStr);
                                                                    }}
                                                                    className="bg-black/40 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-3 outline-none cursor-pointer focus:ring-2 focus:ring-brand-gold/20 transition-all shadow-inner appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]"
                                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.2)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                                >
                                                                    <option value="" className="bg-maroon-950">ALL PERIODS</option>
                                                                    {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m, i) => (
                                                                        <option key={i} value={i} className="bg-maroon-950">{m}</option>
                                                                    ))}
                                                                </select>
                                                                <select
                                                                    value={filterDate ? new Date(filterDate + 'T00:00:00').getDate().toString() : ''}
                                                                    onChange={(e) => {
                                                                        if (e.target.value === '' || !filterDate) return;
                                                                        const currentYear = new Date().getFullYear();
                                                                        const month = new Date(filterDate + 'T00:00:00').getMonth() + 1;
                                                                        const day = parseInt(e.target.value);
                                                                        const dateStr = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                                                        setFilterDate(dateStr);
                                                                    }}
                                                                    disabled={!filterDate}
                                                                    className="bg-black/40 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-3 outline-none cursor-pointer focus:ring-2 focus:ring-brand-gold/20 transition-all shadow-inner appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] disabled:opacity-20"
                                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.2)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                                >
                                                                    <option value="" className="bg-maroon-950">DAY</option>
                                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                                        <option key={day} value={day} className="bg-maroon-950">{day}</option>
                                                                    ))}
                                                                </select>
                                                                {filterDate && (
                                                                    <button onClick={() => { setFilterDate(''); setSelectedSessionId(null); }} className="p-3 text-secondary/40 hover:text-red-400 transition-all hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10">
                                                                        <XCircle size={20} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* History Table */}
                                            <div className="flex-1 overflow-auto relative no-scrollbar">
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead className="bg-black/40 text-secondary/40">
                                                        <tr>
                                                            <th className="px-8 py-6 font-black border-b border-white/5 min-w-[280px] sticky left-0 top-0 bg-maroon-950 z-40 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                                                <div className="flex items-center gap-3">
                                                                    {!isEditing && (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedEnrollmentIds.length === students.length && students.length > 0}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setSelectedEnrollmentIds(students.map(s => s.enrollmentId));
                                                                                else setSelectedEnrollmentIds([]);
                                                                            }}
                                                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-500 cursor-pointer"
                                                                        />
                                                                    )}
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-[0.2em] text-secondary/40 mb-1 font-black">Student Record</span>
                                                                        <span className="text-sm font-black text-white uppercase tracking-tight">Full Identity</span>
                                                                    </div>
                                                                </div>
                                                            </th>

                                                            {filteredSessions.map((session) => (
                                                                <th key={session.id} className="px-6 py-6 border-b border-white/5 text-center min-w-[200px] border-l border-white/5 sticky top-0 bg-maroon-950 z-20">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-[10px] font-black text-secondary/40 mb-2 uppercase tracking-[0.2em]">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                                        </div>
                                                                        <div className="text-lg font-black text-white uppercase tracking-tight">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-brand-gold flex items-center gap-2 mt-2 opacity-80 uppercase tracking-widest bg-brand-gold/5 px-2 py-1 rounded-lg border border-brand-gold/10">
                                                                            <Clock size={12} />
                                                                            {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                                                                        </div>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="px-8 py-6 border-b border-white/5 text-center sticky right-0 top-0 bg-maroon-950 z-40 shadow-[-4px_0_12px_rgba(0,0,0,0.5)] min-w-[100px]">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-secondary/40 mb-1 font-black">Grade</span>
                                                                    <span className="font-black text-brand-gold uppercase tracking-widest text-sm">Rate</span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {students.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={filteredSessions.length + 2} className="px-8 py-20 text-center text-secondary/20 italic bg-white/1 uppercase tracking-[0.3em] font-black text-xs">
                                                                    <Users size={48} className="mx-auto mb-6 opacity-5" />
                                                                    No cohorts enrolled
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            students.map((student) => {
                                                                const presentCount = student.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
                                                                const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
                                                                const isSelected = selectedEnrollmentIds.includes(student.enrollmentId);

                                                                return (
                                                                    <tr key={student.enrollmentId} className={`hover:bg-white/2 transition-all duration-200 group ${isSelected ? 'bg-brand-gold/5' : ''}`}>
                                                                        <td className="px-8 py-5 font-black text-white sticky left-0 bg-maroon-950 z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] group-hover:bg-maroon-950 transition-colors">
                                                                            <div className="flex items-center gap-4">
                                                                                {!isEditing && (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => setSelectedEnrollmentIds(prev => prev.includes(student.enrollmentId) ? prev.filter(id => id !== student.enrollmentId) : [...prev, student.enrollmentId])}
                                                                                        className="w-5 h-5 rounded border-white/10 bg-black/40 text-brand-gold focus:ring-brand-gold/20 cursor-pointer shadow-inner"
                                                                                    />
                                                                                )}
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[180px]">{student.studentName}</span>
                                                                                    <span className="text-[9px] font-bold font-mono text-secondary/40 uppercase tracking-[0.1em]">{student.studentNumber || 'REFERENCE PENDING'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        {filteredSessions.map((session) => {
                                                                            const record = student.attendance.find((a: any) => a.sessionId === session.id);
                                                                            const status = (record?.status || 'Absent').toLowerCase() === 'not registered' ? 'Absent' : (record?.status || 'Absent');
                                                                            const normalizedStatus = status.toLowerCase();
                                                                            const isChanged = `${student.enrollmentId}-${session.id}` in pendingChanges;

                                                                            return (
                                                                                <td key={session.id} className={`px-4 py-4 text-center border-l border-white/5 ${isChanged ? 'bg-brand-gold/5' : ''}`}>
                                                                                    {isEditing ? (
                                                                                        <div className="relative group/edit min-w-[120px]">
                                                                                            <select
                                                                                                value={status}
                                                                                                onChange={(e) => handleStatusChange(student.enrollmentId, student.studentId, session.id, e.target.value)}
                                                                                                className={`w-full py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer appearance-none text-center outline-none border focus:ring-4 focus:ring-white/5 shadow-2xl ${normalizedStatus === 'present'
                                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/5'
                                                                                                    : normalizedStatus === 'late'
                                                                                                        ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30 shadow-brand-gold/5'
                                                                                                        : normalizedStatus === 'excused'
                                                                                                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                                                                                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                                                    }`}
                                                                                            >
                                                                                                <option value="Present" className="bg-maroon-950 font-black">PRESENT</option>
                                                                                                <option value="Late" className="bg-maroon-950 font-black">LATE</option>
                                                                                                <option value="Absent" className="bg-maroon-950 font-black">ABSENT</option>
                                                                                                <option value="Excused" className="bg-maroon-950 font-black">EXCUSED</option>
                                                                                            </select>
                                                                                            {(record?.recognitionMethod || status === 'Absent') && (
                                                                                                <div className={`absolute -top-2 -right-2 p-1.5 bg-maroon-950 rounded-lg border shadow-xl z-10 transition-transform group-hover/edit:scale-110 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                    ? 'border-white/10 text-secondary/20'
                                                                                                    : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                        ? 'border-white/20 text-secondary/40'
                                                                                                        : 'border-brand-gold/50 text-brand-gold ring-4 ring-brand-gold/10'
                                                                                                    }`} title={!record?.recognitionMethod && status === 'Absent' ? 'System Record (Default Absent)' : record?.recognitionMethod?.toLowerCase() === 'manual' ? 'Manually Updated' : 'AI Detected via CCTV'}>
                                                                                                    {!record?.recognitionMethod && status === 'Absent' ? (
                                                                                                        <History size={10} />
                                                                                                    ) : record?.recognitionMethod?.toLowerCase() === 'manual' ? (
                                                                                                        <Edit2 size={10} />
                                                                                                    ) : (
                                                                                                        <Camera size={10} />
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div
                                                                                            className={`group/badge relative flex flex-col items-center py-3 px-4 rounded-xl border transition-all duration-300 min-w-[120px] w-full shadow-2xl ${normalizedStatus === 'present'
                                                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/5'
                                                                                                : normalizedStatus === 'late'
                                                                                                    ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30 shadow-brand-gold/5'
                                                                                                    : normalizedStatus === 'excused'
                                                                                                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                                                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                                                }`}
                                                                                        >
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                                                                                            {record?.timeIn && <div className="text-[9px] font-black font-mono mt-1 opacity-40 uppercase tracking-tighter">
                                                                                                {(() => {
                                                                                                    const d = new Date(new Date(record.timeIn).getTime() + (8 * 60 * 60 * 1000));
                                                                                                    const h = d.getUTCHours();
                                                                                                    const m = d.getUTCMinutes();
                                                                                                    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                                                                                                })()}
                                                                                            </div>}

                                                                                            {/* Snapshot Button / Recognition Indicator */}
                                                                                            {(record?.recognitionMethod || status === 'Absent' || record?.snapshotUrl) && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        if (record?.snapshotUrl) {
                                                                                                            e.stopPropagation();
                                                                                                            setSnapshotModal({
                                                                                                                isOpen: true,
                                                                                                                url: record.snapshotUrl,
                                                                                                                studentName: student.studentName,
                                                                                                                date: new Date(session.date).toLocaleDateString()
                                                                                                            });
                                                                                                        }
                                                                                                    }}
                                                                                                    disabled={!record?.snapshotUrl}
                                                                                                    className={`absolute -top-2 -right-2 p-1.5 bg-maroon-950 rounded-lg border shadow-xl transition-all hover:scale-110 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                        ? 'border-white/10 text-secondary/10 cursor-default'
                                                                                                        : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                            ? 'border-white/20 text-secondary/40 cursor-default'
                                                                                                            : record?.snapshotUrl
                                                                                                                ? 'border-brand-gold text-brand-gold hover:bg-brand-gold/20 cursor-pointer ring-4 ring-brand-gold/10'
                                                                                                                : 'border-brand-gold/50 text-brand-gold cursor-default'
                                                                                                        }`}
                                                                                                    title={record?.snapshotUrl ? 'View Proof of Attendance' : !record?.recognitionMethod && status === 'Absent' ? 'System Record (Default Absent)' : record?.recognitionMethod?.toLowerCase() === 'manual' ? 'Manually Updated' : 'AI Detected via CCTV'}
                                                                                                >
                                                                                                    {!record?.recognitionMethod && status === 'Absent' ? (
                                                                                                        <History size={12} />
                                                                                                    ) : record?.recognitionMethod?.toLowerCase() === 'manual' ? (
                                                                                                        <Edit2 size={12} />
                                                                                                    ) : (
                                                                                                        <Camera size={12} fill={record?.snapshotUrl ? "currentColor" : "none"} className={record?.snapshotUrl ? "animate-pulse" : ""} />
                                                                                                    )}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="px-8 py-5 text-center sticky right-0 bg-maroon-950 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.5)] group-hover:bg-maroon-950 transition-colors uppercase tracking-widest text-[10px] font-black tabular-nums"><div className={`${rate < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{rate}%</div></td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                </div >

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    confirmText={confirmModal.confirmText}
                    isAlert={confirmModal.isAlert}
                    onConfirm={() => {
                        if (confirmModal.onConfirm) confirmModal.onConfirm();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                />

                {/* Excuse Modal */}
                {isExcuseModalOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="bg-maroon-950 w-full max-w-md rounded-2xl border border-white/10 shadow-3xl p-8 overflow-hidden">
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                                <FileText className="text-brand-gold" /> Cleared Absence
                            </h3>

                            <div className="space-y-6">
                                <div className="p-5 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 mb-2">Subject Reference</div>
                                    <div className="font-black text-white text-lg tracking-tight">{excuseTarget?.student?.studentName}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 mt-4 mb-2">Session Protocol</div>
                                    <div className="font-black text-brand-gold text-xs uppercase tracking-widest bg-brand-gold/5 px-2 py-1 rounded inline-block border border-brand-gold/10">
                                        {excuseTarget?.session && new Date(excuseTarget.session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Justification</label>
                                    <textarea
                                        value={excuseReason}
                                        onChange={(e) => setExcuseReason(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:border-brand-gold/50 outline-none shadow-inner transition-all"
                                        placeholder="Specify official justification..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Supporting Documentation</label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="items-center justify-center w-full p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-gold/40 hover:bg-white/5 transition-all flex gap-3 group shadow-inner">
                                                <Upload size={18} className="text-secondary/40 group-hover:text-brand-gold transition-colors" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary/40 group-hover:text-white truncate max-w-[200px]">
                                                    {excuseFile ? excuseFile.name : 'Verify Document'}
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,.pdf"
                                                onChange={(e) => e.target.files && setExcuseFile(e.target.files[0])}
                                            />
                                        </label>
                                        {excuseFile && (
                                            <button onClick={() => setExcuseFile(null)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 rounded-xl border border-red-500/20 transition-all hover:text-white">
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setIsExcuseModalOpen(false)}
                                        className="flex-1 py-4 bg-black/40 hover:bg-white/5 text-secondary/40 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/5 transition-all shadow-inner"
                                    >
                                        Retain Entry
                                    </button>
                                    <button
                                        onClick={submitExcuse}
                                        disabled={isSubmittingExcuse || !excuseReason}
                                        className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingExcuse ? 'Archiving...' : 'Clear Absence'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancellation Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="bg-maroon-950 w-full max-w-md rounded-2xl border border-white/10 shadow-3xl p-8 overflow-hidden">
                            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-3 uppercase tracking-tight">
                                <Ban className="text-red-500" /> Archival Protocol
                            </h3>
                            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest mb-8 leading-relaxed">
                                This action will formally notify all enrolled cohorts of the session archival.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Effective Date</label>
                                    <input
                                        type="date"
                                        value={cancelDate}
                                        onChange={(e) => setCancelDate(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:border-red-500/50 outline-none shadow-inner transition-all"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-3">Formal Justification</label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:border-red-500/50 outline-none shadow-inner transition-all"
                                        placeholder="Specify formal reason..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="flex-1 py-4 bg-black/40 hover:bg-white/5 text-secondary/40 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/5 transition-all shadow-inner"
                                    >
                                        Retain
                                    </button>
                                    <button
                                        onClick={handleCancelClass}
                                        disabled={isCancelling || !cancelDate || !cancelReason}
                                        className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isCancelling ? 'Processing...' : 'Confirm Archival'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Snapshot Modal */}
                {snapshotModal.isOpen && (
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300" onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] bg-maroon-950 rounded-2xl overflow-hidden shadow-3xl border border-white/10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                                <div>
                                    <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase tracking-tight">
                                        <Camera className="text-brand-gold" size={24} />
                                        Optical Evidence Log
                                    </h3>
                                    <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-[0.2em] mt-2">
                                        {snapshotModal.studentName} <span className="text-brand-gold/20 mx-2">|</span> {snapshotModal.date}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}
                                    className="p-3 hover:bg-white/5 rounded-xl text-secondary/40 hover:text-white transition-all border border-transparent hover:border-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-4 bg-black/60 flex items-center justify-center min-h-[400px] shadow-inner relative group">
                                <img
                                    src={snapshotModal.url}
                                    alt="Attendance Snapshot"
                                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-all duration-300 group-hover:scale-[1.02]"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Optical+Evidence+Missing';
                                        e.currentTarget.onerror = null; // Prevent loop
                                    }}
                                />
                                <div className="absolute inset-0 bg-brand-gold/5 pointer-events-none opacity-20"></div>
                            </div>
                            <div className="p-8 bg-white/2 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => window.open(snapshotModal.url, '_blank')}
                                    className="px-8 py-4 bg-brand-gold hover:bg-brand-gold/90 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-gold/10 flex items-center gap-3"
                                >
                                    <Download size={18} /> Download Original Evidence
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
