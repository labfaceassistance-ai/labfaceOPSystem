'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import Button from '@/components/ui/Button';

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
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Success', 'Identity verified. Redirecting to dashboard...', 'success');
                router.push('/admin/dashboard');
            } else {
                showToast('Error', data.message || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showToast('Error', 'Connection to server lost. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-[3rem] animate-in fade-in duration-500">
                <div className="w-16 h-16 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin mb-6"></div>
                <p className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Verifying credentials...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl bg-white/40 backdrop-blur-xl rounded-[3.5rem] shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 relative z-10 border border-slate-100/50">
            {/* Header Area */}
            <div className="bg-gradient-to-b from-[#041C3C]/5 to-transparent p-16 text-center border-b border-slate-100/50 relative">
                <Link href="/" className="absolute top-12 left-12 text-slate-400 hover:text-[#041C3C] text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center min-h-[44px] min-w-[44px] gap-4 transition-all group font-outfit">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[#5CB4E4]" /> 
                    Back
                </Link>

                <div className="w-28 h-28 bg-[#041C3C] border border-[#041C3C] rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-10 mt-8 group-hover:scale-110 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#5CB4E4]/20 blur-xl animate-pulse" />
                    <Shield className="w-14 h-14 text-white relative z-10" />
                </div>
                
                <h1 className="text-5xl md:text-6xl font-black text-[#041C3C] tracking-tighter mb-4 uppercase font-outfit italic">
                    Administrator Login
                </h1>
                
                <div className="inline-flex items-center gap-4 py-3 px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                    Secure Access
                </div>
            </div>

            <div className="p-16 space-y-12">
                <form onSubmit={handleLogin} className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                Administrator Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/40 backdrop-blur-sm border border-slate-200/50 text-[#041C3C] pl-16 pr-6 p-6 rounded-3xl focus:outline-none focus:border-[#5CB4E4] transition-all duration-500 shadow-sm font-black uppercase tracking-[0.2em] text-[11px] placeholder:text-slate-300 font-outfit"
                                    placeholder="Enter your email..."
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                Account Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/40 backdrop-blur-sm border border-slate-200/50 text-[#041C3C] pl-16 pr-16 p-6 rounded-3xl focus:outline-none focus:border-[#5CB4E4] transition-all duration-500 shadow-sm font-black uppercase tracking-[0.2em] text-[11px] placeholder:text-slate-300 font-outfit"
                                    placeholder="••••••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5CB4E4] transition-colors p-2"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        isLoading={loading}
                        variant="primary"
                        size="xl"
                        className="w-full h-20 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#041C3C]/90 text-white shadow-2xl shadow-identity-navy/20 active:scale-95 transition-all duration-500 text-[12px] tracking-[0.5em] group"
                    >
                        Sign In
                        <ArrowRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500 text-[#5CB4E4]" />
                    </Button>
                </form>

                <div className="text-center pt-8 border-t border-slate-100/50">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] font-outfit leading-relaxed opacity-60 italic">
                        Institutional security protocols active.<br />
                        <span className="text-[#5CB4E4] mt-2 inline-block">System Secure and Stable</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin"></div>
                <p className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Loading...</p>
            </div>
        }>
            <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 py-20 w-full relative">
                <AdminLoginForm />
            </div>
        </Suspense>
    );
}
