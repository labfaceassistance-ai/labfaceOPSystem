"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { GraduationCap, School, User, Lock, Eye, EyeOff, Loader2, Check, Zap, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL, getToken, fetchCurrentUser } from '../../utils/auth';

const IdentityNode = ({ className = "", size = 120 }) => (
    <div className={`identity-node ${className}`} style={{ width: size, height: size }}>
       <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g>
             <path d="M100,30 Q60,30 50,80 T100,170 T150,80 Q140,30 100,30 Z" fill="none" stroke="currentColor" className="text-identity-sky" strokeWidth="2" />
             <line x1="100" y1="30" x2="100" y2="170" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="55" y1="110" x2="145" y2="110" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <circle cx="75" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="125" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="110" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="30" r="2" fill="currentColor" className="text-identity-navy" />
             <circle cx="100" cy="170" r="2" fill="currentColor" className="text-identity-navy" />
             <line x1="75" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
             <line x1="125" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
          </g>
       </svg>
    </div>
 );

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-identity-sky/30 border-t-identity-sky rounded-full animate-spin"></div>
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
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-16 h-16 border-[3px] border-identity-sky/10 border-t-identity-sky rounded-full animate-spin shadow-2xl"></div>
                <p className="mt-8 font-black uppercase tracking-[0.4em] text-[10px] text-identity-navy animate-pulse">Synchronizing Identity...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-stretch overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans relative">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.12] overflow-hidden">
                <IdentityNode className="top-[10%] left-[5%]" size={160} />
                <IdentityNode className="bottom-[10%] right-[5%]" size={220} />
                <IdentityNode className="top-[40%] right-[15%]" size={110} />
                <IdentityNode className="bottom-[30%] left-[20%]" size={140} />
            </div>

            {loading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md">
                    <div className="bg-white border border-slate-200 p-12 rounded-[3rem] text-center shadow-4xl relative overflow-hidden group">
                        <Loader2 className="animate-spin h-10 w-10 text-identity-sky mx-auto mb-6" />
                        <h2 className="text-[10px] font-black text-identity-navy uppercase tracking-[0.3em]">Authenticating</h2>
                    </div>
                </div>
            )}

            <div className="hidden lg:flex lg:w-[45%] bg-white relative flex-col justify-between p-20 border-r border-slate-100 overflow-hidden z-10">
                <div className="absolute inset-0 opacity-[0.03] bg-blueprint pointer-events-none"></div>
                
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-lg mx-auto text-center mt-[-5vh]">
                    <div className="w-24 h-24 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-12 group transition-all hover:border-identity-sky/30 identity-glass">
                        <img src="/logo.png" alt="LabFace" className="w-14 h-14 object-contain" />
                    </div>

                    <h1 className="text-6xl font-black tracking-tighter leading-none mb-8 font-outfit uppercase">
                        <span className="text-identity-navy">Lab</span>
                        <span className="text-identity-sky">Face</span>
                    </h1>
                    
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-16 leading-relaxed">
                        Advanced Biometric Security <br />
                        Academic Environment Protocol
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl flex flex-col items-center hover:bg-white hover:shadow-xl transition-all cursor-default group">
                            <h3 className="text-xl font-black text-identity-navy tracking-tighter mb-1 uppercase">Fast</h3>
                            <p className="text-[8px] font-black text-identity-sky uppercase tracking-[0.3em]">ZERO_LATENCY</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl flex flex-col items-center hover:bg-white hover:shadow-xl transition-all cursor-default group">
                            <h3 className="text-xl font-black text-identity-navy tracking-tighter mb-1 uppercase">Secure</h3>
                            <p className="text-[8px] font-black text-identity-sky uppercase tracking-[0.3em]">ENCRYPTED_L9</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
                        <ShieldCheck size={16} className="text-identity-sky/50" />
                        <span>LOCATION: PUP_LOPEZ_CAMPUS</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-identity-navy">
                        <span className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(92,180,228,0.8)]"></span>
                        <span>SYSTEM_STATUS: ONLINE</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC] p-8 sm:p-20 z-10">
                
                <div className="absolute top-12 left-12 z-20">
                    <Link href="/" className="text-slate-400 hover:text-identity-navy text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2 transition-all group">
                        <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                        Return to Home
                    </Link>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full">
                    
                    <div className="max-w-md w-full space-y-12 animate-fade-in">
                        <div className="text-center">
                            <h2 className="text-5xl font-black text-identity-navy tracking-tighter mb-3 uppercase font-outfit">Login</h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">Identity Verification Portal</p>
                        </div>

                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full shadow-sm">
                            {['student', 'professor'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${activeTab === role ? 'bg-identity-sky text-white shadow-lg' : 'text-slate-400 hover:text-identity-navy'}`}
                                    onClick={() => setActiveTab(role as any)}
                                >
                                    {role === 'student' ? <GraduationCap size={18} /> : <School size={18} />}
                                    {role}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3 group">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                                    {activeTab === 'student' ? 'Student ID' : 'Professor ID'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        name={activeTab === 'student' ? "studentId" : "professorId"}
                                        type="text"
                                        required
                                        value={formData.userId}
                                        onChange={handleInputChange}
                                        className={`block w-full pl-16 pr-6 py-5 bg-white border ${userIdError ? 'border-rose-400' : 'border-slate-200'} rounded-2xl text-identity-navy text-xs font-black uppercase tracking-widest focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/5 outline-none transition-all placeholder:text-slate-200 shadow-sm`}
                                        placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "XXXXX"}
                                    />
                                </div>
                                {userIdError && <p className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest ml-2 italic">{userIdError}</p>}
                            </div>

                            <div className="space-y-3 group">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name={activeTab === 'student' ? "studentPassword" : "professorPassword"}
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="block w-full pl-16 pr-16 py-5 bg-white border border-slate-200 rounded-2xl text-identity-navy text-xs font-black tracking-widest focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/5 outline-none transition-all placeholder:text-slate-200 shadow-sm"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-6 flex items-center text-slate-300 hover:text-identity-sky transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center w-5 h-5">
                                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer hidden" />
                                        <div className="w-full h-full border border-slate-200 bg-white rounded-lg group-hover:border-identity-sky/50 peer-checked:bg-identity-sky peer-checked:border-identity-sky transition-all"></div>
                                        <Check className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" size={14} strokeWidth={4} />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-identity-navy transition-colors">Keep me signed in</span>
                                </label>
                                <Link href="/forgot-password" className="text-[9px] font-black text-identity-sky hover:text-identity-navy uppercase tracking-[0.2em] transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 mt-8 bg-identity-sky text-white rounded-2xl font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl hover:bg-identity-navy transition-all active:scale-[0.98] group flex items-center justify-center gap-3"
                            >
                                Sign In
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>

                        <div className="mt-12 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">
                            Don't have an account? <Link href="/register/student" className="text-identity-sky ml-2 hover:text-identity-navy transition-colors underline underline-offset-[8px] decoration-1 decoration-identity-sky/30 font-black">Register Here</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
