/**
 * Attendance Insights Dashboard for Students
 * Shows streaks, trends, predictions, and personalized recommendations
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, Target, AlertTriangle, Users, Calendar, Flame, CheckCircle, BarChart3, Clock, XCircle } from 'lucide-react';
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
        if (savedGoal) {
            setGoal(parseInt(savedGoal));
        }
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
                console.error('[Insights] No valid token found in storage (checked session & local).');
                setLoading(false);
                return;
            }

            console.log('[Insights] Fetching for student:', studentId);

            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/ai/student-insights/${studentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('[Insights] Success:', response.data);
            setInsights(response.data);

            // Fetch overall summary
            const summaryResponse = await axios.get(`${API_URL}/api/student/attendance-summary/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOverallStats(summaryResponse.data);

        } catch (error: any) {
            console.error('Failed to fetch insights:', error);
            if (error.response?.status === 403) {
                console.error('[Insights] 403 Forbidden - Check backend logs for mismatch details');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <AttendanceInsightsSkeleton />;
    }

    const displayInsights = insights || {
        streak: 0,
        trend: 'stable' as const,
        trendPercentage: 0,
        riskLevel: 'low' as const,
        attendanceRate: 0,
        percentile: 0,
        predictions: {
            passLikelihood: 0,
            classesNeeded: 0
        },
        recommendations: ['Start attending classes to get personalized recommendations!'],
        monthlyData: []
    };

    const getTrendIcon = () => {
        switch (displayInsights.trend) {
            case 'up': return <TrendingUp className="text-green-500" size={24} />;
            case 'down': return <TrendingDown className="text-red-500" size={24} />;
            default: return <Minus className="text-slate-500" size={24} />;
        }
    };

    const getTrendMessage = () => {
        if (!insights) return 'Not enough data yet';
        const percentage = Math.abs(displayInsights.trendPercentage);
        switch (displayInsights.trend) {
            case 'up': return `📈 Improving! +${percentage}% this month`;
            case 'down': return `📉 Attendance dropping. -${percentage}% this month`;
            default: return `➡️ Consistent attendance`;
        }
    };

    const getRiskMessage = () => {
        if (!insights) return {
            icon: 'ℹ️',
            message: 'Not enough data for risk assessment',
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
        };

        switch (displayInsights.riskLevel) {
            case 'low': return {
                icon: '✅',
                message: 'On track to pass',
                color: 'text-green-400 bg-green-500/10 border-green-500/30'
            };
            case 'medium': return {
                icon: '⚠️',
                message: `Attend ${displayInsights.predictions.classesNeeded} more classes to stay safe`,
                color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
            };
            case 'high': return {
                icon: '🚨',
                message: 'At risk! Contact professor',
                color: 'text-red-400 bg-red-500/10 border-red-500/30'
            };
        }
    };

    const riskInfo = getRiskMessage();

    return (
        <div className="space-y-6">

            {/* Overall Summary Card */}
            {overallStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <CheckCircle className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{overallStats.presentCount}</div>
                            <div className="text-sm text-slate-400">Total Present</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Clock className="text-orange-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{overallStats.lateCount}</div>
                            <div className="text-sm text-slate-400">Total Late</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                            <XCircle className="text-red-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{overallStats.absentCount}</div>
                            <div className="text-sm text-slate-400">Total Absent</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center">
                            <BarChart3 className="text-brand-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{overallStats.attendanceRate}%</div>
                            <div className="text-sm text-slate-400">Overall Rate</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Streak Card */}
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Attendance Streak</h3>
                        <p className="text-sm text-orange-200">Keep it going!</p>
                    </div>
                    <Flame className="text-orange-400" size={32} />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-orange-400">{displayInsights.streak}</span>
                    <span className="text-2xl text-orange-300">{displayInsights.streak === 1 ? 'day' : 'days'}</span>
                </div>
                {displayInsights.streak >= 7 && (
                    <div className="mt-4 flex items-center gap-2 text-orange-200">
                        <Award size={18} />
                        <span className="text-sm font-medium">
                            {displayInsights.streak >= 30 ? '🏆 Legendary Streak!' :
                                displayInsights.streak >= 14 ? '⭐ Amazing Streak!' :
                                    '🔥 Great Streak!'}
                        </span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Rate */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Attendance Rate</span>
                        <Calendar className="text-blue-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {displayInsights.attendanceRate}%
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        {getTrendIcon()}
                        <span className={displayInsights.trend === 'up' ? 'text-green-400' : displayInsights.trend === 'down' ? 'text-red-400' : 'text-slate-400'}>
                            {getTrendMessage()}
                        </span>
                    </div>
                </div>

                {/* Percentile */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Class Ranking</span>
                        <Users className="text-purple-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {displayInsights.percentile > 0 ? `Top ${100 - displayInsights.percentile}%` : 'N/A'}
                    </div>
                    <p className="text-sm text-purple-300">
                        {displayInsights.percentile > 0
                            ? `You're in the top ${100 - displayInsights.percentile}% of your class`
                            : "Ranking available after more classes"}
                    </p>
                </div>

                {/* Pass Likelihood */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Pass Likelihood</span>
                        <Target className="text-green-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {displayInsights.predictions.passLikelihood}%
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                        <div
                            className={`h-2 rounded-full ${displayInsights.predictions.passLikelihood >= 75 ? 'bg-green-500' :
                                displayInsights.predictions.passLikelihood >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}
                            style={{ width: `${displayInsights.predictions.passLikelihood}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Risk Alert */}
            <div className={`border-2 rounded-lg p-4 ${riskInfo.color}`}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{riskInfo.icon}</span>
                    <div>
                        <h4 className="font-semibold mb-1">{riskInfo.message}</h4>
                        {displayInsights.riskLevel !== 'low' && (
                            <p className="text-sm opacity-80">
                                Based on your current attendance pattern, maintain or improve your attendance to ensure passing.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {displayInsights.recommendations.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-blue-400" size={20} />
                        Personalized Recommendations
                    </h3>
                    <ul className="space-y-3">
                        {displayInsights.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3 text-slate-300">
                                <span className="text-blue-400 font-bold">{index + 1}.</span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Monthly Trend Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Monthly Attendance Trend</h3>

                {(() => {
                    // Generate a complete 6-month view (current month + 5 future months)
                    const currentDate = new Date();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    // Create array of 6 months starting from the current month
                    const completeMonthData = Array.from({ length: 6 }, (_, index) => {
                        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
                        const monthName = monthNames[monthDate.getMonth()];

                        // Find actual data for this month
                        const actualData = displayInsights.monthlyData.find(m => m.month === monthName);

                        return actualData || {
                            month: monthName,
                            rate: 0,
                            attended: 0,
                            total: 0,
                            isPlaceholder: true
                        };
                    });

                    const hasAnyData = displayInsights.monthlyData.length > 0;

                    return hasAnyData ? (
                        <>
                            {/* Summary Card */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {completeMonthData.map((data, index) => (
                                    <div key={index} className={`rounded-lg p-4 border ${data.isPlaceholder
                                        ? 'bg-slate-800/20 border-slate-700/50'
                                        : 'bg-slate-800/50 border-slate-700'
                                        }`}>
                                        <div className="text-xs text-slate-400 mb-1">{data.month}</div>
                                        {data.isPlaceholder ? (
                                            <>
                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-2xl font-bold text-slate-600">--</span>
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    No data yet
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className={`text-2xl font-bold ${data.rate >= 75 ? 'text-green-400' :
                                                        data.rate >= 50 ? 'text-yellow-400' :
                                                            'text-red-400'
                                                        }`}>{data.rate}%</span>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    <span className="text-white font-medium">{data.attended}</span> of <span className="text-white font-medium">{data.total}</span> sessions
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Bar Chart */}
                            <div className="flex items-end gap-2 h-48">
                                {completeMonthData.map((data, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                        <div className={`w-full rounded-t relative ${data.isPlaceholder ? 'bg-slate-800/30' : 'bg-slate-800'
                                            }`} style={{ height: `${Math.max(data.rate, 5)}%` }}>
                                            {!data.isPlaceholder && (
                                                <>
                                                    <div
                                                        className={`absolute inset-0 rounded-t transition-all ${data.rate >= 75 ? 'bg-green-500' :
                                                            data.rate >= 50 ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                            }`}
                                                    />
                                                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white font-medium">
                                                        {data.rate}%
                                                    </span>
                                                    {data.rate > 15 && (
                                                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] text-white/80 font-medium whitespace-nowrap">
                                                            {data.attended}/{data.total}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {data.isPlaceholder && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-xs ${data.isPlaceholder ? 'text-slate-600' : 'text-slate-500'}`}>
                                            {data.month}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Contextual Insight */}
                            {displayInsights.monthlyData.length === 1 && (
                                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-sm text-slate-300">
                                        <span className="font-semibold text-white">Current Month: </span>
                                        You attended <span className="text-blue-400 font-semibold">{displayInsights.monthlyData[0].attended}</span> out of <span className="text-blue-400 font-semibold">{displayInsights.monthlyData[0].total}</span> sessions.
                                        {displayInsights.monthlyData[0].rate < 75 && (
                                            <span className="block mt-2 text-yellow-400">
                                                💡 Attend {Math.ceil(displayInsights.monthlyData[0].total * 0.75) - displayInsights.monthlyData[0].attended} more session(s) to reach 75% attendance.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                            <Calendar className="mb-3 text-slate-600" size={40} />
                            <p className="text-sm">No attendance data yet</p>
                            <p className="text-xs text-slate-600 mt-1">Start attending classes to see your monthly trends</p>
                        </div>
                    );
                })()}
            </div>

            {/* Goal Setting */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="text-blue-400" size={20} />
                    {goal ? 'Your Attendance Goal' : 'Set Your Goal'}
                </h3>

                {goal ? (
                    <div className="mb-4">
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-white">{goal}%</span>
                            <span className="text-slate-400 mb-1">target</span>
                        </div>
                        <p className="text-slate-300 text-sm">
                            You are currently {displayInsights.attendanceRate >= goal ? 'meeting' : 'below'} your goal.
                            {displayInsights.attendanceRate < goal && ` Try to attend ${Math.ceil((goal - displayInsights.attendanceRate) / 5)} more classes!`}
                        </p>
                    </div>
                ) : (
                    <p className="text-slate-300 mb-4">
                        Aim for 100% attendance this month to improve your ranking and ensure passing!
                    </p>
                )}

                <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
                >
                    {goal ? 'Update Goal' : 'Set Attendance Goal'}
                </button>
            </div>

            {/* Goal Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-white mb-4">Set Attendance Goal</h3>
                        <p className="text-slate-400 mb-6">Choose a realistic attendance target for yourself. We'll help you track your progress.</p>

                        <div className="space-y-3 mb-6">
                            {[90, 95, 100].map((target) => (
                                <button
                                    key={target}
                                    onClick={() => handleSaveGoal(target)}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${goal === target
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800/80'
                                        }`}
                                >
                                    <span className="font-bold text-lg">{target}%</span>
                                    {goal === target && <CheckCircle size={20} />}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsGoalModalOpen(false)}
                            className="w-full py-3 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
