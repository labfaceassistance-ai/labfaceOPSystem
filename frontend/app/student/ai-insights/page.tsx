'use client';

import { useState, useEffect } from 'react';
import AttendanceInsights from '../../../components/AttendanceInsights';
import { DashboardSkeleton } from '../../../components/SkeletonLoaders';
import Navbar from '../../../components/Navbar';

import { getUser } from '../../../utils/auth';

export default function AIInsightsPage() {
    const [studentId, setStudentId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get student ID from stored user data
        const user = getUser();
        if (user && user.id) {
            setStudentId(user.id.toString());
        }
        setLoading(false);
    }, []);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
                <h1 className="text-3xl font-bold text-white mb-6">Your Attendance Insights</h1>
                <AttendanceInsights studentId={studentId} />
            </div>
        </div>
    );
}
