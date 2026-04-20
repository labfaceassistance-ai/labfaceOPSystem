/**
 * Attendance Insights Dashboard for Students
 * Shows streaks, trends, predictions, and personalized recommendations
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, Target, AlertTriangle, Users, Calendar, Flame, CheckCircle, BarChart3, Clock, XCircle, ShieldCheck, Zap, Brain } from 'lucide-react';
import axios from 'axios';
import { getToken } from '@/utils/auth';
import AttendanceInsightsSkeleton from './AttendanceInsightsSkeleton';

interface AttendanceInsights {
    streak: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    riskLevel: 'low' | 'medium' | 'high';
    attendanceRate: number;
    percentile: number;
    predictions: {
        passLikelihood: number;
        classesNeeded: number;
    };
    recommendations: string[];
    monthlyData: { month: string; rate: number; attended: number; total: number; isPlaceholder?: boolean }[];
}

export default function AttendanceInsightsDashboard({ studentId }: { studentId: string }) {
    const [insights, setInsights] = useState<AttendanceInsights | null>(null);
    const [overallStats, setOverallStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [goal, setGoal] = useState<number | null>(null);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    useEffect(() => {
        const savedGoal = localStorage.getItem('attendanceGoal');
        if (savedGoal) { setGoal(parseInt(savedGoal)); }
    }, []);

    const handleSaveGoal = (newGoal: number) => {
        setGoal(newGoal);
        localStorage.setItem('attendanceGoal', newGoal.toString());
        setIsGoalModalOpen(false);
    };

    useEffect(() => {
        fetchInsights();
    }, [studentId]);

    const fetchInsights = async () => {
        try {
            const token = getToken();
            if (!token || token === 'undefined' || token === 'null') {
                setLoading(false);
                return;
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/ai/student-insights/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInsights(response.data);

            const summaryResponse = await axios.get(`${API_URL}/api/student/attendance-summary/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOverallStats(summaryResponse.data);

        } catch (error: any) {
            console.error('Failed to fetch insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) { return <AttendanceInsightsSkeleton />; }

    const displayInsights = insights || {
        streak: 0,
        trend: 'stable' as const,
        trendPercentage: 0,
        riskLevel: 'low' as const,
        attendanceRate: 0,
        percentile: 0,
        predictions: { passLikelihood: 0, classesNeeded: 0 },
        recommendations: ['Start attending classes to get personalized recommendations!'],
        monthlyData: []
    };

    const getTrendIcon = () => {
        switch (displayInsights.trend) {
            case 'up': return <TrendingUp className="text-emerald-500" size={24} />;
            case 'down': return <TrendingDown className="text-rose-500" size={24} />;
            default: return <Minus className="text-slate-400" size={24} />;
        }
    };

    const getTrendMessage = () => {
        if (!insights) return 'Processing...';
        const percentage = Math.abs(displayInsights.trendPercentage);
        switch (displayInsights.trend) {
            case 'up': return `Attendance Gains: +${percentage}%`;
            case 'down': return `Attendance Loss: -${percentage}%`;
            default: return `Consistency Lock`;
        }
    };

    const getRiskMessage = () => {
        if (!insights) return {
            icon: <Minus size={20} />,
            message: 'Insufficient Synchronization',
            color: 'text-identity-sky bg-identity-sky/5 border-identity-sky/10'
        };

        switch (displayInsights.riskLevel) {
            case 'low': return {
                icon: <ShieldCheck size={20} />,
                message: 'Active Baseline Secured',
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
            };
            case 'medium': return {
                icon: <AlertTriangle size={20} />,
                message: `Require ${displayInsights.predictions.classesNeeded} Sessions for Re-Stabilization`,
                color: 'text-amber-600 bg-amber-50 border-amber-100'
            };
            case 'high': return {
                icon: <XCircle size={20} />,
                message: 'Critical Stability Compromise',
                color: 'text-rose-600 bg-rose-50 border-rose-100'
            };
        }
    };

    const riskInfo = getRiskMessage();

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Overall Summary Card */}
            {overallStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                    {[
                        { label: 'Total Present', val: overallStats.presentCount, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Total Late', val: overallStats.lateCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                        { label: 'Total Absent', val: overallStats.absentCount, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                        { label: 'Final Attendance Rate', val: `${overallStats.attendanceRate}%`, icon: BarChart3, color: 'text-identity-sky', bg: 'bg-identity-sky/10' }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-white`}>
                                <stat.icon size={28} />
                            </div>
                            <div className="text-2xl font-black text-identity-navy font-outfit leading-none mb-1">{stat.val}</div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Streak Card */}
            <div className="bg-identity-navy rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-identity-sky/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-30"></div>
                <div className="absolute inset-0 bg-blueprint opacity-[0.05] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 text-identity-sky/80 mb-4 text-[10px] font-black uppercase tracking-[0.4em]">
                            <Zap size={16} className="animate-pulse" /> Live Suggestions Active
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase font-outfit">Identity Persistence</h3>
                        <p className="text-identity-sky/60 font-black text-[10px] uppercase tracking-[0.3em]">Keep records up to date.</p>
                        
                        <div className="mt-8 flex items-baseline gap-3">
                            <span className="text-6xl md:text-8xl font-black text-identity-sky font-outfit tracking-tighter drop-shadow-2xl">{displayInsights.streak}</span>
                            <span className="text-xl text-white/40 font-black uppercase tracking-[0.4em]">Nodes</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end text-center md:text-right">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-identity-sky border border-white/10 shadow-2xl mb-6">
                            <Flame size={48} className="drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                        </div>
                        {displayInsights.streak >= 7 && (
                            <div className="bg-identity-sky/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-identity-sky/30 text-identity-sky flex items-center gap-3">
                                <Award size={20} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                    {displayInsights.streak >= 30 ? 'Legendary Tier Status' :
                                        displayInsights.streak >= 14 ? 'Elite Synchronicity' :
                                            'Optimal Session Link'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { label: 'Attendance Rate', val: `${displayInsights.attendanceRate}%`, icon: Calendar, color: 'text-identity-sky', bg: 'bg-identity-sky/5', trend: true },
                    { label: 'Global Ranking', val: displayInsights.percentile > 0 ? `Top ${100 - displayInsights.percentile}%` : 'Pending', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50', sub: displayInsights.percentile > 0 ? `Superior to ${displayInsights.percentile}%` : "Awaiting more sessions" },
                    { label: 'Pass Probability', val: `${displayInsights.predictions.passLikelihood}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50', bar: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</span>
                            <stat.icon className={stat.color} size={20} />
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-identity-navy font-outfit mb-2 tracking-tighter uppercase">
                            {stat.val}
                        </div>
                        {stat.trend && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] mt-4 pt-4 border-t border-slate-50">
                                {getTrendIcon()}
                                <span className={displayInsights.trend === 'up' ? 'text-emerald-500' : displayInsights.trend === 'down' ? 'text-rose-500' : 'text-slate-400'}>
                                    {getTrendMessage()}
                                </span>
                            </div>
                        )}
                        {stat.sub && <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em] mt-4 pt-4 border-t border-slate-50">{stat.sub}</p>}
                        {stat.bar && (
                            <div className="mt-6 pt-6 border-t border-slate-50">
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 shadow-inner">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-1000 ${displayInsights.predictions.passLikelihood >= 75 ? 'bg-emerald-500' : displayInsights.predictions.passLikelihood >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        style={{ width: `${displayInsights.predictions.passLikelihood}%` }}
                                    />
                                </div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{displayInsights.predictions.passLikelihood >= 50 ? 'Stability Nominal' : 'Stability Warning'}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Risk Alert */}
            <div className={`border-2 rounded-3xl p-8 shadow-xl transition-all duration-500 ${riskInfo.color}`}>
                <div className="flex items-start gap-6">
                    <div className="p-4 bg-white/20 rounded-2xl">
                        {riskInfo.icon}
                    </div>
                    <div>
                        <h4 className="font-black uppercase tracking-[0.15em] text-sm mb-2">{riskInfo.message}</h4>
                        {displayInsights.riskLevel !== 'low' && (
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-relaxed">
                                Current attendance trajectory indicates a high probability of system failure. Stabilize immediately.
                            </p>
                        )}
                        {displayInsights.riskLevel === 'low' && (
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-relaxed">
                                Current performance is within optimal operational range.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {displayInsights.recommendations.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky"></div>
                    <h3 className="text-[11px] font-black text-identity-navy uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
                        <Brain className="text-identity-sky" size={24} />
                        Strategic Optimization
                        <span className="h-px bg-slate-100 flex-1"></span>
                    </h3>
                    <ul className="space-y-6">
                        {displayInsights.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-6 group">
                                <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-identity-navy font-black group-hover:bg-identity-sky group-hover:text-white transition-all shadow-sm">
                                    {index + 1}
                                </span>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] leading-relaxed pt-2 group-hover:text-identity-navy transition-colors">{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Monthly Trend Chart */}
            <div className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-2xl">
                <h3 className="text-[11px] font-black text-identity-navy uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
                    <BarChart3 className="text-identity-sky" size={24} />
                    Monthly Attendance Trend
                    <span className="h-px bg-slate-100 flex-1"></span>
                </h3>

                {(() => {
                    const currentDate = new Date();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const completeMonthData = Array.from({ length: 6 }, (_, index) => {
                        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
                        const monthName = monthNames[monthDate.getMonth()];
                        const actualData = (displayInsights.monthlyData || []).find(m => m.month === monthName);
                        return actualData || { month: monthName, rate: 0, attended: 0, total: 0, isPlaceholder: true };
                    });

                    const hasAnyData = (displayInsights.monthlyData || []).length > 0;

                    return hasAnyData ? (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-6 gap-4">
                                {completeMonthData.map((data, index) => (
                                    <div key={index} className={`rounded-[1.8rem] p-5 border transition-all ${data.isPlaceholder ? 'bg-slate-50/50 border-slate-50 opacity-40' : 'bg-slate-50 border-slate-100 hover:shadow-xl hover:bg-white'}`}>
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">{data.month}</div>
                                        <div className="text-xl font-black font-outfit text-identity-navy">{data.isPlaceholder ? '---' : `${data.rate}%`}</div>
                                        <div className="text-[7px] text-slate-300 font-black uppercase tracking-[0.15em] mt-1">
                                            {data.isPlaceholder ? 'Not Tracked' : `${data.attended}/${data.total} SESSIONS`}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-end gap-6 h-48 px-10">
                                {completeMonthData.map((data, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-4 group">
                                        <div className={`w-full max-w-[40px] rounded-2xl relative transition-all duration-700 ${data.isPlaceholder ? 'bg-slate-50 border border-slate-100 border-dashed' : 'bg-slate-50'}`} style={{ height: `${Math.max(data.rate, 5)}%` }}>
                                            {!data.isPlaceholder && (
                                                <>
                                                    <div className={`absolute inset-0 rounded-2xl shadow-lg transition-all ${data.rate >= 75 ? 'bg-emerald-500' : data.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-[10px] text-identity-navy font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {data.rate}%
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${data.isPlaceholder ? 'text-slate-200' : 'text-slate-400 group-hover:text-identity-sky'}`}>
                                            {data.month}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 rounded-[3rem]">
                            <Calendar className="mb-6" size={48} />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No History Found</p>
                        </div>
                    );
                })()}
            </div>

            {/* Goal Setting */}
            <div className="bg-identity-sky/5 border border-identity-sky/20 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex-1">
                    <h3 className="text-xl font-black text-identity-navy uppercase tracking-tighter font-outfit mb-4 flex items-center gap-4">
                        <Target className="text-identity-sky" size={28} />
                        Attendance Goal: {goal ? `${goal}% Attendance` : 'Unassigned'}
                    </h3>
                    {goal ? (
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] leading-relaxed">
                            Current performance: <span className="text-identity-sky">{displayInsights.attendanceRate}%</span>. 
                            {displayInsights.attendanceRate >= goal ? ' Goal achieved.' : ` Reaching goal requires +${goal - displayInsights.attendanceRate}% gain.`}
                        </p>
                    ) : (
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] leading-relaxed">
                            Set your attendance goal for personal recommendations.
                        </p>
                    )}
                </div>

                <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="px-12 py-5 bg-identity-navy text-white hover:bg-identity-sky hover:shadow-2xl rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all shadow-xl shadow-identity-navy/20 active:scale-95 whitespace-nowrap"
                >
                    {goal ? 'Update Goal' : 'Set My Goal'}
                </button>
            </div>

            {/* Goal Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-identity-navy/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-identity-sky/10 rounded-[3rem] w-full max-w-md p-10 shadow-3xl transform transition-all animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-black text-identity-navy mb-4 uppercase tracking-tighter font-outfit italic">Course Description</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed mb-10 italic">Choose your overall goal for the semester.</p>

                        <div className="space-y-4 mb-10">
                            {[90, 95, 100].map((target) => (
                                <button
                                    key={target}
                                    onClick={() => handleSaveGoal(target)}
                                    className={`w-full p-6 rounded-[2rem] border flex items-center justify-between group transition-all duration-500 ${goal === target
                                        ? 'bg-identity-navy border-identity-navy text-white shadow-xl scale-[1.02]'
                                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-identity-sky/30 hover:bg-white hover:shadow-lg'
                                        }`}
                                >
                                    <span className="font-black text-xl font-outfit uppercase tracking-tighter">{target}% Efficiency</span>
                                    {goal === target ? <CheckCircle size={24} className="text-identity-sky" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-identity-sky/30"></div>}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsGoalModalOpen(false)}
                            className="w-full py-4 text-slate-300 hover:text-identity-navy font-black text-[11px] uppercase tracking-[0.4em] transition-all hover:bg-slate-50 rounded-2xl"
                        >
                            Abort Initialization
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
