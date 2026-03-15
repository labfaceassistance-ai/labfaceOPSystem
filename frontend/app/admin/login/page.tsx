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
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                </div>
                <p className="mt-6 text-white text-lg font-semibold">Verifying session...</p>
                <p className="mt-2 text-slate-400 text-sm italic">Synchronizing portal access...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

            <div className="relative max-w-md w-full">
                <div className="flex justify-center mb-8">
                    <div className="bg-brand-600/10 border border-brand-600/30 rounded-full p-4">
                        <Shield className="w-12 h-12 text-brand-500" />
                    </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
                        <p className="text-slate-400">Secure access for Laboratory Administrators</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                    placeholder="admin@email.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white pl-11 pr-11 py-3 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    <span>Login as Admin</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <p className="text-slate-500 text-xs text-center leading-relaxed">
                            This page is for authorized personnel only.<br />
                            All login attempts are monitored and logged.
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    LabFace Laboratory Management System
                </p>
            </div>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                <p className="mt-6 text-white text-lg font-semibold">Loading Portal...</p>
            </div>
        }>
            <AdminLoginForm />
        </Suspense>
    );
}
