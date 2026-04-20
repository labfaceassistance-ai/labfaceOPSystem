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
        <div className="fixed inset-0 bg-identity-navy/20 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="identity-glass w-full max-w-[95vw] h-[90vh] rounded-3xl border border-identity-sky/10 shadow-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-identity-sky/10 bg-white/40">
                    <div>
                        <h2 className="text-2xl font-black text-identity-navy flex items-center gap-4 uppercase tracking-tight italic">
                            <FileText className="text-identity-sky" size={28} />
                            {className}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="bg-identity-sky/10 text-identity-sky border border-identity-sky/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-inner">Attendance Records</span>
                            <span className="text-slate-200">|</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{viewMode === 'list' ? 'Cohort Overview' : 'Detailed Session History Layer'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/40 p-1.5 rounded-xl border border-identity-sky/10 flex gap-1 shadow-inner">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-5 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all gap-2 ${viewMode === 'list' ? 'bg-identity-navy text-white shadow-lg shadow-identity-navy/20' : 'text-slate-400 hover:text-identity-navy hover:bg-slate-50'}`}
                            >
                                <Users size={14} /> List View
                            </button>
                            <button
                                onClick={() => setViewMode('history')}
                                className={`px-5 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all gap-2 ${viewMode === 'history' ? 'bg-identity-navy text-white shadow-lg shadow-identity-navy/20' : 'text-slate-400 hover:text-identity-navy hover:bg-slate-50'}`}
                            >
                                <History size={14} /> History View
                            </button>
                        </div>

                        {viewMode === 'history' && (
                            <button
                                onClick={downloadAttendance}
                                disabled={selectedEnrollmentIds.length === 0 && students.length === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                            >
                                <Download size={16} /> Export Dataset {selectedEnrollmentIds.length > 0 && selectedEnrollmentIds.length < students.length ? `(${selectedEnrollmentIds.length})` : ''}
                            </button>
                        )}
                        {!isEditing ? (
                            !isArchived && viewMode === 'history' && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-identity-navy hover:bg-identity-navy/90 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-identity-navy/20 active:scale-95"
                                >
                                    <Edit2 size={16} /> Update Record
                                </button>
                            )
                        ) : (
                            <>
                                <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border border-slate-200 shadow-inner italic active:scale-95"
                                >
                                    <RotateCcw size={16} /> Revert Changes
                                </button>
                                <button
                                    onClick={saveChanges}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                                >
                                    <Save size={16} /> Commit Updates
                                </button>
                            </>
                        )}
                        {/* Cancellation Button */}
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all ml-2 border border-transparent hover:border-rose-100 active:scale-90"
                            title="Cancel Class"
                        >
                            <Ban size={22} />
                        </button>
                        <button onClick={onClose} className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/60 rounded-xl text-slate-400 hover:text-identity-navy transition-all ml-2 border border-transparent hover:border-identity-sky/10 active:scale-90">
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden p-8">
                    {
                        loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4" >
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-identity-sky/10 border-t-identity-sky"></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] italic animate-pulse">Loading attendance...</div>
                            </div>
                        ) : (
                            <div className="min-w-[800px] flex flex-col h-full">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 shrink-0">
                                    <div className="bg-white/40 p-8 rounded-2xl border border-identity-sky/10 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3 ml-1">Cohort Engagement</div>
                                        <div className="text-3xl font-black text-identity-navy tracking-tight">{students.length} <span className="text-sm font-bold text-slate-300 uppercase tracking-[0.15em] ml-1 italic">Personnes</span></div>
                                    </div>
                                    <div className="bg-white/40 p-8 rounded-2xl border border-identity-sky/10 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3 ml-1">Attendance Log</div>
                                        <div className="text-3xl font-black text-identity-sky tracking-tight">{sessions.length} <span className="text-sm font-bold text-identity-sky/20 uppercase tracking-[0.15em] ml-1 italic">Entries</span></div>
                                    </div>
                                    <div className="bg-white/40 p-8 rounded-2xl border border-identity-sky/10 shadow-inner">
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3 ml-1">Persistence Rate</div>
                                        <div className="text-3xl font-black text-emerald-500 tracking-tight">
                                            {sessions.length > 0 ? Math.round(
                                                (students.reduce((acc, s) => acc + s.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length, 0) /
                                                    (students.length * sessions.length)) * 100
                                            ) : 0}%
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Table Wrapper */}
                                <div className={`flex-1 flex flex-col min-h-0 border border-identity-sky/10 rounded-3xl overflow-hidden bg-white/40 shadow-inner ${isEditing ? 'ring-4 ring-identity-sky/20 border-identity-sky/50' : ''}`}>
                                    {viewMode === 'list' ? (
                                        <div className="flex-1 overflow-auto relative no-scrollbar table-responsive-wrapper">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 tracking-[0.2em]">
                                                    <tr>
                                                        <th className="px-10 py-6 font-black border-b border-identity-sky/5">Student Digital Reference</th>
                                                        <th className="px-10 py-6 font-black border-b border-identity-sky/5">ID Number</th>
                                                        <th className="px-10 py-6 font-black border-b border-identity-sky/5">Security Status</th>
                                                        <th className="px-10 py-6 font-black border-b border-identity-sky/5 text-right">Engagement Vector</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-identity-sky/5">
                                                    {students.map((student) => {
                                                        const presentCount = student.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
                                                        const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
                                                        return (
                                                            <tr key={student.enrollmentId} className="hover:bg-identity-sky/5 transition-colors">
                                                                <td className="px-10 py-5 font-black text-identity-navy">{student.studentName}</td>
                                                                <td className="px-10 py-5 text-slate-400 font-mono italic">{student.studentNumber || 'REFERENCE_VOID'}</td>
                                                                <td className="px-10 py-5">
                                                                    {student.studentId ? (
                                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] bg-emerald-50 text-emerald-600 border border-emerald-100">PROVISIONED</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] bg-slate-50 text-slate-400 border border-slate-200">NO_IDENTITY</span>
                                                                    )}
                                                                </td>
                                                                <td className={`px-10 py-5 font-black text-right tabular-nums ${rate < 75 ? 'text-rose-500' : 'text-emerald-500'}`}>{rate}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <>
                                            {/* History View Filter */}
                                            <div className="bg-white/60 border-b border-identity-sky/10 p-8 z-40 backdrop-blur-xl shrink-0 shadow-sm">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-8">
                                                        <div className="p-4 bg-identity-sky/10 rounded-2xl border border-identity-sky/20 shadow-inner">
                                                            <Calendar className="text-identity-sky" size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 mb-3 ml-1">Chronological Period Filter</div>
                                                            <div className="flex items-center gap-4">
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
                                                                    className="bg-white border border-identity-sky/10 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] rounded-xl pl-5 pr-12 py-4 outline-none cursor-pointer focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.2em_1.2em]"
                                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(15, 23, 42, 0.4)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                                >
                                                                    <option value="">ALL SPECTRA</option>
                                                                    {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m, i) => (
                                                                        <option key={i} value={i} className="bg-white">{m}</option>
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
                                                                    className="bg-white border border-identity-sky/10 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] rounded-xl pl-5 pr-12 py-4 outline-none cursor-pointer focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.2em_1.2em] disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(15, 23, 42, 0.4)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                                                >
                                                                    <option value="">DAY</option>
                                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                                        <option key={day} value={day} className="bg-white">{day}</option>
                                                                    ))}
                                                                </select>
                                                                {filterDate && (
                                                                    <button onClick={() => { setFilterDate(''); setSelectedSessionId(null); }} className="p-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 italic active:scale-90">
                                                                        <XCircle size={22} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* History Table */}
                                            <div className="flex-1 overflow-auto relative no-scrollbar table-responsive-wrapper">
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead className="bg-slate-50/50 text-slate-500">
                                                        <tr>
                                                            <th className="px-10 py-6 font-black border-b border-identity-sky/10 min-w-[300px] sticky left-0 top-0 bg-white/90 backdrop-blur-md z-40 shadow-[4px_0_12px_rgba(15,23,42,0.05)]">
                                                                <div className="flex items-center gap-4">
                                                                    {!isEditing && (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedEnrollmentIds.length === students.length && students.length > 0}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setSelectedEnrollmentIds(students.map(s => s.enrollmentId));
                                                                                else setSelectedEnrollmentIds([]);
                                                                            }}
                                                                            className="w-5 h-5 rounded border-slate-200 bg-white text-identity-sky cursor-pointer shadow-sm"
                                                                        />
                                                                    )}
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1 font-black">Student Master List</span>
                                                                        <span className="text-sm font-black text-identity-navy uppercase tracking-tight italic">Full Biological Identity</span>
                                                                    </div>
                                                                </div>
                                                            </th>
                                                            {/* ... sessions ... */}

                                                            {filteredSessions.map((session) => (
                                                                <th key={session.id} className="px-8 py-6 border-b border-identity-sky/10 text-center min-w-[220px] border-l border-identity-sky/5 sticky top-0 bg-white/90 backdrop-blur-md z-20">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] italic">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                                        </div>
                                                                        <div className="text-lg font-black text-identity-navy uppercase tracking-tight">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-identity-sky flex items-center gap-2 mt-2 opacity-80 uppercase tracking-[0.15em] bg-identity-sky/5 px-2 py-1 rounded-lg border border-identity-sky/10">
                                                                            <Clock size={12} />
                                                                            {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                                                                        </div>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="px-10 py-6 border-b border-identity-sky/10 text-center sticky right-0 top-0 bg-white/90 backdrop-blur-md z-40 shadow-[-4px_0_12px_rgba(15,23,42,0.05)] min-w-[120px]">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1 font-black">Success</span>
                                                                    <span className="font-black text-identity-sky uppercase tracking-[0.15em] text-sm italic">Rate</span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-identity-sky/5">
                                                        {students.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={filteredSessions.length + 2} className="px-10 py-24 text-center text-slate-300 italic bg-white/20 uppercase tracking-[0.3em] font-black text-xs">
                                                                    <Users size={64} className="mx-auto mb-8 opacity-10" />
                                                                    No cohort fragments detected
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            students.map((student) => {
                                                                const presentCount = student.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
                                                                const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
                                                                const isSelected = selectedEnrollmentIds.includes(student.enrollmentId);

                                                                return (
                                                                    <tr key={student.enrollmentId} className={`hover:bg-identity-sky/5 transition-all duration-300 group ${isSelected ? 'bg-identity-sky/5' : ''}`}>
                                                                        <td className="px-10 py-5 font-black text-identity-navy sticky left-0 bg-white z-10 shadow-[4px_0_12px_rgba(15,23,42,0.05)] group-hover:bg-slate-50 transition-colors">
                                                                            <div className="flex items-center gap-4">
                                                                                {!isEditing && (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => setSelectedEnrollmentIds(prev => prev.includes(student.enrollmentId) ? prev.filter(id => id !== student.enrollmentId) : [...prev, student.enrollmentId])}
                                                                                        className="w-5 h-5 rounded border-slate-200 bg-white text-identity-sky focus:ring-4 focus:ring-identity-sky/10 cursor-pointer shadow-sm"
                                                                                    />
                                                                                )}
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[200px] italic">{student.studentName}</span>
                                                                                    <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-[0.1em]">{student.studentNumber || 'IDENTITY_PENDING'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        {filteredSessions.map((session) => {
                                                                            const record = student.attendance.find((a: any) => a.sessionId === session.id);
                                                                            const status = (record?.status || 'Absent').toLowerCase() === 'not registered' ? 'Absent' : (record?.status || 'Absent');
                                                                            const normalizedStatus = status.toLowerCase();
                                                                            const isChanged = `${student.enrollmentId}-${session.id}` in pendingChanges;

                                                                            return (
                                                                                <td key={session.id} className={`px-6 py-5 text-center border-l border-identity-sky/5 ${isChanged ? 'bg-identity-sky/5' : ''}`}>
                                                                                    {isEditing ? (
                                                                                        <div className="relative group/edit min-w-[140px]">
                                                                                            <select
                                                                                                value={status}
                                                                                                onChange={(e) => handleStatusChange(student.enrollmentId, student.studentId, session.id, e.target.value)}
                                                                                                className={`w-full py-3.5 px-5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all cursor-pointer appearance-none text-center outline-none border focus:ring-4 focus:ring-identity-sky/10 shadow-sm ${normalizedStatus === 'present'
                                                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-500/5'
                                                                                                    : normalizedStatus === 'late'
                                                                                                        ? 'bg-identity-sky/5 text-identity-sky border-identity-sky/20 shadow-identity-sky/5'
                                                                                                        : normalizedStatus === 'excused'
                                                                                                            ? 'bg-sky-50 text-sky-600 border-sky-200'
                                                                                                            : 'bg-rose-50 text-rose-600 border-rose-200'
                                                                                                    }`}
                                                                                            >
                                                                                                <option value="Present" className="bg-white font-black">PRESENT</option>
                                                                                                <option value="Late" className="bg-white font-black">LATE</option>
                                                                                                <option value="Absent" className="bg-white font-black">ABSENT</option>
                                                                                                <option value="Excused" className="bg-white font-black">EXCUSED</option>
                                                                                            </select>
                                                                                            {(record?.recognitionMethod || status === 'Absent') && (
                                                                                                <div className={`absolute -top-2 -right-2 p-1.5 bg-white rounded-lg border shadow-xl z-10 transition-transform group-hover/edit:scale-110 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                    ? 'border-slate-100 text-slate-200'
                                                                                                    : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                        ? 'border-slate-200 text-slate-400'
                                                                                                        : 'border-identity-sky/50 text-identity-sky ring-4 ring-identity-sky/10'
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
                                                                                            className={`group/badge relative flex flex-col items-center py-3.5 px-5 rounded-xl border transition-all duration-300 min-w-[140px] w-full shadow-sm ${normalizedStatus === 'present'
                                                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-500/5'
                                                                                                : normalizedStatus === 'late'
                                                                                                    ? 'bg-identity-sky/5 text-identity-sky border-identity-sky/20 shadow-identity-sky/5'
                                                                                                    : normalizedStatus === 'excused'
                                                                                                        ? 'bg-sky-50 text-sky-600 border-sky-200'
                                                                                                        : 'bg-rose-50 text-rose-600 border-rose-200'
                                                                                                }`}
                                                                                        >
                                                                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] italic">{status}</span>
                                                                                            {record?.timeIn && <div className="text-[9px] font-black font-mono mt-1 opacity-60 uppercase tracking-tighter">
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
                                                                                                    className={`absolute -top-2 -right-2 p-1.5 bg-white rounded-lg border shadow-xl transition-all hover:scale-110 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                        ? 'border-slate-100 text-slate-100 cursor-default'
                                                                                                        : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                            ? 'border-slate-100 text-slate-300 cursor-default'
                                                                                                            : record?.snapshotUrl
                                                                                                                ? 'border-identity-sky text-identity-sky hover:bg-identity-sky/10 cursor-pointer ring-4 ring-identity-sky/10'
                                                                                                                : 'border-identity-sky/50 text-identity-sky cursor-default'
                                                                                                        }`}
                                                                                                    title={record?.snapshotUrl ? 'View Optical Evidence' : !record?.recognitionMethod && status === 'Absent' ? 'System Record (Default Absent)' : record?.recognitionMethod?.toLowerCase() === 'manual' ? 'Manually Updated' : 'AI Detected via CCTV'}
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
                                                                        <td className="px-10 py-5 text-center sticky right-0 bg-white z-10 shadow-[-4px_0_12px_rgba(15,23,42,0.05)] group-hover:bg-slate-50 transition-colors uppercase tracking-[0.15em] text-[11px] font-black tabular-nums italic"><div className={`${rate < 75 ? 'text-rose-500' : 'text-emerald-500'}`}>{rate}%</div></td>
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
                    <div className="fixed inset-0 bg-identity-navy/40 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="identity-glass w-full max-w-md rounded-3xl border border-identity-sky/10 shadow-3xl p-10 overflow-hidden">
                            <h3 className="text-xl font-black text-identity-navy mb-8 flex items-center gap-4 uppercase tracking-tight italic">
                                <FileText className="text-identity-sky" /> Exceptions
                            </h3>

                            <div className="space-y-8">
                                <div className="p-6 bg-white/40 rounded-2xl border border-identity-sky/10 shadow-inner">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 italic">Subject Identity Fragment</div>
                                    <div className="font-black text-identity-navy text-xl tracking-tight">{excuseTarget?.student?.studentName}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-6 mb-3 italic">Time Segment</div>
                                    <div className="font-black text-identity-sky text-[10px] uppercase tracking-[0.15em] bg-identity-sky/5 px-3 py-1.5 rounded-lg inline-block border border-identity-sky/10">
                                        {excuseTarget?.session && new Date(excuseTarget.session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 ml-1">Formal Justification</label>
                                    <textarea
                                        value={excuseReason}
                                        onChange={(e) => setExcuseReason(e.target.value)}
                                        className="w-full bg-white/60 border border-identity-sky/10 rounded-2xl p-5 text-identity-navy font-bold focus:border-identity-sky/50 outline-none shadow-inner transition-all placeholder:text-slate-300 placeholder:italic"
                                        placeholder="Provide a reason..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 ml-1">Supporting Documents</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="items-center justify-center w-full p-5 border-2 border-dashed border-identity-sky/20 rounded-2xl hover:border-identity-sky/50 hover:bg-white/40 transition-all flex gap-4 group shadow-inner">
                                                <Upload size={20} className="text-slate-300 group-hover:text-identity-sky transition-colors" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-identity-navy truncate max-w-[200px] italic">
                                                    {excuseFile ? excuseFile.name : 'Upload Credentials'}
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
                                            <button onClick={() => setExcuseFile(null)} className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 rounded-2xl border border-rose-100 transition-all hover:text-white active:scale-90">
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        onClick={() => setIsExcuseModalOpen(false)}
                                        className="flex-1 py-5 bg-white/20 hover:bg-white/40 text-slate-400 hover:text-identity-navy rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] border border-slate-200 transition-all shadow-sm italic active:scale-95"
                                    >
                                        Retain Entry
                                    </button>
                                    <button
                                        onClick={submitExcuse}
                                        disabled={isSubmittingExcuse || !excuseReason}
                                        className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {isSubmittingExcuse ? 'Archiving...' : 'Decrypt & Clear'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancellation Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 bg-identity-navy/40 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="identity-glass w-full max-w-md rounded-3xl border border-rose-100 shadow-3xl p-10 overflow-hidden">
                            <h3 className="text-xl font-black text-identity-navy mb-5 flex items-center gap-4 uppercase tracking-tight italic">
                                <Ban className="text-rose-500" /> Session Archival
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-10 leading-relaxed italic">
                                This action will formally notify all students that the class is archived.
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 ml-1">Effective Date</label>
                                    <input
                                        type="date"
                                        value={cancelDate}
                                        onChange={(e) => setCancelDate(e.target.value)}
                                        className="w-full bg-white/60 border border-identity-sky/10 rounded-2xl p-5 text-identity-navy font-bold focus:border-rose-500/50 outline-none shadow-inner transition-all"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4 ml-1">Formal Justification</label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-white/60 border border-identity-sky/10 rounded-2xl p-5 text-identity-navy font-bold focus:border-rose-500/50 outline-none shadow-inner transition-all placeholder:text-slate-300 placeholder:italic"
                                        placeholder="Specify formal reason for archival..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="flex-1 py-5 bg-white/20 hover:bg-white/40 text-slate-400 hover:text-identity-navy rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] border border-slate-200 transition-all shadow-sm italic active:scale-95"
                                    >
                                        Retain
                                    </button>
                                    <button
                                        onClick={handleCancelClass}
                                        disabled={isCancelling || !cancelDate || !cancelReason}
                                        className="flex-1 py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-lg shadow-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95"
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
                    <div className="fixed inset-0 bg-identity-navy/60 backdrop-blur-xl flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300" onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] identity-glass rounded-3xl overflow-hidden shadow-3xl border border-identity-sky/10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            <div className="p-10 border-b border-identity-sky/10 flex justify-between items-center bg-white/40">
                                <div>
                                    <h3 className="text-xl font-black text-identity-navy flex items-center gap-5 uppercase tracking-tight italic">
                                        <Camera className="text-identity-sky" size={28} />
                                        Captured Image
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3 ml-1">
                                        {snapshotModal.studentName} <span className="text-identity-sky/20 mx-3">|</span> {snapshotModal.date}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}
                                    className="p-4 hover:bg-white/60 rounded-2xl text-slate-400 hover:text-identity-navy transition-all border border-transparent hover:border-identity-sky/10 active:scale-90"
                                >
                                    <X size={28} />
                                </button>
                            </div>
                            <div className="p-8 bg-slate-50 flex items-center justify-center min-h-[450px] shadow-inner relative group">
                                <img
                                    src={snapshotModal.url}
                                    alt="Attendance Snapshot"
                                    className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-3xl transition-all duration-500 group-hover:scale-[1.03]"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Optical+Evidence+Missing';
                                        e.currentTarget.onerror = null; // Prevent loop
                                    }}
                                />
                            </div>
                            <div className="p-6 bg-white/40 border-t border-identity-sky/10 flex justify-center">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] italic">Captured Image</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
