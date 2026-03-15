import { useEffect, useState } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import { Activity, Clock, User, CheckCircle, AlertCircle, XCircle, Square, Camera, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActivityLog {
    id: number;
    time_in: string;
    status: string;
    recognition_method: string;
    created_at: string;
    student_name: string;
    student_last_name: string;
    student_id: string;
    id_photo: string | null;
}

interface ActiveSessionPanelProps {
    sessionId: string;
    onStopSession?: () => void;
}

export default function ActiveSessionPanel({ sessionId, onStopSession }: ActiveSessionPanelProps) {
    const router = useRouter();
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    const [stopping, setStopping] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    // Fetch session info
    const fetchSessionInfo = async () => {
        try {
            setError(null);
            const token = getToken();
            if (!token) {
                console.error('[ActiveSession] No token found');
                return;
            }
            console.log(`[ActiveSession] Fetching session info for ID: ${sessionId}`);
            const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('[ActiveSession] Session info received:', response.data);
            setSessionInfo(response.data);
        } catch (error: any) {
            console.error('[ActiveSession] Failed to fetch session info:', error);
            console.error('[ActiveSession] Error details:', error.response?.data || error.message);
            setError('Failed to load session info');
        }
    };

    useEffect(() => {
        if (sessionId) fetchSessionInfo();
    }, [sessionId]);

    // Fetch activity log
    const fetchActivity = async () => {
        try {
            const token = getToken();
            if (!token) {
                console.error('[ActiveSession] No token for activity fetch');
                setLoading(false);
                return;
            }
            console.log(`[ActiveSession] Fetching activity for session ID: ${sessionId}`);
            const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('[ActiveSession] Activity data received:', response.data);
            setActivity(response.data);
            setLoading(false);
        } catch (error: any) {
            console.error('[ActiveSession] Failed to fetch activity:', error);
            console.error('[ActiveSession] Activity error details:', error.response?.data || error.message);
            setLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        if (!sessionId) return;
        fetchActivity();
        const interval = setInterval(fetchActivity, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [sessionId]);

    // Stop monitoring
    const handleStop = async () => {
        setStopping(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            await axios.post(`${API_URL}/api/attendance/sessions/${sessionId}/stop`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (onStopSession) {
                onStopSession();
            }
        } catch (error) {
            console.error('Failed to stop monitoring:', error);
        } finally {
            setStopping(false);
        }
    };

    const getStatusColor = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === 'present') return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        if (normalized === 'late') return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
        return 'text-red-400 bg-red-500/20 border-red-500/30';
    };

    const getStatusIcon = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === 'present') return <CheckCircle size={16} />;
        if (normalized === 'late') return <AlertCircle size={16} />;
        return <XCircle size={16} />;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Active Session
                        </h3>
                        <p className="text-sm text-brand-400 font-semibold mt-1">
                            {error ? (
                                <button onClick={fetchSessionInfo} className="flex items-center gap-1 text-red-400 hover:text-red-300 underline">
                                    <RefreshCw size={12} /> Retry Loading
                                </button>
                            ) : (
                                sessionInfo?.subject_name || 'Loading...'
                            )}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {sessionInfo?.section}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-semibold text-sm border border-red-500/20 hover:border-red-500/30 transition-all mb-1"
                >
                    {stopping ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Square size={16} fill="currentColor" />
                    )}
                    {stopping ? 'Stopping...' : 'Stop Session'}
                </button>
            </div>

            {/* Stats Bar */}
            <div className="bg-slate-950/50 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle size={12} />
                    <span>{activity.filter(l => l.status.toLowerCase() === 'present').length} Present</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span>Running</span>
                </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 p-3 custom-scrollbar bg-slate-900/30">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="animate-pulse flex flex-col items-center gap-2">
                            <Activity size={24} className="opacity-50" />
                            <span className="text-xs">Connecting feed...</span>
                        </div>
                    </div>
                ) : activity.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                            <Activity size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No activity yet</p>
                            <p className="text-xs opacity-60">Students will appear here</p>
                        </div>
                    </div>
                ) : (
                    activity
                        .filter((log) => log.status !== 'Unknown' && !log.status.startsWith('Log'))
                        .map((log) => (
                            <div
                                key={log.id}
                                className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors animate-fade-in group"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Student Photo */}
                                    <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                                        {log.id_photo ? (
                                            <img src={log.id_photo} alt={log.student_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User size={16} className="text-slate-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Activity Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold text-white text-xs truncate">
                                                {log.student_name} {log.student_last_name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 ml-auto font-mono">
                                                {formatTime(log.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border ${getStatusColor(log.status)}`}>
                                                {log.status}
                                            </span>
                                            <span className="text-[10px] text-slate-600" title={log.recognition_method}>
                                                {log.recognition_method === 'CCTV' ? 'Via Camera' : 'Manual'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
