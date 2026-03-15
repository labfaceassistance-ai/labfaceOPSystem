"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

interface ClassAnalyticsProps {
    classId: number;
}

interface StudentAnalytics {
    studentId: number;
    studentName: string;
    profilePicture: string | null;
    totalSessions: number;
    attendedSessions: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
    isAtRisk: boolean;
}

interface AnalyticsData {
    classId: number;
    totalSessions: number;
    totalStudents: number;
    averageAttendance: number;
    atRiskCount: number;
    students: StudentAnalytics[];
}

export default function ClassAnalytics({ classId }: ClassAnalyticsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    useEffect(() => {
        fetchAnalytics();
    }, [classId]);

    const fetchAnalytics = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/${classId}/analytics`);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center p-12 text-slate-400">
                No analytics data available
            </div>
        );
    }

    const riskStudents = analytics.students.filter(s => s.isAtRisk);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users size={24} />}
                    title="Total Students"
                    value={analytics.totalStudents}
                    color="blue"
                />
                <StatCard
                    icon={<Calendar size={24} />}
                    title="Total Sessions"
                    value={analytics.totalSessions}
                    color="purple"
                />
                <StatCard
                    icon={<TrendingDown size={24} />}
                    title="At Risk"
                    value={analytics.atRiskCount}
                    color="red"
                />
                <StatCard
                    icon={<BarChart3 size={24} />}
                    title="Class Average"
                    value={`${analytics.averageAttendance}%`}
                    color="green"
                />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'list'
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    List View
                </button>
                <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'grid'
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    Grid View
                </button>
            </div>

            {/* Risk List */}
            {riskStudents.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                        <TrendingDown size={20} />
                        Students at Risk (Below 75% Attendance)
                    </h3>
                    <div className="space-y-3">
                        {riskStudents.map(student => (
                            <div
                                key={student.studentId}
                                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                                        {student.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{student.studentName}</p>
                                        <p className="text-sm text-slate-400">
                                            {student.attendedSessions}/{student.totalSessions} sessions
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-red-400">
                                        {student.attendanceRate}%
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {student.absentCount} absent
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student List */}
            {viewMode === 'list' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="font-bold text-white">Student Attendance</h3>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {analytics.students.map(student => (
                            <div
                                key={student.studentId}
                                className="p-4 hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                                            {student.studentName.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-white">{student.studentName}</p>
                                            <div className="flex gap-4 mt-1 text-sm">
                                                <span className="text-green-400">
                                                    ✓ {student.presentCount} Present
                                                </span>
                                                <span className="text-yellow-400">
                                                    ⏰ {student.lateCount} Late
                                                </span>
                                                <span className="text-red-400">
                                                    ✗ {student.absentCount} Absent
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${student.isAtRisk ? 'text-red-400' : 'text-green-400'
                                            }`}>
                                            {student.attendanceRate}%
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {student.attendedSessions}/{student.totalSessions}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <AttendanceGrid classId={classId} />
            )}
        </div>
    );
}

function StatCard({ icon, title, value, color }: any) {
    const colors: { [key: string]: string } = {
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        red: 'bg-red-500/10 border-red-500/30 text-red-400',
        green: 'bg-green-500/10 border-green-500/30 text-green-400'
    };

    return (
        <div className={`${colors[color]} border rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-2">
                <span className="opacity-80">{icon}</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm opacity-80">{title}</p>
        </div>
    );
}

function AttendanceGrid({ classId }: { classId: number }) {
    const [gridData, setGridData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGrid();
    }, [classId]);

    const fetchGrid = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/classes/${classId}/attendance-grid`);
            setGridData(response.data);
        } catch (error) {
            console.error('Failed to fetch grid:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center p-12 text-slate-400">Loading grid...</div>;
    }

    if (!gridData) {
        return <div className="text-center p-12 text-slate-400">No grid data available</div>;
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
                <h3 className="font-bold text-white">Attendance Grid</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-slate-800">
                            <th className="sticky left-0 bg-slate-800 p-3 text-left text-white font-medium z-10">
                                Student
                            </th>
                            {gridData.sessions.map((session: any) => (
                                <th key={session.id} className="p-3 text-center text-xs text-slate-300 min-w-[80px]">
                                    {new Date(session.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {gridData.students.map((student: any) => (
                            <tr key={student.studentId} className="hover:bg-slate-800/50">
                                <td className="sticky left-0 bg-slate-900 p-3 text-white font-medium z-10">
                                    {student.studentName}
                                </td>
                                {student.attendance.map((att: any, idx: number) => (
                                    <td key={idx} className="p-3 text-center">
                                        <StatusBadge status={att.status} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        'Present': 'bg-green-500',
        'Late': 'bg-yellow-500',
        'Absent': 'bg-red-500/30 border border-red-500/50'
    };

    return (
        <div
            className={`w-8 h-8 rounded-full ${styles[status as keyof typeof styles]} mx-auto`}
            title={status}
        />
    );
}
