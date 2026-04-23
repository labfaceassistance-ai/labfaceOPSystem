'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';
import BackButton from '@/components/ui/BackButton';
import IdentityBackground from '@/components/IdentityBackground';

function AdminLoginForm() {
    const { showToast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
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
            <div className="bg-gradient-to-b from-[#5CB4E4]/5 to-transparent pt-8 sm:pt-16 px-8 sm:px-16 pb-4 sm:pb-6 text-center border-b border-slate-100/50 relative">
                <BackButton href="/" className="absolute top-6 sm:top-12 left-6 sm:left-12" />

                <div className="w-20 sm:w-28 h-20 sm:h-28 bg-white/80 backdrop-blur-md border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-6 sm:mb-10 mt-4 sm:mt-8 group-hover:scale-110 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#5CB4E4]/5 blur-xl animate-pulse" />
                    <img src="/logo.png" alt="LabFace" className="w-12 h-12 sm:w-16 sm:h-16 object-contain relative z-10" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#041C3C] tracking-tighter mb-4 uppercase font-outfit italic leading-tight">
                    Administrator
                </h1>
                
                <div className="inline-flex items-center gap-3 sm:gap-4 py-2 sm:py-3 px-4 sm:px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                    <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                    Secure Access Portal
                </div>
            </div>

            <div className="pt-6 sm:pt-10 px-6 sm:px-16 pb-10 sm:pb-16 space-y-8 sm:space-y-10">
                <form onSubmit={handleLogin} className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="space-y-6 sm:space-y-8">
                        <InputField
                            label="Administrator Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={Mail}
                            isRequired
                            isValid={email.includes('@') && email.length > 5}
                            placeholder="admin@institution.edu"
                            className="bg-white/40 backdrop-blur-sm border-slate-200/50 rounded-3xl"
                        />

                        <InputField
                            label="Account Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={Lock}
                            isRequired
                            isValid={password.length >= 8}
                            placeholder="••••••••••••"
                            className="bg-white/40 backdrop-blur-sm border-slate-200/50 rounded-3xl"
                        />
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button
                            type="submit"
                            isLoading={loading}
                            variant="primary"
                            size="xl"
                            className="w-full sm:w-80 h-16 sm:h-20 rounded-[2rem] sm:rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-2xl shadow-identity-navy/20 active:scale-95 transition-all duration-500 text-[12px] tracking-[0.5em] group flex items-center justify-center relative overflow-hidden"
                        >
                            <span className="relative z-10 font-black uppercase tracking-widest italic">Sign In</span>
                            <ArrowRight size={20} className="absolute right-8 sm:right-12 group-hover:translate-x-2 transition-transform duration-500 text-[#5CB4E4]" />
                        </Button>
                    </div>
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
            <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20 w-full relative overflow-hidden">
                <IdentityBackground />
                <AdminLoginForm />
            </div>
        </Suspense>
    );
}
