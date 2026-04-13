'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import axios from 'axios';
import { API_URL, getToken } from '@/utils/auth';

interface AcademicUpdateBannerProps {
    user: any;
}

export default function AcademicUpdateBanner({ user }: AcademicUpdateBannerProps) {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [academicSettings, setAcademicSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAcademicStatus = async () => {
            try {
                const token = getToken();
                if (!token) return;

                const res = await axios.get(`${API_URL}/api/users/academic-settings`);
                const settings = res.data;
                setAcademicSettings(settings);

                // Check if current user info matches current period
                // Logic: If user has not verified for this period, show banner
                if (user.lastVerifiedPeriodId !== settings.id) {
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Failed to check academic status:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            checkAcademicStatus();
        }
    }, [user]);

    if (!isVisible || !academicSettings || loading) return null;

    return (
        <div className="mb-6 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg">Academic Update Required</h4>
                        <p className="text-slate-400 text-sm">
                            The system has transitioned to <span className="text-brand-400 font-semibold">{academicSettings.schoolYear} - {academicSettings.semester}</span>. 
                            Please update your Information to maintain active status.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => router.push('/student/profile?tab=academic')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-95"
                    >
                        Update Now
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        title="Dismiss for now"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
