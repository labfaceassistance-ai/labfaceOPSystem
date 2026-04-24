"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { Calendar, Clock, User as UserIcon, AlertCircle, XCircle, CheckCircle, Filter, Camera, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import BackButton from '@/components/ui/BackButton';
import { getToken, getUser, getBackendUrl } from '../../../../utils/auth';
import { useMemo } from 'react';

interface HistoryRecord {
    date: string;
    weekday: string;
    status: string;
    timeIn: string | null;
    snapshotUrl?: string | null;
    recognitionMethod: string | null;
    startTime: string;
    type: string;
}

interface ClassData {
    classInfo: {
        id: number;
        subjectName: string;
        subjectCode: string;
        professor: string;
        schedule: any;
    };
    stats: {
        rate: number;
        present: number;
        late: number;
        excused: number;
        absent: number;
        total: number;
    };
    history: HistoryRecord[];
    currentBatch: any;
    availableBatches: any[];
    pendingRequests: any[];
}

import IdentityBackground from '../../../../components/IdentityBackground';
import StudentBatchModal from '../../../../components/StudentBatchModal';

export default function ClassDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id;

    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<ClassData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

    // Filter Stats
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilterType, setDateFilterType] = useState('All'); // 'All', 'Week', 'Month', 'Date'
    const [specificDate, setSpecificDate] = useState('');

    // Modal State
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

    useEffect(() => {
        const token = getToken();
        const userData = getUser();

        if (!token || !userData) {
            setError('Authentication missing. Please log in again.');
            setLoading(false);
            return;
        }

        setUser(userData);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !classId) return;

            setLoading(true);
            try {
                const axios = (await import('axios')).default;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

                const response = await axios.get(`${API_URL}/api/student/classes/${classId}/details?studentId=${user.id}`);
                setData(response.data);
            } catch (err: any) {
                console.error("Failed to fetch class details", err);
                setError(err.response?.data?.error || "Failed to load class details");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user, classId]);

    const filteredHistory = useMemo(() => {
        if (!data) return [];
        let filtered = data.history;

        // 1. Filter by Status
        if (statusFilter !== 'All') {
            filtered = filtered.filter((record: HistoryRecord) => record.status === statusFilter);
        }

        // 2. Filter by Date
        const today = new Date();
        if (dateFilterType === 'Week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 7);
            filtered = filtered.filter((record: HistoryRecord) => {
                const recordDate = new Date(record.date);
                return recordDate >= oneWeekAgo && recordDate <= today;
            });
        } else if (dateFilterType === 'Month') {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            filtered = filtered.filter((record: HistoryRecord) => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
            });
        } else if (dateFilterType === 'Date' && specificDate) {
            filtered = filtered.filter((record: HistoryRecord) => {
                const selected = new Date(specificDate).toDateString();
                const current = new Date(record.date).toDateString();
                return selected === current;
            });
        }

        return filtered;
    }, [data, statusFilter, dateFilterType, specificDate]);

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const date = new Date(`2000-01-01T${timeStr}`);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <IdentityBackground />
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-identity-sky/10"></div>
                    <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] animate-pulse">Loading Class Details...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-transparent font-sans p-8 relative overflow-hidden">
                <IdentityBackground />
                <Navbar />
                <div className="max-w-7xl mx-auto mt-28 relative z-10">
                    <div className="identity-glass border border-red-500/30 rounded-[2rem] p-12 text-center max-w-2xl mx-auto shadow-xl">
                        <XCircle className="mx-auto mb-6 text-red-500" size={48} />
                        <h1 className="text-2xl font-black text-identity-navy mb-3 uppercase tracking-tighter italic">Error Loading Class</h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.15em] mb-10">{error}</p>
                        <Link href="/student/dashboard" className="px-10 py-4 bg-identity-navy hover:bg-identity-sky text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] transition-all shadow-xl active:scale-95">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-outfit select-none text-slate-900 selection:bg-identity-sky/10 selection:text-identity-navy relative page-transition overflow-hidden">
            <IdentityBackground />
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
                {/* Header */}
                <div className="mb-12 relative z-30 animate-fade-up">
                    <BackButton 
                        href="/student/dashboard" 
                        label="Back to Dashboard" 
                        className="mb-8 bg-white/40 backdrop-blur-md rounded-2xl px-5 py-3 -ml-2 border border-identity-sky/10 shadow-sm italic" 
                    />
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-block px-5 py-2 rounded-2xl bg-identity-sky/10 text-identity-sky text-[10px] font-black uppercase tracking-[0.15em] border border-identity-sky/10 shadow-inner">
                                {data.classInfo.subjectCode}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-identity-navy uppercase tracking-tighter italic font-outfit leading-none">{data.classInfo.subjectName}</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.15em] text-[10px] flex items-center gap-3 italic">
                                <UserIcon size={16} className="text-identity-sky/50" /> {data.classInfo.professor}
                            </p>
                        </div>
                        
                        <div className="identity-glass px-8 py-5 rounded-[2rem] border border-identity-sky/10 flex items-center gap-6 shadow-xl animate-in fade-in zoom-in-95 duration-700">
                            <div className={`text-4xl md:text-5xl font-black italic tracking-tighter ${data.stats.rate >= 90 ? 'text-emerald-500' :
                                data.stats.rate >= 75 ? 'text-amber-500' :
                                    'text-red-500'
                                }`}>
                                {data.stats.rate}%
                            </div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] leading-relaxed">
                                ACADEMIC<br />ATTENDANCE RATE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
                    {[
                        { label: 'Present', val: data.stats.present, icon: CheckCircle, color: 'emerald' },
                        { label: 'Late', val: data.stats.late, icon: Clock, color: 'amber' },
                        { label: 'Excused', val: data.stats.excused, icon: AlertCircle, color: 'sky' },
                        { label: 'Absent', val: data.stats.absent, icon: XCircle, color: 'red' }
                    ].map((stat, i) => (
                        <div 
                            key={stat.label}
                            onClick={() => setStatusFilter(stat.label)} 
                            className={`cursor-pointer transition-all p-8 rounded-[2rem] border relative overflow-hidden group active:scale-95 shadow-lg ${
                                statusFilter === stat.label 
                                ? `bg-${stat.color}-500/5 border-${stat.color}-500/30 ring-2 ring-${stat.color}-500/20` 
                                : 'bg-white/40 border-identity-sky/5 hover:border-identity-sky/20 hover:bg-white/60 shadow-sm'
                            }`}
                        >
                            <div className="flex items-center gap-4 mb-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 ${
                                    stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' :
                                    stat.color === 'amber' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' :
                                    stat.color === 'sky' ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/10' :
                                    'bg-red-500/10 text-red-500 border-red-500/10'
                                }`}>
                                    <stat.icon size={24} />
                                </div>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-black text-identity-navy tracking-tighter italic pl-1 relative z-10">{stat.val}</div>
                        </div>
                    ))}
                </div>

                {/* Batch Management Card */}
                <div className="mb-12 animate-fade-up" style={{ animationDelay: '150ms' }}>
                    <div className="identity-glass p-8 rounded-[2rem] border border-identity-sky/10 shadow-xl bg-white/40 overflow-hidden relative group">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-identity-navy text-white flex items-center justify-center shadow-xl border-2 border-identity-sky/20 group-hover:rotate-3 transition-transform">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-2">Laboratory Batch Management</h3>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm italic ${
                                            data.currentBatch ? 'bg-identity-sky/10 text-identity-sky border-identity-sky/10' : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                            CURRENT: {data.currentBatch ? data.currentBatch.name : 'UNASSIGNED'}
                                        </div>
                                        {data.pendingRequests?.length > 0 && (
                                            <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] border border-amber-500/10 shadow-sm italic animate-pulse">
                                                REQUEST PENDING
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBatchModalOpen(true)}
                                className="w-full md:w-auto px-10 py-5 bg-identity-navy hover:bg-identity-sky text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl shadow-identity-navy/20 flex items-center justify-center gap-3 italic group/btn"
                            >
                                <UserPlus size={18} className="group-hover/btn:scale-110 transition-transform" /> Open Marketplace
                            </button>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="identity-glass rounded-[2.5rem] md:rounded-[3.5rem] border border-white/20 shadow-4xl relative overflow-hidden animate-fade-up bg-white/40 mb-16" style={{ animationDelay: '200ms' }}>
                    <div className="p-8 md:p-10 border-b border-identity-sky/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="bg-identity-sky/10 p-3 rounded-2xl border border-identity-sky/10">
                                <Calendar className="text-identity-sky" size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-identity-navy uppercase tracking-tighter italic font-outfit">Attendance History</h2>
                        </div>

                        {/* Filters Container */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Status Filter */}
                            <div className="relative group">
                                <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-identity-sky pointer-events-none" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-white/60 border border-slate-100 text-identity-navy pl-10 pr-10 py-4 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all appearance-none cursor-pointer hover:bg-white shadow-sm min-w-[160px]"
                                >
                                    <option value="All">All Records</option>
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Excused">Excused</option>
                                    <option value="Absent">Absent</option>
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="relative group">
                                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-identity-sky pointer-events-none" />
                                <select
                                    value={dateFilterType}
                                    onChange={(e) => setDateFilterType(e.target.value)}
                                    className="bg-white/60 border border-slate-100 text-identity-navy pl-10 pr-10 py-4 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all appearance-none cursor-pointer hover:bg-white shadow-sm min-w-[160px]"
                                >
                                    <option value="All">Full History</option>
                                    <option value="Week">Past 7 Days</option>
                                    <option value="Month">Current Month</option>
                                    <option value="Date">Specific Date</option>
                                </select>
                            </div>

                            {/* Specific Date Picker */}
                            {dateFilterType === 'Date' && (
                                <input
                                    type="date"
                                    value={specificDate}
                                    onChange={(e) => setSpecificDate(e.target.value)}
                                    className="bg-white/60 border border-slate-100 text-identity-navy px-6 py-4 rounded-2xl focus:outline-none focus:border-identity-sky font-black uppercase text-[10px] tracking-[0.15em] transition-all shadow-sm [color-scheme:light]"
                                />
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-identity-sky/5 max-h-[700px] overflow-y-auto custom-scrollbar">
                        {filteredHistory.length > 0 ? (
                            filteredHistory.map((record: HistoryRecord, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        if (record.snapshotUrl) {
                                            setSelectedRecord(record);
                                        }
                                    }}
                                    className={`px-8 py-8 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-all 
                                        ${record.snapshotUrl ? 'cursor-pointer hover:bg-identity-sky/[0.02]' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="bg-white border border-identity-sky/10 rounded-2xl p-4 text-center min-w-[85px] shadow-sm group-hover:scale-105 group-hover:border-identity-sky/30 transition-all">
                                            <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em] leading-none mb-1">{record.weekday}</div>
                                            <div className="text-2xl font-black text-identity-navy italic tracking-tighter">{record.date.split(',')[0].split(' ')[1]}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className={`text-xl font-black uppercase tracking-tighter italic italic ${record.type?.toLowerCase().includes('make') ? 'text-purple-500' :
                                                record.type?.toLowerCase().includes('batch') ? 'text-amber-500' :
                                                    'text-identity-navy group-hover:text-identity-sky transition-colors'
                                                }`}>
                                                {record.type ? (record.type.charAt(0).toUpperCase() + record.type.slice(1) + ' Session') : 'Scheduled Lecture'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-3">
                                                <Clock size={16} className="text-identity-sky/40" /> {formatTime(record.startTime)}
                                            </div>
                                            <div className="flex items-center gap-4 flex-wrap pt-2">
                                                {record.timeIn && (
                                                    <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-2xl text-[9px] font-black border border-emerald-500/10 uppercase tracking-[0.1em] italic">
                                                        <Clock size={12} /> Recorded Time: {record.timeIn}
                                                    </span>
                                                )}
                                                {record.snapshotUrl ? (
                                                    <span className="inline-flex items-center gap-2 bg-identity-sky/10 text-identity-sky px-4 py-1.5 rounded-2xl text-[9px] font-black border border-identity-sky/10 uppercase tracking-[0.1em] italic group-hover:bg-identity-sky group-hover:text-white transition-all shadow-sm">
                                                        <Camera size={14} /> View Biometric Proof
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-4">
                                        <span className={`inline-block px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] italic border shadow-sm ${record.status.toLowerCase() === 'present' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                                            record.status.toLowerCase() === 'late' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                                record.status.toLowerCase() === 'excused' ? 'text-identity-sky bg-identity-sky/10 border-identity-sky/20' :
                                                    'text-red-500 bg-red-500/10 border-red-500/20'
                                            }`}>
                                            {record.status}
                                        </span>
                                        {record.recognitionMethod && (
                                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] px-3 py-1 rounded-2xl bg-white border border-identity-sky/5 shadow-inner italic">
                                                Method: {record.recognitionMethod}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-24 text-center text-slate-400 space-y-4">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Calendar size={40} className="opacity-20 text-identity-navy" />
                                </div>
                                <p className="text-xl font-black text-identity-navy uppercase tracking-tighter italic">No Attendance Records Found</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No entries matching the selected criteria were identified.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Evidence Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-identity-navy/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedRecord(null)}>
                    <div className="identity-glass bg-white border border-identity-sky/20 rounded-[3rem] max-w-2xl w-full p-10 shadow-[0_0_80px_rgba(30,58,138,0.2)] relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="absolute top-8 right-8 text-slate-300 hover:text-identity-navy transition-colors bg-slate-50 p-2 rounded-2xl border border-slate-100"
                        >
                            <XCircle size={28} />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic font-outfit">Attendance Verification Record</h3>
                            <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic">{selectedRecord.date} · {selectedRecord.timeIn}</p>
                        </div>

                        <div className="bg-slate-50 rounded-[3rem] overflow-hidden border border-identity-sky/10 aspect-video flex items-center justify-center mb-10 shadow-inner group relative">
                            <div className="absolute inset-0 bg-identity-sky/5 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
                            </div>
                            {selectedRecord.snapshotUrl ? (
                                <img
                                    src={`${getBackendUrl()}${selectedRecord.snapshotUrl}`}
                                    alt="Attendance Proof"
                                    className="w-full h-full object-cover relative z-10"
                                />
                            ) : (
                                <div className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] relative z-10">Record Image Unavailable</div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-identity-sky/5 shadow-inner">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Status</span>
                                <span className={`text-lg font-black uppercase tracking-tighter italic ${selectedRecord.status === 'Present' ? 'text-emerald-500' :
                                    selectedRecord.status === 'Late' ? 'text-amber-500' : 'text-identity-navy'
                                    }`}>
                                    {selectedRecord.status}
                                </span>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-identity-sky/5 shadow-inner">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] block mb-2">Recognition Protocol</span>
                                <span className="text-lg font-black text-identity-navy uppercase tracking-tighter italic">{selectedRecord.recognitionMethod}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Batch Marketplace Modal */}
            {isBatchModalOpen && (
                <StudentBatchModal
                    isOpen={isBatchModalOpen}
                    onClose={() => setIsBatchModalOpen(false)}
                    classId={Number(classId)}
                    currentBatch={data.currentBatch}
                    availableBatches={data.availableBatches}
                    onSuccess={() => {
                        // Re-fetch data to show pending status or new batch
                        const fetchData = async () => {
                            try {
                                const axios = (await import('axios')).default;
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                const response = await axios.get(`${API_URL}/api/student/classes/${classId}/details?studentId=${user.id}`);
                                setData(response.data);
                            } catch (err) {
                                console.error("Refresh failed", err);
                            }
                        };
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

