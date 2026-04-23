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
        <div className="space-y-6 animate-fade-up pb-20 font-outfit">
            {/* Tab Title HUD */}
            <div className="flex items-center gap-4 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
                <div className="flex flex-col items-center px-8">
                    <h1 className="text-[10px] font-black text-identity-sky uppercase tracking-[0.6em] italic opacity-70 mb-1">
                        STUDENT DASHBOARD
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(0,186,255,0.8)]" />
                        <span className="text-[12px] font-black text-identity-navy uppercase tracking-[0.2em] italic">PERFORMANCE ANALYTICS</span>
                    </div>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-identity-sky/20 to-transparent" />
            </div>


            {/* ── Subject Report Table ─────────────────────────────────────── */}
            <div className="space-y-4">
                <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] italic flex items-center gap-3 px-2">
                    <BookOpen size={14} />
                    ATTENDANCE OVERVIEW
                </p>

                <div className="identity-glass rounded-xl sm:rounded-2xl border border-identity-sky/15 shadow-xl overflow-hidden bg-white/40 backdrop-blur-xl">
                    <div className="hidden md:grid grid-cols-[1fr_80px_80px_100px_100px_160px_130px] bg-identity-navy text-white px-6 py-2.5">
                        {['SUBJECT', 'ABS', 'LATE', 'TOTAL', 'RATE %', 'RISK LEVEL', 'STATUS'].map((h, i) => (
                            <div key={h} className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] italic ${i > 0 ? 'text-center' : ''}`}>{h}</div>
                        ))}
                    </div>

                    <div className="divide-y divide-identity-sky/10">
                        {subjects.map((s, idx) => {
                            const st = getStatus(s.effectiveAbsences, s.late);
                            const pct = Math.min(100, Math.round((s.effectiveAbsences / 3) * 100));
                            const absLeft = Math.max(0, 3 - s.effectiveAbsences);
                            const latesLeft = 3 - (s.late % 3) === 3 ? 3 : 3 - (s.late % 3);

                            return (
                                <div
                                    key={s.id}
                                    className="grid grid-cols-1 md:grid-cols-[1fr_80px_80px_100px_100px_160px_130px] items-center px-5 sm:px-6 py-3.5 sm:py-4 hover:bg-white/60 transition-all group/row relative"
                                    style={{ borderLeft: `4px solid ${st.borderCol}` }}
                                >
                                    <div className="mb-4 md:mb-0">
                                        <div className="font-black text-[15px] italic uppercase tracking-tight" style={{ color: s.color }}>{s.subjectName}</div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">{s.subjectCode} · {s.schedule}</div>
                                    </div>

                                    {[s.absent, s.late, s.effectiveAbsences, `${s.attendanceRate}%`].map((val, i) => (
                                        <div key={i} className="flex md:block items-center justify-between mb-1 md:mb-0">
                                            <span className="md:hidden text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{['ABS', 'LATE', 'TOTAL', 'RATE'][i]}:</span>
                                            <div className="md:text-center text-sm font-black italic text-identity-navy/70">
                                                {val}{i === 2 && <span className="text-[9px] text-slate-300 not-italic ml-1">/3</span>}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="md:pr-6 mb-4 md:mb-0">
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2 p-[1px]">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: st.borderCol }} />
                                        </div>
                                        <div className="text-[8px] font-black uppercase tracking-[0.15em] italic flex gap-2">
                                            {absLeft === 0 ? <span className="text-rose-600">INELIGIBLE</span> : <span>{absLeft} LEFT</span>}
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-400">{latesLeft} TO ABS</span>
                                        </div>
                                    </div>

                                    <div className="md:text-right">
                                        <span className={`inline-flex px-4 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em] italic ${st.tw}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── At-Risk Drill-Down ───────────────────────────────── */}
            {atRisk.length > 0 && (
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.5em] italic flex items-center gap-3 px-2">
                        <AlertTriangle size={16} />
                        SUBJECTS AT RISK
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {atRisk.map(s => {
                            const st = getStatus(s.effectiveAbsences, s.late);
                            const absLeft = Math.max(0, 3 - s.effectiveAbsences);
                            return (
                                <div key={s.id} className="identity-glass p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-rose-500/20 shadow-lg relative overflow-hidden bg-rose-500/[0.02] backdrop-blur-xl">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
                                            <AlertTriangle size={18} className="text-rose-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-sm italic uppercase tracking-tight" style={{ color: s.color }}>{s.subjectName}</div>
                                            <div className="text-[8px] text-rose-900/40 font-black uppercase tracking-[0.2em] mt-1 italic">ACADEMIC ALERT</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black italic text-rose-600">{s.attendanceRate}%</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {[
                                            { label: 'ABS', val: `${s.absent}/3` },
                                            { label: 'LATES', val: s.late },
                                            { label: 'LEFT', val: absLeft },
                                        ].map(item => (
                                            <div key={item.label} className="bg-white/60 border border-rose-500/10 rounded-xl p-3 text-center">
                                                <div className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] italic mb-1">{item.label}</div>
                                                <div className="text-sm font-black italic text-identity-navy/70">{item.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {absLeft === 1 && (
                                        <div className="bg-rose-500 text-white rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] italic flex items-center gap-3 animate-pulse">
                                            <Zap size={12} /> CRITICAL: 1 ABSENCE REMAINING
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Visual Data Engine ─────────────────────────────────────── */}
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
    );
}
