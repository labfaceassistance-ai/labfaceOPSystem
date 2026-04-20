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
            setUserIdError('INVALID STUDENT ID FORMAT'); 
            isValid = false; 
        }
        if (activeTab === 'professor' && formData.userId.length < 5) { 
            setUserIdError('INVALID PROFESSOR ID FORMAT'); 
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
            
            showToast('Authentication Successful', 'Login protocol complete. Redirecting...', 'success');
            router.push(user.role === 'admin' ? '/admin/dashboard' : user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard');
        } catch (err: any) {
            showToast('Login Failed', err.response?.data?.message || 'Access denied. Please check your credentials.', 'error');
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-[3rem] animate-in fade-in duration-500">
                <div className="bg-white border border-slate-200 p-12 rounded-[3rem] text-center shadow-xl">
                    <div className="w-12 h-12 border-4 border-identity-sky/30 border-t-identity-sky rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-[10px] font-black text-identity-navy uppercase tracking-[0.15em]">Synchronizing Identity...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl identity-glass rounded-[3rem] shadow-xl overflow-hidden animate-fade-in relative z-10 border border-identity-sky/20">
            {/* Header Area */}
            <div className="bg-identity-sky/5 p-12 text-center border-b border-identity-sky/10 relative">
                <Link href="/" className="absolute top-8 left-8 text-slate-400 hover:text-identity-navy text-[9px] font-black uppercase tracking-[0.4em] flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 transition-all group">
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                    HOME
                </Link>

                <div className="w-20 h-20 bg-white border border-identity-sky/20 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-6 mt-4">
                    <img src="/logo.png" alt="LabFace" className="w-12 h-12 object-contain" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-identity-navy tracking-tighter mb-2 uppercase font-outfit">SIGN IN</h1>
                <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.15em]">Sign Into LabFace</p>
            </div>

            <div className="p-12">
                <div className="flex bg-slate-100/80 p-2 rounded-2xl border border-slate-200 w-full shadow-sm mb-10">
                    {['student', 'professor'].map((role) => (
                        <button
                            key={role}
                            type="button"
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center min-h-[44px] gap-4 ${activeTab === role ? 'bg-identity-sky text-white shadow-lg' : 'text-slate-400 hover:text-identity-navy'}`}
                            onClick={() => setActiveTab(role as any)}
                        >
                            {role === 'student' ? <GraduationCap size={18} /> : <School size={18} />}
                            {role}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                    <InputField
                        label={activeTab === 'student' ? "STUDENT ID REFERENCE" : "PROFESSOR ID REFERENCE"}
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        error={userIdError}
                        isRequired
                        isValid={activeTab === 'student' ? formData.userId.length === 15 : formData.userId.length === 5}
                        placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "XXXXX"}
                    />

                    <InputField
                        label="PASSKEY"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        isRequired
                        isValid={formData.password.length >= 8}
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-4 cursor-pointer group min-h-[44px]">
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer hidden" />
                                <div className="w-full h-full border border-slate-200 bg-white rounded-lg group-hover:border-identity-sky/50 peer-checked:bg-identity-sky peer-checked:border-identity-sky transition-all shadow-sm"></div>
                                <svg className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-identity-navy transition-colors">MAINTAIN ACTIVE SESSION</span>
                        </label>
                        <Link href="/forgot-password" className="text-[9px] font-black text-identity-sky hover:text-identity-navy uppercase tracking-[0.2em] transition-colors min-h-[44px] flex items-center">
                            RESET ACCESS
                        </Link>
                    </div>

                    <Button
                        type="submit"
                        isLoading={loading}
                        variant="primary"
                        size="xl"
                        className="w-full mt-8"
                    >
                        SIGN IN PROTOCOL
                        <ArrowRight size={18} className="ml-3" />
                    </Button>
                </form>

                <div className="mt-12 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] border-t border-slate-100 pt-8">
                    NEW TO LABFACE? <Link href="/register/student" className="text-identity-sky ml-2 hover:text-identity-navy transition-colors underline underline-offset-[8px] decoration-2 decoration-identity-sky/30 font-black">CREATE AN ACCOUNT</Link>
                </div>
            </div>
        </div>
    );
}
