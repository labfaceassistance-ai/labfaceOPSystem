import { useEffect, useState } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import { Activity, Clock, User, CheckCircle, AlertCircle, XCircle, Square, Camera, RefreshCw, Signal, Shield, Monitor } from 'lucide-react';
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

    const fetchSessionInfo = async () => {
        try {
            setError(null);
            const token = getToken();
            if (!token) return;
            const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSessionInfo(response.data);
        } catch (error: any) {
            setError('Failed to load session info');
        }
    };

    useEffect(() => {
        if (sessionId) fetchSessionInfo();
    }, [sessionId]);

    const fetchActivity = async () => {
        try {
            const token = getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            const response = await axios.get(`${API_URL}/api/attendance/sessions/${sessionId}/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivity(response.data);
            setLoading(false);
        } catch (error: any) {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionId) return;
        fetchActivity();
        const interval = setInterval(fetchActivity, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleStop = async () => {
        setStopping(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            await axios.post(`${API_URL}/api/attendance/sessions/${sessionId}/stop`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (onStopSession) onStopSession();
        } catch (error) {
            console.error('Failed to stop monitoring:', error);
        } finally {
            setStopping(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 flex flex-col overflow-hidden h-[600px] animate-in fade-in duration-700 shadow-xl font-outfit relative">
            
            {/* Header section */}
            <div className="p-6 bg-white border-b border-slate-50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <h3 className="font-bold text-[#041C3C] uppercase tracking-wider text-sm">
                            Attendance Feed
                        </h3>
                    </div>
                    <button
                        onClick={handleStop}
                        disabled={stopping}
                        className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                            stopping ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        }`}
                    >
                        {stopping ? 'Stopping...' : 'Stop Monitoring'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 bg-[#041C3C] text-white rounded-lg inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                        <Clock size={12} /> {sessionInfo?.subject_name || 'Loading...'}
                    </div>
                    <div className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest border border-slate-100">
                        <Signal size={12} /> Section: {sessionInfo?.section || '...'}
                    </div>
                </div>
            </div>

            {/* Metrics bar */}
            <div className="bg-slate-50/50 px-6 py-3 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {activity.filter(l => l.status.toLowerCase() === 'present').length} Present
                    </div>
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-[10px] uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {activity.filter(l => l.status.toLowerCase() === 'absent').length} Absent
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[#5CB4E4] font-bold text-[9px] uppercase tracking-widest opacity-80">
                    <Shield size={12} /> SECURE
                </div>
            </div>

            {/* Activity Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 p-6 custom-scrollbar bg-slate-50/20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <RefreshCw size={24} className="text-[#5CB4E4] animate-spin" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Feed...</p>
                    </div>
                ) : activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center opacity-60">
                        <div className="p-10 bg-white rounded-full border border-slate-100 shadow-sm animate-bounce-slow">
                            <Activity size={40} className="text-[#5CB4E4]/40" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-[#041C3C] uppercase tracking-widest">Waiting for Students</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider max-w-[200px] leading-relaxed mx-auto">Camera is scanning for student arrivals...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 pb-6">
                        {activity
                            .filter((log) => log.status !== 'Unknown' && !log.status.startsWith('Log'))
                            .map((log) => (
                                <div
                                    key={log.id}
                                    className="bg-white rounded-2xl p-3 border border-slate-100 hover:border-[#5CB4E4]/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-sm flex items-center gap-4 group"
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                                            {log.id_photo ? (
                                                <img src={log.id_photo} alt={log.student_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <User size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                            log.status.toLowerCase() === 'present' ? 'bg-emerald-500' : log.status.toLowerCase() === 'late' ? 'bg-amber-500' : 'bg-rose-500'
                                        }`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-[#041C3C] text-[12px] truncate uppercase tracking-tight">
                                                {log.student_name} {log.student_last_name}
                                            </h4>
                                            <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider">
                                                {formatTime(log.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-[7px] font-bold uppercase tracking-widest ${
                                                log.status.toLowerCase() === 'present' ? 'text-emerald-500' : log.status.toLowerCase() === 'late' ? 'text-amber-500' : 'text-rose-500'
                                            }`}>
                                                {log.status}
                                            </span>
                                            <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest italic opacity-60">
                                                {log.recognition_method === 'CCTV' ? 'AI Scan' : 'Manual'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="bg-white border-t border-slate-50 p-3 text-center">
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">Monitoring Live Activity</span>
            </div>
        </div>
    );
}
