"use client";
import { useEffect, useRef, useState } from 'react';
import {
    TrendingUp, AlertTriangle, XCircle,
    BarChart3, Activity, BookOpen, Info, ChevronRight, Zap
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissedTopic {
    date: string;
    session: string;
    topics: string[];
    importance: string;
}

interface SubjectAnalytics {
    id: number;
    subjectName: string;
    subjectCode: string;
    schedule: string;
    color: string;
    totalSessions: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    effectiveAbsences: number; // absent + floor(late/3)
    attendanceRate: number;
    classAverageRate: number;
    streak: string;           // e.g. "PPLAPPPAPP"
    trend: number[];          // rate % per session (chronological)
    classTrend: number[];
    missedTopics: MissedTopic[];
}

interface AnalyticsTabProps {
    user: {
        id?: number;
        firstName: string;
        lastName: string;
        studentId?: string;
        course?: string;
        yearLevel?: string;
    };
}

// ─── Palette assigned to subjects ─────────────────────────────────────────────
const SUBJECT_COLOURS = [
    '#5CB4E4', // identity-sky
    '#4ade80', // green
    '#a78bfa', // purple
    '#fb923c', // orange
    '#f472b6', // pink
    '#34d399', // teal
];

// ─── Status helpers ───────────────────────────────────────────────────────────
function getStatus(eff: number, lates: number) {
    if (eff >= 3)           return { label: 'INELIGIBLE',       tw: 'bg-rose-500/15 text-rose-600 border-rose-400/30',   bar: '#f87171', borderCol: '#f87171' };
    if (eff >= 2)           return { label: 'CRITICAL RISK',   tw: 'bg-amber-500/10 text-amber-600 border-amber-400/30', bar: '#fbbf24', borderCol: '#fbbf24' };
    if (eff >= 1 || lates >= 2) return { label: 'ACADEMIC WARNING',    tw: 'bg-orange-500/10 text-orange-600 border-orange-300/30', bar: '#fb923c', borderCol: '#fb923c' };
    return { label: 'STABLE STATUS',    tw: 'bg-emerald-500/10 text-emerald-600 border-emerald-400/30', bar: '#4ade80', borderCol: '#4ade80' };
}

// ─── Streak dot colour map ────────────────────────────────────────────────────
const STREAK_COLOUR: Record<string, string> = {
    P: '#4ade80',
    L: '#fbbf24',
    A: '#f87171',
    E: '#5CB4E4',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnalyticsTab({ user }: AnalyticsTabProps) {
    const [subjects, setSubjects] = useState<SubjectAnalytics[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    const trendCanvasRef   = useRef<HTMLCanvasElement>(null);
    const compareCanvasRef = useRef<HTMLCanvasElement>(null);
    const trendChartRef    = useRef<any>(null);
    const compareChartRef  = useRef<any>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user.id) return;
        let cancelled = false;

        const fetchAnalytics = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                const axios = (await import('axios')).default;
                const { data } = await axios.get(`${API_URL}/api/student/analytics/${user.id}`);
                if (!cancelled) setSubjects(data);
            } catch (err: any) {
                if (!cancelled) setError('Unable to load analytics data. Please try again.');
                console.error('Analytics fetch error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAnalytics();
        return () => { cancelled = true; };
    }, [user.id]);

    // ── Build Charts ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (subjects.length === 0) return;

        const buildCharts = async () => {
            if (typeof window === 'undefined') return;
            if (!(window as any).Chart) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
                    script.onload = () => { resolve(); };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            const Chart = (window as any).Chart;
            const TC = '#64748b'; // slate-500
            const GC = 'rgba(92,180,228,.1)';

            // ── Trend chart ──────────────────────────────────────────────────
            if (trendCanvasRef.current) {
                if (trendChartRef.current) trendChartRef.current.destroy();
                const maxLen = Math.max(...subjects.map(s => s.trend.length), 1);
                const labels = Array.from({ length: maxLen }, (_, i) => `Session ${i + 1}`);
                trendChartRef.current = new Chart(trendCanvasRef.current, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            ...subjects.map(s => ({
                                data: s.trend,
                                borderColor: s.color,
                                borderShadowColor: `${s.color}30`,
                                fill: false,
                                tension: 0.45,
                                pointRadius: 5,
                                pointHoverRadius: 8,
                                pointBackgroundColor: s.color,
                                borderWidth: 3,
                                spanGaps: true,
                            })),
                            {
                                data: labels.map(() => 75),
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                borderDash: [6, 6],
                                borderWidth: 2,
                                pointRadius: 0,
                                fill: false,
                                label: 'Threshold'
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#0F172A',
                                titleFont: { family: 'Outfit', weight: '900', size: 12 },
                                bodyFont: { family: 'Outfit', weight: '700', size: 11 },
                                padding: 12,
                                cornerRadius: 8,
                                displayColors: true
                            }
                        },
                        scales: {
                            x: { ticks: { color: TC, font: { family: 'Outfit', weight: '700', size: 10 } }, grid: { display: false } },
                            y: {
                                min: 50, max: 105,
                                ticks: { color: TC, font: { family: 'Outfit', weight: '700', size: 10 }, callback: (v: number) => v + '%' },
                                grid: { color: GC, drawTicks: false },
                            },
                        },
                    },
                });
            }

            // ── Compare chart ────────────────────────────────────────────────
            if (compareCanvasRef.current) {
                if (compareChartRef.current) compareChartRef.current.destroy();
                compareChartRef.current = new Chart(compareCanvasRef.current, {
                    type: 'bar',
                    data: {
                        labels: subjects.map(s => s.subjectCode || s.subjectName.substring(0, 8)),
                        datasets: [
                            {
                                label: 'My Attendance',
                                data: subjects.map(s => s.attendanceRate),
                                backgroundColor: subjects.map(s =>
                                    s.attendanceRate < 75 ? 'rgba(239, 68, 68, 0.8)' :
                                    s.attendanceRate < 85 ? 'rgba(245, 158, 11, 0.8)' :
                                    'rgba(16, 185, 129, 0.75)'
                                ),
                                borderRadius: 8,
                                barThickness: 24,
                            },
                            {
                                label: 'Class Average',
                                data: subjects.map(s => s.classAverageRate),
                                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                                borderRadius: 8,
                                barThickness: 24,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#0F172A',
                                titleFont: { family: 'Outfit', weight: '900', size: 12 },
                                bodyFont: { family: 'Outfit', weight: '700', size: 11 },
                                padding: 12,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            x: { ticks: { color: TC, font: { family: 'Outfit', weight: '700', size: 10 } }, grid: { display: false } },
                            y: {
                                min: 0, max: 105,
                                ticks: { color: TC, font: { family: 'Outfit', weight: '700', size: 10 }, callback: (v: number) => v + '%' },
                                grid: { color: GC, drawTicks: false },
                            },
                        },
                    },
                });
            }
        };

        buildCharts();

        return () => {
            trendChartRef.current?.destroy();
            compareChartRef.current?.destroy();
        };
    }, [subjects]);

    if (loading) {
        return (
            <div className="space-y-12 animate-fade-in">
                <Skeleton variant="card" height="120px" />
                <Skeleton variant="card" height="300px" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <Skeleton variant="card" height="350px" />
                    <Skeleton variant="card" height="350px" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="identity-glass p-20 rounded-[3rem] border-2 border-rose-500/20 shadow-3xl text-center bg-white/40 backdrop-blur-xl">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border-2 border-rose-500/20">
                    <XCircle className="text-rose-500" size={42} />
                </div>
                <p className="text-rose-950 font-black text-xl uppercase tracking-[0.4em] mb-4 italic">Connection Error</p>
                <p className="text-rose-600/60 text-[12px] font-black uppercase tracking-[0.2em] italic max-w-sm mx-auto">{error}</p>
            </div>
        );
    }

    if (subjects.length === 0) {
        return (
            <div className="identity-glass p-20 rounded-[3rem] border-2 border-identity-sky/15 shadow-3xl bg-white/40 backdrop-blur-xl">
                <EmptyState
                    icon={BarChart3}
                    title="No Analytics Data"
                    description="Your attendance analytics will appear here once your records are updated."
                    className="py-12"
                />
            </div>
        );
    }

    const atRisk = subjects.filter(s => s.effectiveAbsences >= 2 || s.late >= 2);

    const overallStatus = (() => {
        const dropped   = subjects.some(s => s.effectiveAbsences >= 3);
        const watchOut  = subjects.some(s => s.effectiveAbsences >= 2);
        const takeCare  = subjects.some(s => s.effectiveAbsences >= 1 || s.late >= 2);

        if (dropped)  return { label: 'INELIGIBLE',   sub: 'Subject access revoked', tw: 'bg-rose-500/10 border-rose-500/30 text-rose-600' };
        if (watchOut) return { label: 'CRITICAL RISK',   sub: `${atRisk.length} subjects at risk`, tw: 'bg-amber-500/10 border-amber-500/30 text-amber-600' };
        if (takeCare) return { label: 'ACADEMIC WARNING',   sub: 'Monitoring active', tw: 'bg-orange-500/10 border-orange-500/30 text-orange-600' };
        return           { label: 'OPTIMAL PERFORMANCE',  sub: 'All subjects stable', tw: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' };
    })();

    return (
        <div className="space-y-14 animate-fade-up pb-20 font-outfit">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="identity-glass p-12 sm:p-14 rounded-[3.5rem] border-2 border-identity-sky/15 shadow-3xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-white/40 backdrop-blur-2xl">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint-fine" />
                <div className="corner-bracket-tl scale-110" />
                <div className="corner-bracket-br scale-110" />

                <div className="flex items-center gap-8 relative z-10">
                    <div className="p-7 bg-identity-navy text-white rounded-3xl border-2 border-identity-sky/25 shadow-3xl shadow-identity-navy/20">
                        <Activity size={42} className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-identity-navy uppercase tracking-tighter italic leading-none mb-4">
                            Attendance Analytics
                        </h1>
                        <p className="text-[11px] font-black text-identity-sky uppercase tracking-[0.5em] italic flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-identity-sky animate-status-pulse shadow-[0_0_10px_rgba(92,180,228,0.8)]" />
                            {subjects.length} Enrolled Subjects · Real-time synchronization active.
                        </p>
                    </div>
                </div>

                {/* Overall status badge */}
                <div className={`px-10 py-6 rounded-[2.5rem] border-2 ${overallStatus.tw} relative z-10 text-center min-w-[220px] backdrop-blur-md shadow-xl`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 italic opacity-70">Overall Status</div>
                    <div className="text-2xl font-black uppercase tracking-tight italic">{overallStatus.label}</div>
                    <div className="text-[10px] opacity-60 mt-2 font-black uppercase tracking-[0.2em] italic">{overallStatus.sub}</div>
                </div>
            </div>

            {/* ── Subject Report Table ─────────────────────────────────────── */}
            <div className="space-y-8">
                <p className="text-[12px] font-black text-identity-sky uppercase tracking-[0.5em] italic flex items-center gap-4 px-4">
                    <BookOpen size={18} />
                    Attendance Overview
                </p>

                <div className="identity-glass rounded-[4rem] border-2 border-identity-sky/15 shadow-3xl overflow-hidden bg-white/40 backdrop-blur-xl">
                    {/* Header row */}
                    <div className="hidden md:grid grid-cols-[1fr_70px_70px_80px_100px_160px_130px] bg-identity-navy text-white px-10 py-6 border-b-2 border-identity-sky/20">
                        {['Subject', 'Absences', 'Lates', 'Total Absences', 'Attendance %', 'Dropout Risk', 'Status'].map((h, i) => (
                            <div key={h} className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${i > 0 ? 'text-center' : ''}`}>{h}</div>
                        ))}
                    </div>

                    <div className="divide-y-2 divide-identity-sky/10">
                        {subjects.map((s, idx) => {
                            const st   = getStatus(s.effectiveAbsences, s.late);
                            const pct  = Math.min(100, Math.round((s.effectiveAbsences / 3) * 100));
                            const absLeft = Math.max(0, 3 - s.effectiveAbsences);
                            const latesLeft = 3 - (s.late % 3) === 3 ? 3 : 3 - (s.late % 3);

                            return (
                                <div
                                    key={s.id}
                                    className={`grid grid-cols-1 md:grid-cols-[1fr_70px_70px_80px_100px_160px_130px] items-center px-10 py-8 hover:bg-white/60 transition-all group/row relative overflow-hidden`}
                                    style={{ borderLeft: `5px solid ${st.borderCol}` }}
                                >
                                    <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-blueprint-fine" />
                                    
                                    {/* Subject name */}
                                    <div className="mb-6 md:mb-0">
                                        <div className="font-black text-lg italic uppercase tracking-tight" style={{ color: s.color }}>{s.subjectName}</div>
                                        <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-3">
                                            {s.subjectCode} <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {s.schedule}
                                        </div>
                                    </div>

                                    {/* Metrics with unified labels on mobile */}
                                    {[
                                        { label: 'ABS', val: s.absent, max: 3, warn: s.absent >= 2, critical: s.absent >= 3 },
                                        { label: 'LATE', val: s.late, warn: s.late >= 2, critical: s.late >= 3 },
                                        { label: 'EFF', val: s.effectiveAbsences, max: 3, warn: s.effectiveAbsences >= 2, critical: s.effectiveAbsences >= 3 },
                                        { label: 'RATE', val: `${s.attendanceRate}%`, warn: s.attendanceRate < 85, critical: s.attendanceRate < 75 }
                                    ].map((m, i) => (
                                        <div key={m.label} className="flex md:block items-center justify-between mb-2 md:mb-0">
                                            <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{m.label}: </span>
                                            <div className={`md:text-center text-xl font-black italic ${m.critical ? 'text-rose-600' : m.warn ? 'text-amber-500' : 'text-identity-navy/60'}`}>
                                                {m.val}{m.max && <span className="text-[11px] text-slate-400 font-black not-italic ml-1">/{m.max}</span>}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Dropout meter */}
                                    <div className="md:pr-10 mb-6 md:mb-0">
                                        <div className="h-3 w-full bg-slate-200/50 rounded-full overflow-hidden mb-3 border border-slate-300/30 p-[2px]">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
                                                style={{ width: `${pct}%`, background: st.borderCol }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] italic flex gap-3 items-center">
                                            {absLeft === 0 ? <span className="text-rose-600">INELIGIBLE</span> : 
                                             absLeft === 1 ? <span className="text-amber-600">1 Absence Remaining</span> : 
                                             <span className="text-emerald-600">{absLeft} Absences Remaining</span>}
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                            <span className="text-slate-400">{latesLeft} Lates until Absence</span>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <div className="md:text-right">
                                        <span className={`inline-flex px-6 py-2 rounded-2xl border-2 text-[11px] font-black uppercase tracking-[0.4em] italic shadow-lg ${st.tw}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer System Rules */}
                    <div className="px-10 py-8 bg-identity-navy text-white/50 border-t-2 border-identity-sky/20">
                        <div className="flex items-start gap-6 text-[10px] font-black uppercase tracking-[0.35em] italic leading-relaxed">
                            <Info size={16} className="text-identity-sky/80 flex-shrink-0 animate-pulse" />
                            Rules: 3 Lates = 1 Absence · 3 Absences = Ineligible · Minimum Requirement: 75% Attendance Rate
                        </div>
                    </div>
                </div>
            </div>

            {/* ── At-Risk HUD Drill-Down ───────────────────────────────── */}
            {atRisk.length > 0 && (
                <div className="space-y-8 animate-pulse-subtle">
                    <p className="text-[12px] font-black text-rose-500 uppercase tracking-[0.6em] italic flex items-center gap-4 px-4">
                        <AlertTriangle size={20} className="animate-pulse" />
                        Subjects at Risk
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {atRisk.map(s => {
                            const st      = getStatus(s.effectiveAbsences, s.late);
                            const absLeft = Math.max(0, 3 - s.effectiveAbsences);
                            const latesLeft = (3 - (s.late % 3)) === 0 ? 3 : 3 - (s.late % 3);

                            return (
                                <div
                                    key={s.id}
                                    className="identity-glass p-10 rounded-[3.5rem] border-2 border-rose-500/20 shadow-3xl relative overflow-hidden group bg-rose-500/[0.02] backdrop-blur-2xl"
                                    style={{ borderLeft: `4px solid ${st.borderCol}` }}
                                >
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />

                                    <div className="flex items-center gap-6 mb-10 relative z-10">
                                        <div className="w-16 h-16 rounded-2.5xl flex items-center justify-center bg-rose-500/15 border-2 border-rose-500/20 shadow-2xl">
                                            <AlertTriangle size={28} className="text-rose-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-xl italic uppercase tracking-tight" style={{ color: s.color }}>{s.subjectName}</div>
                                            <div className="text-[11px] text-rose-900/40 font-black uppercase tracking-[0.3em] mt-2 italic">{s.subjectCode} · ACADEMIC ALERT</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black italic text-rose-600 drop-shadow-sm">{s.attendanceRate}%</div>
                                            <div className="text-[10px] text-rose-900/30 font-black uppercase tracking-[0.2em] italic">ATTENDANCE RATE</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 mb-10 relative z-10">
                                        {[
                                            { label: 'Absences', val: `${s.absent}/3`, critical: s.absent >= 2 },
                                            { label: 'Total Lates', val: s.late, critical: s.late >= 2 },
                                            { label: 'Remaining', val: `${absLeft} Abs`, critical: absLeft <= 1 },
                                        ].map(item => (
                                            <div key={item.label} className="bg-white/60 border-2 border-rose-500/10 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all">
                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] italic mb-3">{item.label}</div>
                                                <div className={`text-2xl font-black italic ${item.critical ? 'text-rose-600' : 'text-identity-navy/60'}`}>{item.val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        {absLeft === 1 && (
                                            <div className="bg-rose-500 text-white rounded-2.5xl px-8 py-5 text-[12px] font-black uppercase tracking-[0.2em] italic flex items-center gap-4 shadow-2xl animate-pulse">
                                                <Zap size={18} className="animate-bounce" />
                                                CRITICAL: 1 ABSENCE REMAINING BEFORE INELIGIBILITY
                                            </div>
                                        )}
                                        <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-2.5xl px-8 py-4 text-[11px] font-black text-amber-700 uppercase tracking-[0.2em] italic flex items-center gap-4">
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                                            {latesLeft} lates until next absence
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Visual Data Engine ─────────────────────────────────────── */}
            <div className="space-y-8">
                <p className="text-[12px] font-black text-identity-sky uppercase tracking-[0.5em] italic flex items-center gap-4 px-4">
                    <TrendingUp size={20} />
                    Attendance Trends
                </p>

                <div className="identity-glass p-12 sm:p-14 rounded-[4rem] border-2 border-identity-sky/15 shadow-3xl relative overflow-hidden bg-white/40 backdrop-blur-xl group">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h3 className="font-black text-xl text-identity-navy italic uppercase tracking-tight mb-2">Session History</h3>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.15em] italic">The red line marks the 75% minimum requirement</p>
                            </div>
                            <div className="flex flex-wrap gap-6 p-4 bg-white/60 rounded-2.5xl border border-identity-sky/10 shadow-inner">
                                {subjects.map(s => (
                                    <div key={s.id} className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] italic" style={{ color: s.color }}>
                                        <span className="w-4 h-1.5 rounded-full" style={{ background: s.color }} />
                                        {s.subjectCode}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative w-full h-[300px] bg-slate-900/5 rounded-[2.5rem] p-8 border-2 border-identity-sky/5 shadow-inner">
                            <canvas ref={trendCanvasRef} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Compare bar chart */}
                    <div className="identity-glass p-10 sm:p-12 rounded-[4rem] border-2 border-identity-sky/15 shadow-3xl relative overflow-hidden bg-white/40 backdrop-blur-xl">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                        <div className="relative z-10">
                            <h3 className="font-black text-xl text-identity-navy italic uppercase tracking-tight mb-2">Personal Performance vs Class Average</h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] italic mb-10">Your attendance compared to the rest of the class</p>
                            
                            <div className="relative w-full h-[250px]">
                                <canvas ref={compareCanvasRef} />
                            </div>
                        </div>
                    </div>

                    {/* Attendance Pattern */}
                    <div className="identity-glass p-10 sm:p-12 rounded-[4rem] border-2 border-identity-sky/15 shadow-3xl relative overflow-hidden bg-white/40 backdrop-blur-xl">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint-fine" />
                        <div className="relative z-10">
                            <h3 className="font-black text-xl text-identity-navy italic uppercase tracking-tight mb-2">Attendance Pattern</h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] italic mb-12">Your attendance pattern for recent sessions</p>

                            <div className="space-y-8">
                                {subjects.map(s => (
                                    <div key={s.id} className="flex items-center gap-6 group/streak">
                                        <div className="min-w-[100px] text-[12px] font-black italic tracking-tighter uppercase transition-all group-hover/streak:scale-105" style={{ color: s.color }}>
                                            {s.subjectCode || s.subjectName}
                                        </div>
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {s.streak.split('').map((c, i) => (
                                                <div
                                                    key={i}
                                                    title={`S${i + 1}: ${c}`}
                                                    className="w-3.5 h-3.5 rounded-[4px] flex-shrink-0 transition-all hover:scale-150 hover:shadow-lg cursor-crosshair border border-white"
                                                    style={{ background: STREAK_COLOUR[c] || '#cbd5e1' }}
                                                />
                                            ))}
                                        </div>
                                        <div className={`text-xl font-black italic ml-auto flex-shrink-0 ${s.attendanceRate < 75 ? 'text-rose-600' : s.attendanceRate < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {s.attendanceRate}%
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-6 mt-12 pt-10 border-t-2 border-identity-sky/10">
                                {[
                                    { c: 'P', label: 'PRESENT', col: '#4ade80' },
                                    { c: 'L', label: 'LATE',  col: '#fbbf24' },
                                    { c: 'A', label: 'ABSENT',   col: '#f87171' },
                                    { c: 'E', label: 'EXCUSED', col: '#5CB4E4' },
                                ].map(item => (
                                    <div key={item.c} className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] italic">
                                        <span className="w-3.5 h-3.5 rounded-[4px] shadow-sm border border-slate-200" style={{ background: item.col }} />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
