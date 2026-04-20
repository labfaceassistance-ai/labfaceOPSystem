'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Brain, Users, AlertTriangle, TrendingUp, Target,
    Activity, CheckCircle, XCircle, ChevronLeft
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getToken, getUser } from '@/utils/auth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface SystemInsights {
    totalStudents: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    avgSuccessProbability: number;
    predictedDropouts: number;
}

interface RiskStudent {
    id: number;
    student_id: string;
    name: string;
    risk_score: number;
    risk_level: string;
    attendance_rate: number;
}

export default function AdminAIPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<SystemInsights>({
        totalStudents: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        avgSuccessProbability: 0,
        predictedDropouts: 0
    });
    const [highRiskStudents, setHighRiskStudents] = useState<RiskStudent[]>([]);

    useEffect(() => {
        const token = getToken();
        const userData = getUser();

        if (!token || !userData) {
            router.push('/admin/login');
            return;
        }

        if (userData.role !== 'admin') {
            router.push('/');
            return;
        }

        fetchSystemInsights();
    }, []);

    const fetchSystemInsights = async () => {
        try {
            setLoading(true);
            const token = getToken();

            // Get all students
            const studentsResponse = await axios.get(`${API_URL}/api/analytics/student-insights?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const allStudents = [
                ...(studentsResponse.data.topPerformers || []),
                ...(studentsResponse.data.atRiskStudents || [])
            ];

            // Calculate risk for each student
            const studentsWithRisk = await Promise.all(
                allStudents.slice(0, 50).map(async (student: any) => {
                    try {
                        const [riskResponse, predictionResponse] = await Promise.all([
                            axios.post(`${API_URL}/api/ai/predict/risk`,
                                { studentId: student.id },
                                { headers: { Authorization: `Bearer ${token}` } }
                            ),
                            axios.post(`${API_URL}/api/ai/predict/success`,
                                { studentId: student.id },
                                { headers: { Authorization: `Bearer ${token}` } }
                            )
                        ]);

                        return {
                            ...student,
                            risk_score: riskResponse.data.risk_score,
                            risk_level: riskResponse.data.risk_level,
                            success_probability: predictionResponse.data.success_probability
                        };
                    } catch {
                        return {
                            ...student,
                            risk_score: 50,
                            risk_level: 'medium',
                            success_probability: 0.5
                        };
                    }
                })
            );

            // Calculate insights
            const highRisk = studentsWithRisk.filter(s => s.risk_level === 'high');
            const mediumRisk = studentsWithRisk.filter(s => s.risk_level === 'medium');
            const lowRisk = studentsWithRisk.filter(s => s.risk_level === 'low');
            const avgSuccess = studentsWithRisk.reduce((sum, s) => sum + (s.success_probability || 0), 0) / (studentsWithRisk.length || 1);
            const predictedDropouts = studentsWithRisk.filter(s => s.success_probability < 0.4).length;

            setInsights({
                totalStudents: studentsWithRisk.length,
                highRiskCount: highRisk.length,
                mediumRiskCount: mediumRisk.length,
                lowRiskCount: lowRisk.length,
                avgSuccessProbability: avgSuccess * 100,
                predictedDropouts
            });

            setHighRiskStudents(highRisk.slice(0, 10));
        } catch (error) {
            console.error('Error fetching system insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
                <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Loading Analytics...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-identity-sky/20">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
                
                <div className="mb-8">
                    <Link href="/admin/dashboard" className="inline-flex items-center text-slate-400 hover:text-identity-navy font-black uppercase text-[10px] tracking-[0.15em] transition-colors group bg-white/50 px-5 py-3 rounded-2xl border border-slate-200">
                        <ChevronLeft size={16} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Admin Portal
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-identity-navy mb-3 uppercase tracking-tighter italic flex items-center gap-4">
                            <div className="bg-identity-sky/10 p-3 rounded-2xl">
                                <Brain className="text-identity-sky w-8 h-8" />
                            </div>
                            Monitor Predictive Analytics
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] ml-2">Behavioral Insights Engine</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-fade-in">
                    <div className="identity-glass p-8 rounded-[32px] shadow-xl border border-identity-sky/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="p-4 bg-identity-navy/5 rounded-2xl text-identity-navy">
                                <Users size={28} />
                            </div>
                            <div className="text-right">
                                <div className="text-3xl md:text-4xl font-black text-identity-navy tracking-tighter">{insights.totalStudents}</div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-1">Monitored Nodes</div>
                            </div>
                        </div>
                    </div>

                    <div className="identity-glass p-8 rounded-[32px] shadow-xl border border-rose-500/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500">
                                <AlertTriangle size={28} />
                            </div>
                            <div className="text-right">
                                <div className="text-3xl md:text-4xl font-black text-rose-500 tracking-tighter">{insights.highRiskCount}</div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-1">Critical Anomalies</div>
                            </div>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-400 mt-2 relative z-10 bg-rose-500/5 px-4 py-2 rounded-2xl inline-block">
                            {insights.totalStudents > 0 ? ((insights.highRiskCount / insights.totalStudents) * 100).toFixed(1) : 0}% OF ALL STUDENTS
                        </div>
                    </div>

                    <div className="identity-glass p-8 rounded-[32px] shadow-xl border border-emerald-500/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                <CheckCircle size={28} />
                            </div>
                            <div className="text-right">
                                <div className="text-3xl md:text-4xl font-black text-emerald-500 tracking-tighter">{insights.lowRiskCount}</div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-1">Stable Records</div>
                            </div>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-500 mt-2 relative z-10 bg-emerald-500/5 px-4 py-2 rounded-2xl inline-block">
                            {insights.totalStudents > 0 ? ((insights.lowRiskCount / insights.totalStudents) * 100).toFixed(1) : 0}% OF ALL STUDENTS
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-fade-in">
                    <div className="identity-glass p-8 rounded-[32px] shadow-xl border border-slate-200">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-identity-sky/10 rounded-2xl text-identity-sky">
                                <Target size={24} />
                            </div>
                            <h3 className="text-sm font-black text-identity-navy uppercase tracking-[0.15em]">System Reliability Coefficient</h3>
                        </div>
                        <div className="flex items-end gap-4 mt-4">
                            <span className="text-4xl md:text-5xl font-black text-identity-navy tracking-tighter italic">{insights.avgSuccessProbability.toFixed(1)}%</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-[0.15em]">AI Prediction Confidence</p>
                    </div>

                    <div className="identity-glass p-8 rounded-[32px] shadow-xl border border-rose-200 bg-rose-50/30">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                                <XCircle size={24} />
                            </div>
                            <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.15em]">Forecasted Deregistrations</h3>
                        </div>
                        <div className="flex items-end gap-4 mt-4">
                            <span className="text-4xl md:text-5xl font-black text-rose-500 tracking-tighter italic">{insights.predictedDropouts}</span>
                        </div>
                        <p className="text-[10px] font-bold text-rose-400 mt-3 uppercase tracking-[0.15em]">Students with &lt; 40% attendance</p>
                    </div>
                </div>

                <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-identity-sky/10 mb-12 bg-white/40 animate-fade-in">
                    <h2 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter italic flex items-center gap-4">
                        <Activity className="text-identity-sky w-6 h-6" />
                        Analyze Threat Distribution
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.15em]">Critical Risk Threshold</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.highRiskCount} Identities</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-rose-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.highRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em]">Moderate Instability</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.mediumRiskCount} Identities</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.mediumRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.15em]">Secure Status</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.lowRiskCount} Identities</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.lowRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="identity-glass p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-rose-500/20 bg-white/40 animate-fade-in relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                    <h2 className="text-xl font-black text-rose-500 mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10">
                        <AlertTriangle className="text-rose-500 w-6 h-6" />
                        Review At-Risk Students
                    </h2>

                    {highRiskStudents.length > 0 ? (
                        <div className="table-responsive-wrapper relative z-10">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="px-6 py-5 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Course Code</th>
                                        <th className="px-6 py-5 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px]">Target Name</th>
                                        <th className="px-6 py-5 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px] text-center">Compliance Rate</th>
                                        <th className="px-6 py-5 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px] text-center">Risk Score</th>
                                        <th className="px-6 py-5 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px] text-center">System Flag</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {highRiskStudents.map((student, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <code className="text-[10px] bg-white px-3 py-1.5 rounded-2xl text-identity-navy font-mono border border-slate-200 font-bold tracking-[0.15em]">
                                                    {student.student_id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-5 text-identity-navy font-black text-xs uppercase tracking-[0.15em] italic">
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-amber-500 font-black text-xs">{student.attendance_rate}%</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-rose-500 font-black text-sm">{student.risk_score?.toFixed(0) || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em]">
                                                    CRITICAL ALERT
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-emerald-600 text-xs flex items-center gap-4 font-black uppercase tracking-[0.15em] shadow-inner relative z-10">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            NO AT-RISK STUDENTS DETECTED.
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
