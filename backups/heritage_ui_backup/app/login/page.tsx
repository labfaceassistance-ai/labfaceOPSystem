"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { GraduationCap, School, User, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, Check, ChevronRight, ShieldCheck, Zap } from 'lucide-react';
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
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="mt-6 text-primary font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Heritage Profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-brand-cream overflow-hidden relative">
            {/* Subtle Coffee Texture/Glow */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-cream/90 backdrop-blur-xl">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">Securing Access</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Authenticating credentials with the mainframe</p>
                    </div>
                </div>
            )}

            {/* Main Container */}
            <div className="flex w-full h-full min-h-screen">
                {/* Left Side: Visual Heritage Panel */}
                <div className="hidden lg:flex w-[45%] bg-coffee relative flex-col items-center justify-center p-12 transition-all duration-1000">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 z-0"></div>
                    <div className="relative z-10 text-center max-w-sm">
                        <div className="w-20 h-20 bg-brand-cream/10 backdrop-blur-md rounded-[2rem] mx-auto mb-10 flex items-center justify-center border border-white/10 shadow-3xl rotate-6 group hover:rotate-0 transition-all duration-500">
                            <img src="/logo.png" alt="LabFace" className="w-12 h-12 object-contain -rotate-6 group-hover:rotate-0 transition-all" />
                        </div>
                        <h1 className="text-5xl font-black text-brand-cream tracking-tighter mb-6 uppercase leading-[0.9]">
                            Heritage <br />
                            <span className="text-secondary opacity-80">Security</span>
                        </h1>
                        <p className="text-brand-cream/60 text-sm font-medium leading-relaxed mb-12 uppercase tracking-widest">
                            Precision Attendance & Biometric Oversight <br />
                            <span className="text-secondary/50 font-black">Powered by LabFace AI</span>
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl backdrop-blur-sm group hover:bg-white/10 transition-all">
                                <div className="p-3 bg-secondary/20 text-secondary rounded-xl"><Zap size={20} /></div>
                                <div className="text-left">
                                    <div className="text-[10px] font-black uppercase text-brand-cream tracking-widest">Fast Track</div>
                                    <div className="text-[9px] font-bold text-brand-cream/40 uppercase">Sub-second identification</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl backdrop-blur-sm group hover:bg-white/10 transition-all">
                                <div className="p-3 bg-secondary/20 text-secondary rounded-xl"><ShieldCheck size={20} /></div>
                                <div className="text-left">
                                    <div className="text-[10px] font-black uppercase text-brand-cream tracking-widest">Secure Core</div>
                                    <div className="text-[9px] font-bold text-brand-cream/40 uppercase">Encrypted metadata vault</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-12 text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">
                        Est. 2025 • LabFace Operating System
                    </div>
                </div>

                {/* Right Side: Form Panel */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 bg-brand-cream relative">
                    <div className="max-w-md w-full animate-fade-in">
                        <Link href="/" className="inline-flex items-center text-primary/40 hover:text-primary mb-12 transition-all group font-black uppercase text-[9px] tracking-widest">
                            <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Retract to Landing
                        </Link>

                        <div className="mb-10">
                            <h2 className="text-4xl font-black text-primary tracking-tighter uppercase mb-2">Sign In</h2>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Credential Verification Required</p>
                        </div>

                        {/* Role Switcher */}
                        <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-10 border border-slate-300/30">
                            <button
                                className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all flex items-center justify-center gap-3 ${activeTab === 'student' ? 'bg-coffee text-brand-cream shadow-2xl' : 'text-slate-500 hover:text-primary'}`}
                                onClick={() => setActiveTab('student')}
                            >
                                <GraduationCap size={16} /> Student
                            </button>
                            <button
                                className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all flex items-center justify-center gap-3 ${activeTab === 'professor' ? 'bg-coffee text-brand-cream shadow-2xl' : 'text-slate-500 hover:text-primary'}`}
                                onClick={() => setActiveTab('professor')}
                            >
                                <School size={16} /> Faculty
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="group">
                                    <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-slate-400 mb-3 ml-1">Identity Protocol</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-primary/30 group-focus-within:text-primary transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input
                                            name={activeTab === 'student' ? "studentId" : "professorId"}
                                            type="text"
                                            required
                                            value={formData.userId}
                                            onChange={handleInputChange}
                                            className={`block w-full pl-14 pr-4 py-5 bg-white border-2 ${userIdError ? 'border-red-500' : 'border-slate-100 group-focus-within:border-primary'} rounded-3xl transition-all font-bold text-primary placeholder-slate-300 shadow-sm outline-none`}
                                            placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "FACULTY-ID"}
                                        />
                                    </div>
                                    {userIdError && <p className="mt-2 text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{userIdError}</p>}
                                </div>

                                <div className="group">
                                    <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-slate-400 mb-3 ml-1">Security Passphrase</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-primary/30 group-focus-within:text-primary transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            name={activeTab === 'student' ? "studentPassword" : "professorPassword"}
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="block w-full pl-14 pr-14 py-5 bg-white border-2 border-slate-100 group-focus-within:border-primary rounded-3xl transition-all font-bold text-primary placeholder-slate-300 shadow-sm outline-none"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-primary"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer hidden" />
                                        <div className="w-5 h-5 border-2 border-slate-200 rounded-lg group-hover:border-primary peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                                        <Check className="absolute inset-0 m-auto text-brand-cream opacity-0 peer-checked:opacity-100 transition-opacity" size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Remember Session</span>
                                </label>
                                <Link href="/forgot-password"  className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline decoration-primary/20">Lost Key?</Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-coffee text-brand-cream rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                Sign In <ChevronRight size={16} />
                            </button>
                        </form>

                        <div className="mt-12 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                            Don't have an account? <Link href="/register/student" className="text-secondary hover:text-primary transition-colors border-b border-secondary/20 pb-0.5 ml-1">Initialize Registration</Link>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="fixed bottom-8 left-8 hidden lg:block">
                <div className="text-[8px] font-black text-primary/30 uppercase tracking-[0.4em] transform -rotate-90 origin-left">
                    Official Security Terminal
                </div>
            </div>
        </div>
    );
}
