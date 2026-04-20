'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import {
    BarChart3, Users, AlertTriangle, TrendingDown, Activity,
    ChevronRight, Brain, Copy, Check
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Section color palette (assigned by class index) ──────────────────────
const SECTION_PALETTE = ['#5CB4E4', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];

// ─── Types ─────────────────────────────────────────────────────────────────
interface AnalyticsTabProps { user: any; classes: any[]; }

interface DashboardKPIs { avgAttendance: number; absentToday: number; atRisk: number; dropoutTriggered: number; }
interface SessionSection { section: string; classId: number; rates: (number | null)[]; }
interface SessionData { sessions: string[]; sections: SessionSection[]; }
interface StatusBreakdown { present: number; late: number; absent: number; total: number; }
interface SectionStat { section: string; classId: number; present: number; late: number; absent: number; }
interface HeatmapData { slots: string[]; days: string[]; data: number[][]; }
interface DayCount { day: string; shortDay: string; count: number; }
interface StudentRisk {
    id: number; name: string; studentNumber: string; section: string; classId: number;
    absences: number; lates: number; effAbs: number; attendanceRate: number;
    streak: string[]; consecutiveAbs: number; riskScore: number;
    status: string; interventionStatus: string; missedTopics: string[]; pattern: string;
}
interface SemComparison { section: string; classId: number; lastSem: number; thisSem: number; }
interface ConsecAbsence { studentId: number; name: string; section: string; streak: string[]; consecutiveAbs: number; }
interface PeerGroup { students: string[]; count: number; }

interface AllData {
    kpis: DashboardKPIs;
    sessionData: SessionData;
    statusBreakdown: StatusBreakdown;
    bySection: SectionStat[];
    heatmap: HeatmapData;
    byDay: DayCount[];
    students: StudentRisk[];
    semComparison: SemComparison[];
    consecutiveAbsences: ConsecAbsence[];
    peerGroups: PeerGroup[];
}

// ─── Small presentational components (defined outside to avoid re-init) ───
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Dropout: 'bg-red-500/20 text-red-400 border-red-500/30',
        Critical: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'High Risk': 'bg-amber-400/15 text-amber-300 border-amber-400/20',
        Good: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] rounded border ${map[status] || map.Good}`}>
            {status}
        </span>
    );
}

function InterventionBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Improved: 'bg-emerald-500/20 text-emerald-400',
        'No change': 'bg-amber-500/20 text-amber-400',
        Pending: 'bg-slate-500/20 text-slate-400',
        None: 'bg-slate-800/60 text-slate-600',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] rounded ${map[status] || map.None}`}>
            {status}
        </span>
    );
}

function StreakDots({ streak }: { streak: string[] }) {
    return (
        <div className="flex gap-1 flex-wrap">
            {streak.slice(0, 8).map((s, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s === 'Present' ? '#10B981' : s === 'Late' ? '#F59E0B' : '#EF4444' }}
                    title={s}
                />
            ))}
        </div>
    );
}

function RiskMiniBar({ score }: { score: number }) {
    const color = score >= 80 ? '#EF4444' : score >= 50 ? '#F59E0B' : '#10B981';
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-14 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
            <span className="text-[9px] font-black" style={{ color }}>{score}%</span>
        </div>
    );
}

// ─── Heatmap colour helper ─────────────────────────────────────────────────
function heatColor(val: number): string {
    if (val === 0) return 'rgba(92,180,228,0.05)';
    if (val <= 1) return 'rgba(59,130,246,0.45)';
    if (val <= 4) return 'rgba(245,158,11,0.55)';
    if (val <= 7) return 'rgba(248,113,113,0.55)';
    return 'rgba(239,68,68,0.82)';
}

// ─── Spinner ───────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div className="w-8 h-8 relative">
            <div className="absolute inset-0 border-3 border-identity-sky/20 rounded-full" />
            <div className="absolute inset-0 border-3 border-identity-sky border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function AnalyticsTab({ user, classes }: AnalyticsTabProps) {
    const activeClasses = useMemo(() => classes.filter(c => !c.is_archived), [classes]);

    // Dynamic section colour mapping built from professor's actual classes
    const sections = useMemo(() => {
        const unique = [...new Set(activeClasses.map(c => c.section).filter(Boolean))];
        return unique.map((s, i) => ({ id: s as string, label: s as string, color: SECTION_PALETTE[i % SECTION_PALETTE.length] }));
    }, [activeClasses]);

    const sectionColor = useCallback((section: string) => {
        const found = sections.find(s => s.id === section);
        return found?.color ?? '#5CB4E4';
    }, [sections]);

    // ── State ────────────────────────────────────────────────────────────
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'students'>('dashboard');
    const [activeSection, setActiveSection] = useState<string>('all');
    const [activePeriod, setActivePeriod] = useState<'semester' | 'week'>('semester');
    const [activeDay, setActiveDay] = useState<'all' | 'mwf' | 'tth'>('all');
    const [selectedStudent, setSelectedStudent] = useState<StudentRisk | null>(null);
    const [allData, setAllData] = useState<AllData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartJsLoaded, setChartJsLoaded] = useState(false);
    const [interventionLog, setInterventionLog] = useState<any[]>([]);
    const [aiCopied, setAiCopied] = useState(false);

    // ── Canvas refs ──────────────────────────────────────────────────────
    const lineRef = useRef<HTMLCanvasElement>(null);
    const lineInst = useRef<any>(null);
    const doughnutRef = useRef<HTMLCanvasElement>(null);
    const doughnutInst = useRef<any>(null);
    const groupedRef = useRef<HTMLCanvasElement>(null);
    const groupedInst = useRef<any>(null);
    const rankRef = useRef<HTMLCanvasElement>(null);
    const rankInst = useRef<any>(null);
    const stackedRef = useRef<HTMLCanvasElement>(null);
    const stackedInst = useRef<any>(null);
    const dayRef = useRef<HTMLCanvasElement>(null);
    const dayInst = useRef<any>(null);
    const semRef = useRef<HTMLCanvasElement>(null);
    const semInst = useRef<any>(null);

    // ── Derived / filtered data ──────────────────────────────────────────
    const filteredData = useMemo((): AllData | null => {
        if (!allData) return null;
        if (activeSection === 'all') return allData;
        return {
            ...allData,
            bySection: allData.bySection.filter(s => s.section === activeSection),
            semComparison: allData.semComparison.filter(s => s.section === activeSection),
            students: allData.students.filter(s => s.section === activeSection),
            sessionData: {
                sessions: allData.sessionData.sessions,
                sections: allData.sessionData.sections.filter(s => s.section === activeSection),
            },
        };
    }, [allData, activeSection]);

    const filteredStudents = useMemo(() =>
        activeSection === 'all' ? (allData?.students ?? []) : (allData?.students.filter(s => s.section === activeSection) ?? []),
        [allData, activeSection]);

    const atRiskStudents = useMemo(() => filteredStudents.filter(s => s.status !== 'Good'), [filteredStudents]);

    const studentKPIs = useMemo(() => ({
        dropout: filteredStudents.filter(s => s.effAbs >= 3).length,
        critical: filteredStudents.filter(s => s.effAbs === 2).length,
        highRisk: filteredStudents.filter(s => s.effAbs < 2 && s.attendanceRate < 75).length,
        pending: filteredStudents.filter(s => s.interventionStatus === 'Pending').length,
    }), [filteredStudents]);

    // ── Data fetch ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const uid = user.professorId || user.userId || user.user_id;
        if (!uid) return;

        const load = async () => {
            setLoading(true);
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };
            const B = `${API_URL}/api/analytics/professor/${uid}`;

            const settled = await Promise.allSettled([
                axios.get(`${B}/dashboard`, { headers }),
                axios.get(`${B}/attendance-by-session`, { headers }),
                axios.get(`${B}/status-breakdown`, { headers }),
                axios.get(`${B}/by-section`, { headers }),
                axios.get(`${B}/absence-heatmap`, { headers }),
                axios.get(`${B}/absence-by-day`, { headers }),
                axios.get(`${B}/students-at-risk`, { headers }),
                axios.get(`${B}/semester-comparison`, { headers }),
                axios.get(`${B}/consecutive-absences`, { headers }),
                axios.get(`${B}/peer-groups`, { headers }),
            ]);

            const v = (r: any, fb: any) => r.status === 'fulfilled' ? r.value.data : fb;

            setAllData({
                kpis: v(settled[0], { avgAttendance: 0, absentToday: 0, atRisk: 0, dropoutTriggered: 0 }),
                sessionData: v(settled[1], { sessions: [], sections: [] }),
                statusBreakdown: v(settled[2], { present: 0, late: 0, absent: 0, total: 0 }),
                bySection: v(settled[3], []),
                heatmap: v(settled[4], { slots: [], days: [], data: [] }),
                byDay: v(settled[5], []),
                students: v(settled[6], []),
                semComparison: v(settled[7], []),
                consecutiveAbsences: v(settled[8], []),
                peerGroups: v(settled[9], []),
            });
            setLoading(false);
        };
        load();
    }, [user]);

    // ── Load Chart.js 4.4.1 from CDN ─────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if ((window as any).Chart) { setChartJsLoaded(true); return; }
        const existing = document.querySelector('script[data-chartjs="1"]');
        if (existing) { existing.addEventListener('load', () => setChartJsLoaded(true)); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
        s.setAttribute('data-chartjs', '1');
        s.onload = () => setChartJsLoaded(true);
        document.head.appendChild(s);
    }, []);

    // ── Destroy helper ───────────────────────────────────────────────────
    const kill = (inst: React.MutableRefObject<any>) => {
        if (inst.current) { inst.current.destroy(); inst.current = null; }
    };

    // ── Initialise / update all charts ───────────────────────────────────
    useEffect(() => {
        if (!chartJsLoaded || !filteredData || activeSubTab !== 'dashboard') return;
        const C = (window as any).Chart;
        if (!C) return;

        // Global defaults for dark theme
        try {
            C.defaults.color = '#94a3b8';
            C.defaults.borderColor = 'rgba(92,180,228,0.08)';
            C.defaults.font = { family: 'Outfit, sans-serif', size: 11 };
        } catch (_) { /* ignore */ }

        const scale = { grid: { color: 'rgba(92,180,228,0.07)' }, ticks: { color: '#64748b' } };

        /* ▼ 1. Line — attendance rate per session ──────────────────────── */
        kill(lineInst);
        if (lineRef.current) {
            lineInst.current = new C(lineRef.current, {
                type: 'line',
                data: {
                    labels: filteredData.sessionData.sessions,
                    datasets: [
                        ...filteredData.sessionData.sections.map((sec) => ({
                            label: sec.section,
                            data: sec.rates,
                            borderColor: sectionColor(sec.section),
                            backgroundColor: `${sectionColor(sec.section)}18`,
                            fill: false, tension: 0.4, pointRadius: 4, borderWidth: 2, spanGaps: true,
                        })),
                        {
                            label: '75% Threshold',
                            data: filteredData.sessionData.sessions.map(() => 75),
                            borderColor: '#EF4444', borderDash: [6, 3], borderWidth: 1.5,
                            pointRadius: 0, fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', boxWidth: 10, padding: 14, font: { size: 11 } } },
                        tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${c.raw ?? 'N/A'}%` } },
                    },
                    scales: {
                        x: scale,
                        y: { ...scale, min: 0, max: 100, ticks: { ...scale.ticks, callback: (v: any) => `${v}%` } },
                    },
                },
            });
        }

        /* ▼ 2. Doughnut — status breakdown ─────────────────────────────── */
        kill(doughnutInst);
        if (doughnutRef.current) {
            const bd = filteredData.statusBreakdown;
            doughnutInst.current = new C(doughnutRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Late', 'Absent'],
                    datasets: [{
                        data: [bd.present, bd.late, bd.absent],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                        borderColor: '#041C3C', borderWidth: 3,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '62%',
                    plugins: {
                        legend: {
                            position: 'bottom' as const,
                            labels: {
                                color: '#94a3b8', boxWidth: 10, padding: 12,
                                generateLabels: (chart: any) => {
                                    const d = chart.data;
                                    const total = bd.total || 1;
                                    return d.labels.map((lbl: string, i: number) => ({
                                        text: `${lbl}  ${d.datasets[0].data[i]}  (${Math.round(d.datasets[0].data[i] / total * 100)}%)`,
                                        fillStyle: d.datasets[0].backgroundColor[i],
                                        index: i,
                                    }));
                                },
                            },
                        },
                    },
                },
            });
        }

        /* ▼ 3. Grouped bar — P / L / A by section ──────────────────────── */
        kill(groupedInst);
        if (groupedRef.current) {
            groupedInst.current = new C(groupedRef.current, {
                type: 'bar',
                data: {
                    labels: filteredData.bySection.map(s => s.section),
                    datasets: [
                        { label: 'Present', data: filteredData.bySection.map(s => s.present), backgroundColor: '#10B981', borderRadius: 3 },
                        { label: 'Late', data: filteredData.bySection.map(s => s.late), backgroundColor: '#F59E0B', borderRadius: 3 },
                        { label: 'Absent', data: filteredData.bySection.map(s => s.absent), backgroundColor: '#EF4444', borderRadius: 3 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 10 } } },
                    scales: { x: scale, y: { ...scale, beginAtZero: true } },
                },
            });
        }

        /* ▼ 4. Horizontal bar — absence rate ranking ────────────────────── */
        kill(rankInst);
        if (rankRef.current) {
            const ranked = [...filteredData.bySection].map(s => {
                const tot = s.present + s.late + s.absent;
                return { section: s.section, rate: tot > 0 ? Math.round((s.absent / tot) * 100) : 0 };
            }).sort((a, b) => b.rate - a.rate);

            const rankColors = ranked.map((_, i, arr) => {
                if (arr.length <= 1) return '#F59E0B';
                const t = arr.length === 1 ? 0.5 : i / (arr.length - 1);
                const r = Math.round(239 * (1 - t) + 16 * t);
                const g = Math.round(68 * (1 - t) + 185 * t);
                const b2 = Math.round(68 * (1 - t) + 129 * t);
                return `rgb(${r},${g},${b2})`;
            });

            rankInst.current = new C(rankRef.current, {
                type: 'bar',
                data: {
                    labels: ranked.map(r => r.section),
                    datasets: [{ label: 'Absence Rate', data: ranked.map(r => r.rate), backgroundColor: rankColors, borderRadius: 4 }],
                },
                options: {
                    indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { ...scale, min: 0, max: 100, ticks: { ...scale.ticks, callback: (v: any) => `${v}%` } }, y: scale },
                },
            });
        }

        /* ▼ 5. Stacked bar — actual abs + late-converted abs ───────────── */
        kill(stackedInst);
        if (stackedRef.current) {
            stackedInst.current = new C(stackedRef.current, {
                type: 'bar',
                data: {
                    labels: filteredData.bySection.map(s => s.section),
                    datasets: [
                        { label: 'Actual Absences', data: filteredData.bySection.map(s => s.absent), backgroundColor: '#EF4444', stack: 'a', borderRadius: 3 },
                        { label: 'Abs from Lates (÷3)', data: filteredData.bySection.map(s => Math.floor(s.late / 3)), backgroundColor: '#F59E0B', stack: 'a', borderRadius: 3 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 10 } } },
                    scales: { x: scale, y: { ...scale, stacked: true, beginAtZero: true } },
                },
            });
        }

        /* ▼ 6. Bar — absences by day of week ───────────────────────────── */
        kill(dayInst);
        if (dayRef.current) {
            const weekColors = (filteredData.byDay ?? []).map(d =>
                ['Monday', 'Friday'].includes(d.day) ? '#EF4444' : d.day === 'Wednesday' ? '#F59E0B' : '#10B981'
            );
            dayInst.current = new C(dayRef.current, {
                type: 'bar',
                data: {
                    labels: (filteredData.byDay ?? []).map(d => d.shortDay),
                    datasets: [{ label: 'Absences', data: (filteredData.byDay ?? []).map(d => d.count), backgroundColor: weekColors, borderRadius: 6 }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: scale, y: { ...scale, beginAtZero: true } },
                },
            });
        }

        /* ▼ 7. Grouped bar — semester comparison ───────────────────────── */
        kill(semInst);
        if (semRef.current && (filteredData.semComparison ?? []).length > 0) {
            semInst.current = new C(semRef.current, {
                type: 'bar',
                data: {
                    labels: (filteredData.semComparison ?? []).map(s => s.section),
                    datasets: [
                        { label: 'Last Semester', data: (filteredData.semComparison ?? []).map(s => s.lastSem), backgroundColor: '#475569', borderRadius: 4 },
                        {
                            label: 'This Semester',
                            data: (filteredData.semComparison ?? []).map(s => s.thisSem),
                            backgroundColor: (filteredData.semComparison ?? []).map(s => sectionColor(s.section)),
                            borderRadius: 4,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 10 } } },
                    scales: {
                        x: scale,
                        y: { ...scale, min: 0, max: 100, ticks: { ...scale.ticks, callback: (v: any) => `${v}%` } },
                    },
                },
            });
        }

        return () => {
            kill(lineInst); kill(doughnutInst); kill(groupedInst);
            kill(rankInst); kill(stackedInst); kill(dayInst); kill(semInst);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartJsLoaded, filteredData, activeSubTab]);

    // ── Fetch interventions when student selected ─────────────────────────
    useEffect(() => {
        if (!selectedStudent || !user) return;
        const uid = user.professorId || user.userId || user.user_id;
        const load = async () => {
            try {
                const token = getToken();
                const res = await axios.get(
                    `${API_URL}/api/analytics/professor/${uid}/interventions/${selectedStudent.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setInterventionLog(res.data);
            } catch { setInterventionLog([]); }
        };
        load();
    }, [selectedStudent, user]);

    // ── Generate AI intervention prompt ──────────────────────────────────
    const handleGenerateIntervention = useCallback(() => {
        if (!selectedStudent) return;
        const prompt = `You are a professor's AI assistant. Generate an intervention plan for this student:

Student: ${selectedStudent.name}
Section: ${selectedStudent.section}
Effective Absences: ${selectedStudent.effAbs} out of 3 allowed
Attendance Rate: ${selectedStudent.attendanceRate}%
Missed Sessions: ${selectedStudent.missedTopics.join(', ') || 'None recorded'}
Absence Pattern: ${selectedStudent.pattern}
Risk Status: ${selectedStudent.status}

Generate:
1. Three talking points for the professor to use when meeting this student
2. Catch-up material and activity suggestions for each missed session
3. A 2-week follow-up timeline with checkpoints on Day 3, Day 7, and Day 14`;

        // Dispatch for any in-page AI widget
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('labface-ai-prompt', { detail: { prompt, student: selectedStudent } }));
        }
        // Clipboard fallback
        if (navigator.clipboard) {
            navigator.clipboard.writeText(prompt).then(() => {
                setAiCopied(true); setTimeout(() => setAiCopied(false), 3000);
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = prompt; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
            setAiCopied(true); setTimeout(() => setAiCopied(false), 3000);
        }
    }, [selectedStudent]);

    // ── Small UI building blocks ──────────────────────────────────────────
    const KpiCard = ({ label, value, unit = '', color, icon }: { label: string; value: number; unit?: string; color: string; icon: React.ReactNode }) => (
        <div className="identity-glass rounded-2xl border border-identity-sky/10 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"
                style={{ backgroundColor: `${color}12` }} />
            <div className="relative z-10">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border mb-3"
                    style={{ backgroundColor: `${color}18`, borderColor: `${color}30`, color }}>
                    {icon}
                </div>
                <div className="text-2xl font-black tracking-tighter" style={{ color }}>{value}{unit}</div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5">{label}</div>
            </div>
        </div>
    );

    const ChartCard = ({ title, height = 280, children }: { title: string; height?: number; children: React.ReactNode }) => (
        <div className="identity-glass rounded-2xl border border-identity-sky/10 p-5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4">{title}</h3>
            <div style={{ height, position: 'relative' }}>{children}</div>
        </div>
    );

    const SectionPill = ({ id, label, color }: { id: string; label: string; color: string }) => {
        const active = activeSection === id;
        return (
            <button onClick={() => setActiveSection(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-150 border"
                style={{
                    borderRadius: '8px',
                    borderColor: active ? color : 'rgba(92,180,228,0.14)',
                    backgroundColor: active ? `${color}22` : 'transparent',
                    color: active ? color : '#64748b',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
            </button>
        );
    };

    const PillToggle = ({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) => (
        <div className="flex gap-1">
            {options.map(o => {
                const a = value === o.id;
                return (
                    <button key={o.id} onClick={() => onChange(o.id)}
                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-150 border"
                        style={{
                            borderRadius: '8px',
                            borderColor: a ? '#5CB4E4' : 'rgba(92,180,228,0.14)',
                            backgroundColor: a ? 'rgba(92,180,228,0.15)' : 'transparent',
                            color: a ? '#5CB4E4' : '#64748b',
                        }}>
                        {o.label}
                    </button>
                );
            })}
        </div>
    );

    // ── No data placeholder ───────────────────────────────────────────────
    const NoData = ({ msg = 'No data available' }: { msg?: string }) => (
        <div className="flex items-center justify-center h-full text-slate-600 text-sm">{msg}</div>
    );

    // ─────────────────────────────────────────────────────────────────────
    //  LOADING STATE
    // ─────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-16 identity-glass rounded-2xl border border-identity-sky/10 animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-28 identity-glass rounded-2xl border border-identity-sky/10 animate-pulse" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-72 identity-glass rounded-2xl border border-identity-sky/10 animate-pulse" />)}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    //  DASHBOARD TAB
    // ─────────────────────────────────────────────────────────────────────
    const dashboardContent = (
        <div className="space-y-6">
            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Avg Attendance Rate" value={allData?.kpis.avgAttendance ?? 0} unit="%" color="#F59E0B" icon={<Activity size={16} />} />
                <KpiCard label="Absent Today" value={allData?.kpis.absentToday ?? 0} color="#EF4444" icon={<Users size={16} />} />
                <KpiCard label="At-Risk Students" value={allData?.kpis.atRisk ?? 0} color="#F59E0B" icon={<AlertTriangle size={16} />} />
                <KpiCard label="Dropout Triggered" value={allData?.kpis.dropoutTriggered ?? 0} color="#EF4444" icon={<TrendingDown size={16} />} />
            </div>

            {/* ── Row 2: Line + Doughnut ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Attendance Rate Per Session" height={280}>
                    {(filteredData?.sessionData?.sections?.length ?? 0) > 0
                        ? <canvas ref={lineRef} />
                        : <NoData msg="No completed sessions yet" />}
                </ChartCard>

                <ChartCard title="Overall Attendance Breakdown" height={280}>
                    {(filteredData?.statusBreakdown.total ?? 0) > 0
                        ? <canvas ref={doughnutRef} />
                        : <NoData msg="No attendance records yet" />}
                </ChartCard>
            </div>

            {/* ── Full-width grouped bar ── */}
            <ChartCard title="Present / Late / Absent by Section" height={240}>
                {(filteredData?.bySection?.length ?? 0) > 0
                    ? <canvas ref={groupedRef} />
                    : <NoData />}
            </ChartCard>

            {/* ── Row 4: Ranking + Stacked ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Section Absence Rate Ranking" height={220}>
                    {(filteredData?.bySection?.length ?? 0) > 0
                        ? <canvas ref={rankRef} />
                        : <NoData />}
                </ChartCard>
                <ChartCard title="Actual Absences vs Late-Converted (÷3)" height={220}>
                    {(filteredData?.bySection?.length ?? 0) > 0
                        ? <canvas ref={stackedRef} />
                        : <NoData />}
                </ChartCard>
            </div>

            {/* ── Row 5: Heatmap + Day bar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CSS-grid heatmap */}
                <div className="identity-glass rounded-2xl border border-identity-sky/10 p-5">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4">
                        Absence Heatmap — Time Slot × Day
                    </h3>
                    {(allData?.heatmap?.slots?.length ?? 0) > 0 ? (
                        <div>
                            {/* Day labels */}
                            <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
                                <div />
                                {allData!.heatmap.days.map(d => (
                                    <div key={d} className="text-center text-[8px] font-black text-slate-600 uppercase tracking-[0.1em]">{d}</div>
                                ))}
                            </div>
                            {allData!.heatmap.slots.map((slot, si) => (
                                <div key={slot} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center">{slot}</div>
                                    {allData!.heatmap.days.map((d, di) => {
                                        const val = allData!.heatmap.data[si]?.[di] ?? 0;
                                        return (
                                            <div key={d} title={`${slot} ${d}: ${val} absences`}
                                                className="h-9 rounded-lg flex items-center justify-center text-[9px] font-black text-white/70 transition-colors"
                                                style={{ backgroundColor: heatColor(val) }}>
                                                {val > 0 ? val : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            {/* Legend */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <span className="text-[7px] text-slate-600 uppercase tracking-[0.1em]">Scale:</span>
                                {[
                                    { l: '0', c: 'rgba(92,180,228,0.05)' },
                                    { l: '1', c: 'rgba(59,130,246,0.45)' },
                                    { l: '2–4', c: 'rgba(245,158,11,0.55)' },
                                    { l: '5–7', c: 'rgba(248,113,113,0.55)' },
                                    { l: '8+', c: 'rgba(239,68,68,0.82)' },
                                ].map(item => (
                                    <div key={item.l} className="flex items-center gap-1">
                                        <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: item.c }} />
                                        <span className="text-[7px] text-slate-600">{item.l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <NoData msg="No heatmap data" />}
                </div>

                <ChartCard title="Absences by Day of Week" height={220}>
                    {(allData?.byDay?.some(d => d.count > 0)) ? <canvas ref={dayRef} /> : <NoData />}
                </ChartCard>
            </div>

            {/* ── Row 6: Consecutive detectors + Peer groups ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Consecutive absence list */}
                <div className="identity-glass rounded-2xl border border-identity-sky/10 p-5">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4">Consecutive Absence Detector</h3>
                    {(allData?.consecutiveAbsences?.length ?? 0) > 0 ? (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {allData!.consecutiveAbsences.map(s => (
                                <div key={s.studentId}
                                    className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                                    <div>
                                        <div className="text-sm font-black text-white">{s.name}</div>
                                        <div className="text-[8px] text-slate-500 uppercase tracking-[0.1em] mt-0.5">{s.section}</div>
                                        <div className="mt-2"><StreakDots streak={s.streak} /></div>
                                    </div>
                                    <span className="ml-3 px-2 py-1 bg-red-500/20 text-red-400 text-[9px] font-black rounded-lg border border-red-500/20 flex-shrink-0">
                                        {s.consecutiveAbs} in a row
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                            <div className="text-emerald-400 text-3xl">✓</div>
                            <p className="text-slate-500 text-sm">No consecutive absences</p>
                        </div>
                    )}
                </div>

                {/* Peer group clusters */}
                <div className="identity-glass rounded-2xl border border-identity-sky/10 p-5">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4">Peer Group Clusters</h3>
                    {(allData?.peerGroups?.length ?? 0) > 0 ? (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {allData!.peerGroups.map((group, i) => (
                                <div key={i} className="bg-identity-sky/5 border border-identity-sky/10 rounded-xl p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {group.students.map(name => (
                                                <span key={name} className="text-[10px] text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-full">{name}</span>
                                            ))}
                                        </div>
                                        <span className="px-2 py-1 bg-identity-sky/15 text-identity-sky text-[9px] font-black rounded-lg border border-identity-sky/20 flex-shrink-0">
                                            {group.count}×
                                        </span>
                                    </div>
                                    <div className="text-[7px] text-slate-600 mt-1.5 uppercase tracking-[0.1em]">
                                        Absent together in {group.count} sessions
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                            No peer group patterns detected
                        </div>
                    )}
                </div>
            </div>

            {/* ── Full-width semester comparison ── */}
            {(filteredData?.semComparison?.some(s => s.lastSem > 0) ?? false) && (
                <ChartCard title="Semester-over-Semester Attendance Rate" height={240}>
                    <canvas ref={semRef} />
                </ChartCard>
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    //  STUDENT PROFILE
    // ─────────────────────────────────────────────────────────────────────
    const studentProfile = selectedStudent && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left card */}
            <div className="identity-glass rounded-2xl border border-identity-sky/10 p-6 space-y-4">
                {/* Avatar + name row */}
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                        style={{
                            background: `linear-gradient(135deg, ${sectionColor(selectedStudent.section)}, ${sectionColor(selectedStudent.section)}77)`,
                        }}>
                        {selectedStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-black text-white text-base truncate">{selectedStudent.name}</div>
                        <div className="text-[8px] text-slate-500 uppercase tracking-[0.15em]">{selectedStudent.section}</div>
                        <div className="mt-1.5"><StatusBadge status={selectedStudent.status} /></div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-4xl font-black leading-none"
                            style={{ color: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981' }}>
                            {selectedStudent.riskScore}%
                        </div>
                        <div className="text-[7px] text-slate-600 uppercase tracking-[0.1em] mt-0.5">Risk Score</div>
                    </div>
                </div>

                {/* 3 stat boxes */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { label: 'Absences', value: `${selectedStudent.absences}/3`, color: '#EF4444' },
                        { label: 'Eff. Absences', value: `${selectedStudent.effAbs}/3`, color: '#F59E0B' },
                        {
                            label: 'Trajectory',
                            value: selectedStudent.attendanceRate >= 75 ? '↑' : '↓',
                            color: selectedStudent.attendanceRate >= 75 ? '#10B981' : '#EF4444',
                        },
                    ].map(stat => (
                        <div key={stat.label} className="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30">
                            <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="text-[7px] text-slate-500 uppercase tracking-[0.1em] mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Streak */}
                <div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-[0.15em] mb-2">Recent Sessions</div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <StreakDots streak={selectedStudent.streak} />
                        <div className="flex gap-2 ml-1">
                            {[['#10B981', 'Present'], ['#F59E0B', 'Late'], ['#EF4444', 'Absent']].map(([c, l]) => (
                                <div key={l} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                                    <span className="text-[7px] text-slate-600">{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Missed topics */}
                {selectedStudent.missedTopics.length > 0 && (
                    <div>
                        <div className="text-[8px] text-slate-500 uppercase tracking-[0.15em] mb-2">Missed Sessions</div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedStudent.missedTopics.map((t, i) => (
                                <span key={i} className="text-[9px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">{t}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pattern note */}
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                    <div className="text-[8px] text-slate-500 uppercase tracking-[0.1em] mb-1">Absence Pattern</div>
                    <div className="text-sm font-black text-slate-300">{selectedStudent.pattern}</div>
                    {selectedStudent.consecutiveAbs >= 2 && (
                        <div className="text-[9px] text-red-400 mt-1">{selectedStudent.consecutiveAbs} consecutive absences</div>
                    )}
                </div>
            </div>

            {/* Right card */}
            <div className="identity-glass rounded-2xl border border-identity-sky/10 p-6 space-y-4 flex flex-col">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Intervention Record</h3>

                {/* Latest in 2×2 grid */}
                {interventionLog.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { label: 'Date Contacted', value: interventionLog[0].date_contacted ? new Date(interventionLog[0].date_contacted).toLocaleDateString('en-PH') : '—' },
                            { label: 'Method', value: interventionLog[0].method || '—' },
                            { label: 'Response', value: interventionLog[0].response || '—' },
                            { label: 'Outcome', value: interventionLog[0].outcome || '—' },
                        ].map(item => (
                            <div key={item.label} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                                <div className="text-[7px] text-slate-500 uppercase tracking-[0.1em] mb-1">{item.label}</div>
                                <div className="text-xs font-black text-slate-200">{item.value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 text-center">
                        <div className="text-slate-600 text-xs">No intervention recorded yet</div>
                    </div>
                )}

                {/* History */}
                {interventionLog.length > 1 && (
                    <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs border-t border-slate-700/30 pt-3">
                        {interventionLog.slice(1).map((iv: any) => (
                            <div key={iv.id} className="flex items-center justify-between gap-3 py-1">
                                <span className="text-slate-500">{new Date(iv.date_contacted || iv.created_at).toLocaleDateString()}</span>
                                <span className="text-slate-400 flex-1 truncate">{iv.method}</span>
                                <span style={{ color: iv.outcome === 'Improved' ? '#10B981' : '#F59E0B' }}>{iv.outcome}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Risk warning box */}
                <div className="rounded-xl p-4 border-l-4 flex-1"
                    style={{
                        backgroundColor: `${selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981'}12`,
                        borderLeftColor: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981',
                    }}>
                    <div className="text-[8px] font-black uppercase tracking-[0.15em] mb-1"
                        style={{ color: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981' }}>
                        Risk Assessment
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">
                        {selectedStudent.status === 'Dropout' && `This student has ${selectedStudent.effAbs} effective absences — dropout threshold reached.`}
                        {selectedStudent.status === 'Critical' && `1 effective absence away from the dropout threshold.`}
                        {selectedStudent.status === 'High Risk' && `Attendance rate is ${selectedStudent.attendanceRate}%, below the 75% minimum.`}
                        {selectedStudent.status === 'Good' && `Attendance at ${selectedStudent.attendanceRate}% — currently within safe standing.`}
                    </div>
                </div>

                {/* Generate button */}
                <button onClick={handleGenerateIntervention}
                    className={`w-full py-3 px-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-200 border flex items-center justify-center gap-2 active:scale-95 ${aiCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-identity-sky/10 text-identity-sky border-identity-sky/30 hover:bg-identity-sky/20 hover:border-identity-sky/50'
                        }`}>
                    {aiCopied ? <><Check size={14} /> Prompt Copied!</> : <><Brain size={14} /> Generate Intervention Plan</>}
                </button>
                <p className="text-[7px] text-slate-600 text-center uppercase tracking-[0.1em]">
                    Dispatches AI event · Copies prompt to clipboard
                </p>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    //  STUDENTS TAB
    // ─────────────────────────────────────────────────────────────────────
    const studentsContent = (
        <div className="space-y-6">
            {/* Student KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Dropout Triggered" value={studentKPIs.dropout} color="#EF4444" icon={<TrendingDown size={16} />} />
                <KpiCard label="Critical — 1 Away" value={studentKPIs.critical} color="#F59E0B" icon={<AlertTriangle size={16} />} />
                <KpiCard label="High Risk" value={studentKPIs.highRisk} color="#F59E0B" icon={<BarChart3 size={16} />} />
                <KpiCard label="Interventions Pending" value={studentKPIs.pending} color="#8B5CF6" icon={<Activity size={16} />} />
            </div>

            {/* At-risk table */}
            <div className="identity-glass rounded-2xl border border-identity-sky/10 overflow-hidden">
                <div className="p-4 border-b border-identity-sky/10 flex items-center justify-between">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Student Risk Table</h3>
                    <span className="text-[8px] text-slate-600">Click a row to view profile</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                        <thead>
                            <tr className="border-b border-identity-sky/8">
                                {['Student', 'Section', 'Abs', 'Lates', 'Eff.Abs', 'Streak', 'Risk Score', 'Status', 'Intervention'].map(h => (
                                    <th key={h} className="px-3 py-3 text-[7px] font-black text-slate-600 uppercase tracking-[0.12em] text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {atRiskStudents.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-10 text-center text-slate-600 text-sm">
                                        No at-risk students in selected filter ✓
                                    </td>
                                </tr>
                            )}
                            {atRiskStudents.map(student => {
                                const isSelected = selectedStudent?.id === student.id && selectedStudent?.classId === student.classId;
                                return (
                                    <tr key={`${student.id}-${student.classId}`}
                                        onClick={() => { setSelectedStudent(student); setInterventionLog([]); }}
                                        className={`border-b border-identity-sky/5 cursor-pointer transition-all duration-100 hover:bg-identity-sky/5 ${isSelected ? 'bg-identity-sky/8 border-identity-sky/15' : ''}`}>
                                        <td className="px-3 py-3 text-sm font-black text-white whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {isSelected && <ChevronRight size={12} className="text-identity-sky flex-shrink-0" />}
                                                {student.name}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap"
                                                style={{
                                                    backgroundColor: `${sectionColor(student.section)}15`,
                                                    borderColor: `${sectionColor(student.section)}28`,
                                                    color: sectionColor(student.section),
                                                }}>
                                                {student.section}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-400 text-center">{student.absences}</td>
                                        <td className="px-3 py-3 text-sm text-slate-400 text-center">{student.lates}</td>
                                        <td className="px-3 py-3 text-sm font-black text-center"
                                            style={{ color: student.effAbs >= 3 ? '#EF4444' : student.effAbs >= 2 ? '#F59E0B' : '#94a3b8' }}>
                                            {student.effAbs}
                                        </td>
                                        <td className="px-3 py-3"><StreakDots streak={student.streak.slice(0, 6)} /></td>
                                        <td className="px-3 py-3"><RiskMiniBar score={student.riskScore} /></td>
                                        <td className="px-3 py-3"><StatusBadge status={student.status} /></td>
                                        <td className="px-3 py-3"><InterventionBadge status={student.interventionStatus} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pill buttons for quick student switching */}
            {atRiskStudents.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[8px] text-slate-600 uppercase tracking-[0.1em]">Quick select:</span>
                    {atRiskStudents.map(s => {
                        const active = selectedStudent?.id === s.id && selectedStudent?.classId === s.classId;
                        return (
                            <button key={`${s.id}-${s.classId}`}
                                onClick={() => { setSelectedStudent(s); setInterventionLog([]); }}
                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] rounded-[8px] transition-all duration-150 border"
                                style={{
                                    borderColor: active ? sectionColor(s.section) : 'rgba(92,180,228,0.14)',
                                    backgroundColor: active ? `${sectionColor(s.section)}20` : 'transparent',
                                    color: active ? sectionColor(s.section) : '#64748b',
                                }}>
                                {s.name.split(' ')[0]}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Student profile panel */}
            {selectedStudent ? studentProfile : (
                <div className="identity-glass rounded-2xl border border-identity-sky/10 p-10 text-center">
                    <div className="text-slate-600 text-sm">Select a student row above to view their full profile</div>
                </div>
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    //  MAIN RENDER
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 font-outfit">
            {/* ── Filter Bar ── */}
            <div className="identity-glass rounded-2xl border border-identity-sky/10 p-4 space-y-3">
                {/* Row 1 — Section pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.15em] mr-1 flex-shrink-0">Section</span>
                    <SectionPill id="all" label="All Sections" color="#5CB4E4" />
                    {sections.map(s => <SectionPill key={s.id} id={s.id} label={s.label} color={s.color} />)}
                </div>
                {/* Row 2 — Period + Day filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <PillToggle
                        value={activePeriod}
                        options={[{ id: 'semester', label: 'Full Semester' }, { id: 'week', label: 'This Week' }]}
                        onChange={v => setActivePeriod(v as any)}
                    />
                    <div className="w-px h-4 bg-slate-700/60 flex-shrink-0" />
                    <PillToggle
                        value={activeDay}
                        options={[{ id: 'all', label: 'All' }, { id: 'mwf', label: 'MWF Only' }, { id: 'tth', label: 'TTh Only' }]}
                        onChange={v => setActiveDay(v as any)}
                    />
                </div>
            </div>

            {/* ── Sub-tab bar ── */}
            <div className="flex items-center gap-2">
                {/* Dashboard tab */}
                <button onClick={() => setActiveSubTab('dashboard')}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-[8px] border transition-all duration-150 ${activeSubTab === 'dashboard'
                        ? 'bg-identity-sky/15 text-identity-sky border-identity-sky/35 shadow-sm'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:border-identity-sky/15'
                        }`}>
                    Dashboard
                </button>
                {/* Students tab with at-risk badge */}
                <button onClick={() => setActiveSubTab('students')}
                    className={`relative px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-[8px] border transition-all duration-150 ${activeSubTab === 'students'
                        ? 'bg-identity-sky/15 text-identity-sky border-identity-sky/35 shadow-sm'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:border-identity-sky/15'
                        }`}>
                    Students
                    {(allData?.students.filter(s => s.status !== 'Good').length ?? 0) > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-1.5 py-px text-[8px] font-black bg-red-500 text-white rounded-full min-w-[18px]">
                            {allData!.students.filter(s => s.status !== 'Good').length} at risk
                        </span>
                    )}
                </button>
            </div>

            {/* ── Tab content (key forces chart remount on tab switch) ── */}
            <div key={`${activeSubTab}__${activeSection}`}>
                {activeSubTab === 'dashboard' && dashboardContent}
                {activeSubTab === 'students' && studentsContent}
            </div>
        </div>
    );
}
