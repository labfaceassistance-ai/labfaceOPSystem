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
            <div className="bg-slate-950 w-full max-w-[95vw] h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileText className="text-brand-500" />
                            {className}
                        </h2>
                        <p className="text-slate-400 mt-1 flex items-center gap-2">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Attendance Records</span>
                            <span className="text-slate-600">â€¢</span>
                            {viewMode === 'list' ? 'Overview' : 'Detailed History'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex mr-4">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Users size={14} /> List
                            </button>
                            <button
                                onClick={() => setViewMode('history')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'history' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <History size={14} /> History
                            </button>
                        </div>

                        {viewMode === 'history' && (
                            <button
                                onClick={downloadAttendance}
                                disabled={selectedEnrollmentIds.length === 0 && students.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                <Download size={16} /> Download {selectedEnrollmentIds.length > 0 && selectedEnrollmentIds.length < students.length ? `(${selectedEnrollmentIds.length})` : ''}
                            </button>
                        )}
                        {!isEditing ? (
                            !isArchived && viewMode === 'history' && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-brand-600/20"
                                >
                                    <Edit2 size={16} /> Update Records
                                </button>
                            )
                        ) : (
                            <>
                                <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors"
                                >
                                    <RotateCcw size={16} /> Cancel
                                </button>
                                <button
                                    onClick={saveChanges}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </>
                        )}
                        {/* Cancellation Button */}
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="p-2 hover:bg-red-500/10 rounded-full text-slate-400 hover:text-red-400 transition-colors ml-2 mr-2"
                            title="Cancel Class (Advance Notice)"
                        >
                            <Ban size={24} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors ml-2">
                            <X size={24} />
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="text-sm text-slate-500 mb-1">Total Enrolled</div>
                                        <div className="text-2xl font-bold text-white">{students.length}</div>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="text-sm text-slate-500 mb-1">Total Sessions</div>
                                        <div className="text-2xl font-bold text-brand-400">{sessions.length}</div>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="text-sm text-slate-500 mb-1">Avg. Attendance</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {sessions.length > 0 ? Math.round(
                                                (students.reduce((acc, s) => acc + s.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length, 0) /
                                                    (students.length * sessions.length)) * 100
                                            ) : 0}%
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Table Wrapper */}
                                <div className={`flex-1 flex flex-col min-h-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50 ${isEditing ? 'ring-2 ring-brand-500/50' : ''}`}>
                                    {viewMode === 'list' ? (
                                        <div className="flex-1 overflow-auto relative">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                                                    <tr>
                                                        <th className="px-6 py-4 font-bold border-b border-slate-800">Student Name</th>
                                                        <th className="px-6 py-4 font-bold border-b border-slate-800">Student ID</th>
                                                        <th className="px-6 py-4 font-bold border-b border-slate-800">Account Status</th>
                                                        <th className="px-6 py-4 font-bold border-b border-slate-800 text-right">Attendance Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800 border-t border-slate-800">
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
                                            <div className="bg-slate-900/80 border-b border-slate-800 p-4 z-40 backdrop-blur-md shrink-0">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-brand-500/10 rounded-lg">
                                                            <Calendar className="text-brand-400" size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Date Filter</div>
                                                            <div className="flex items-center gap-2">
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
                                                                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer"
                                                                >
                                                                    <option value="">All Time</option>
                                                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                                        <option key={i} value={i}>{m}</option>
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
                                                                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 disabled:opacity-30 cursor-pointer"
                                                                >
                                                                    <option value="">Day</option>
                                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                                        <option key={day} value={day}>{day}</option>
                                                                    ))}
                                                                </select>
                                                                {filterDate && (
                                                                    <button onClick={() => { setFilterDate(''); setSelectedSessionId(null); }} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                                                                        <XCircle size={20} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* History Table */}
                                            <div className="flex-1 overflow-auto relative">
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead className="bg-slate-900 text-slate-400">
                                                        <tr>
                                                            <th className="px-6 py-5 font-bold border-b border-slate-800 min-w-[240px] sticky left-0 top-0 bg-slate-900 z-40 shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
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
                                                                        <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Student Record</span>
                                                                        <span className="text-sm font-bold text-slate-200">Full Name</span>
                                                                    </div>
                                                                </div>
                                                            </th>

                                                            {filteredSessions.map((session) => (
                                                                <th key={session.id} className="px-4 py-5 border-b border-slate-800 text-center min-w-[200px] border-l border-slate-800/50 sticky top-0 bg-slate-900 z-20">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                                        </div>
                                                                        <div className="text-base font-black text-white">
                                                                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        </div>
                                                                        <div className="text-[10px] font-mono text-brand-400 flex items-center gap-1.5 opacity-80 mt-1">
                                                                            <Clock size={10} />
                                                                            {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                                                                        </div>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="px-6 py-5 border-b border-slate-800 text-center sticky right-0 top-0 bg-slate-900/95 z-40 shadow-[-4px_0_8px_rgba(0,0,0,0.3)] min-w-[80px]">
                                                                <div className="flex flex-col items-center"><span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Grade</span><span className="font-bold text-brand-400">Rate</span></div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {students.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={filteredSessions.length + 2} className="px-6 py-12 text-center text-slate-500 italic bg-slate-950/20">
                                                                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                                                                    No students enrolled in this class.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            students.map((student) => {
                                                                const presentCount = student.attendance.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
                                                                const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
                                                                const isSelected = selectedEnrollmentIds.includes(student.enrollmentId);

                                                                return (
                                                                    <tr key={student.enrollmentId} className={`hover:bg-slate-900/50 transition-all duration-200 group ${isSelected ? 'bg-brand-500/5' : ''}`}>
                                                                        <td className="px-6 py-4 font-bold text-slate-300 sticky left-0 bg-slate-950 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.3)] group-hover:bg-slate-950 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                {!isEditing && (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => setSelectedEnrollmentIds(prev => prev.includes(student.enrollmentId) ? prev.filter(id => id !== student.enrollmentId) : [...prev, student.enrollmentId])}
                                                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-500 cursor-pointer"
                                                                                    />
                                                                                )}
                                                                                <div className="flex flex-col"><span className="text-sm tracking-tight">{student.studentName}</span><span className="text-[10px] font-mono text-slate-500">{student.studentNumber || 'N/A'}</span></div>
                                                                            </div>
                                                                        </td>
                                                                        {filteredSessions.map((session) => {
                                                                            const record = student.attendance.find((a: any) => a.sessionId === session.id);
                                                                            const status = (record?.status || 'Absent').toLowerCase() === 'not registered' ? 'Absent' : (record?.status || 'Absent');
                                                                            const normalizedStatus = status.toLowerCase();
                                                                            const isChanged = `${student.enrollmentId}-${session.id}` in pendingChanges;

                                                                            return (
                                                                                <td key={session.id} className={`px-4 py-4 text-center border-l border-slate-800/30 ${isChanged ? 'bg-amber-500/5' : ''}`}>
                                                                                    {isEditing ? (
                                                                                        <div className="relative group/edit min-w-[100px]">
                                                                                            <select
                                                                                                value={status}
                                                                                                onChange={(e) => handleStatusChange(student.enrollmentId, student.studentId, session.id, e.target.value)}
                                                                                                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer appearance-none text-center outline-none border focus:ring-2 focus:ring-brand-500/50 shadow-lg shadow-black/20 ${normalizedStatus === 'present'
                                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                                                    : normalizedStatus === 'late'
                                                                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                                                        : normalizedStatus === 'excused'
                                                                                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                                                                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                                                    }`}
                                                                                            >
                                                                                                <option value="Present" className="bg-slate-900 text-emerald-400">PRESENT</option>
                                                                                                <option value="Late" className="bg-slate-900 text-amber-400">LATE</option>
                                                                                                <option value="Absent" className="bg-slate-900 text-red-500">ABSENT</option>
                                                                                                <option value="Excused" className="bg-slate-900 text-blue-400">EXCUSED</option>
                                                                                            </select>
                                                                                            {(record?.recognitionMethod || status === 'Absent') && (
                                                                                                <div className={`absolute -top-2 -right-2 p-1 bg-slate-900 rounded-full border shadow-sm z-10 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                    ? 'border-slate-700 text-slate-500'
                                                                                                    : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                        ? 'border-slate-700 text-slate-400'
                                                                                                        : 'border-brand-500/50 text-brand-400'
                                                                                                    }`} title={!record?.recognitionMethod && status === 'Absent' ? 'System Record (Default Absent)' : record?.recognitionMethod?.toLowerCase() === 'manual' ? 'Manually Updated' : 'AI Detected via CCTV'}>
                                                                                                    {!record?.recognitionMethod && status === 'Absent' ? (
                                                                                                        <History size={8} />
                                                                                                    ) : record?.recognitionMethod?.toLowerCase() === 'manual' ? (
                                                                                                        <Edit2 size={8} />
                                                                                                    ) : (
                                                                                                        <Camera size={8} />
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div
                                                                                            className={`group/badge relative flex flex-col items-center py-2.5 px-3 rounded-xl border transition-all duration-200 min-w-[100px] w-full shadow-lg shadow-black/20 ${normalizedStatus === 'present'
                                                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                                                : normalizedStatus === 'late'
                                                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                                                    : normalizedStatus === 'excused'
                                                                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                                                }`}
                                                                                        >
                                                                                            <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
                                                                                            {record?.timeIn && <div className="text-[9px] font-mono mt-1 opacity-60">
                                                                                                {(() => {
                                                                                                    const d = new Date(new Date(record.timeIn).getTime() + (8 * 60 * 60 * 1000));
                                                                                                    const h = d.getUTCHours();
                                                                                                    const m = d.getUTCMinutes();
                                                                                                    return `${h % 12 || 12}:${m.toString().padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
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
                                                                                                    className={`absolute -top-2 -right-2 p-1 bg-slate-900 rounded-full border shadow-sm transition-transform hover:scale-110 ${!record?.recognitionMethod && status === 'Absent'
                                                                                                        ? 'border-slate-700 text-slate-500 cursor-default'
                                                                                                        : record?.recognitionMethod?.toLowerCase() === 'manual'
                                                                                                            ? 'border-slate-700 text-slate-400 cursor-default'
                                                                                                            : record?.snapshotUrl
                                                                                                                ? 'border-brand-500 text-brand-400 hover:bg-brand-500/20 cursor-pointer ring-2 ring-brand-500/20'
                                                                                                                : 'border-brand-500/50 text-brand-400 cursor-default'
                                                                                                        }`}
                                                                                                    title={record?.snapshotUrl ? 'View Proof of Attendance' : !record?.recognitionMethod && status === 'Absent' ? 'System Record (Default Absent)' : record?.recognitionMethod?.toLowerCase() === 'manual' ? 'Manually Updated' : 'AI Detected via CCTV'}
                                                                                                >
                                                                                                    {!record?.recognitionMethod && status === 'Absent' ? (
                                                                                                        <History size={10} />
                                                                                                    ) : record?.recognitionMethod?.toLowerCase() === 'manual' ? (
                                                                                                        <Edit2 size={10} />
                                                                                                    ) : (
                                                                                                        <Camera size={10} fill={record?.snapshotUrl ? "currentColor" : "none"} />
                                                                                                    )}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="px-4 py-4 text-center sticky right-0 bg-slate-950/95 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.3)] group-hover:bg-slate-950 transition-colors"><div className={`text-sm font-bold ${rate < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{rate}%</div></td>
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-800 shadow-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <FileText className="text-blue-400" /> Mark as Excused
                            </h3>

                            <div className="space-y-4">
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="text-sm text-slate-400">Student</div>
                                    <div className="font-bold text-white">{excuseTarget?.student?.studentName}</div>
                                    <div className="text-sm text-slate-400 mt-2">Session</div>
                                    <div className="font-bold text-white">
                                        {excuseTarget?.session && new Date(excuseTarget.session.date).toLocaleDateString()} ({excuseTarget?.session?.startTime.substring(0, 5)} - {excuseTarget?.session?.endTime.substring(0, 5)})
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Reason for Excuse</label>
                                    <textarea
                                        value={excuseReason}
                                        onChange={(e) => setExcuseReason(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Enter the reason for excusing this absence..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Excuse Letter (Optional)</label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="items-center justify-center w-full p-2 border-2 border-dashed border-slate-700 rounded-lg hover:border-blue-500 hover:bg-slate-800/50 transition-colors flex gap-2">
                                                <Upload size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-400 truncate max-w-[200px]">
                                                    {excuseFile ? excuseFile.name : 'Click to upload file'}
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
                                            <button onClick={() => setExcuseFile(null)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setIsExcuseModalOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitExcuse}
                                        disabled={isSubmittingExcuse || !excuseReason}
                                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingExcuse ? 'Submitting...' : 'Confirm Excuse'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancellation Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-800 shadow-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Ban className="text-red-500" /> Cancel Class (Advance Notice)
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                This will notify all enrolled students that this specific class date is cancelled.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Date to Cancel</label>
                                    <input
                                        type="date"
                                        value={cancelDate}
                                        onChange={(e) => setCancelDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Reason</label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                        placeholder="e.g. Professor is attending a conference..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCancelClass}
                                        disabled={isCancelling || !cancelDate || !cancelReason}
                                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Snapshot Modal */}
                {snapshotModal.isOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200" onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Camera className="text-brand-500" size={20} />
                                        Attendance Proof
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {snapshotModal.studentName} â€¢ {snapshotModal.date}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSnapshotModal({ isOpen: false, url: '', studentName: '', date: '' })}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-1 bg-black flex items-center justify-center min-h-[400px]">
                                <img
                                    src={snapshotModal.url}
                                    alt="Attendance Snapshot"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Snapshot+Not+Found';
                                        e.currentTarget.onerror = null; // Prevent loop
                                    }}
                                />
                            </div>
                            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                                <button
                                    onClick={() => window.open(snapshotModal.url, '_blank')}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} /> Open Full Image
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
