'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getToken, fetchCurrentUser } from '@/utils/auth';

function AdminLoginForm() {
    const { showToast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const searchParams = useSearchParams();
    const isLoggingOut = searchParams?.get('logout') === 'success';
    const [isCheckingAuth, setIsCheckingAuth] = useState(!isLoggingOut);

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
                    if (user && user.role === 'admin') {
                        router.replace('/admin/dashboard');
                        return;
                    }
                } catch (e) {
                    console.error("Admin session verification failed", e);
                }
            }
            setIsCheckingAuth(false);
        };
        checkSession();
    }, [router, isLoggingOut]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/admin/dashboard');
            } else {
                showToast(data.message || 'Invalid credentials');
            }
        } catch (err) {
            showToast('LOGIN FAILED. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-[3rem] animate-in fade-in duration-500">
                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mb-6"></div>
                <p className="text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Establishing Secure Connection...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] w-full flex items-center justify-center p-6 relative w-full selection:bg-identity-sky/15">
            <div className="relative max-w-lg w-full z-10 animate-fade-in">
                
                <div className="flex justify-center mb-10 relative z-20">
                    <div className="bg-white border border-identity-sky/20 rounded-[2.5rem] p-6 shadow-2xl group transition-all hover:scale-105 hover:border-identity-sky relative overflow-hidden">
                        <div className="absolute inset-0 bg-identity-sky/10 blur-xl rounded-full opacity-50 pointer-events-none" />
                        <Shield className="w-12 h-12 text-identity-navy relative z-10 group-hover:text-identity-sky transition-colors" />
                    </div>
                </div>

                <div className="identity-glass p-10 md:p-14 rounded-[2rem] md:rounded-[3rem] border border-identity-sky/20 shadow-xl relative overflow-hidden w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/5 via-transparent to-transparent pointer-events-none" />
                    
                    <Link href="/" className="absolute top-8 left-8 text-slate-400 hover:text-identity-navy text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all group z-20">
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                        HOME
                    </Link>

                    <div className="text-center mb-12 relative z-10 mt-6">
                        <h1 className="text-3xl md:text-4xl font-black text-identity-navy mb-3 uppercase tracking-tighter font-outfit">Admin Portal</h1>
                        <div className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-identity-navy/5 text-identity-navy text-[9px] font-black uppercase tracking-[0.15em] border border-identity-navy/10">
                             <span className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse"></span>
                             Administrator Access Only
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-3">
                            <label className="text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] ml-2 flex items-center gap-2">
                                Admin Login
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-identity-sky transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-identity-navy pl-16 pr-6 py-5 rounded-2xl focus:outline-none focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-sm font-black uppercase tracking-[0.15em] text-xs placeholder:text-slate-300"
                                    placeholder="ADMIN@LABFACE.OPS"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] ml-2 flex items-center gap-2">
                                Secure Passkey
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-identity-sky transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-identity-navy pl-16 pr-16 py-5 rounded-2xl focus:outline-none focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-sm font-black uppercase tracking-[0.15em] text-xs placeholder:text-slate-300"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-identity-sky transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-identity-navy hover:bg-identity-sky disabled:bg-slate-300 text-white font-black uppercase tracking-[0.15em] text-[11px] py-6 rounded-2xl transition-all duration-300 shadow-xl active:scale-95 flex items-center justify-center gap-4 group mt-8"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-10 border-t border-slate-200/60 relative z-10 text-center">
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em] leading-relaxed">
                            Classified Access · Level 9 Encryption Active<br />
                            <span className="text-identity-sky mt-2 inline-block">All Login Attempts Are Monitored</span>
                        </p>
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-center gap-4 opacity-50">
                    <div className="h-[2px] w-12 bg-slate-300 rounded-full" />
                    <p className="text-identity-navy font-black text-[9px] uppercase tracking-[0.15em]">LabFace Ops System</p>
                    <div className="h-[2px] w-12 bg-slate-300 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin"></div>
                <p className="text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Loading Platform...</p>
            </div>
        }>
            <AdminLoginForm />
        </Suspense>
    );
}
