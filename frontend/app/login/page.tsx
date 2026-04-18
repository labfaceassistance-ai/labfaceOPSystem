"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { GraduationCap, School, User, Lock, Eye, EyeOff, Loader2, Check, Zap, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL, getToken, fetchCurrentUser } from '../../utils/auth';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        }>
            <LoginContent />
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
    const [showPassword, setShowPassword] = useState(false);
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
                const startTime = Date.now();
                try {
                    const user = await fetchCurrentUser();
                    const elapsedTime = Date.now() - startTime;
                    const minDelay = 800;
                    if (elapsedTime < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
                    }
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
        if (name === 'studentId' || name === 'professorId') {
            const isBulkInput = value.length - formData.userId.length > 1;
            if (isBulkInput && canSmartSwitch) {
                if (/^\d{5}$/.test(value) && activeTab !== 'professor') setActiveTab('professor');
                else if ((value.includes('-') || /^\d{4}-\d{5}/.test(value)) && activeTab !== 'student') setActiveTab('student');
            }
            setUserIdError('');
            if (activeTab === 'student') value = formatStudentId(value, (e.nativeEvent as any).inputType);
            else value = value.replace(/\D/g, '').slice(0, 5);
            userIdRef.current = value;
            setFormData(prev => ({ ...prev, userId: value }));
        } else if (name === 'studentPassword' || name === 'professorPassword') {
            setFormData(prev => ({ ...prev, password: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserIdError('');
        if (activeTab === 'student' && formData.userId.length < 15) { setUserIdError('Invalid format'); return; }
        if (activeTab === 'professor' && formData.userId.length < 5) { setUserIdError('Invalid format'); return; }
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { ...formData, intendedRole: activeTab }, { withCredentials: true });
            const { token, user } = res.data;
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', token);
            storage.setItem('user', JSON.stringify(user));
            router.push(user.role === 'admin' ? '/admin/dashboard' : user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Login failed', 'error');
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center text-primary">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="mt-6 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-stretch overflow-hidden bg-primary text-brand-cream font-outfit">
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-brand-cream p-10 rounded-[2.5rem] text-center shadow-2xl">
                        <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
                        <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Authenticating</h2>
                    </div>
                </div>
            )}

            {/* Left Side: Visual Hero (Cream Background) */}
            <div className="hidden lg:flex lg:w-[45%] bg-background text-primary relative flex-col justify-between p-12 lg:p-16 border-r border-primary/10 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 mix-blend-overlay"></div>
                
                {/* Top Ambient Glow */}
                <div className="absolute -top-[10%] -left-[10%] w-[120%] h-[50%] bg-white/40 blur-[100px] pointer-events-none"></div>

                <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-lg mx-auto text-center mt-[-10vh]">
                    {/* Logo Circle */}
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-primary/5 mb-8">
                        <img src="/logo.png" alt="LabFace" className="w-14 h-14 object-contain translate-y-[2px]" />
                    </div>

                    <h1 className="text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-[0.9] mb-4">
                        Welcome Back <br /> to LabFace
                    </h1>
                    
                    <p className="text-primary/70 text-[11px] font-bold tracking-wide mb-12">
                        Secure, AI-powered attendance monitoring <br /> for the modern laboratory.
                    </p>
                    
                    {/* Fast and Secure Feature Boxes */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex flex-col items-center hover:bg-primary/10 transition-colors cursor-default">
                            <h3 className="text-xl font-black tracking-tight mb-1">Fast</h3>
                            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Recognition</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex flex-col items-center hover:bg-primary/10 transition-colors cursor-default">
                            <h3 className="text-xl font-black tracking-tight mb-1">Secure</h3>
                            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Data Privacy</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Status Tags */}
                <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        <ShieldCheck size={16} className="text-primary" />
                        <span>PUP Lopez Campus</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        <Zap size={16} className="text-emerald-600" />
                        <span>System Online</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Form (Dark Coffee Background) */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-primary p-6 sm:p-12 lg:p-16">
                
                {/* Back to Landing Page Link */}
                <div className="absolute top-8 left-8 sm:top-12 sm:left-12 z-20">
                    <Link href="/" className="text-brand-cream/60 hover:text-yellow-500 text-[11px] font-bold tracking-widest flex items-center gap-2 transition-colors">
                        <span>&larr;</span> Back to Landing Page
                    </Link>
                </div>

                {/* Background Ambient Glows */}
                <div className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[60%] bg-yellow-500/10 blur-[120px] pointer-events-none rounded-full"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-cream/5 blur-[120px] pointer-events-none rounded-full"></div>

                <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full mt-16 sm:mt-0">
                    
                    <div className="max-w-sm w-full">
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black tracking-tight mb-2 text-white">Sign In</h2>
                            <p className="text-brand-cream/50 text-[11px] font-bold uppercase tracking-[0.1em]">Access your dashboard</p>
                        </div>

                        {/* Full Width Role Switcher */}
                        <div className="flex bg-white/5 p-1 rounded-xl mb-10 border border-white/10 w-full shadow-inner">
                            <button
                                type="button"
                                className={`flex-1 py-3.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'student' ? 'bg-yellow-500 text-black shadow-md' : 'text-brand-cream/60 hover:text-white'}`}
                                onClick={() => setActiveTab('student')}
                            >
                                <GraduationCap size={16} /> Student
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-3.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'professor' ? 'bg-yellow-500 text-black shadow-md' : 'text-brand-cream/60 hover:text-white'}`}
                                onClick={() => setActiveTab('professor')}
                            >
                                <School size={16} /> Professor
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2 group">
                                <label className="block text-[11px] font-bold text-brand-cream/80 ml-1">
                                    {activeTab === 'student' ? 'Student Number' : 'Professor ID'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-cream/40 group-focus-within:text-yellow-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        name={activeTab === 'student' ? "studentId" : "professorId"}
                                        type="text"
                                        required
                                        value={formData.userId}
                                        onChange={handleInputChange}
                                        className={`block w-full pl-12 pr-4 py-4 bg-[#2e2119] border ${userIdError ? 'border-red-500' : 'border-white/10'} rounded-xl text-white text-sm focus:border-yellow-500 focus:bg-[#34261d] outline-none transition-all shadow-inner`}
                                        placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "ID NUMBER"}
                                    />
                                </div>
                                {userIdError && <p className="mt-1 text-[10px] font-bold text-red-400 ml-1">{userIdError}</p>}
                            </div>

                            <div className="space-y-2 group">
                                <label className="block text-[11px] font-bold text-brand-cream/80 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-cream/40 group-focus-within:text-yellow-500 transition-colors">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        name={activeTab === 'student' ? "studentPassword" : "professorPassword"}
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="block w-full pl-12 pr-12 py-4 bg-[#2e2119] border border-white/10 rounded-xl text-white text-sm focus:border-yellow-500 focus:bg-[#34261d] outline-none transition-all shadow-inner placeholder-brand-cream/20"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-brand-cream/40 hover:text-brand-cream transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center w-4 h-4">
                                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer hidden" />
                                        <div className="w-full h-full border border-white/20 bg-white/5 rounded group-hover:border-yellow-500 peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-all"></div>
                                        <Check className="absolute text-black opacity-0 peer-checked:opacity-100 transition-opacity" size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-[10px] font-bold text-brand-cream/60 pt-[1px]">Remember me</span>
                                </label>
                                <Link href="/forgot-password" className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-8 bg-yellow-500 text-black rounded-xl font-black text-[12px] shadow-[0_4px_15px_rgba(234,179,8,0.2)] hover:shadow-[0_4px_25px_rgba(234,179,8,0.4)] hover:bg-yellow-400 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/50 active:scale-[0.98]"
                            >
                                Sign In
                            </button>
                        </form>

                        <div className="mt-8 text-center text-brand-cream/50 text-[11px] font-bold">
                            Don't have an account? <Link href="/register/student" className="text-yellow-500 ml-1 hover:text-yellow-400 transition-colors underline underline-offset-4">Register here</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
