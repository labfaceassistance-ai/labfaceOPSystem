"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { GraduationCap, School, ArrowRight, ChevronLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL, getToken, fetchCurrentUser } from '../../utils/auth';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-identity-sky/30 border-t-identity-sky rounded-full animate-spin"></div>
            </div>
        }>
            <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 py-20 w-full relative page-transition">
                <LoginContent />
            </div>
        </Suspense>
    );
}

function LoginContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isLoggingOut = searchParams.get('logout') === 'success';

    const [activeTab, setActiveTab] = useState<'student' | 'professor'>('student');
    const [isCheckingAuth, setIsCheckingAuth] = useState(false);
    const [canSmartSwitch, setCanSmartSwitch] = useState(false);

    useEffect(() => {
        const role = searchParams.get('role');
        if (role === 'student' || role === 'professor') {
            setActiveTab(role as 'student' | 'professor');
            setCanSmartSwitch(false);
            const timer = setTimeout(() => setCanSmartSwitch(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    useEffect(() => {
        setCanSmartSwitch(false);
        const timer = setTimeout(() => setCanSmartSwitch(true), 800);
        return () => clearTimeout(timer);
    }, [activeTab]);

    useEffect(() => {
        const token = getToken();
        if (token && !isLoggingOut) {
            setIsCheckingAuth(true);
        }
    }, [isLoggingOut]);

    const [formData, setFormData] = useState({ userId: '', password: '' });
    const [userIdError, setUserIdError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const userIdRef = useRef(formData.userId);

    useEffect(() => {
        userIdRef.current = formData.userId;
    }, [formData.userId]);

    useEffect(() => {
        const checkSession = async () => {
            if (isLoggingOut) {
                setIsCheckingAuth(false);
                return;
            }

            const token = getToken();
            if (token) {
                try {
                    const user = await fetchCurrentUser();
                    if (user) {
                        const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard';
                        router.replace(dashboardPath);
                        return;
                    }
                } catch (e) {
                    console.error("Session verification failed", e);
                }
            }
            setIsCheckingAuth(false);
        };
        checkSession();
    }, [router, isLoggingOut]);

    const formatStudentId = (value: string, inputType?: string) => {
        if (!value || value.trim() === '') return '';
        const raw = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!raw || raw === '-') return '';
        const parts = raw.split('-');
        const definitions = [{ length: 4, reg: /^[0-9]*$/ }, { length: 5, reg: /^[0-9]*$/ }, { length: 2, reg: /^[A-Z]*$/ }, { length: 1, reg: /^[0-9]*$/ }];
        let result = '';
        let overflow = '';
        let lastSegmentFull = false;
        let processedSegments = 0;
        for (let i = 0; i < definitions.length; i++) {
            let segmentRaw = overflow + (parts[i] || '');
            if (!segmentRaw && i >= parts.length) break;
            const def = definitions[i];
            let segmentClean = '';
            let nextOverflow = '';
            for (const char of segmentRaw) {
                if (segmentClean.length < def.length) {
                    if (def.reg.test(char)) segmentClean += char;
                    else nextOverflow += char;
                } else nextOverflow += char;
            }
            if (i > 0) result += '-';
            result += segmentClean;
            overflow = nextOverflow;
            lastSegmentFull = segmentClean.length === def.length;
            processedSegments++;
        }
        const isDeleting = inputType && inputType.includes('delete');
        if (!isDeleting && lastSegmentFull && processedSegments < definitions.length) result += '-';
        return result;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        const name = e.target.name;
        if (name === 'userId') {
            const isBulkInput = value.length - formData.userId.length > 1;
            if (isBulkInput && canSmartSwitch) {
                if (/^\d{5}$/.test(value) && activeTab !== 'professor') setActiveTab('professor');
                else if ((value.includes('-') || /^\d{4}-\d{5}/.test(value)) && activeTab !== 'student') setActiveTab('student');
            }
            setUserIdError('');
            if (activeTab === 'student') value = formatStudentId(value);
            else value = value.replace(/\D/g, '').slice(0, 5);
            userIdRef.current = value;
            setFormData(prev => ({ ...prev, userId: value }));
        } else if (name === 'password') {
            setFormData(prev => ({ ...prev, password: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserIdError('');

        let isValid = true;
        if (activeTab === 'student' && formData.userId.length < 15) {
            setUserIdError('Please enter your full Student ID.');
            isValid = false;
        }
        if (activeTab === 'professor' && formData.userId.length < 5) {
            setUserIdError('Please enter your full Employee ID.');
            isValid = false;
        }

        if (!isValid) return;

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { ...formData, intendedRole: activeTab }, { withCredentials: true });
            const { token, user } = res.data;
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', token);
            storage.setItem('user', JSON.stringify(user));

            showToast('Login Successful', 'Redirecting...', 'success');
            router.push(user.role === 'admin' ? '/admin/dashboard' : user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard');
        } catch (err: any) {
            showToast('Login Failed', err.response?.data?.message || 'Login failed. Please check your user ID and password.', 'error');
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-[3rem] animate-in fade-in duration-500">
                <div className="bg-white border border-slate-200 p-12 rounded-[3rem] text-center shadow-xl">
                    <div className="w-12 h-12 border-4 border-identity-sky/30 border-t-identity-sky rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-[10px] font-black text-identity-navy uppercase tracking-[0.15em]">Logging in...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl bg-white/40 backdrop-blur-xl rounded-[3.5rem] shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 relative z-10 border border-slate-100/50">
            {/* Header Area */}
            <div className="bg-gradient-to-b from-[#5CB4E4]/5 to-transparent p-16 text-center border-b border-slate-100/50 relative">
                <Link href="/" className="absolute top-12 left-12 text-slate-400 hover:text-[#041C3C] text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center min-h-[44px] min-w-[44px] gap-4 transition-all group font-outfit">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[#5CB4E4]" />
                    BACK
                </Link>

                <div className="w-28 h-28 bg-white/80 backdrop-blur-md border border-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-10 mt-8 group-hover:scale-110 transition-all duration-700">
                    <img src="/logo.png" alt="LabFace" className="w-16 h-16 object-contain" />
                </div>

                <h1 className="text-5xl md:text-6xl font-black text-[#041C3C] tracking-tighter mb-4 uppercase font-outfit italic">
                    Login
                </h1>

                <div className="inline-flex items-center gap-4 py-3 px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                    Sign in to your account
                </div>
            </div>

            <div className="p-16 space-y-12">
                {/* Role Switcher */}
                <div className="flex bg-slate-100/50 backdrop-blur-md p-2.5 rounded-[2.5rem] border border-slate-200/50 w-full shadow-inner">
                    {['student', 'professor'].map((role) => (
                        <button
                            key={role}
                            type="button"
                            className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-700 flex items-center justify-center min-h-[48px] gap-4 ${activeTab === role
                                    ? 'bg-white text-[#041C3C] shadow-2xl scale-[1.02] border border-slate-100'
                                    : 'text-slate-400 hover:text-[#041C3C]/60'
                                }`}
                            onClick={() => setActiveTab(role as any)}
                        >
                            {role === 'student' ? <GraduationCap size={20} className={activeTab === role ? 'text-[#5CB4E4]' : ''} /> : <School size={20} className={activeTab === role ? 'text-[#5CB4E4]' : ''} />}
                            {role === 'student' ? 'Student' : 'Professor'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="space-y-8">
                        <InputField
                            label={activeTab === 'student' ? "Student ID" : "Employee ID"}
                            name="userId"
                            value={formData.userId}
                            onChange={handleInputChange}
                            error={userIdError}
                            isRequired
                            isValid={activeTab === 'student' ? formData.userId.length === 15 : formData.userId.length === 5}
                            placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "XXXXX"}
                            className="bg-white/40 backdrop-blur-sm border-slate-200/50 rounded-3xl"
                        />

                        <InputField
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            isRequired
                            isValid={formData.password.length >= 8}
                            placeholder="••••••••••••"
                            className="bg-white/40 backdrop-blur-sm border-slate-200/50 rounded-3xl"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <label className="flex items-center gap-5 cursor-pointer group min-h-[44px]">
                            <div className="relative flex items-center justify-center w-6 h-6">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="peer hidden"
                                />
                                <div className="w-full h-full border-2 border-slate-200/80 bg-white/60 backdrop-blur-sm rounded-xl group-hover:border-[#5CB4E4]/50 peer-checked:bg-[#041C3C] peer-checked:border-[#041C3C] transition-all duration-500 shadow-sm"></div>
                                <svg className="absolute text-[#5CB4E4] opacity-0 peer-checked:opacity-100 transition-all duration-500 w-4 h-4 scale-50 peer-checked:scale-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-[#041C3C] transition-colors duration-500">Remember Me</span>
                        </label>

                        <Link href="/forgot-password" virtual-link="true" className="text-[10px] font-black text-[#5CB4E4] hover:text-[#041C3C] uppercase tracking-[0.3em] transition-all duration-500 border-b border-transparent hover:border-[#5CB4E4]/30 pb-1">
                            Forgot Password?
                        </Link>
                    </div>

                    <Button
                        type="submit"
                        isLoading={loading}
                        variant="primary"
                        size="xl"
                        className="w-full h-20 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#041C3C]/90 text-white shadow-2xl shadow-identity-navy/20 active:scale-95 transition-all duration-500 text-[12px] tracking-[0.5em] group"
                    >
                        Login
                        <ArrowRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500 text-[#5CB4E4]" />
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10 opacity-60">Don't have an account?</p>
                    <Link
                        href="/register/student"
                        className="inline-flex items-center gap-6 px-12 py-6 bg-white/60 backdrop-blur-md text-[#041C3C] font-black uppercase tracking-[0.4em] text-[11px] rounded-[2rem] border border-slate-100 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-700 group shadow-lg"
                    >
                        Create Account <span className="text-[#5CB4E4] group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
