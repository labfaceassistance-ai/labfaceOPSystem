'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { TrendingUp, Users, AlertTriangle, Brain, Target, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Line } from 'react-chartjs-2';
import { getToken, getUser } from '@/utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Forecast {
    day: number;
    predicted_count: number;
    confidence: number;
}

interface StudentRisk {
    id: number;
    student_id: string;
    name: string;
    risk_score: number;
    risk_level: string;
    attendance_rate: number;
}

export default function ProfessorAIPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [forecast, setForecast] = useState<Forecast[]>([]);
    const [atRiskStudents, setAtRiskStudents] = useState<StudentRisk[]>([]);

    useEffect(() => {
        const token = getToken();
        // user is needed for role check.
        // If we trust getUser() to return the object:
        const userData = getUser();

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        if (userData.role !== 'professor' && userData.role !== 'admin') {
            router.push('/');
            return;
        }

        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchForecast(selectedCourse);
            fetchAtRiskStudents(selectedCourse);
        }
    }, [selectedCourse]);

    const fetchCourses = async () => {
        try {
            const token = getToken();
            const response = await axios.get(`${API_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(response.data);
            if (response.data.length > 0) {
                setSelectedCourse(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchForecast = async (courseId: number) => {
        try {
            const token = getToken();
            const response = await axios.post(`${API_URL}/api/ai/predict/attendance`,
                { courseId, daysAhead: 7 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setForecast(response.data.forecast || []);
        } catch (error) {
            console.error('Error fetching forecast:', error);
            setForecast([]);
        }
    };

    const fetchAtRiskStudents = async (courseId: number) => {
        try {
            const token = getToken();
            // Get students for this course
            const studentsResponse = await axios.get(`${API_URL}/api/analytics/student-insights?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const atRisk = studentsResponse.data.atRiskStudents || [];

            // Get risk scores for each
            const studentsWithRisk = await Promise.all(
                atRisk.slice(0, 10).map(async (student: any) => {
                    try {
                        const riskResponse = await axios.post(`${API_URL}/api/ai/predict/risk`,
                            { studentId: student.id },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        return {
                            ...student,
                            risk_score: riskResponse.data.risk_score,
                            risk_level: riskResponse.data.risk_level
                        };
                    } catch {
                        return {
                            ...student,
                            risk_score: 50,
                            risk_level: 'medium'
                        };
                    }
                })
            );

            setAtRiskStudents(studentsWithRisk);
        } catch (error) {
            console.error('Error fetching at-risk students:', error);
            setAtRiskStudents([]);
        }
    };

    const chartData = {
        labels: forecast.map(f => `Day ${f.day}`),
        datasets: [{
            label: 'Predicted Attendance',
            data: forecast.map(f => f.predicted_count),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: 'rgb(203, 213, 225)' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(51, 65, 85, 0.3)' },
                ticks: { color: 'rgb(148, 163, 184)' }
            },
            y: {
                grid: { color: 'rgba(51, 65, 85, 0.3)' },
                ticks: { color: 'rgb(148, 163, 184)' },
                beginAtZero: true
            }
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'high': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-white text-xl">Loading AI analytics...</div>
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
                        AI Analytics for Professors
                    </h1>
                    <p className="text-slate-400">Predictive insights and student risk assessment</p>
                </div>

                {/* Course Selector */}
                <div className="mb-6">
                    <label className="block text-white mb-2">Select Course:</label>
                    <select
                        value={selectedCourse || ''}
                        onChange={(e) => setSelectedCourse(Number(e.target.value))}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.course_code} - {course.course_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Attendance Forecast */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="text-blue-400" size={24} />
                        7-Day Attendance Forecast
                    </h2>
                    {forecast.length > 0 ? (
                        <div style={{ height: '300px' }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    ) : (
                        <p className="text-slate-400">No forecast data available. Need more historical data.</p>
                    )}
                </div>

                {/* At-Risk Students */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-red-900/50 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-red-400" size={24} />
                        At-Risk Students
                    </h2>
                    {atRiskStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {atRiskStudents.map((student, index) => (
                                <div key={index} className="p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="font-medium text-white">{student.name}</div>
                                            <div className="text-sm text-slate-400">{student.student_id}</div>
                                        </div>
                                        <div className={`text-2xl font-bold ${getRiskColor(student.risk_level)}`}>
                                            {student.risk_score?.toFixed(0) || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Attendance Rate:</span>
                                        <span className="text-white">{student.attendance_rate}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Risk Level:</span>
                                        <span className={getRiskColor(student.risk_level)}>
                                            {student.risk_level?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-green-400">No at-risk students identified. Great job!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
