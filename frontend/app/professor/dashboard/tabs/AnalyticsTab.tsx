'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import { useNavigation } from '@/context/NavigationContext';
import {
    BarChart3, Users, AlertTriangle, TrendingDown, Activity,
    ChevronRight, Brain, Copy, Check, CheckCircle, Zap, ShieldCheck, ArrowRight, Signal, History, PieChart, RefreshCw, Calendar, Mail
} from 'lucide-react';
import { useToast } from '@/components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Section color palette (assigned by class index) ──────────────────────
const SECTION_PALETTE = ['#5CB4E4', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'];

// ─── Types ─────────────────────────────────────────────────────────────────
interface AnalyticsTabProps { user: any; classes: any[]; initialKpis?: any; }

interface DashboardKPIs { avgAttendance: number; absentToday: number; atRisk: number; dropoutTriggered: number; }
interface SessionSection { section: string; classId: number; rates: (number | null)[]; }
interface SessionData { sessions: string[]; sections: SessionSection[]; }
interface StatusBreakdown { present: number; late: number; absent: number; total: number; }
interface SectionStat { section: string; classId: number; present: number; late: number; absent: number; sessionCount?: number; }
interface HeatmapData { slots: string[]; days: string[]; data: number[][]; }
interface DayCount { day: string; shortDay: string; count: number; }
interface StudentRisk {
    id: number; name: string; studentNumber: string; section: string; classId: number;
    absences: number; lates: number; effAbs: number; attendanceRate: number;
    attended: number;
    streak: string[]; consecutiveAbs: number; riskScore: number;
    status: string; interventionStatus: string; missedTopics: string[]; pattern: string;
    email: string;
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
        Dropout: 'bg-rose-500/20 text-rose-500 border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        Critical: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        'High Risk': 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        Good: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    };
    return (
        <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border italic ${map[status] || map.Good}`}>
            {status === 'Dropout' ? 'DROPPED' : status === 'Critical' ? 'CRITICAL' : status === 'High Risk' ? 'AT RISK' : 'GOOD'}
        </span>
    );
}

function InterventionBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Improved: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
        'No change': 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30',
        Pending: 'bg-[#5CB4E4]/20 text-[#5CB4E4] border-[#5CB4E4]/30',
        None: 'bg-white/5 text-slate-400 border-white/10',
    };
    return (
        <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border italic ${map[status] || map.None}`}>
            {(status || 'NONE').toUpperCase().replace(' ', '_')}
        </span>
    );
}

function StreakDots({ streak }: { streak: string[] }) {
    // Reverse the streak so that the latest session is on the right
    const displayStreak = [...streak].reverse();
    return (
        <div className="flex gap-2 flex-wrap items-center">
            {displayStreak.slice(-10).map((s, i) => {
                const status = (s || 'Absent').toLowerCase();
                const isPresent = status === 'present';
                const isLate = status === 'late';
                const isExcused = status === 'excused';
                // Most recent dots (on the right) are more opaque to show the "active" streak
                const opacity = i >= displayStreak.length - 3 ? '1' : '0.4';
                
                return (
                    <div key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg transition-transform hover:scale-150 cursor-help border border-white/20"
                        style={{ 
                            backgroundColor: isPresent ? '#10B981' : isLate ? '#F59E0B' : isExcused ? '#5CB4E4' : '#EF4444',
                            opacity: opacity,
                            boxShadow: `0 0 8px ${isPresent ? 'rgba(16,185,129,0.3)' : isLate ? 'rgba(245,158,11,0.3)' : isExcused ? 'rgba(92,180,228,0.3)' : 'rgba(239,68,68,0.3)'}`
                        }}
                        title={s.toUpperCase()}
                    />
                );
            })}
        </div>
    );
}

const formatSchedule = (scheduleJson: string) => {
    try {
        if (!scheduleJson) return 'NO SCHEDULE SET';
        const schedule = JSON.parse(scheduleJson);
        if (!Array.isArray(schedule) || schedule.length === 0) return 'NO SCHEDULE SET';
        const days = schedule.map((s: any) => s.day.substring(0, 3)).join(', ');
        const times = schedule[0];
        return `${days.toUpperCase()} · ${times.startTime} - ${times.endTime}`;
    } catch {
        return 'NO SCHEDULE SET';
    }
};

function RiskMiniBar({ score }: { score: number }) {
    const color = score >= 80 ? '#EF4444' : score >= 50 ? '#F59E0B' : '#10B981';
    return (
        <div className="flex items-center gap-4">
            <div className="w-24 h-2 rounded-full bg-[#041C3C]/10 overflow-hidden shadow-inner border border-white/20">
                <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.3)]" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
            <span className="text-[11px] font-black italic tracking-tight" style={{ color }}>{score}%</span>
        </div>
    );
}

// ─── Heatmap colour helper ─────────────────────────────────────────────────
function heatColor(val: number, maxVal: number): string {
    if (val === 0) return 'rgba(4,28,60,0.03)';
    if (maxVal <= 0) return 'rgba(92,180,228,0.55)';
    
    const intensity = val / maxVal;
    if (intensity < 0.25) return 'rgba(92,180,228,0.55)'; // Low
    if (intensity < 0.5) return 'rgba(245,158,11,0.65)';  // Mod
    if (intensity < 0.75) return 'rgba(248,113,113,0.65)'; // Mid-High
    return 'rgba(239,68,68,0.85)'; // High
}

// ─── Spinner ───────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div className="flex flex-col items-center justify-center p-20 gap-8 font-outfit">
            <div className="w-20 h-20 relative">
                <div className="absolute inset-0 border-2 border-[#5CB4E4]/10 rounded-2xl rotate-45" />
                <div className="absolute inset-0 border-2 border-[#041C3C] border-t-transparent rounded-2xl rotate-45 animate-spin shadow-[0_0_30px_rgba(92,180,228,0.5)]" />
                <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                    <Brain className="text-[#041C3C]/20 w-8 h-8" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <p className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] animate-pulse italic leading-none">
                    Loading Analytics...
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic opacity-60">
                    Connecting to data source
                </p>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function AnalyticsTab({ user, classes, initialKpis }: AnalyticsTabProps) {
    const { updateTabBadge, setActiveTab } = useNavigation();
    const { showToast } = useToast();
    const activeClasses = useMemo(() => classes.filter(c => !c.is_archived), [classes]);

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
    const [activeSections, setActiveSections] = useState<string[]>([]);
    const [activePeriod, setActivePeriod] = useState<'semester' | 'week'>('semester');
    const [riskProfile, setRiskProfile] = useState<'all' | 'dropped' | 'at-risk' | 'stable'>('all');
    const [selectedStudent, setSelectedStudent] = useState<StudentRisk | null>(null);
    const [allData, setAllData] = useState<AllData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartJsLoaded, setChartJsLoaded] = useState(false);
    const [interventionLog, setInterventionLog] = useState<any[]>([]);
    const [aiCopied, setAiCopied] = useState(false);
    
    // Audit Modal State
    const [auditStudent, setAuditStudent] = useState<StudentRisk | null>(null);
    const [auditHistory, setAuditHistory] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

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
    const chartsInitialized = useRef(false);

    // ── Derived / filtered data ──────────────────────────────────────────
    const filteredStudents = useMemo(() => {
        if (!allData) return [];
        let students = [...allData.students];
        
        // 1. Section Filter
        if (activeSections.length > 0) {
            students = students.filter(s => activeSections.includes(s.section));
        }

        // 2. Risk Profile Filter
        if (riskProfile === 'dropped') {
            students = students.filter(s => s.status === 'Dropout');
        } else if (riskProfile === 'at-risk') {
            students = students.filter(s => s.status === 'Critical' || s.status === 'High Risk');
        } else if (riskProfile === 'stable') {
            students = students.filter(s => s.status === 'Good');
        }

        return students;
    }, [allData, activeSections, riskProfile]);

    const filteredData = useMemo((): AllData | null => {
        if (!allData) return null;
        
        const students = filteredStudents;
        
        let bySection = allData.bySection;
        if (activeSections.length > 0) {
            bySection = bySection.filter(s => activeSections.includes(s.section));
        }

        let sessionData = { ...allData.sessionData };
        if (activeSections.length > 0) {
            sessionData.sections = sessionData.sections.filter(s => activeSections.includes(s.section));
        }
        if (activePeriod === 'week') {
            const count = 3;
            sessionData.sessions = sessionData.sessions.slice(-count);
            sessionData.sections = sessionData.sections.map(sec => ({
                ...sec,
                rates: sec.rates.slice(-count)
            }));
        }

        return {
            ...allData,
            students,
            bySection,
            sessionData,
            statusBreakdown: {
                present: students.reduce((sum: number, s: StudentRisk) => sum + s.attended, 0),
                late: students.reduce((sum: number, s: StudentRisk) => sum + s.lates, 0),
                absent: students.reduce((sum: number, s: StudentRisk) => sum + s.absences, 0),
                total: students.reduce((sum: number, s: StudentRisk) => sum + (s.attended + s.lates + s.absences), 0) || 1,
            },
            semComparison: activeSections.length > 0 
                ? allData.semComparison.filter(s => activeSections.includes(s.section))
                : allData.semComparison
        };
    }, [allData, filteredStudents, activeSections, activePeriod]);

    // Update global navbar badge with total alert count (Risk + Dropped)
    useEffect(() => {
        if (allData?.kpis) {
            const totalAlerts = (allData.kpis.atRisk ?? 0) + (allData.kpis.dropoutTriggered ?? 0);
            // Proposal: Use '!' or true for a simple pulse dot instead of a number
            updateTabBadge('analytics', totalAlerts > 0 ? '!' : undefined);
        }
    }, [allData?.kpis.atRisk, allData?.kpis.dropoutTriggered, updateTabBadge]);

    const atRiskStudents = useMemo(() => filteredStudents.filter(s => s.status !== 'Good'), [filteredStudents]);

    const dynamicMin = useMemo(() => {
        if (!filteredData) return 50;
        const allRates = filteredData.sessionData.sections.flatMap(s => s.rates).filter(r => r !== null) as number[];
        if (allRates.length === 0) return 50;
        const minVal = Math.min(...allRates);
        // Set floor to 5% below lowest point, rounded down to nearest 5
        return Math.max(0, Math.floor(minVal / 5) * 5 - 5);
    }, [filteredData]);

    const studentKPIs = useMemo(() => ({
        dropout: filteredStudents.filter(s => s.status === 'Dropout').length,
        critical: filteredStudents.filter(s => s.status === 'Critical').length,
        highRisk: filteredStudents.filter(s => s.status === 'High Risk').length,
        pending: filteredStudents.filter(s => s.interventionStatus === 'Pending').length,
    }), [filteredStudents]);

    // ── Data fetch ───────────────────────────────────────────────────────
    const loadData = async () => {
        if (!user) return;
        const uid = user.professorId || user.userId || user.user_id;
        if (!uid) return;
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
            kpis: v(settled[0], initialKpis || { avgAttendance: 0, absentToday: 0, atRisk: 0, dropoutTriggered: 0 }),
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

    const openAuditModal = async (student: StudentRisk) => {
        setAuditStudent(student);
        setAuditLoading(true);
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const uid = user.professorId || user.userId || user.user_id;
        
        try {
            const res = await axios.get(`${API_URL}/api/analytics/professor/${uid}/student-history/${student.id}/${student.classId}`, { headers });
            setAuditHistory(res.data);
        } catch (err) {
            console.error('Audit Modal Error:', err);
            setAuditHistory([]);
        } finally {
            setAuditLoading(false);
        }
    };

    const updateAttendance = async (session_id: number, log_id: number | null, newStatus: string) => {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const uid = user.professorId || user.userId || user.user_id;

        try {
            if (log_id) {
                await axios.put(`${API_URL}/api/analytics/professor/${uid}/attendance/${log_id}`, { status: newStatus }, { headers });
            } else {
                await axios.post(`${API_URL}/api/analytics/professor/${uid}/attendance-manual`, {
                    session_id,
                    student_id: auditStudent?.id,
                    status: newStatus
                }, { headers });
            }
            
            // Refresh both the history list and the main dashboard indicators
            if (auditStudent) openAuditModal(auditStudent);
            loadData();
        } catch (err) {
            console.error('Update Attendance Error:', err);
        }
    };

    useEffect(() => {
        loadData();
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

    const kill = (inst: React.MutableRefObject<any>) => {
        if (inst.current) { inst.current.destroy(); inst.current = null; }
    };

    // Handle resize to ensure charts don't disappear
    useEffect(() => {
        const handleResize = () => {
            [lineInst, doughnutInst, groupedInst, rankInst, dayInst, semInst].forEach(inst => {
                if (inst.current) inst.current.resize();
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Self-Managed Chart Component ──────────────────────────────────
    const UniversalChart = ({ 
        type, 
        data, 
        options, 
        height = '100%' 
    }: { 
        type: string; 
        data: any; 
        options: any; 
        height?: string | number 
    }) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const chartInst = useRef<any>(null);

        useEffect(() => {
            if (!chartJsLoaded || !canvasRef.current || !data) return;
            const C = (window as any).Chart;
            if (!C) return;

            // Cleanup if type changed
            if (chartInst.current) {
                chartInst.current.destroy();
                chartInst.current = null;
            }

            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            chartInst.current = new C(ctx, {
                type,
                data,
                options: {
                    ...options,
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 750,
                        easing: 'easeOutQuart'
                    }
                }
            });

            const resizeObserver = new ResizeObserver(() => {
                if (chartInst.current) chartInst.current.resize();
            });
            resizeObserver.observe(canvasRef.current.parentElement || canvasRef.current);

            return () => {
                if (chartInst.current) {
                    chartInst.current.destroy();
                    chartInst.current = null;
                }
                resizeObserver.disconnect();
            };
        }, [type, data, options, chartJsLoaded]);

        return (
            <div className="relative w-full overflow-hidden" style={{ height }}>
                <canvas ref={canvasRef} />
            </div>
        );
    };

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

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('labface-ai-prompt', { detail: { prompt, student: selectedStudent } }));
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(prompt).then(() => {
                setAiCopied(true); setTimeout(() => setAiCopied(false), 3000);
            });
        }
    }, [selectedStudent]);

    const StrategicSummary = useMemo(() => {
        if (!allData || !filteredData) return null;
        
        const bestClass = [...filteredData.bySection].sort((a, b) => b.present - a.present)[0];
        const worstClass = [...filteredData.bySection].sort((a, b) => a.present - b.present)[0];
        
        const sessions = filteredData.sessionData.sections.flatMap(s => s.rates);
        const perfectSessions = sessions.filter(r => r === 100).length;
        const lowEngagement = sessions.filter(r => (r ?? 0) < 60 && r !== null).length;

        return (
            <div className="bg-[#041C3C] rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl border border-[#5CB4E4]/20 group mb-6">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-blueprint" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5CB4E4] rounded-full blur-[100px] opacity-10 translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                            <Brain size={32} className="text-[#5CB4E4] animate-pulse" />
                            <h2 className="text-xl font-black uppercase tracking-[0.3em] italic">AI Strategic Summary</h2>
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[140px]">
                            <div className="text-[8px] text-[#5CB4E4] font-black uppercase tracking-[0.2em] mb-1">Top Performer</div>
                            <div className="text-lg font-black italic truncate">{bestClass?.section || 'N/A'}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[140px]">
                            <div className="text-[8px] text-rose-400 font-black uppercase tracking-[0.2em] mb-1">High Absences</div>
                            <div className="text-lg font-black italic truncate">{worstClass?.section || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [allData, filteredData, filteredStudents.length, activeSections.length, sections.length]);

    const KpiCard = ({ label, value, unit = '', color, icon }: { label: string; value: number; unit?: string; color: string; icon: React.ReactNode }) => (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 relative overflow-hidden group shadow-xl transition-all duration-700 hover:-translate-y-1 font-outfit">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-[0.1] -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"
                style={{ backgroundColor: color }} />
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-[#041C3C] text-[#5CB4E4] shadow-xl border border-[#5CB4E4]/20 group-hover:bg-[#5CB4E4] group-hover:text-white transition-all duration-700">
                        {icon}
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black italic tracking-tighter text-[#041C3C] leading-none">{value}</span>
                        <span className="text-xl font-black text-[#5CB4E4] italic tracking-tight">{unit}</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic">{label}</p>
                </div>
            </div>
        </div>
    );

    const ChartCard = ({ title, height = 320, children }: { title: string; height?: number; children: React.ReactNode }) => (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-6 sm:p-8 relative overflow-hidden shadow-xl font-outfit group transition-all duration-700">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/30 to-transparent top-0 z-20 animate-scan-y opacity-30 pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-[#041C3C] text-[#5CB4E4] rounded-xl shadow-lg transition-all duration-500 group-hover:scale-110">
                         <Signal size={16} />
                    </div>
                    <h3 className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.3em] italic">
                        {title}
                    </h3>
                </div>
                <div className="flex gap-3">
                    {[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full bg-[#5CB4E4] ${i === 1 ? 'animate-pulse' : 'opacity-20'}`} />)}
                </div>
            </div>

            <div className="relative z-10" style={{ height }}>
                {children}
            </div>
        </div>
    );

    const SectionPill = ({ id, label, color }: { id: string; label: string; color: string }) => {
        const active = activeSections.includes(id);
        const toggle = () => {
            if (active) setActiveSections(prev => prev.filter(x => x !== id));
            else setActiveSections(prev => [...prev, id]);
        };
        return (
            <button onClick={toggle}
                className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 border italic shadow-sm active:scale-95 group/pill"
                style={{
                    borderRadius: '0.75rem',
                    borderColor: active ? color : 'rgba(4,28,60,0.1)',
                    backgroundColor: active ? `${color}15` : 'rgba(255,255,255,0.6)',
                    color: active ? color : '#041C3C',
                }}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-transform ${active ? 'animate-pulse scale-110' : 'group-hover/pill:scale-125'}`} 
                    style={{ backgroundColor: color, boxShadow: active ? `0 0 10px ${color}` : 'none' }} />
                {label}
            </button>
        );
    };

    const FilterTag = ({ label, onClear, color = '#5CB4E4' }: { label: string; onClear: () => void; color?: string }) => (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#041C3C] text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] italic shadow-lg animate-in zoom-in duration-300">
            <span className="opacity-60">{label}</span>
            <button onClick={onClear} className="hover:text-rose-400 transition-colors">
                <Check size={12} strokeWidth={4} />
            </button>
        </div>
    );

    const PillToggle = ({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) => (
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 font-outfit">
            {options.map(o => {
                const a = value === o.id;
                return (
                    <button key={o.id} onClick={() => onChange(o.id)}
                        className={`px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 rounded-xl italic active:scale-95 ${
                            a ? 'bg-[#041C3C] text-white shadow-xl scale-105' : 'text-slate-400 hover:text-[#041C3C] hover:bg-white/80'
                        }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );

    const NoData = ({ msg = 'NO DATA AVAILABLE' }: { msg?: string }) => (
        <div className="flex flex-col items-center justify-center h-full gap-6 opacity-30 text-[#041C3C] font-outfit">
            <PieChart size={64} className="animate-pulse" />
            <p className="text-[12px] font-black uppercase tracking-[0.6em] italic">{msg}</p>
        </div>
    );

    const trendsChartData = useMemo(() => {
        if (!filteredData) return null;
        return {
            labels: filteredData.sessionData.sessions,
            datasets: [
                ...filteredData.sessionData.sections.map((sec) => ({
                    label: sec.section,
                    data: sec.rates,
                    borderColor: sectionColor(sec.section),
                    backgroundColor: `${sectionColor(sec.section)}20`,
                    fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 8, borderWidth: 3, spanGaps: true,
                })),
                {
                    label: 'RISK THRESHOLD (75%)',
                    data: filteredData.sessionData.sessions.map(() => 75),
                    borderColor: '#EF4444', borderDash: [10, 5], borderWidth: 2,
                    pointRadius: 0, fill: false,
                },
            ],
        };
    }, [filteredData, sectionColor]);

    const statusChartData = useMemo(() => {
        if (!filteredData) return null;
        return {
            labels: ['PRESENT', 'LATE', 'ABSENT'],
            datasets: [{
                data: [filteredData.statusBreakdown.present, filteredData.statusBreakdown.late, filteredData.statusBreakdown.absent],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                borderColor: '#ffffff', borderWidth: 8,
                hoverOffset: 20
            }],
        };
    }, [filteredData]);

    const rankingChartData = useMemo(() => {
        if (!filteredData || filteredData.bySection.length === 0) return null;
        
        const sorted = [...filteredData.bySection].map(s => {
            const tot = s.present + s.late + s.absent;
            return { 
                section: s.section, 
                label: `${s.section} (${s.sessionCount || 0} SESS)`, 
                rate: tot > 0 ? Math.round((s.absent / tot) * 100) : 0 
            };
        }).sort((a, b) => b.rate - a.rate);

        return {
            labels: sorted.map(r => r.label),
            datasets: [{ 
                label: 'Absence Rank', 
                data: sorted.map(r => r.rate), 
                backgroundColor: sorted.map(r => sectionColor(r.section)), 
                borderRadius: 12, 
                barThickness: 24 
            }],
        };
    }, [filteredData, sectionColor]);

    const dynamicMaxAbsence = useMemo(() => {
        if (!rankingChartData) return 100;
        const rates = rankingChartData.datasets[0].data as number[];
        if (rates.length === 0) return 100;
        const maxVal = Math.max(...rates);
        // Set ceiling to 5% above highest point, rounded up to nearest 5, minimum 10%
        return Math.max(10, Math.ceil((maxVal + 5) / 5) * 5);
    }, [rankingChartData]);

    if (loading && !allData) return <Spinner />;

    const dashboardContent = (
        <div className="space-y-4 animate-in fade-in duration-1000">
            {loading && (
                <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-slate-100">
                    <div className="h-full bg-[#5CB4E4] animate-progress" />
                </div>
            )}
            
            {StrategicSummary}

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Average Attendance" value={allData?.kpis.avgAttendance ?? initialKpis?.avgAttendance ?? 0} unit="%" color="#5CB4E4" icon={<Activity size={24} />} />
                <KpiCard label="Absences Today" value={allData?.kpis.absentToday ?? initialKpis?.absentToday ?? 0} color="#EF4444" icon={<Users size={24} />} />
                <KpiCard label="At Risk Students" value={allData?.kpis.atRisk ?? initialKpis?.atRisk ?? 0} color="#F59E0B" icon={<AlertTriangle size={24} />} />
                <KpiCard label="Dropped Students" value={allData?.kpis.dropoutTriggered ?? initialKpis?.dropoutTriggered ?? 0} color="#EF4444" icon={<TrendingDown size={24} />} />
            </div>


            {/* Row 2: Line + Doughnut */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Attendance Trends">
                    <div className="mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                        Monitor daily engagement and identify sessions with significant drops.
                    </div>
                    {trendsChartData ? (
                        <UniversalChart
                            type="line"
                            data={trendsChartData}
                            options={{
                                layout: { padding: { bottom: 25, left: 10, right: 10, top: 10 } },
                                plugins: {
                                    legend: { labels: { color: '#041C3C', boxWidth: 12, padding: 20, font: { size: 11, weight: '900' } } },
                                },
                                scales: {
                                    x: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', font: { size: 9, weight: '700' } }, title: { display: true, text: 'SESSIONS (CHRONOLOGICAL)', color: '#041C3C', font: { weight: '900', size: 9 }, padding: { top: 15 } } },
                                    y: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', callback: (v: any) => `${v}%`, font: { size: 9, weight: '700' } }, min: dynamicMin, max: 100, title: { display: true, text: 'ATTENDANCE RATE %', color: '#041C3C', font: { weight: '900', size: 9 }, padding: { bottom: 15 } } },
                                },
                            }}
                        />
                    ) : <NoData />}
                </ChartCard>

                <ChartCard title="Attendance Status">
                    <div className="mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        Overview of class health: Ratio of on-time, late, and absent students.
                    </div>
                    {statusChartData ? (
                        <UniversalChart
                            type="doughnut"
                            data={statusChartData}
                            options={{
                                cutout: '70%',
                                layout: { padding: { bottom: 15 } },
                                plugins: {
                                    legend: {
                                        position: 'bottom' as const,
                                        labels: {
                                            color: '#041C3C', boxWidth: 12, padding: 25, font: { size: 11, weight: '900' },
                                            generateLabels: (chart: any) => {
                                                const d = chart.data;
                                                const total = filteredData!.statusBreakdown.total || 1;
                                                return d.labels.map((lbl: string, i: number) => ({
                                                    text: `${lbl} · ${d.datasets[0].data[i]} (${Math.round(d.datasets[0].data[i] / total * 100)}%)`,
                                                    fillStyle: d.datasets[0].backgroundColor[i],
                                                    index: i,
                                                }));
                                            },
                                        },
                                    },
                                },
                            }}
                        />
                    ) : <NoData />}
                </ChartCard>
            </div>

            {/* Full-width grouped bar */}
            <ChartCard title="Section Comparison" height={380}>
                <div className="mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    Compare attendance performance across all your assigned sections.
                </div>
                {(filteredData?.bySection?.length ?? 0) > 0 ? (
                    <UniversalChart
                        type="bar"
                        data={{
                            labels: filteredData!.bySection.map(s => `${s.section} (${s.sessionCount || 0} SESS)`),
                            datasets: [
                                { label: 'PRESENT', data: filteredData!.bySection.map(s => s.present), backgroundColor: '#10B981', borderRadius: 8 },
                                { label: 'LATE', data: filteredData!.bySection.map(s => s.late), backgroundColor: '#F59E0B', borderRadius: 8 },
                                { label: 'ABSENT', data: filteredData!.bySection.map(s => s.absent), backgroundColor: '#EF4444', borderRadius: 8 },
                            ],
                        }}
                        options={{
                            layout: { padding: { bottom: 20, top: 10 } },
                            plugins: { legend: { labels: { color: '#041C3C', boxWidth: 12, font: { weight: '900' } } } },
                            scales: { 
                                x: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', font: { size: 9, weight: '700' } }, title: { display: true, text: 'SECTIONS', color: '#041C3C', font: { weight: '900', size: 9 }, padding: { top: 15 } } }, 
                                y: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', font: { size: 9, weight: '700' } }, beginAtZero: true, title: { display: true, text: 'STUDENT COUNT', color: '#041C3C', font: { weight: '900', size: 9 }, padding: { bottom: 15 } } } 
                            },
                        }}
                    />
                ) : <NoData />}
            </ChartCard>

            <div className="grid grid-cols-1 gap-4">
                <ChartCard title="Absence Ranking" height={300}>
                    <div className="mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                        Identify sections with the highest percentage of absent students.
                    </div>
                    {rankingChartData ? (
                        <UniversalChart
                            type="bar"
                            data={rankingChartData}
                            options={{
                                indexAxis: 'y' as const,
                                layout: { padding: { bottom: 15 } },
                                plugins: { legend: { display: false } },
                                scales: { 
                                    x: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', callback: (v: any) => `${v}%`, font: { size: 9, weight: '700' } }, min: 0, max: dynamicMaxAbsence }, 
                                    y: { grid: { color: 'rgba(92,180,228,0.08)' }, ticks: { color: '#041C3C', font: { size: 9, weight: '700' } } } 
                                },
                            }}
                        />
                    ) : <NoData />}
                </ChartCard>
            </div>

            {/* Class Insight Cards - MOVED HERE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData?.bySection.map((cls: any) => (
                    <div key={cls.classId} className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-500 font-outfit">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-10 -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: sectionColor(cls.section) }} />
                        
                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1 flex-1">
                                    <div className="inline-flex px-2 py-0.5 rounded bg-[#041C3C] text-white text-[7px] font-black uppercase tracking-widest italic">
                                        SECTION: {cls.section}
                                    </div>
                                    <h4 className="text-[13px] font-black text-[#041C3C] uppercase tracking-tight leading-tight italic line-clamp-1">{cls.subjectName || 'UNNAMED CLASS'}</h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-[14px] font-black text-[#041C3C] italic">{Math.round((cls.present / (cls.present + cls.late + cls.absent || 1)) * 100)}%</div>
                                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter italic">AVG_HEALTH</div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                                    <Calendar size={10} className="text-[#5CB4E4]" />
                                    {formatSchedule(cls.schedule_json)}
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {[
                                        { l: 'PRESENT', v: cls.present, c: 'text-emerald-500' },
                                        { l: 'LATE', v: cls.late, c: 'text-[#F59E0B]' },
                                        { l: 'ABSENT', v: cls.absent, c: 'text-rose-500' },
                                    ].map(stat => (
                                        <div key={stat.l} className="bg-white/80 p-2 rounded-lg border border-slate-50 text-center shadow-sm">
                                            <div className={`text-[10px] font-black italic ${stat.c}`}>{stat.v}</div>
                                            <div className="text-[7px] font-black text-slate-300 uppercase tracking-tighter italic">{stat.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>


            {/* Row 6: Consecutive detectors */}
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-5 sm:p-6 shadow-xl relative overflow-hidden font-outfit">
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent bottom-0 z-20 animate-scan-y opacity-30 pointer-events-none" />
                    <h3 className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.3em] mb-6 italic flex items-center gap-4">
                        <History size={18} className="text-rose-500 animate-pulse" /> CONSECUTIVE ABSENCES
                    </h3>
                    {(allData?.consecutiveAbsences?.length ?? 0) > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allData!.consecutiveAbsences.map(s => (
                                <div key={s.studentId} className="flex items-center justify-between bg-white/60 border border-slate-100 rounded-xl p-4 shadow-lg transition-all hover:-translate-y-1 duration-500">
                                    <div className="space-y-2">
                                        <div>
                                            <div className="text-md font-black text-[#041C3C] uppercase tracking-tighter italic">{s.name}</div>
                                            <div className="text-[9px] text-[#5CB4E4] font-black uppercase tracking-[0.2em] mt-1 italic">{s.section.toUpperCase()}</div>
                                        </div>
                                        <StreakDots streak={s.streak} />
                                    </div>
                                    <div className="bg-rose-500/10 text-rose-600 px-4 py-2 rounded-xl border border-rose-200 text-[10px] font-black uppercase tracking-[0.2em] italic shadow-md">
                                        {s.consecutiveAbs}× ABSENCES
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <NoData msg="NO RECENT ABSENCES" />}
                </div>
            </div>

            {/* Full-width semester comparison */}
            {(filteredData?.semComparison?.some(s => s.lastSem > 0) ?? false) && (
                <ChartCard title="Semester Comparison" height={380}>
                    <canvas ref={semRef} />
                </ChartCard>
            )}
        </div>
    );

    const studentProfile = selectedStudent && (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in zoom-in-95 duration-1000">
            {/* Surveillance Dossier - Left Card */}
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-6 relative overflow-hidden shadow-2xl font-outfit group">
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/40 to-transparent top-0 z-20 animate-scan-y opacity-30 pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                
                <div className="flex items-start gap-12 relative z-10">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl relative z-10 border-2 border-white/50 group-hover:rotate-6 transition-transform duration-700"
                            style={{ background: `linear-gradient(135deg, ${sectionColor(selectedStudent.section)}, #041C3C)` }}>
                            {selectedStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -inset-8 bg-[#5CB4E4]/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                        <h2 className="font-black text-[#041C3C] text-3xl truncate tracking-tighter italic leading-none">{selectedStudent.name.toUpperCase()}</h2>
                        <div className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mt-4 italic flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[#5CB4E4] animate-pulse shadow-[0_0_15px_rgba(92,180,228,1)]" />
                            SECTION: {selectedStudent.section.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-[#5CB4E4] font-black uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                            <Mail size={12} />
                            EMAIL: {selectedStudent.email}
                        </div>
                        <div className="mt-4"><StatusBadge status={selectedStudent.status} /></div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 relative z-10">
                    {[
                        { label: 'ABSENCES', value: `${selectedStudent.absences}/3`, color: '#EF4444' },
                        { label: 'TOTAL ABSENCES', value: `${selectedStudent.effAbs}/3`, color: '#F59E0B' },
                        { label: 'ATTENDANCE %', value: `${selectedStudent.attendanceRate}%`, color: selectedStudent.attendanceRate >= 75 ? '#10B981' : '#EF4444' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 text-center border border-white shadow-xl transition-all hover:scale-105 duration-500">
                            <div className="text-xl font-black italic tracking-tighter mb-2" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="text-[9px] text-slate-300 uppercase tracking-[0.3em] italic font-black">{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="text-[10px] text-[#041C3C] uppercase tracking-[0.3em] mb-2 italic font-black">RECENT ATTENDANCE</div>
                    <div className="bg-white/60 backdrop-blur-xl shadow-inner p-6 rounded-2xl border border-white">
                        <StreakDots streak={selectedStudent.streak} />
                    </div>
                </div>

                {selectedStudent.missedTopics.length > 0 && (
                    <div className="space-y-6 relative z-10">
                        <div className="text-[11px] text-[#041C3C] uppercase tracking-[0.5em] mb-4 italic font-black">MISSED LESSONS</div>
                        <div className="flex flex-wrap gap-2">
                            {selectedStudent.missedTopics.map((t, i) => (
                                <span key={i} className="text-[10px] px-6 py-2 bg-[#041C3C] text-white rounded-xl font-black italic tracking-widest shadow-xl hover:bg-[#5CB4E4] hover:text-[#041C3C] transition-all cursor-default border border-[#5CB4E4]/30 uppercase">
                                    {t.replace(' ', '_')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right card - Intervention Panel */}
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-6 flex flex-col relative overflow-hidden shadow-2xl font-outfit">
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/40 to-transparent bottom-0 z-20 animate-scan-y opacity-30 pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                
                <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.3em] mb-4 italic flex items-center gap-4 relative z-10">
                    <Brain size={20} className="text-[#5CB4E4]" /> AI RECOMMENDATION
                </h3>

                <div className="flex-1 space-y-10 relative z-10">
                    {interventionLog.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'LAST CONTACT', value: interventionLog[0].date_contacted ? new Date(interventionLog[0].date_contacted).toLocaleDateString() : 'NONE' },
                                { label: 'METHOD', value: interventionLog[0].method?.toUpperCase() || 'N/A' },
                                { label: 'STUDENT RESPONSE', value: interventionLog[0].response?.toUpperCase() || 'N/A' },
                                { label: 'OUTCOME', value: interventionLog[0].outcome?.toUpperCase() || 'N/A' },
                            ].map(item => (
                                <div key={item.label} className="bg-white/80 p-4 rounded-xl border border-white shadow-xl group/sub transition-all hover:bg-slate-50">
                                    <div className="text-[9px] text-slate-300 uppercase tracking-[0.3em] mb-2 italic font-black">{item.label}</div>
                                    <div className="text-[12px] font-black text-[#041C3C] italic tracking-tight">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-10 border-2 border-dashed border-white/40 text-center flex flex-col items-center gap-4">
                            <Activity size={32} className="text-slate-300 animate-pulse" />
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic leading-relaxed max-w-xs">NO PREVIOUS ACTIONS RECORDED FOR THIS STUDENT</p>
                        </div>
                    )}

                    <div className="rounded-xl p-6 border-l-[12px] relative shadow-xl"
                        style={{
                            backgroundColor: `${selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981'}10`,
                            borderLeftColor: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981',
                        }}>
                        <div className="flex items-center gap-4 mb-4">
                            <ShieldCheck size={20} style={{ color: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981' }} />
                            <div className="text-[11px] font-black uppercase tracking-[0.4em] italic"
                                style={{ color: selectedStudent.riskScore >= 80 ? '#EF4444' : selectedStudent.riskScore >= 50 ? '#F59E0B' : '#10B981' }}>
                                AI SUMMARY
                            </div>
                        </div>
                        <p className="text-lg text-[#041C3C] leading-tight font-black italic font-outfit uppercase tracking-tighter">
                            {selectedStudent.status === 'Dropout' && `Action Required: Student has reached the absence limit (${selectedStudent.effAbs} total absences).`}
                            {selectedStudent.status === 'Critical' && `Warning: Student is one absence away from being dropped.`}
                            {selectedStudent.status === 'High Risk' && `Risk Warning: Attendance rate is ${selectedStudent.attendanceRate}%, which is below the threshold.`}
                            {selectedStudent.status === 'Good' && `Status: Good. Student attendance is stable at ${selectedStudent.attendanceRate}%.`}
                        </p>
                    </div>
                </div>

                <div className="relative group/btn z-10 pt-4">
                    <div className="absolute -inset-2 bg-gradient-to-r from-[#5CB4E4] to-[#041C3C] blur-[20px] opacity-0 group-hover/btn:opacity-60 transition-all duration-1000 rounded-2xl" />
                    <button onClick={handleGenerateIntervention}
                        className={`relative w-full py-4 px-8 rounded-xl font-black text-[12px] uppercase tracking-[0.3em] transition-all duration-700 border flex items-center justify-center gap-4 active:scale-95 italic shadow-xl ${aiCopied
                            ? 'bg-emerald-500 text-white border-white scale-105'
                            : 'bg-[#041C3C] text-white border-[#5CB4E4]/30 hover:bg-[#5CB4E4] hover:text-[#041C3C]'
                            }`}>
                        {aiCopied ? <><CheckCircle size={20} /> TEXT COPIED</> : <><Brain size={20} /> GET AI ADVICE</>}
                    </button>
                    <p className="text-[9px] text-slate-400 text-center uppercase tracking-[0.4em] italic font-black mt-4 animate-pulse">
                        AI ENGINE: CONNECTED
                    </p>
                </div>
            </div>
        </div>
    );

    const studentsContent = (
        <div className="space-y-4 animate-in fade-in duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Dropout Alerts" value={studentKPIs.dropout} color="#EF4444" icon={<TrendingDown size={24} />} />
                <KpiCard label="Critical Breach" value={studentKPIs.critical} color="#F59E0B" icon={<AlertTriangle size={24} />} />
                <KpiCard label="High Stability Risk" value={studentKPIs.highRisk} color="#F59E0B" icon={<Signal size={24} />} />
                <KpiCard label="Recently Absent" value={studentKPIs.pending} color="#8B5CF6" icon={<Activity size={24} />} />
            </div>

            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-xl font-outfit relative">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-[#041C3C] text-[#5CB4E4] rounded-xl shadow-lg">
                            <Users size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] italic">
                            STUDENT ATTENDANCE ASSESSMENT
                        </h3>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                         <div className="w-4 h-4 rounded-full bg-[#5CB4E4] animate-pulse" />
                         <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] italic">UPDATING LIVE</span>
                    </div>
                </div>
                <div className="overflow-x-auto relative z-10 custom-scrollbar">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="bg-[#041C3C] border-b border-[#5CB4E4]/30">
                                {['STUDENT NAME', 'SECTION', 'ABSENCES', 'LATES', 'TOTAL', 'RECENT', 'STATUS', 'ACTION'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-[#5CB4E4] uppercase tracking-[0.3em] text-left italic">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {atRiskStudents.length === 0 && (
                                <tr className="bg-white/40 group">
                                    <td colSpan={8} className="px-10 py-48 text-center pb-64">
                                        <div className="flex flex-col items-center gap-10">
                                            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20 shadow-4xl group-hover:scale-110 transition-transform duration-700">
                                                <CheckCircle size={64} className="text-emerald-500" />
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-2xl font-black text-[#041C3C] uppercase tracking-[0.6em] italic">ALL STUDENTS STABLE</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">No students are currently at risk.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {atRiskStudents.map(student => {
                                const isSelected = selectedStudent?.id === student.id && selectedStudent?.classId === student.classId;
                                return (
                                    <tr key={`${student.id}-${student.classId}`}
                                        onClick={() => { setSelectedStudent(student); setInterventionLog([]); }}
                                        className={`cursor-pointer transition-all duration-700 group/row relative border-b border-slate-50/50 ${isSelected ? 'bg-[#5CB4E4]/10' : 'bg-white/10 hover:bg-white/30'}`}>
                                        <td className="px-4 py-2 text-[11px] font-black text-[#041C3C] whitespace-nowrap italic group-hover/row:translate-x-1 transition-transform flex items-center gap-3">
                                            <div className={`w-1 h-8 rounded-full transition-all duration-700 ${isSelected ? 'bg-[#5CB4E4] shadow-[0_0_15px_rgba(92,180,228,1)]' : 'bg-slate-200 group-hover/row:bg-slate-300'}`} />
                                            {student.name.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-md border italic shadow-sm transition-all group-hover/row:scale-105"
                                                style={{
                                                    backgroundColor: `${sectionColor(student.section)}10`,
                                                    borderColor: `${sectionColor(student.section)}30`,
                                                    color: sectionColor(student.section),
                                                }}>
                                                {student.section.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-[11px] font-black text-rose-500 italic text-center opacity-60 group-hover/row:opacity-100">{student.absences.toString().padStart(2, '0')}</td>
                                        <td className="px-4 py-2 text-[11px] font-black text-[#F59E0B] italic text-center opacity-60 group-hover/row:opacity-100">{student.lates.toString().padStart(2, '0')}</td>
                                        <td className="px-4 py-2 text-[11px] font-black italic text-center"
                                            style={{ color: student.effAbs >= 3 ? '#EF4444' : student.effAbs >= 2 ? '#F59E0B' : '#041C3C' }}>
                                            {student.effAbs.toString().padStart(2, '0')}
                                        </td>
                                        <td className="px-4 py-2 scale-75 origin-left"><StreakDots streak={student.streak.slice(0, 8)} /></td>
                                        <td className="px-4 py-2 scale-90 origin-left"><StatusBadge status={student.status} /></td>
                                        <td className="px-4 py-2 scale-90 origin-left">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openAuditModal(student);
                                                }}
                                                className="px-4 py-1.5 bg-[#041C3C] text-[#5CB4E4] text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-[#5CB4E4]/30 italic hover:bg-[#5CB4E4] hover:text-[#041C3C] transition-all shadow-lg active:scale-95 flex items-center gap-2 group/btn"
                                            >
                                                <History size={12} className="group-hover/btn:rotate-[-45deg] transition-transform" />
                                                EDIT HISTORY
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Selection Hub - OPTIMIZED */}
            {atRiskStudents.length > 0 && (
                <div className="flex flex-col gap-3 bg-white/40 p-6 rounded-[2.5rem] border border-white/20 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">CRITICAL_DOSSIER: QUICK_ACCESS</span>
                        <span className="text-[9px] font-black text-[#5CB4E4] uppercase tracking-[0.2em] italic opacity-50">TOP 12 PRIORITY TARGETS</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center relative z-10">
                        {atRiskStudents.slice(0, 12).map(s => {
                            const active = selectedStudent?.id === s.id && selectedStudent?.classId === s.classId;
                            return (
                                <button key={`${s.id}-${s.classId}`}
                                    onClick={() => { setSelectedStudent(s); setInterventionLog([]); }}
                                    className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] rounded-lg transition-all duration-500 border italic active:scale-90 hover:shadow-lg flex items-center gap-2 group"
                                    style={{
                                        borderColor: active ? sectionColor(s.section) : 'rgba(92,180,228,0.1)',
                                        backgroundColor: active ? `${sectionColor(s.section)}15` : 'rgba(255,255,255,0.4)',
                                        color: active ? sectionColor(s.section) : '#041C3C',
                                    }}>
                                    <div className="w-2 h-2 rounded-full" style={{ 
                                        backgroundColor: s.status === 'Dropout' ? '#EF4444' : s.status === 'Critical' ? '#F59E0B' : '#5CB4E4',
                                        boxShadow: `0 0 10px ${s.status === 'Dropout' ? '#EF4444' : s.status === 'Critical' ? '#F59E0B' : '#5CB4E4'}`
                                    }} />
                                    {s.name.split(' ')[0].toUpperCase()}
                                </button>
                            );
                        })}
                        {atRiskStudents.length > 12 && (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic ml-2">
                                +{atRiskStudents.length - 12} MORE IN LIST BELOW
                            </span>
                        )}
                    </div>
                </div>
            )}

            {selectedStudent ? studentProfile : (
                <div className="bg-white/40 backdrop-blur-xl rounded-2xl border-2 border-dashed border-white/40 p-16 text-center shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-[#041C3C]/5 rounded-full flex items-center justify-center border border-[#041C3C]/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 shadow-inner">
                            <Activity size={32} className="text-[#041C3C]/20" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-[#041C3C] uppercase tracking-[0.4em] italic">SELECT A STUDENT</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic max-w-md">Select a student from the list above to view their detailed attendance report.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4 font-outfit relative">
            {/* Filter Hub - OPERATIONS CONSOLE */}
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl relative overflow-hidden font-outfit">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-blueprint" />
                
                <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex flex-wrap items-center gap-6">
                        {/* Section Multi-Select Cluster */}
                        <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic">CONSOLE_01: CLASS_SELECTOR</span>
                                <div className="flex gap-4">
                                    <button onClick={() => setAllData(null as any)} className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] hover:underline flex items-center gap-2">
                                        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> REFRESH_SYSTEM
                                    </button>
                                    <button onClick={() => setActiveSections([])} className="text-[8px] font-black text-[#5CB4E4] uppercase tracking-[0.2em] hover:underline">RESET_ALL</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                                {sections.length === 0 ? (
                                    <span className="text-[10px] text-slate-300 italic px-2">NO CLASSES DETECTED</span>
                                ) : sections.map(s => <SectionPill key={s.id} id={s.id} label={s.label} color={s.color} />)}
                            </div>
                        </div>

                        <div className="hidden lg:block w-[1px] h-16 bg-slate-200/50" />

                        {/* Control Cluster */}
                        <div className="flex flex-wrap gap-6 items-end">
                            <div className="flex flex-col gap-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none ml-2">CONSOLE_02: TIMELINE</span>
                                <PillToggle
                                    value={activePeriod}
                                    options={[{ id: 'semester', label: 'SEMESTER' }, { id: 'week', label: 'WEEK' }]}
                                    onChange={v => setActivePeriod(v as any)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none ml-2">CONSOLE_03: RISK_PROFILE</span>
                                <PillToggle
                                    value={riskProfile}
                                    options={[
                                        { id: 'all', label: 'ALL' },
                                        { id: 'dropped', label: 'DROPPED' },
                                        { id: 'at-risk', label: 'AT RISK' },
                                        { id: 'stable', label: 'STABLE' }
                                    ]}
                                    onChange={v => setRiskProfile(v as any)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Bar */}
                    {(activeSections.length > 0 || riskProfile !== 'all' || activePeriod !== 'semester') && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 mt-1">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic mr-2">ACTIVE_FILTERS:</span>
                            {activeSections.map(s => (
                                <FilterTag key={s} label={s} onClear={() => setActiveSections(prev => prev.filter(x => x !== s))} />
                            ))}
                            {riskProfile !== 'all' && (
                                <FilterTag label={riskProfile} onClear={() => setRiskProfile('all')} color="#EF4444" />
                            )}
                            {activePeriod !== 'semester' && (
                                <FilterTag label={activePeriod} onClear={() => setActivePeriod('semester')} color="#5CB4E4" />
                            )}
                            <div className="ml-auto text-[10px] font-black text-[#041C3C] italic tracking-tight opacity-40">
                                MATCHING: {filteredStudents.length} TARGETS
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center gap-4 bg-white/60 p-2 rounded-2xl border border-white backdrop-blur-2xl shadow-xl self-start font-outfit">
                <button onClick={() => setActiveSubTab('dashboard')}
                    className={`relative px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-1000 italic active:scale-95 ${activeSubTab === 'dashboard'
                        ? 'bg-[#041C3C] text-white shadow-xl scale-105'
                        : 'bg-transparent text-slate-400 hover:text-[#041C3C] hover:bg-white'
                        }`}>
                    STATISTICS DASHBOARD
                    {activeSubTab === 'dashboard' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#5CB4E4] rounded-full shadow-[0_0_15px_rgba(92,180,228,1)] animate-pulse" />}
                </button>
                
                <button onClick={() => setActiveSubTab('students')}
                    className={`relative px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-1000 italic active:scale-95 ${activeSubTab === 'students'
                        ? 'bg-[#041C3C] text-white shadow-xl scale-105'
                        : 'bg-transparent text-slate-400 hover:text-[#041C3C] hover:bg-white'
                        }`}>
                    RISK DASHBOARD
                    {atRiskStudents.length > 0 && (
                        <span className="ml-4 inline-flex items-center justify-center px-3 py-1.5 text-[10px] font-black bg-rose-500 text-white rounded-lg shadow-xl animate-pulse">
                            {atRiskStudents.length} ALERT
                        </span>
                    )}
                    {activeSubTab === 'students' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,1)] animate-pulse" />}
                </button>
            </div>

            {/* Tab content */}
            <div className="animate-in fade-in duration-500">
                {activeSubTab === 'dashboard' && dashboardContent}
                {activeSubTab === 'students' && studentsContent}
            </div>

            {/* Audit & Edit History Modal - MOVED TO GLOBAL SCOPE */}
            {auditStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#041C3C]/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20 relative font-outfit">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-blueprint" />
                        
                        {/* Modal Header */}
                        <div className="bg-[#041C3C] p-8 text-white flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-[#5CB4E4]/20 flex items-center justify-center border-2 border-[#5CB4E4]/30 shadow-xl">
                                    <History size={32} className="text-[#5CB4E4]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-[0.2em] italic leading-none">{auditStudent.name}</h2>
                                    <p className="text-[10px] font-black text-[#5CB4E4] uppercase tracking-[0.4em] mt-2 italic opacity-70">
                                        STUDENT_DOSSIER: ATTENDANCE_AUDIT_LOG
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setAuditStudent(null); loadData(); }}
                                className="p-4 bg-white/10 rounded-2xl hover:bg-rose-500 transition-all group"
                            >
                                <Check size={24} className="text-white group-hover:scale-125 transition-transform" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Left Column: Quick Actions & Instructions */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Mail size={18} className="text-[#5CB4E4]" />
                                            <span className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.3em] italic">DIRECT_CONTACT</span>
                                        </div>
                                        
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Email</div>
                                            <div className="text-[12px] font-bold text-[#041C3C] flex items-center gap-2">
                                                {auditStudent.email}
                                                <button onClick={() => { navigator.clipboard.writeText(auditStudent.email); showToast('Email copied', 'success'); }} 
                                                    className="p-1 hover:bg-slate-100 rounded text-[#5CB4E4] transition-colors">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <a href={`mailto:${auditStudent.email}`} 
                                            className="w-full py-3 bg-[#041C3C] text-[#5CB4E4] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-[#5CB4E4]/30 italic hover:bg-[#5CB4E4] hover:text-[#041C3C] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                            <Mail size={14} /> SEND EMAIL
                                        </a>
                                    </div>

                                    <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10">
                                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] italic mb-4">INSTRUCTIONS:</div>
                                        <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed">
                                            Change status to <span className="text-emerald-600">EXCUSED</span> if student provided valid medical/academic proof. Streak dots and KPI metrics will update in real-time.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column: History Table */}
                                <div className="lg:col-span-2">
                                    {auditLoading ? (
                                        <div className="flex items-center justify-center p-20"><RefreshCw className="animate-spin text-[#5CB4E4]" /></div>
                                    ) : (
                                        <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-xl">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left italic">DATE / SESSION</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center italic">CURRENT STATUS</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right italic">AUDIT ACTIONS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {auditHistory.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="text-[11px] font-black text-[#041C3C] italic">{new Date(row.date).toLocaleDateString()}</div>
                                                                <div className="text-[9px] text-[#5CB4E4] font-bold tracking-widest opacity-60 uppercase">{row.start_time}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase italic border ${
                                                                    row.status.toLowerCase() === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    row.status.toLowerCase() === 'late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    row.status.toLowerCase() === 'excused' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                                }`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {['Present', 'Late', 'Excused', 'Absent'].map(st => (
                                                                        <button 
                                                                            key={st}
                                                                            onClick={() => updateAttendance(row.session_id, row.log_id, st)}
                                                                            className={`px-2 py-1 text-[8px] font-black uppercase rounded shadow-sm border transition-all ${
                                                                                row.status.toLowerCase() === st.toLowerCase() 
                                                                                ? 'bg-[#041C3C] text-white border-[#041C3C]' 
                                                                                : 'bg-white text-slate-400 border-slate-100 hover:border-[#5CB4E4] hover:text-[#5CB4E4]'
                                                                            }`}
                                                                        >
                                                                            {st[0]}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
