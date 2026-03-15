'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Brain, Users, AlertTriangle, TrendingUp, Target,
    Activity, CheckCircle, XCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getToken, getUser } from '@/utils/auth';

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
            router.push('/login');
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
            const avgSuccess = studentsWithRisk.reduce((sum, s) => sum + (s.success_probability || 0), 0) / studentsWithRisk.length;
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-white text-xl">Loading AI insights...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Brain className="text-purple-400" size={32} />
                        System-Wide AI Analytics
                    </h1>
                    <p className="text-slate-400">Predictive insights across all students</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Total Students */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="text-blue-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">{insights.totalStudents}</div>
                                <div className="text-sm text-slate-400">Total Students</div>
                            </div>
                        </div>
                    </div>

                    {/* High Risk */}
                    <div className="bg-red-900/20 backdrop-blur-sm border border-red-900/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <AlertTriangle className="text-red-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-red-400">{insights.highRiskCount}</div>
                                <div className="text-sm text-slate-400">High Risk</div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400">
                            {((insights.highRiskCount / insights.totalStudents) * 100).toFixed(1)}% of total
                        </div>
                    </div>

                    {/* Medium Risk */}
                    <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-900/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="text-yellow-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-yellow-400">{insights.mediumRiskCount}</div>
                                <div className="text-sm text-slate-400">Medium Risk</div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400">
                            {((insights.mediumRiskCount / insights.totalStudents) * 100).toFixed(1)}% of total
                        </div>
                    </div>

                    {/* Low Risk */}
                    <div className="bg-green-900/20 backdrop-blur-sm border border-green-900/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircle className="text-green-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-green-400">{insights.lowRiskCount}</div>
                                <div className="text-sm text-slate-400">Low Risk</div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400">
                            {((insights.lowRiskCount / insights.totalStudents) * 100).toFixed(1)}% of total
                        </div>
                    </div>

                    {/* Avg Success Rate */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="text-purple-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">{insights.avgSuccessProbability.toFixed(1)}%</div>
                                <div className="text-sm text-slate-400">Avg Success Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Predicted Dropouts */}
                    <div className="bg-red-900/20 backdrop-blur-sm border border-red-900/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <XCircle className="text-red-400" size={32} />
                            <div className="text-right">
                                <div className="text-3xl font-bold text-red-400">{insights.predictedDropouts}</div>
                                <div className="text-sm text-slate-400">Predicted Dropouts</div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400">
                            Success probability &lt; 40%
                        </div>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Risk Distribution</h2>
                    <div className="space-y-4">
                        {/* High Risk Bar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-red-400">High Risk</span>
                                <span className="text-white">{insights.highRiskCount} students</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-4">
                                <div
                                    className="bg-red-400 h-4 rounded-full transition-all duration-1000"
                                    style={{ width: `${(insights.highRiskCount / insights.totalStudents) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Medium Risk Bar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-yellow-400">Medium Risk</span>
                                <span className="text-white">{insights.mediumRiskCount} students</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-4">
                                <div
                                    className="bg-yellow-400 h-4 rounded-full transition-all duration-1000"
                                    style={{ width: `${(insights.mediumRiskCount / insights.totalStudents) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Low Risk Bar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-400">Low Risk</span>
                                <span className="text-white">{insights.lowRiskCount} students</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-4">
                                <div
                                    className="bg-green-400 h-4 rounded-full transition-all duration-1000"
                                    style={{ width: `${(insights.lowRiskCount / insights.totalStudents) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* High Risk Students Table */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-red-900/50 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-red-400" size={24} />
                        Critical: High Risk Students
                    </h2>
                    {highRiskStudents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Student ID</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Attendance</th>
                                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Risk Score</th>
                                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {highRiskStudents.map((student, index) => (
                                        <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="py-3 px-4 text-white">{student.student_id}</td>
                                            <td className="py-3 px-4 text-white">{student.name}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-yellow-400">{student.attendance_rate}%</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-red-400 font-bold">{student.risk_score?.toFixed(0) || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-3 py-1 bg-red-900/30 border border-red-900/50 text-red-400 rounded-full text-sm">
                                                    HIGH RISK
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-green-400">No high-risk students identified. Excellent!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
