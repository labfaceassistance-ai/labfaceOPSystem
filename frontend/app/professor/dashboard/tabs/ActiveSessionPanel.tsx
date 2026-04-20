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
        if (normalized === 'present') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (normalized === 'late') return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-red-600 bg-red-50 border-red-100';
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
        <div className="identity-glass p-8 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/10 flex flex-col overflow-hidden h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-3xl font-outfit">
            {/* Header */}
            <div className="p-4 border-b border-identity-sky/5 bg-white/40">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-black text-identity-navy flex items-center gap-4 uppercase tracking-tighter italic">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            Active Monitor
                        </h3>
                        <p className="text-[10px] text-identity-sky font-black uppercase tracking-[0.2em] mt-2 ml-6">
                            {error ? (
                                <button onClick={fetchSessionInfo} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors">
                                    <RefreshCw size={12} className="animate-spin-slow" /> Retry Connection
                                </button>
                            ) : (
                                sessionInfo?.subject_name || 'Synchronizing...'
                            )}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 ml-6 opacity-60">
                            Section {sessionInfo?.section || '---'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="w-full flex items-center justify-center gap-4 px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-xl shadow-rose-500/10 active:scale-95 disabled:opacity-50"
                >
                    {stopping ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Square size={16} fill="currentColor" />
                    )}
                    {stopping ? 'Terminating...' : 'Stop Monitoring'}
                </button>
            </div>

            {/* Stats Bar */}
            <div className="bg-white/10 px-6 py-3 border-b border-identity-sky/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-[0.2em]">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    {activity.filter(l => l.status.toLowerCase() === 'present').length} Present
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
                    <Activity size={12} className="text-identity-sky" />
                    Surveillance Active
                </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar bg-white/5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-10 h-10 relative">
                            <div className="absolute inset-0 border-3 border-identity-sky/20 rounded-full"></div>
                            <div className="absolute inset-0 border-3 border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.22em] animate-pulse">Syncing Logs...</p>
                    </div>
                ) : activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                        <div className="p-4 bg-identity-sky/5 rounded-full border border-identity-sky/10">
                            <Activity size={32} className="text-identity-sky/20" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-identity-navy uppercase tracking-[0.15em]">Awaiting Recognition</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Detection engine is primed</p>
                        </div>
                    </div>
                ) : (
                    activity
                        .filter((log) => log.status !== 'Unknown' && !log.status.startsWith('Log'))
                        .map((log) => (
                            <div
                                key={log.id}
                                className="bg-white/40 rounded-2xl p-4 border border-identity-sky/10 hover:border-identity-sky/30 transition-all animate-fade-in group shadow-sm flex items-center gap-4"
                            >
                                {/* Student Photo */}
                                <div className="w-11 h-11 rounded-2xl bg-white/60 flex-shrink-0 overflow-hidden ring-2 ring-white/40 group-hover:ring-identity-sky/30 transition-all border border-identity-sky/5">
                                    {log.id_photo ? (
                                        <img src={log.id_photo} alt={log.student_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={18} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>

                                {/* Activity Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-black text-identity-navy text-[11px] truncate uppercase tracking-tight">
                                            {log.student_name} {log.student_last_name}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-400 font-mono tracking-[0.15em]">
                                            {formatTime(log.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border ${getStatusColor(log.status)}`}>
                                            <div className={`w-1 h-1 rounded-full ${log.status.toLowerCase() === 'present' ? 'bg-emerald-500' : log.status.toLowerCase() === 'late' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                            {log.status}
                                        </span>
                                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] opacity-60">
                                            <Camera size={10} /> {log.recognition_method === 'CCTV' ? 'Optic' : 'Manual'}
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
