"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, User, Lock, GraduationCap, School, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL, getToken, fetchCurrentUser } from '../../utils/auth';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
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
        // Disable smart switch immediately upon tab change to prevent browser autofill
        // from instantly switching us back (Sticky Tab fix)
        setCanSmartSwitch(false);
        const timer = setTimeout(() => {
            setCanSmartSwitch(true);
        }, 800); // 800ms cooldown
        return () => clearTimeout(timer);
    }, [activeTab]);

    useEffect(() => {
        // Only show checking auth state if we actually have a token to verify
        const token = getToken();
        if (token && !isLoggingOut) {
            setIsCheckingAuth(true);
        }
    }, [isLoggingOut]);

    const [formData, setFormData] = useState({ userId: '', password: '' });
    const [userIdError, setUserIdError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const userIdRef = useRef(formData.userId); // Sync ref for race-condition-free checks

    useEffect(() => {
        userIdRef.current = formData.userId;
    }, [formData.userId]);

    const [isPasswordFocused, setIsPasswordFocused] = useState(false); // Hack to stop aggressive autofill

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
                    // Signal-based loading: duration depends on API response speed
                    const user = await fetchCurrentUser();

                    // Add a small minimum delay (e.g., 800ms) for visual smoothness if response is too fast
                    const elapsedTime = Date.now() - startTime;
                    const minDelay = 800;
                    if (elapsedTime < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
                    }

                    if (user) {
                        // Priority Check: Redirect based on the scoped role returned by the server
                        const dashboardPath = user.role === 'admin' ? '/admin/dashboard'
                            : user.role === 'professor' ? '/professor/dashboard'
                                : '/student/dashboard';
                        router.replace(dashboardPath);
                        return;
                    }
                } catch (e) {
                    console.error("Session verification failed", e);
                    // No need to clear storages, fetchCurrentUser does it on 401/403
                }
            }
            setIsCheckingAuth(false);
        };

        checkSession();
    }, [router, isLoggingOut]);

    const formatStudentId = (value: string, inputType?: string) => {
        // Allow complete deletion - return empty if nothing to format
        if (!value || value.trim() === '') {
            return '';
        }

        const raw = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

        // If after cleaning there's nothing left, return empty
        if (!raw || raw === '-') {
            return '';
        }

        const parts = raw.split('-');

        const definitions = [
            { length: 4, regex: /^[0-9]*$/ },      // YYYY
            { length: 5, regex: /^[0-9]*$/ },      // NNNNN
            { length: 2, regex: /^[A-Z]*$/ },      // XX
            { length: 1, regex: /^[0-9]*$/ }       // N
        ];

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

            let validCharsInSegment = 0;

            for (const char of segmentRaw) {
                if (segmentClean.length < def.length) {
                    if (def.regex.test(char)) {
                        segmentClean += char;
                        validCharsInSegment++;
                    } else {
                        const isDeleting = inputType && inputType.includes('delete');
                        if (validCharsInSegment > 0 || isDeleting) {
                            nextOverflow += char;
                        }
                    }
                } else {
                    nextOverflow += char;
                }
            }

            if (i > 0) result += '-';
            result += segmentClean;
            overflow = nextOverflow;

            if (segmentClean.length === def.length) {
                lastSegmentFull = true;
            } else {
                lastSegmentFull = false;
            }
            processedSegments++;
        }

        const isDeleting = inputType && inputType.includes('delete');
        if (!isDeleting && lastSegmentFull && processedSegments < definitions.length) {
            result += '-';
        }

        return result;
    };

    const formatProfessorId = (value: string) => {
        // Allow complete deletion - return empty if nothing to format
        if (!value || value.trim() === '') {
            return '';
        }
        return value.replace(/\D/g, '').slice(0, 5);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        const name = e.target.name;

        // Smart Tab Switching Logic for Autofill/Paste
        if (name === 'studentId' || name === 'professorId') {
            const isBulkInput = value.length - formData.userId.length > 1;

            if (!canSmartSwitch) {
                // Sticky Tab Protection Phase (Cooldown Active)
                // If browser autofills "Wrong Tab" data during cooldown -> Clear it immediately
                // regardless of input type to prevent sticking.

                // If on Student Tab but receive Professor ID (5 digits) -> Clear both
                if (activeTab === 'student' && /^\s*\d{5}\s*$/.test(value)) {
                    userIdRef.current = '';
                    setFormData({ userId: '', password: '' });
                    return;
                }

                // If on Professor Tab but receive Student ID (contains dash or long number) -> Clear both
                if (activeTab === 'professor' && (value.includes('-') || /^\d{4}-\d{5}/.test(value))) {
                    userIdRef.current = '';
                    setFormData({ userId: '', password: '' });
                    return;
                }
            } else if (isBulkInput) {
                // Smart Switching Phase (Stable Tab)

                // Check for Professor ID format (exactly 5 digits)
                if (/^\d{5}$/.test(value) && activeTab !== 'professor') {
                    setActiveTab('professor');
                    userIdRef.current = value;
                    setFormData(prev => ({ ...prev, userId: value }));
                    return;
                }

                // Check for Student ID format (contains hyphen or matches student pattern partially)
                if ((value.includes('-') || /^\d{4}-\d{5}/.test(value)) && activeTab !== 'student') {
                    setActiveTab('student');
                    userIdRef.current = value;
                    setFormData(prev => ({ ...prev, userId: value }));
                    return;
                }
            }
        }

        if (name === 'studentId' || name === 'professorId') {
            setUserIdError(''); // Clear error on typing
            if (activeTab === 'student') {
                const inputType = (e.nativeEvent as any).inputType;

                // Only format if NOT a bulk input to avoid fighting the autofill
                const isBulkInput = value.length - formData.userId.length > 1;

                if (!isBulkInput) {
                    value = formatStudentId(value, inputType);
                }
            } else {
                value = formatProfessorId(value);
            }
            // Map specific ID fields back to generic userId in state
            userIdRef.current = value;
            setFormData(prev => ({ ...prev, userId: value }));
        } else if (name === 'studentPassword' || name === 'professorPassword') {
            // Ref-based Gatekeeper: Blocks orphaned password only if NO ID has been set (sync check)
            if (!canSmartSwitch && !userIdRef.current) {
                return;
            }
            setFormData(prev => ({ ...prev, password: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.currentTarget.name === 'studentId' && activeTab === 'student') {
            const target = e.currentTarget;
            const selectionStart = target.selectionStart;
            const selectionEnd = target.selectionEnd;
            const value = target.value;

            if (selectionStart !== null && selectionStart === selectionEnd) {
                if (e.key === 'Backspace') {
                    if ((selectionStart === 5 || selectionStart === 11 || selectionStart === 14)
                        && value[selectionStart - 1] === '-'
                        && selectionStart < value.length) {
                        e.preventDefault();
                    }
                } else if (e.key === 'Delete') {
                    if ((selectionStart === 4 || selectionStart === 10 || selectionStart === 13)
                        && value[selectionStart] === '-'
                        && selectionStart < value.length - 1) {
                        e.preventDefault();
                    }
                }
            }
        }
    };

    const handleBlur = () => {
        if (activeTab === 'student') {
            if (formData.userId.length > 0 && formData.userId.length < 15) {
                setUserIdError('Invalid format');
            }
        } else if (activeTab === 'professor') {
            if (formData.userId.length > 0 && formData.userId.length < 5) {
                setUserIdError('Invalid format');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Clear any previous error toasts
        // showToast('', 'error'); // This line is not needed as showToast is for displaying, not clearing.
        setUserIdError('');

        // Validation
        if (activeTab === 'student' && formData.userId.length < 15) {
            setUserIdError('Invalid format');
            return;
        }

        if (activeTab === 'professor' && formData.userId.length < 5) {
            setUserIdError('Invalid format');
            return;
        }


        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                ...formData,
                intendedRole: activeTab
            }, {
                withCredentials: true
            });

            const { token, user } = res.data;

            // Use localStorage if "Remember me" is checked, otherwise use sessionStorage
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', token);
            storage.setItem('user', JSON.stringify(user));

            if (user.role === 'admin') {
                router.push('/admin/dashboard');
            } else if (user.role === 'professor') {
                router.push('/professor/dashboard');
            } else {
                router.push('/student/dashboard');
            }
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawMessage = err instanceof Error ? (err as any).response?.data?.message || err.message : 'Login failed. Please try again.';
            const errorMsg = rawMessage || 'Login failed. Please check your credentials.';
            showToast(errorMsg, 'error');
            setLoading(false); // Only stop loading on error
        }

        // Note: loading(false) is intentionally omitted here to keep the overlay 
        // visible during the router transition to the dashboard.

    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                </div>
                <p className="mt-6 text-white text-lg font-semibold">Checking authentication...</p>
                <p className="mt-2 text-slate-400 text-sm italic">Synchronizing with dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-slate-950">
            {/* Full-Screen Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="text-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-brand-400/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                        </div>
                        <p className="mt-6 text-white text-lg font-semibold">Signing you in...</p>
                        <p className="mt-2 text-slate-400 text-sm">Please wait while we verify your credentials</p>
                    </div>
                </div>
            )}

            {/* Left Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-600 blur-3xl"></div>
                </div>

                <div className="relative z-10 text-center px-12">
                    <h2 className="text-4xl font-bold text-white mb-6">Welcome Back to LabFace</h2>
                    <p className="text-slate-300 text-lg mb-8">
                        Secure, AI-powered attendance monitoring for the modern laboratory.
                    </p>
                    <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-white mb-1">Fast</div>
                            <div className="text-slate-400 text-sm">Recognition</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold text-white mb-1">Secure</div>
                            <div className="text-slate-400 text-sm">Data Privacy</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 bg-slate-950">
                <div className="max-w-md w-full mx-auto">
                    <Link href="/" className="inline-flex items-center text-slate-400 hover:text-brand-400 mb-8 transition-colors group">
                        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Landing Page
                    </Link>


                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-white">Sign In</h1>
                        <p className="mt-2 text-slate-400">Access your dashboard</p>
                    </div>

                    {/* Role Toggles */}
                    <div className="flex p-1 bg-slate-900/50 rounded-xl mb-8 border border-slate-800">
                        <button
                            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'student' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => {
                                setActiveTab('student');
                                setFormData({ userId: '', password: '' });
                                setUserIdError('');
                            }}
                        >
                            <GraduationCap size={18} /> Student
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'professor' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => {
                                setActiveTab('professor');
                                setFormData({ userId: '', password: '' });
                                setUserIdError('');
                            }}
                        >
                            <School size={18} /> Professor
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit} key={activeTab}>

                        <div>
                            <label htmlFor={activeTab === 'student' ? "studentId" : "professorId"} className="block text-sm font-medium text-slate-300 mb-1">
                                {activeTab === 'student' ? "Student Number" : "Professor ID"}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id={activeTab === 'student' ? "studentId" : "professorId"}
                                    name={activeTab === 'student' ? "studentId" : "professorId"}
                                    type="text"
                                    required
                                    autoComplete={activeTab === 'student' ? "username-student" : "username-professor"}
                                    className={`block w-full pl-10 pr-3 py-3 border ${userIdError ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-colors bg-slate-800 text-white placeholder-slate-500`}
                                    placeholder={activeTab === 'student' ? "YYYY-NNNNN-XX-N" : "NNNNN"}
                                    value={formData.userId}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleBlur}
                                    maxLength={activeTab === 'student' ? 15 : 5}
                                />
                            </div>
                            {userIdError && (
                                <p className="mt-1 text-sm text-red-400">{userIdError}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor={activeTab === 'student' ? "studentPassword" : "professorPassword"} className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id={activeTab === 'student' ? "studentPassword" : "professorPassword"}
                                    name={activeTab === 'student' ? "studentPassword" : "professorPassword"}
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete={activeTab === 'student' ? "current-password-student" : "current-password-professor"}
                                    className="block w-full pl-10 pr-10 py-3 border border-slate-700 rounded-lg focus:ring-brand-500 focus:border-brand-500 transition-colors bg-slate-800 text-white placeholder-slate-500"
                                    placeholder="Enter Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer h-4 w-4 appearance-none border border-slate-700 rounded bg-slate-800 checked:bg-brand-500 checked:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer transition-all"
                                    />
                                    <svg
                                        className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300 cursor-pointer">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <Link href="/forgot-password" className="font-medium text-brand-400 hover:text-brand-300">Forgot password?</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-500 hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-400">
                            Don&apos;t have an account?{' '}
                            <button
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="font-medium text-brand-400 hover:text-brand-300 underline focus:outline-none"
                            >
                                Register here
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Registration Choice Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-up">
                        <button
                            onClick={() => setIsRegisterModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-white">Create Account</h3>
                            <p className="text-slate-400 mt-2">Choose your registration type</p>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href="/register/student"
                                className="flex items-center p-4 border-2 border-slate-800 rounded-xl hover:border-brand-500 hover:bg-brand-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-500 group-hover:text-white transition-colors border border-brand-500/20">
                                    <GraduationCap size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">Student</div>
                                    <div className="text-sm text-slate-400">Register with your student number</div>
                                </div>
                                <div className="ml-auto text-slate-500 group-hover:text-brand-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>

                            <Link
                                href="/register/professor"
                                className="flex items-center p-4 border-2 border-slate-800 rounded-xl hover:border-brand-500 hover:bg-brand-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-500 group-hover:text-white transition-colors border border-brand-500/20">
                                    <School size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">Professor</div>
                                    <div className="text-sm text-slate-400">Register with your faculty ID</div>
                                </div>
                                <div className="ml-auto text-slate-500 group-hover:text-brand-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
