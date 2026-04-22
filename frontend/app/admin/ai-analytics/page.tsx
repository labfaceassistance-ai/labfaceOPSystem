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
                <p className="text-identity-navy/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Analyzing Student Patterns...</p>
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

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-in px-2">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#041C3C] mb-3 uppercase tracking-tighter font-outfit flex flex-wrap items-center gap-4">
                            <div className="bg-[#5CB4E4]/10 rounded-2xl p-3">
                                <Brain className="text-[#5CB4E4] w-10 h-10" />
                            </div>
                            <span>Predictive Insights</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] md:text-sm font-black uppercase tracking-[0.4em] ml-2">AI-driven student performance forecasting.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 animate-fade-in">
                    <div className="identity-glass p-10 rounded-[3rem] shadow-xl border border-[#5CB4E4]/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#5CB4E4]/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="bg-[#5CB4E4]/10 rounded-2xl p-3 text-[#041C3C]">
                                <Users size={32} />
                            </div>
                            <div className="text-right">
                                <div className="text-4xl md:text-5xl font-black text-[#041C3C] tracking-tighter font-outfit">{insights.totalStudents}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">TOTAL STUDENTS</div>
                            </div>
                        </div>
                    </div>

                    <div className="identity-glass p-10 rounded-[3rem] shadow-xl border border-rose-500/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="bg-rose-500/10 rounded-2xl p-3 text-rose-500">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="text-right">
                                <div className="text-4xl md:text-5xl font-black text-rose-500 tracking-tighter font-outfit">{insights.highRiskCount}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">HIGH-RISK ALERTS</div>
                            </div>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-400 mt-4 relative z-10 bg-rose-500/5 px-4 py-2 rounded-2xl inline-block">
                            {insights.totalStudents > 0 ? ((insights.highRiskCount / insights.totalStudents) * 100).toFixed(1) : 0}% of student body
                        </div>
                    </div>

                    <div className="identity-glass p-10 rounded-[3rem] shadow-xl border border-emerald-500/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="bg-emerald-500/10 rounded-2xl p-3 text-emerald-500">
                                <CheckCircle size={32} />
                            </div>
                            <div className="text-right">
                                <div className="text-4xl md:text-5xl font-black text-emerald-500 tracking-tighter font-outfit">{insights.lowRiskCount}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">ON-TRACK STUDENTS</div>
                            </div>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-500 mt-4 relative z-10 bg-emerald-500/5 px-4 py-2 rounded-2xl inline-block">
                            {insights.totalStudents > 0 ? ((insights.lowRiskCount / insights.totalStudents) * 100).toFixed(1) : 0}% of student body
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-fade-in">
                    <div className="identity-glass p-10 rounded-[3rem] shadow-xl border border-[#041C3C]/5 bg-white/40">
                         <div className="flex items-center gap-4 mb-8">
                            <div className="bg-[#5CB4E4]/10 rounded-2xl p-3 text-[#5CB4E4]">
                                <Target size={28} />
                            </div>
                            <h3 className="text-xs md:text-sm font-black text-[#041C3C] uppercase tracking-[0.15em]">Prediction Accuracy Level</h3>
                        </div>
                        <div className="flex items-end gap-2 mt-4">
                            <span className="text-5xl md:text-6xl font-black text-[#041C3C] tracking-tighter font-outfit italic">{insights.avgSuccessProbability.toFixed(1)}%</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-[0.15em]">AI CONFIDENCE RATING</p>
                    </div>

                    <div className="identity-glass p-10 rounded-[3rem] shadow-xl border border-rose-200 bg-rose-50/20">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-rose-500/10 rounded-2xl p-3 text-rose-500">
                                <XCircle size={28} />
                            </div>
                            <h3 className="text-xs md:text-sm font-black text-rose-500 uppercase tracking-[0.15em]">Predicted At-Risk Departures</h3>
                        </div>
                        <div className="flex items-end gap-2 mt-4">
                            <span className="text-5xl md:text-6xl font-black text-rose-500 tracking-tighter font-outfit italic">{insights.predictedDropouts}</span>
                        </div>
                        <p className="text-[10px] font-black text-rose-400 mt-4 uppercase tracking-[0.15em]">Status: Attention Required</p>
                    </div>
                </div>

                <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-[#5CB4E4]/10 mb-12 bg-white/40 animate-fade-in">
                    <h2 className="text-2xl font-black text-[#041C3C] mb-10 uppercase tracking-tighter font-outfit flex items-center gap-4">
                        <div className="bg-[#5CB4E4]/10 rounded-2xl p-2">
                            <Activity className="text-[#5CB4E4] w-6 h-6" />
                        </div>
                        STUDENT RISK DISTRIBUTION
                    </h2>
                    
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.15em]">CRITICAL RISK LEVEL</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.highRiskCount} STUDENTS</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-rose-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.highRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em]">MODERATE RISK LEVEL</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.mediumRiskCount} STUDENTS</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.mediumRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.15em]">LOW RISK LEVEL</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{insights.lowRiskCount} STUDENTS</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 border border-slate-200 overflow-hidden shadow-inner">
                                <div
                                    className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${insights.totalStudents > 0 ? (insights.lowRiskCount / insights.totalStudents) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="identity-glass p-10 rounded-[3rem] shadow-2xl border border-rose-500/20 bg-white/40 animate-fade-in relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none opacity-50" />
                    <h2 className="text-2xl font-black text-rose-500 mb-10 uppercase tracking-tighter font-outfit flex items-center gap-4 relative z-10">
                        <div className="bg-rose-500/10 rounded-2xl p-2">
                            <AlertTriangle className="text-rose-500 w-6 h-6" />
                        </div>
                        REVIEW AT-RISK STUDENTS
                    </h2>

                    {highRiskStudents.length > 0 ? (
                        <div className="table-responsive-wrapper relative z-10">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="px-6 py-5 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px]">STUDENT ID</th>
                                        <th className="px-6 py-5 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px]">FULL NAME</th>
                                        <th className="px-6 py-5 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px] text-center">ATTENDANCE RATE</th>
                                        <th className="px-6 py-5 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px] text-center">RISK SCORE</th>
                                        <th className="px-6 py-5 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px] text-center">ACTION STATUS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {highRiskStudents.map((student, index) => (
                                        <tr key={index} className="hover:bg-white/60 transition-colors group">
                                            <td className="px-6 py-6">
                                                <code className="text-[10px] bg-white px-3 py-1.5 rounded-xl text-[#041C3C] font-mono border border-slate-200 font-black tracking-[0.15em]">
                                                    {student.student_id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-6 text-[#041C3C] font-black text-xs uppercase tracking-[0.15em]">
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="text-amber-500 font-black text-xs tracking-[0.15em]">{student.attendance_rate}%</span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="text-rose-500 font-black text-sm tracking-tighter">{student.risk_score?.toFixed(0) || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="px-4 py-2 bg-rose-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] shadow-lg shadow-rose-500/20">
                                                    ATTENTION REQUIRED
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-emerald-500 text-white rounded-[2rem] p-10 text-xs flex items-center justify-center gap-6 font-black uppercase tracking-[0.15em] shadow-2xl relative z-10 border border-emerald-400">
                            <CheckCircle className="w-8 h-8 shrink-0" />
                            NO AT-RISK STUDENTS IDENTIFIED AT THIS TIME
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
