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
        <div className="mb-8 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-identity-sky/10 via-identity-sky/20 to-identity-sky/10 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-identity-navy border border-white/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl overflow-hidden">
                <div className="absolute inset-0 bg-blueprint opacity-[0.05] pointer-events-none"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-identity-sky/10 flex items-center justify-center text-identity-sky shrink-0 border border-identity-sky/20 shadow-inner">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-2xl uppercase tracking-tighter font-outfit">Academic Update Required</h4>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] leading-relaxed mt-2">
                            The system has transitioned into <span className="text-identity-sky font-black underline underline-offset-4">{academicSettings.schoolYear} - {academicSettings.semester}</span>. 
                            <br />Please synchronize your identity record.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                    <button
                        onClick={() => router.push('/student/profile?tab=academic')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-4 bg-identity-sky hover:bg-white hover:text-identity-navy font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl transition-all shadow-xl shadow-identity-sky/20 active:scale-95 text-white"
                    >
                        Synchronize
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-4 text-white/30 hover:text-white hover:bg-white/5 rounded-2xl transition-all shadow-inner border border-white/5"
                        title="Dismiss for now"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
