'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { TrendingUp, Users, AlertTriangle, Brain, Target, Calendar, CheckCircle } from 'lucide-react';
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
            const studentsResponse = await axios.get(`${API_URL}/api/analytics/student-insights?limit=20&classId=${courseId}`, {
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-10">
                    <div className="w-20 h-20 relative">
                        <div className="absolute inset-0 border-4 border-[#5CB4E4]/10 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute inset-0 border-4 border-[#5CB4E4]/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-[#041C3C] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-[12px] font-black text-[#5CB4E4] uppercase tracking-[0.5em] animate-pulse italic font-outfit">Analyzing Attendance Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 scrollbar-hide font-outfit select-none">
            <Navbar />
            
            {/* Header section with scanning effect */}
            <div className="mb-20 space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000 relative">
                <div className="absolute -left-12 top-0 h-full w-1 bg-gradient-to-b from-[#5CB4E4] to-transparent opacity-20" />
                <div className="flex items-center gap-8 group">
                    <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-3xl border border-slate-100 group-hover:scale-110 transition-transform duration-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[#5CB4E4]/5 animate-pulse" />
                        <Brain className="text-[#041C3C] relative z-10" size={40} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic flex items-center gap-4">
                                AI Attendance Analytics
                        </h1>
                        <p className="text-[12px] text-[#5CB4E4] font-black uppercase tracking-[0.5em] mt-3 italic opacity-80">Predictive student support and academic forecasting.</p>
                    </div>
                </div>
            </div>

            {/* Course Selector Dropdown - Refined */}
            <div className="mb-12 animate-in fade-in duration-1000 delay-200">
                <div className="text-[11px] text-slate-400 font-black uppercase tracking-[0.4em] mb-4 italic ml-2">SELECT AN ACADEMIC PROGRAM</div>
                <div className="relative group/select max-w-sm">
                    <div className="absolute -inset-1 bg-[#5CB4E4]/20 blur-xl opacity-0 group-hover/select:opacity-100 transition-opacity rounded-[2rem]" />
                    <select
                        value={selectedCourse || ''}
                        onChange={(e) => setSelectedCourse(Number(e.target.value))}
                        className="relative w-full px-8 py-5 bg-white/40 backdrop-blur-xl border border-[#5CB4E4]/10 rounded-[2rem] text-[#041C3C] font-black uppercase tracking-[0.2em] italic focus:outline-none focus:ring-2 focus:ring-[#5CB4E4] appearance-none cursor-pointer text-sm shadow-2xl"
                    >
                        {courses.map(course => (
                            <option key={course.id} value={course.id} className="bg-white text-[#041C3C] uppercase font-black tracking-[0.2em]">
                                {course.course_code.toUpperCase()} · {course.course_name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-[#5CB4E4]">
                        <Target size={20} />
                    </div>
                </div>
            </div>

            {/* Attendance Forecast - Chart Redesign */}
            <div className="bg-white/40 backdrop-blur-xl border border-[#5CB4E4]/10 rounded-[3rem] p-10 mb-12 shadow-3xl relative overflow-hidden animate-in fade-in zoom-in duration-1000 delay-300">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <TrendingUp size={120} className="text-[#5CB4E4]" />
                </div>
                
                <h2 className="text-[12px] font-black text-[#041C3C] mb-10 flex items-center gap-4 uppercase tracking-[0.4em] italic relative z-10">
                    <Calendar className="text-[#5CB4E4]" size={18} />
                    ATTENDANCE FORECAST CHART
                </h2>
                
                {forecast.length > 0 ? (
                    <div className="h-[350px] relative z-10 bg-white/40 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="h-[350px] flex items-center justify-center bg-white/20 rounded-[2rem] border-2 border-dashed border-slate-100 relative z-10">
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] italic">Insufficient data for academic forecasting.</p>
                    </div>
                )}
            </div>

            {/* At-Risk Students - Grid Redesign */}
            <div className="bg-white/40 backdrop-blur-xl border border-rose-500/10 rounded-[3.5rem] p-10 shadow-3xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-blueprint" />
                <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-rose-500/20 to-transparent top-0 animate-scan-y opacity-30 pointer-events-none" />
                
                <h2 className="text-[12px] font-black text-[#041C3C] mb-10 flex items-center gap-4 uppercase tracking-[0.4em] italic relative z-10">
                    <AlertTriangle className="text-rose-500" size={18} />
                    AT-RISK STUDENT ASSESSMENT
                </h2>
                
                {atRiskStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                        {atRiskStudents.map((student, index) => (
                            <div key={index} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20 group/card">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-[#041C3C] text-lg uppercase truncate italic tracking-tight group-hover/card:text-rose-600 transition-colors">{student.name}</div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 italic">STUDENT ID: {student.student_id}</div>
                                    </div>
                                    <div className={`text-4xl font-black italic tracking-tighter ${getRiskColor(student.risk_level)}`}>
                                        {student.risk_score?.toFixed(0) || 'Ø'}%
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] italic">
                                        <span className="text-slate-400">ATTENDANCE RATE</span>
                                        <span className="text-[#041C3C]">{student.attendance_rate}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out`} 
                                            style={{ 
                                                width: `${student.attendance_rate}%`,
                                                backgroundColor: student.risk_level === 'high' ? '#EF4444' : student.risk_level === 'medium' ? '#F59E0B' : '#10B981'
                                            }} />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.3em] italic pt-4">
                                        <span className="text-slate-400">ACTION STATUS</span>
                                        <span className={`${getRiskColor(student.risk_level)} border-b border-current`}>
                                            {student.risk_level === 'high' ? 'CRITICAL RISK LEVEL' : student.risk_level === 'medium' ? 'HIGH RISK LEVEL' : 'STABLE STATUS'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-emerald-500/10 text-center relative z-10 transition-all hover:bg-emerald-500/5">
                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-6 opacity-30" />
                        <p className="text-emerald-500 text-[12px] font-black uppercase tracking-[0.4em] italic">All students are performing within expected parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
