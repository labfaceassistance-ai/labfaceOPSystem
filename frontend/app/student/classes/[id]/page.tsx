"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { Calendar, Clock, User as UserIcon, AlertCircle, XCircle, CheckCircle, ChevronLeft, Filter, Camera } from 'lucide-react';
import Link from 'next/link';
import { getToken, getUser, getBackendUrl } from '../../../../utils/auth';
import { useMemo } from 'react';

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
    history: {
        date: string;
        weekday: string;
        status: string;
        timeIn: string | null;
        snapshotUrl?: string | null;
        recognitionMethod: string | null;
        startTime: string;
        type: string;
    }[];
}

export default function ClassDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id;

    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<ClassData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter Stats
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilterType, setDateFilterType] = useState('All'); // 'All', 'Week', 'Month', 'Date'
    const [specificDate, setSpecificDate] = useState('');

    // Modal State
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    useEffect(() => {
        // Check auth using standard utils
        const token = getToken();
        // getUser() returns the parsed object, so we don't need JSON.parse later
        const userData = getUser();

        if (!token || !userData) {
            console.error('Missing auth data:', { token: !!token, userData: !!userData });
            setError('Authentication missing. Please log in again.');
            setLoading(false);
            // router.push('/login');
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
            filtered = filtered.filter(record => record.status === statusFilter);
        }

        // 2. Filter by Date
        const today = new Date();
        if (dateFilterType === 'Week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 7);
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= oneWeekAgo && recordDate <= today;
            });
        } else if (dateFilterType === 'Month') {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
            });
        } else if (dateFilterType === 'Date' && specificDate) {
            filtered = filtered.filter(record => {
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
            <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-950 text-white font-sans p-8">
                <Navbar />
                <div className="max-w-7xl mx-auto mt-8">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-2xl mx-auto">
                        <XCircle className="mx-auto mb-3 text-red-400" size={40} />
                        <h1 className="text-xl font-bold text-white mb-2">Error Loading Class</h1>
                        <p className="text-slate-400 mb-6">{error}</p>
                        <Link href="/student/dashboard" className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 pb-4 pt-20 md:px-8 md:pb-8 md:pt-28">
                {/* Header */}
                <div className="mb-8 relative z-30">
                    <Link href="/student/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors bg-slate-950/80 backdrop-blur-sm rounded-lg px-3 py-2 -ml-2 border border-slate-800/50 shadow-lg">
                        <ChevronLeft size={16} /> Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold border border-blue-500/30 mb-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                {data.classInfo.subjectCode}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{data.classInfo.subjectName}</h1>
                            <p className="text-slate-400 text-lg flex items-center gap-2">
                                <UserIcon size={18} /> {data.classInfo.professor}
                            </p>
                        </div>
                        <div className="bg-slate-900/50 px-6 py-3 rounded-xl border border-slate-800 flex items-center gap-3">
                            <div className={`text-4xl font-bold ${data.stats.rate >= 90 ? 'text-emerald-400' :
                                data.stats.rate >= 75 ? 'text-amber-400' :
                                    'text-red-400'
                                }`}>
                                {data.stats.rate}%
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                                OVERALL<br />ATTENDANCE RATE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div onClick={() => setStatusFilter('Present')} className={`cursor-pointer transition-all p-5 rounded-2xl border ${statusFilter === 'Present' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <CheckCircle size={18} />
                            </div>
                            <span className="text-slate-400 text-sm font-medium">Present</span>
                        </div>
                        <div className="text-2xl font-bold text-white pl-1">{data.stats.present}</div>
                    </div>
                    <div onClick={() => setStatusFilter('Late')} className={`cursor-pointer transition-all p-5 rounded-2xl border ${statusFilter === 'Late' ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-orange-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                                <Clock size={18} />
                            </div>
                            <span className="text-slate-400 text-sm font-medium">Late</span>
                        </div>
                        <div className="text-2xl font-bold text-white pl-1">{data.stats.late}</div>
                    </div>
                    <div onClick={() => setStatusFilter('Excused')} className={`cursor-pointer transition-all p-5 rounded-2xl border ${statusFilter === 'Excused' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-blue-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <AlertCircle size={18} />
                            </div>
                            <span className="text-slate-400 text-sm font-medium">Excused</span>
                        </div>
                        <div className="text-2xl font-bold text-white pl-1">{data.stats.excused}</div>
                    </div>
                    <div onClick={() => setStatusFilter('Absent')} className={`cursor-pointer transition-all p-5 rounded-2xl border ${statusFilter === 'Absent' ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-red-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                                <XCircle size={18} />
                            </div>
                            <span className="text-slate-400 text-sm font-medium">Absent</span>
                        </div>
                        <div className="text-2xl font-bold text-white pl-1">{data.stats.absent}</div>
                    </div>
                </div>

                {/* History List */}
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-brand-400" size={20} />
                            <h2 className="text-xl font-bold text-white">Attendance History</h2>
                        </div>

                        {/* Filters Container */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Status Filter */}
                            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                                <Filter size={14} className="text-slate-500 ml-2" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-transparent text-white text-sm px-2 py-1.5 focus:outline-none"
                                >
                                    <option value="All" className="bg-slate-900 text-slate-200">All Status</option>
                                    <option value="Present" className="bg-slate-900 text-slate-200">Present</option>
                                    <option value="Late" className="bg-slate-900 text-slate-200">Late</option>
                                    <option value="Excused" className="bg-slate-900 text-slate-200">Excused</option>
                                    <option value="Absent" className="bg-slate-900 text-slate-200">Absent</option>
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                                <Calendar size={14} className="text-slate-500 ml-2" />
                                <select
                                    value={dateFilterType}
                                    onChange={(e) => {
                                        setDateFilterType(e.target.value);
                                    }}
                                    className="bg-transparent text-white text-sm px-2 py-1.5 focus:outline-none"
                                >
                                    <option value="All" className="bg-slate-900 text-slate-200">All Time</option>
                                    <option value="Week" className="bg-slate-900 text-slate-200">This Week</option>
                                    <option value="Month" className="bg-slate-900 text-slate-200">This Month</option>
                                    <option value="Date" className="bg-slate-900 text-slate-200">Specific Date</option>
                                </select>
                            </div>

                            {/* Specific Date Picker */}
                            {dateFilterType === 'Date' && (
                                <input
                                    type="date"
                                    value={specificDate}
                                    onChange={(e) => setSpecificDate(e.target.value)}
                                    className="bg-slate-800 text-white text-sm rounded-lg border border-slate-700 px-3 py-1.5 focus:outline-none focus:border-brand-500"
                                />
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
                        {filteredHistory.length > 0 ? (
                            filteredHistory.map((record, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        if (record.snapshotUrl) {
                                            setSelectedRecord(record);
                                        }
                                    }}
                                    className={`p-4 flex items-center justify-between group transition-colors 
                                        ${record.snapshotUrl ? 'cursor-pointer hover:bg-slate-800/50' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-800 rounded-lg p-3 text-center min-w-[70px] border border-slate-700 group-hover:border-slate-600 transition-colors">
                                            <div className="text-xs text-slate-400 uppercase font-bold">{record.weekday}</div>
                                            <div className="text-lg font-bold text-white">{record.date.split(',')[0].split(' ')[1]}</div>
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold mb-0.5 ${record.type?.toLowerCase().includes('make') ? 'text-purple-400' :
                                                record.type?.toLowerCase().includes('batch') ? 'text-amber-400' :
                                                    'text-slate-300'
                                                }`}>
                                                {record.type ? (record.type.charAt(0).toUpperCase() + record.type.slice(1) + ' Session') : 'Regular Session'}
                                            </div>
                                            <div className="text-sm text-slate-400 mb-2 flex items-center gap-1.5">
                                                <Clock size={14} /> {formatTime(record.startTime)}
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {record.timeIn && (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">
                                                        <Clock size={12} /> Time In: {record.timeIn}
                                                    </span>
                                                )}
                                                {record.snapshotUrl ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-500/20 uppercase tracking-wide cursor-pointer hover:bg-blue-500/20 transition-colors">
                                                        <Camera size={12} /> View Snapshot
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end justify-center min-w-[100px] h-full gap-2 md:items-center">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${record.status.toLowerCase() === 'present' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                            record.status.toLowerCase() === 'late' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                                record.status.toLowerCase() === 'excused' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                                                    'text-red-400 bg-red-500/10 border-red-500/20'
                                            }`}>
                                            {record.status}
                                        </span>
                                        {record.recognitionMethod && (
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                                                {record.recognitionMethod}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} records found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Evidence Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedRecord(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <XCircle size={24} />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white">Attendance Proof</h3>
                            <p className="text-slate-400 text-sm mt-1">{selectedRecord.date} • {selectedRecord.timeIn}</p>
                        </div>

                        <div className="bg-black rounded-xl overflow-hidden border border-slate-800 aspect-video flex items-center justify-center mb-6">
                            {selectedRecord.snapshotUrl ? (
                                <img
                                    src={`${getBackendUrl()}${selectedRecord.snapshotUrl}`}
                                    alt="Attendance Proof"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="text-slate-500">No image available</div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <span className="text-xs text-slate-500 block">Status</span>
                                <span className={`font-bold ${selectedRecord.status === 'Present' ? 'text-emerald-400' :
                                    selectedRecord.status === 'Late' ? 'text-orange-400' : 'text-white'
                                    }`}>
                                    {selectedRecord.status}
                                </span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <span className="text-xs text-slate-500 block">Method</span>
                                <span className="font-bold text-white">{selectedRecord.recognitionMethod}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
