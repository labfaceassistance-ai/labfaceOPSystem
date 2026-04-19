'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getToken, fetchCurrentUser } from '@/utils/auth';

function AdminLoginForm() {
    const { showToast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Wrap useSearchParams in a safe way or handle null
    const searchParams = useSearchParams();
    const isLoggingOut = searchParams?.get('logout') === 'success';

    const [isCheckingAuth, setIsCheckingAuth] = useState(!isLoggingOut);

    useEffect(() => {
        const checkSession = async () => {
            console.log('Checking session...');
            if (isLoggingOut) {
                console.log('User logged out, skipping session check');
                setIsCheckingAuth(false);
                return;
            }

            const token = getToken();
            if (token) {
                try {
                    // Simple check without complex timeout or race conditions for now
                    const user = await fetchCurrentUser();

                    if (user && user.role === 'admin') {
                        console.log('User is admin, redirecting...');
                        router.replace('/admin/dashboard');
                        return;
                    }
                } catch (e) {
                    console.error("Admin session verification failed", e);
                }
            }
            // Always ensure we stop checking
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
            showToast('Login failed. Please try again.');
            console.error('Admin login error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-maroon-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,164,132,0.05)_0%,transparent_70%)] pointer-events-none" />
                <div className="relative">
                    <div className="w-24 h-24 border-[3px] border-brand-gold/10 border-t-brand-gold rounded-full animate-spin mx-auto shadow-2xl shadow-brand-gold/20"></div>
                </div>
                <p className="mt-10 text-white text-xl font-black uppercase tracking-[0.4em] animate-pulse">Neural Link Sync...</p>
                <p className="mt-4 text-brand-gold/40 text-[10px] font-black uppercase tracking-[0.3em] italic">Accessing LabFace Central Matrix</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-maroon-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(196,164,132,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(196,164,132,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none"></div>
            <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-gold/10 to-transparent pointer-events-none opacity-30" />
            
            <div className="relative max-w-lg w-full animate-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-12">
                    <div className="bg-black/40 border border-brand-gold/30 rounded-[32px] p-6 shadow-3xl group transition-all hover:scale-105 hover:border-brand-gold relative">
                        <div className="absolute inset-0 bg-brand-gold/10 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                        <Shield className="w-16 h-16 text-brand-gold relative z-10" />
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-2xl p-12 rounded-[48px] border border-white/10 shadow-3xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="text-center mb-12 relative z-10">
                        <h1 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter">Command Vault</h1>
                        <p className="text-secondary/40 text-[10px] font-black uppercase tracking-[0.4em]">ADMINISTRATOR_ACCESS_ONLY</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-3">
                            <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                Credentials Alpha
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/20 group-focus-within:text-brand-gold transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/60 border border-white/5 text-white pl-16 pr-6 py-5 rounded-2xl focus:outline-none focus:border-brand-gold transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10"
                                    placeholder="ADMIN@LABFACE.OPS"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                Secure Passkey
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/20 group-focus-within:text-brand-gold transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/60 border border-white/5 text-white pl-16 pr-16 py-5 rounded-2xl focus:outline-none focus:border-brand-gold transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-secondary/20 hover:text-brand-gold transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-gold hover:bg-black hover:text-brand-gold disabled:bg-black/60 disabled:text-secondary/20 disabled:border-white/5 text-black font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-2xl transition-all duration-300 transform border border-brand-gold shadow-2xl active:scale-95 flex items-center justify-center gap-4 group"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-[3px] border-black/20 border-t-black rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                    <span>Initialize Command</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-10 border-t border-white/5 relative z-10 text-center">
                        <p className="text-secondary/20 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed italic">
                            Classified Access · Level 9 Encryption Active<br />
                            All Neural Interfaces Are Logged
                        </p>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
                </div>

                <div className="mt-8 flex items-center justify-center gap-4 opacity-40 hover:opacity-100 transition-opacity">
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-brand-gold/30" />
                    <p className="text-brand-gold font-black text-[9px] uppercase tracking-[0.5em]">LabFace Ops System</p>
                    <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-brand-gold/30" />
                </div>
            </div>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-maroon-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-24 h-24 border-[3px] border-brand-gold/10 border-t-brand-gold rounded-full animate-spin mx-auto shadow-2xl shadow-brand-gold/20"></div>
                <p className="mt-10 text-white text-xl font-black uppercase tracking-[0.4em] animate-pulse">Loading Portal Matrix...</p>
            </div>
        }>
            <AdminLoginForm />
        </Suspense>
    );
}
