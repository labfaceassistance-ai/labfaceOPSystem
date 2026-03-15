"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Clock, Play, Users, Search, Save, Trash2, ChevronDown } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';

interface SessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number | null;
    className?: string;
    onSuccess: () => void;
}

interface Student {
    id: number | null;
    enrollment_id: number;
    user_id: string;
    first_name: string;
    last_name: string;
    course: string;
    year_level: number;
    is_registered: number; // 0 or 1
}

export default function SessionModal({ isOpen, onClose, classId, className, onSuccess }: SessionModalProps) {
    const router = useRouter();
    const [type, setType] = useState('regular'); // regular, makeup, batch
    const [loading, setLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Form State
    const now = new Date();
    const phTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [customTime, setCustomTime] = useState(phTime);
    const [customEndTime, setCustomEndTime] = useState('09:30');
    const [sessionName, setSessionName] = useState('');
    const [reason, setReason] = useState('');
    const [makeupByBatch, setMakeupByBatch] = useState(false);
    const [lateThreshold, setLateThreshold] = useState(15);



    // Batch session state
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Group Management State
    const [groups, setGroups] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'schedule' | 'create_batch'>('schedule');
    const [newGroupName, setNewGroupName] = useState('');
    const [isSavingGroup, setIsSavingGroup] = useState(false);

    // Status State (For Restrictions)
    const [todayStatus, setTodayStatus] = useState<any>(null);
    const [fetchingStatus, setFetchingStatus] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'success' | 'info';
        onConfirm?: () => void;
        confirmText?: string;
        isAlert?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Scheduling State
    const [scheduledBatches, setScheduledBatches] = useState<any[]>([]);
    const [selectedScheduleGroupId, setSelectedScheduleGroupId] = useState('');

    // Fetch Initial Data
    useEffect(() => {
        if (classId && isOpen) {
            fetchStatusToday();
            if (type === 'batch' || (type === 'makeup' && makeupByBatch)) {
                fetchEnrolledStudents();
                fetchGroups();
            }
        }
    }, [type, makeupByBatch, classId, isOpen]);

    const fetchStatusToday = async () => {
        setFetchingStatus(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await axios.get(`${API_URL}/api/classes/${classId}/status-today`);
            setTodayStatus(res.data);
        } catch (e) {
            console.error('Failed to fetch status:', e);
        } finally {
            setFetchingStatus(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/groups/class/${classId}`);
            setGroups(response.data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    const handleSaveGroup = async () => {
        if (!newGroupName || selectedStudents.length === 0) return;
        setIsSavingGroup(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.post(`${API_URL}/api/groups`, {
                classId,
                name: newGroupName,
                enrollmentIds: selectedStudents
            });
            setNewGroupName('');
            setSelectedStudents([]);
            fetchGroups();
            setViewMode('schedule');
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Group saved successfully!',
                type: 'success',
                confirmText: 'OK',
                isAlert: true
            });
        } catch (error) {
            console.error('Failed to save group:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save group. Please try again.',
                type: 'danger',
                confirmText: 'OK',
                isAlert: true
            });
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Group',
            message: 'Are you sure you want to delete this group?',
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    await axios.delete(`${API_URL}/api/groups/${groupId}`);
                    fetchGroups();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Failed to delete group:', error);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete group.',
                        type: 'danger',
                        confirmText: 'OK',
                        isAlert: true
                    });
                }
            }
        });
    };

    const handleAddToSchedule = () => {
        if (!selectedScheduleGroupId) return;
        const group = groups.find(g => String(g.id) === selectedScheduleGroupId);
        if (!group) return;

        const newBatch = {
            groupId: group.id,
            groupName: group.name,
            startTime: customTime,
            endTime: customEndTime,
            date: customDate,
            enrollmentIds: group.enrollmentIds
        };

        setScheduledBatches([...scheduledBatches, newBatch]);
        setSelectedScheduleGroupId('');
    };

    const handleRemoveFromSchedule = (index: number) => {
        const newBatches = [...scheduledBatches];
        newBatches.splice(index, 1);
        setScheduledBatches(newBatches);
    };

    const fetchEnrolledStudents = async () => {
        setLoadingStudents(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/${classId}/students`);
            setStudents(response.data || []);
        } catch (error) {
            console.error('Failed to fetch students:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to load students. Please check your connection.',
                type: 'danger',
                confirmText: 'OK',
                isAlert: true
            });
        } finally {
            setLoadingStudents(false);
        }
    };

    const toggleStudent = (enrollmentId: number) => {
        setSelectedStudents(prev =>
            prev.includes(enrollmentId)
                ? prev.filter(id => id !== enrollmentId)
                : [...prev, enrollmentId]
        );
    };

    const selectAll = () => {
        setSelectedStudents(filteredStudents.map(s => s.enrollment_id));
    };

    const deselectAll = () => {
        setSelectedStudents([]);
    };

    const filteredStudents = students.filter(student =>
        `${student.first_name} ${student.last_name} ${student.user_id}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    const handleStartSession = async () => {
        setLoading(true);
        let willRedirect = false;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const now = new Date();

            // Default values
            let date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            let startTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
            let endTime = null;
            let isScheduled = false;

            if (type === 'makeup') {
                date = customDate;
                startTime = customTime;
                endTime = customEndTime;

                // Check if future date (using Manila time for today comparison)
                const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
                if (customDate > todayStr) {
                    isScheduled = true;
                }
            }

            // --- BATCH SESSION LOGIC (includes make-up batch) ---
            if (type === 'batch' || (type === 'makeup' && makeupByBatch)) {
                if (scheduledBatches.length === 0) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Selection Required',
                        message: 'Please add at least one batch to the schedule before starting.',
                        type: 'warning',
                        confirmText: 'OK',
                        isAlert: true
                    });
                    setLoading(false);
                    return;
                }

                let lastStartedSessionId = null;
                let anyBatchScheduled = false;

                for (const batch of scheduledBatches) {
                    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
                    const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

                    const isFutureDate = batch.date > todayStr;
                    // Strict time check: if today, check if batch start time is > current time
                    const isFutureTime = batch.date === todayStr && batch.startTime > nowTime;

                    const batchIsScheduled = isFutureDate || isFutureTime;
                    if (batchIsScheduled) anyBatchScheduled = true;

                    const payload: any = {
                        classId,
                        date: batch.date,
                        startTime: batch.startTime,
                        endTime: batch.endTime,
                        type: type === 'makeup' ? 'makeup' : 'batch',
                        batchStudents: batch.enrollmentIds,
                        sessionName: batch.groupName,

                        isScheduled: batchIsScheduled,
                        lateThreshold: lateThreshold || 15
                    };

                    if (type === 'makeup' && reason) {
                        payload.reason = reason;
                    }

                    const response = await axios.post(`${API_URL}/api/attendance/sessions`, payload);
                    if (!batchIsScheduled && response.data.sessionId) {
                        lastStartedSessionId = response.data.sessionId;
                    }
                }

                if (anyBatchScheduled) {
                    alert('Future batches scheduled successfully.');
                    onSuccess();
                }

                if (lastStartedSessionId) {
                    willRedirect = true;
                    setIsRedirecting(true);
                    router.push(`/professor/dashboard?tab=monitor&sessionId=${lastStartedSessionId}`);
                    // Do NOT close modal, kept open for loading state
                } else {
                    onClose();
                }

            } else {
                // --- REGULAR / MAKEUP LOGIC ---
                const payload: any = {
                    classId,
                    date,
                    startTime,
                    type,
                    isScheduled,
                    lateThreshold: lateThreshold || 15
                };

                if (endTime) payload.endTime = endTime;
                if (type === 'makeup' && reason) payload.reason = reason;

                const response = await axios.post(`${API_URL}/api/attendance/sessions`, payload);

                if (isScheduled) {
                    alert('Make-up class scheduled and students notified.');
                    // For scheduled future sessions, we do NOT redirect.
                    willRedirect = false;
                    onSuccess();
                    onClose();
                } else if (response.data.sessionId) {
                    // Immediate start
                    willRedirect = true;
                    setIsRedirecting(true);
                    router.push(`/professor/dashboard?tab=monitor&sessionId=${response.data.sessionId}`);
                    // Do NOT close modal, kept open for loading state
                }
            }

            // Reset form only if not redirecting
            if (!willRedirect) {
                setType('regular');
                setSelectedStudents([]);
                setSessionName('');
                setReason('');
                setSearchQuery('');
                setScheduledBatches([]);
            }
        } catch (error: any) {
            console.error('Failed to start session:', error);
            const errorMsg = error.response?.data?.error || 'Failed to start session';
            setConfirmModal({
                isOpen: true,
                title: 'Session Error',
                message: errorMsg,
                type: 'danger',
                confirmText: 'OK',
                isAlert: true
            });
            // If error, we are definitely not redirecting successfully
        } finally {
            if (!willRedirect) {
                setLoading(false);
            }
        }
    };



    // Helper to check if Regular is Allowed
    const isRegularAllowed = () => {
        if (!todayStatus || fetchingStatus) return false; // Strict check: fail if data missing or still fetching
        if (todayStatus.isRecuringToday && !todayStatus.isCancelled) return true;
        if (todayStatus.isMakeupScheduled) return true;

        if (todayStatus.isCancelled) return false;

        return false;
    };

    // Helper to check if Batch Start is Allowed (for Today)
    const isBatchStartAllowed = () => {
        // If any batch is scheduled for TODAY (immediate start), we must check if today is a valid class day.
        // If it is a FUTURE batch, it is always allowed (scheduling).
        if (scheduledBatches.length === 0) return false;

        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
        const hasImmediateBatch = scheduledBatches.some(b => b.date <= todayStr);

        if (hasImmediateBatch) {
            // For immediate batches, apply Regular rules unless it's explicitly valid (e.g. Make-up logic handled elsewhere, but this is 'By Batch' tab)
            // The 'By Batch' tab implies Regular Class logic (just splitted).
            // If user wants off-schedule, they should use Make-up Tab -> By Batch.
            return isRegularAllowed();
        }

        return true; // All batches are future
    };

    // Helper text for button
    const getButtonText = () => {
        if (loading || fetchingStatus || isRedirecting) {
            if (isRedirecting) return 'Starting Class...';
            return 'Checking...';
        }

        if (type === 'makeup' && !makeupByBatch) {
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
            if (customDate > todayStr) return 'Schedule & Notify';
        }

        return type === 'batch' ? 'Start/Schedule Batches' : 'Start Session';
    };

    if (!isOpen || !classId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative animate-scale-up ${isRedirecting ? 'opacity-90 pointer-events-none' : ''}`}>
                <button
                    onClick={onClose}
                    disabled={isRedirecting}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 disabled:opacity-30"
                >
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Session</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Start a new attendance session for <span className="font-bold text-brand-600">{className}</span>
                </p>

                {/* Session Type Tabs */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <button
                        onClick={() => setType('regular')}
                        disabled={isRedirecting}
                        className={`p-3 rounded-lg text-sm font-bold border-2 transition-all ${type === 'regular'
                            ? 'bg-brand-50 border-brand-500 text-brand-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Regular Class
                    </button>
                    <button
                        onClick={() => setType('makeup')}
                        disabled={isRedirecting}
                        className={`p-3 rounded-lg text-sm font-bold border-2 transition-all ${type === 'makeup'
                            ? 'bg-amber-50 border-amber-500 text-amber-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Make-up Class
                    </button>
                    <button
                        onClick={() => setType('batch')}
                        disabled={isRedirecting}
                        className={`p-3 rounded-lg text-sm font-bold border-2 transition-all ${type === 'batch'
                            ? 'bg-purple-50 border-purple-500 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        By Batch
                    </button>
                </div>

                {/* Regular Session */}
                {type === 'regular' && (
                    <div className={`border p-4 rounded-lg mb-6 ${!isRegularAllowed() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className={`text-sm ${!isRegularAllowed() ? 'text-red-800' : 'text-blue-800'}`}>
                            <strong>Regular Session:</strong> Start a live class immediately.
                            {!isRegularAllowed() && !fetchingStatus && (
                                <span className="block mt-2 font-bold flex items-center gap-2">
                                    <X size={16} /> Not scheduled for today. Please use "Make-up Class" tab if needed.
                                </span>
                            )}
                            {fetchingStatus && (
                                <span className="block mt-2 text-gray-500">Checking schedule...</span>
                            )}
                            {todayStatus?.isMakeupScheduled && (
                                <span className="block mt-2 font-bold text-emerald-600 flex items-center gap-2">
                                    <Calendar size={16} /> Make-up Class Scheduled for Today. You can start.
                                </span>
                            )}
                        </p>

                        <div className="mt-4">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Late Threshold (Minutes)</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={lateThreshold}
                                    onChange={(e) => setLateThreshold(parseInt(e.target.value) || 15)}
                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                />
                                <p className="text-xs text-gray-400 mt-1">Students arriving after {lateThreshold} minutes will be marked Late.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Make-up Session */}
                {type === 'makeup' && (
                    <div className="space-y-4 mb-6">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <p className="text-sm text-amber-800">
                                <strong>Make-up Class:</strong> Schedule a session for a different date/time. All enrolled students can attend.
                            </p>
                        </div>

                        {/* Make it by batch toggle */}
                        <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="makeupByBatch"
                                checked={makeupByBatch}
                                onChange={(e) => {
                                    setMakeupByBatch(e.target.checked);
                                    if (!e.target.checked) {
                                        setScheduledBatches([]);
                                        setSelectedStudents([]);
                                    }
                                }}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <label htmlFor="makeupByBatch" className="text-sm font-bold text-purple-700 cursor-pointer">
                                Make it by batch?
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Start Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input
                                        type="time"
                                        value={customTime}
                                        onChange={(e) => setCustomTime(e.target.value)}
                                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">End Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input
                                        type="time"
                                        value={customEndTime}
                                        onChange={(e) => setCustomEndTime(e.target.value)}
                                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Reason (Optional)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Missed class due to holiday"
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm resize-none"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Late Threshold (Minutes)</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={lateThreshold}
                                    onChange={(e) => setLateThreshold(parseInt(e.target.value) || 15)}
                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                />
                                <p className="text-xs text-gray-400 mt-1">Students arriving after {lateThreshold} minutes will be marked Late.</p>
                            </div>
                        </div>

                        {/* Batch Selection UI (shown when makeupByBatch is enabled) */}
                        {makeupByBatch && (
                            <div className="space-y-4 border-t-2 border-purple-200 pt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800">
                                        {viewMode === 'schedule' ? 'Schedule Batches' : 'Create New Batch'}
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode(viewMode === 'schedule' ? 'create_batch' : 'schedule')}
                                        className="text-sm text-brand-600 font-bold hover:underline"
                                    >
                                        {viewMode === 'schedule' ? '+ Create New Batch' : '← Back to Schedule'}
                                    </button>
                                </div>

                                {viewMode === 'create_batch' ? (
                                    // CREATE BATCH VIEW
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Batch Name</label>
                                            <input
                                                type="text"
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder="e.g., Batch 1"
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                                    <Users size={16} />
                                                    Select Students ({selectedStudents.length} / {students.length})
                                                </label>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={selectAll} className="text-xs text-brand-600 font-bold">Select All</button>
                                                    <span className="text-gray-300">|</span>
                                                    <button type="button" onClick={deselectAll} className="text-xs text-gray-600 font-bold">Deselect All</button>
                                                </div>
                                            </div>

                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search students..."
                                                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                                />
                                            </div>

                                            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                                                {loadingStudents ? (
                                                    <div className="p-8 text-center text-gray-500">Loading...</div>
                                                ) : filteredStudents.length === 0 ? (
                                                    <div className="p-8 text-center text-gray-500">No students found</div>
                                                ) : (
                                                    filteredStudents.map((student) => (
                                                        <label key={student.enrollment_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 border-l-4 border-l-transparent hover:border-l-brand-500">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudents.includes(student.enrollment_id)}
                                                                onChange={() => toggleStudent(student.enrollment_id)}
                                                                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium text-gray-900 text-sm">{student.last_name}, {student.first_name}</div>
                                                                    {!student.is_registered && <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border border-slate-700">NO ACCOUNT</span>}
                                                                </div>
                                                                <div className="text-xs text-gray-500">{student.user_id}</div>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSaveGroup}
                                            disabled={!newGroupName || selectedStudents.length === 0 || isSavingGroup}
                                            className="w-full bg-brand-600 text-white font-bold py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> {isSavingGroup ? 'Saving Batch...' : 'Save Batch'}
                                        </button>
                                    </div>
                                ) : (
                                    // SCHEDULE VIEW - Show saved batches
                                    <div className="space-y-3">
                                        {groups.length === 0 ? (
                                            <div className="text-center text-gray-500 py-8 border border-dashed border-gray-300 rounded-lg">
                                                No batches created yet. Click "+ Create New Batch" to get started.
                                            </div>
                                        ) : (
                                            groups.map((group) => (
                                                <div key={group.id} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduledBatches.some(b => b.groupId === group.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setScheduledBatches([...scheduledBatches, {
                                                                    groupId: group.id,
                                                                    groupName: group.name,
                                                                    enrollmentIds: group.enrollment_ids,
                                                                    date: customDate,
                                                                    startTime: customTime,
                                                                    endTime: customEndTime
                                                                }]);
                                                            } else {
                                                                setScheduledBatches(scheduledBatches.filter(b => b.groupId !== group.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm text-gray-800">{group.name}</div>
                                                        <div className="text-xs text-gray-500">{group.student_count} students</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Batch Session */}
                {type === 'batch' && (
                    <div className="space-y-4 mb-6">
                        {/* Schedule Warning */}
                        <div className={`border p-4 rounded-lg mb-4 ${!isRegularAllowed() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                            <p className={`text-sm ${!isRegularAllowed() ? 'text-red-800' : 'text-blue-800'}`}>
                                <strong>Batch Session:</strong> Schedule groups for specific times.
                                {!isRegularAllowed() && !fetchingStatus && (
                                    <span className="block mt-2 font-bold flex items-center gap-2">
                                        <X size={16} /> Not scheduled for today. Please use "Make-up Class" tab for off-schedule sessions.
                                    </span>
                                )}
                                {fetchingStatus && (
                                    <span className="block mt-2 text-gray-500">Checking schedule...</span>
                                )}
                            </p>
                        </div>

                        {/* View Switcher */}
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800">
                                {viewMode === 'schedule' ? 'Schedule Batches' : 'Create New Batch'}
                            </h4>
                            <button
                                onClick={() => setViewMode(viewMode === 'schedule' ? 'create_batch' : 'schedule')}
                                className="text-sm text-brand-600 font-bold hover:underline"
                            >
                                {viewMode === 'schedule' ? '+ Create New Batch' : '← Back to Schedule'}
                            </button>
                        </div>

                        {viewMode === 'create_batch' ? (
                            // --- CREATE BATCH VIEW ---
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Batch Name</label>
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g., Batch 1"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                                            <Users size={16} />
                                            Select Students ({selectedStudents.length} / {students.length})
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAll} className="text-xs text-brand-600 font-bold">Select All</button>
                                            <span className="text-gray-300">|</span>
                                            <button type="button" onClick={deselectAll} className="text-xs text-gray-600 font-bold">Deselect All</button>
                                        </div>
                                    </div>

                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search students..."
                                            className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                        />
                                    </div>

                                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                                        {loadingStudents ? (
                                            <div className="p-8 text-center text-gray-500">Loading...</div>
                                        ) : filteredStudents.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">No students found</div>
                                        ) : (
                                            filteredStudents.map((student) => (
                                                <label key={student.enrollment_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 border-l-4 border-l-transparent hover:border-l-brand-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student.enrollment_id)}
                                                        onChange={() => toggleStudent(student.enrollment_id)}
                                                        className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium text-gray-900 text-sm">{student.last_name}, {student.first_name}</div>
                                                            {!student.is_registered && <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border border-slate-700">NO ACCOUNT</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{student.user_id}</div>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveGroup}
                                    disabled={!newGroupName || selectedStudents.length === 0 || isSavingGroup}
                                    className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> {isSavingGroup ? 'Saving Batch...' : 'Save Batch'}
                                </button>
                            </div>
                        ) : (
                            // --- SCHEDULE VIEW ---
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Batch</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={selectedScheduleGroupId}
                                                        onChange={(e) => setSelectedScheduleGroupId(e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white font-bold text-brand-600"
                                                    >
                                                        <option value="">Select a batch...</option>
                                                        {groups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.name} ({g.enrollmentIds.length} students)</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
                                                </div>
                                                {selectedScheduleGroupId && (
                                                    <button
                                                        onClick={() => handleDeleteGroup(Number(selectedScheduleGroupId))}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200" title="Delete Batch"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Start Time</label>
                                            <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-brand-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">End Time</label>
                                            <input type="time" value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-brand-600" />
                                        </div>
                                    </div>
                                    <div className="mt-3 mb-3">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Late Threshold (Minutes)</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={lateThreshold}
                                                onChange={(e) => setLateThreshold(parseInt(e.target.value) || 15)}
                                                className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm font-bold text-brand-600"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddToSchedule}
                                        disabled={!selectedScheduleGroupId}
                                        className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                                    >
                                        + Add Batch to Schedule
                                    </button>
                                </div>

                                {/* Scheduled List */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase">Scheduled Batches</label>
                                    {scheduledBatches.length === 0 ? (
                                        <div className="text-gray-400 text-sm italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                                            No batches scheduled yet. Add one above.
                                        </div>
                                    ) : (
                                        scheduledBatches.map((batch, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div>
                                                    <div className="font-bold text-gray-800">{batch.groupName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={12} /> {batch.startTime} - {batch.endTime}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveFromSchedule(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Start Button */}
                <button
                    onClick={handleStartSession}
                    disabled={
                        loading ||
                        fetchingStatus ||
                        isRedirecting ||
                        (type === 'batch' && (scheduledBatches.length === 0 || !isBatchStartAllowed())) ||
                        (type === 'regular' && !isRegularAllowed())
                    }
                    className={`w-full text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${type === 'batch'
                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                        : type === 'makeup'
                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                            : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
                        }`}
                >
                    {loading || isRedirecting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <>
                            {getButtonText() === 'Schedule & Notify' ? <Calendar size={20} /> : <Play size={20} />}
                            {getButtonText()}
                        </>
                    )}
                </button>
            </div>
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
        </div >
    );
}
