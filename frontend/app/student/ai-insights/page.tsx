'use client';

import { useState, useEffect } from 'react';
import AttendanceInsights from '../../../components/AttendanceInsights';
import Navbar from '../../../components/Navbar';
import IdentityBackground from '../../../components/IdentityBackground';
import { getUser } from '../../../utils/auth';
import { Sparkles } from 'lucide-react';

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

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <IdentityBackground />
            <div className="relative z-10 text-center">
                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-identity-sky/10"></div>
                <p className="text-identity-navy font-black text-[10px] uppercase tracking-[0.15em] animate-pulse">Initializing Neural Link...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-identity-sky/10 selection:text-identity-navy relative page-transition">
            <IdentityBackground />
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 relative z-10">
                <div className="flex items-center gap-6 mb-12 animate-fade-up">
                    <div className="p-4 bg-identity-sky/10 text-identity-sky rounded-2xl border border-identity-sky/10 shadow-inner group">
                        <Sparkles size={32} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-identity-navy tracking-tighter uppercase font-outfit italic">Cognitive Analytics</h1>
                        <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.4em] mt-1">Advanced System Performance Insights</p>
                    </div>
                </div>

                <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                    <AttendanceInsights studentId={studentId} />
                </div>
            </main>
        </div>
    );
}

