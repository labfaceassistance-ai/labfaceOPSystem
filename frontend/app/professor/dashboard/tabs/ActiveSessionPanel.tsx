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
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 flex flex-col overflow-hidden h-[600px] animate-in fade-in slide-in-from-bottom-12 duration-1000 shadow-3xl font-outfit relative group">
            {/* Environmental HUD Elements */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/40 to-transparent top-0 z-20 animate-scan-y opacity-30 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
            
            {/* Header Telemetry Section */}
            <div className="p-8 bg-white/60 relative z-10 rounded-t-[2.5rem] border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                            <h3 className="font-black text-[#041C3C] uppercase tracking-[0.2em] italic text-lg">
                                Attendance Feed
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div className="p-2 bg-[#041C3C] text-[#5CB4E4] rounded-lg inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] italic shadow-xl border border-[#5CB4E4]/20">
                                {error ? (
                                    <button onClick={fetchSessionInfo} className="flex items-center gap-2 text-rose-500 hover:scale-105 transition-transform">
                                        <RefreshCw size={12} /> REFRESH
                                    </button>
                                ) : (
                                    <><Clock size={12} /> {sessionInfo?.subject_name || 'Loading...'}</>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] italic opacity-60">
                                <span className="flex items-center gap-2"><Monitor size={12} /> {sessionId.substring(0,8)}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="flex items-center gap-2"><Signal size={12} /> Section: {sessionInfo?.section || '...'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group/stop">
                        <button
                            onClick={handleStop}
                            disabled={stopping}
                            className={`relative px-8 py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-700 shadow-xl active:scale-95 italic flex items-center gap-4 border ${
                                stopping ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-[#041C3C] text-white border-rose-500/20 hover:bg-rose-600 hover:scale-105'
                            }`}
                        >
                            {stopping ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Square size={14} className="fill-white" />
                            )}
                            {stopping ? '...' : 'STOP'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics HUD Bar */}
            <div className="bg-[#041C3C] px-8 py-4 flex items-center justify-between relative z-10 shadow-xl border-y border-[#5CB4E4]/10">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] italic">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        {activity.filter(l => l.status.toLowerCase() === 'present').length} IN
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <div className="flex items-center gap-3 text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] italic">
                        <XCircle size={14} />
                        {activity.filter(l => l.status.toLowerCase() === 'absent').length} OUT
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[#5CB4E4] font-black text-[9px] uppercase tracking-[0.4em] italic">
                    <Shield size={14} /> SECURE
                </div>
            </div>

            {/* Real-time Activity Feed */}
            <div className="flex-1 overflow-y-auto space-y-4 p-8 custom-scrollbar bg-white/10 relative z-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-10">
                        <div className="w-20 h-20 relative">
                            <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-[2rem] rotate-45 blur-2xl animate-pulse" />
                            <div className="absolute inset-0 border-4 border-[#041C3C] border-t-transparent rounded-[2rem] rotate-45 animate-spin" />
                        </div>
                        <p className="text-[14px] font-black text-[#041C3C] uppercase tracking-widest animate-pulse italic">Loading Feed...</p>
                    </div>
                ) : activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-10 text-center animate-in fade-in zoom-in-95 duration-1000">
                        <div className="p-16 bg-white/80 rounded-full border border-white shadow-4xl group/empty animate-bounce-slow">
                            <Activity size={80} className="text-[#5CB4E4]/40 group-hover:text-[#5CB4E4] transition-all duration-700" />
                        </div>
                        <div className="space-y-6">
                            <p className="text-xl font-black text-[#041C3C] uppercase tracking-widest italic animate-pulse">Waiting for Students</p>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic max-w-sm">Camera is scanning for student arrivals...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activity
                            .filter((log) => log.status !== 'Unknown' && !log.status.startsWith('Log'))
                            .map((log) => (
                                    <div
                                    key={log.id}
                                    className="bg-white/80 rounded-[1.5rem] p-4 border border-white hover:border-[#5CB4E4]/50 transition-all duration-700 animate-in fade-in slide-in-from-right-12 group/item shadow-xl hover:-translate-x-2 flex items-center gap-6 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5CB4E4]/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                    
                                    {/* Student Profile Identity */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-14 h-14 rounded-[1.2rem] bg-white overflow-hidden ring-4 ring-slate-50 group-hover/item:ring-[#5CB4E4]/10 transition-all border border-slate-100 shadow-xl relative z-10">
                                            {log.id_photo ? (
                                                <img src={log.id_photo} alt={log.student_name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-1000" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[#5CB4E4]/20">
                                                    <User size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-xl z-20 transition-transform group-hover/item:scale-125 ${
                                            log.status.toLowerCase() === 'present' ? 'bg-emerald-500' : log.status.toLowerCase() === 'late' ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </div>
                                    </div>

                                    {/* Identity Metadata */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-black text-[#041C3C] text-lg truncate uppercase tracking-tight italic">
                                                {log.student_name} {log.student_last_name}
                                            </h4>
                                            <div className="text-slate-400 font-black text-[9px] italic opacity-60">
                                                {formatTime(log.created_at)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.3em] italic border transition-all ${
                                                log.status.toLowerCase() === 'present' 
                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                                : log.status.toLowerCase() === 'late' 
                                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                            }`}>
                                                {log.status === 'Present' ? 'PRESENT' : log.status === 'Late' ? 'LATE' : 'ABSENT'}
                                            </span>
                                            <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic opacity-40">
                                                {log.recognition_method === 'CCTV' ? 'AI Detection' : 'Manual Entry'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
            
            {/* HUD Footer Effects */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#5CB4E4] to-transparent shadow-[0_0_25px_rgba(92,180,228,1)] animate-pulse pointer-events-none opacity-40" />
            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-[#5CB4E4]/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-[#5CB4E4]/10 to-transparent pointer-events-none" />
        </div>
    );
}
