"use client";
import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { Mail, Lock, Key, ArrowRight, CheckCircle, ChevronLeft, Eye, EyeOff, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../utils/auth';
import Button from '../../components/ui/Button';

function ForgotPasswordContent() {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const validatePassword = (password: string) => {
        const minLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
    };

    const isPasswordValid = newPassword.length > 0 ? validatePassword(newPassword) : true;
    const doPasswordsMatch = confirmPassword.length > 0 ? newPassword === confirmPassword : true;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            showToast('Success', 'Verification code sent to your email.', 'success');
            setStep(2);
            setResendTimer(60);
        } catch (err: any) {
            showToast('Error', err.response?.data?.message || 'Failed to send OTP.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            showToast('Resent', 'New verification code sent.', 'info');
            setResendTimer(60);
        } catch (err: any) {
            showToast('Error', err.response?.data?.message || 'Failed to resend OTP.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
            if (response.data.user) {
                setUserInfo(response.data.user);
                setStep(3);
                showToast('Verified', 'Identity verified. You can now reset your password.', 'success');
            } else {
                showToast('Error', 'Unable to retrieve user information.', 'error');
            }
        } catch (err: any) {
            showToast('Error', err.response?.data?.message || 'Invalid code.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast('Error', 'Passwords do not match.', 'error');
            return;
        }

        if (!validatePassword(newPassword)) {
            showToast('Security Error', "Password requirements not met.", 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, { email, otp, newPassword, targetRole: selectedRole });
            setStep(4);
            showToast('SUCCESS', 'Account credentials updated successfully.', 'success');
        } catch (err: any) {
            showToast('Error', err.response?.data?.message || 'Failed to update password.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl bg-white/40 backdrop-blur-xl rounded-[3.5rem] shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 relative z-10 border border-slate-100/50">
            {/* Header Area */}
            <div className="bg-gradient-to-b from-[#5CB4E4]/5 to-transparent p-16 text-center border-b border-slate-100/50 relative">
                <Link href="/login" className="absolute top-12 left-12 text-slate-400 hover:text-[#041C3C] text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center min-h-[44px] min-w-[44px] gap-4 transition-all group font-outfit">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[#5CB4E4]" />
                    BACK
                </Link>

                <div className="w-28 h-28 bg-white/80 backdrop-blur-md border border-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-10 mt-8">
                    <Key className="w-14 h-14 text-[#041C3C]" />
                </div>

                <h1 className="text-5xl md:text-6xl font-black text-[#041C3C] tracking-tighter mb-4 uppercase font-outfit italic">
                    Reset your password
                </h1>

                <div className="inline-flex items-center gap-4 py-3 px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                    Step {step} of 4
                </div>
            </div>

            <div className="p-16 space-y-12">
                {step === 1 && (
                    <form onSubmit={handleSendOTP} className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <div className="space-y-4">
                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@email.com"
                                    required
                                    className="w-full bg-white/40 backdrop-blur-sm border border-slate-200/50 text-[#041C3C] pl-16 pr-6 p-6 rounded-3xl focus:outline-none focus:border-[#5CB4E4] transition-all duration-500 shadow-sm font-black uppercase tracking-[0.2em] text-[11px] placeholder:text-slate-300 font-outfit"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            isLoading={loading}
                            variant="primary"
                            size="xl"
                            className="w-full h-20 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-2xl active:scale-95 transition-all duration-500 text-[12px] tracking-[0.3em] group"
                        >
                            Send Recovery Code
                            <ArrowRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500 text-[#5CB4E4]" />
                        </Button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <div className="space-y-4">
                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                Verification Code
                            </label>
                            <div className="relative group">
                                <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="000000"
                                    required
                                    className="w-full bg-white/40 backdrop-blur-sm border border-slate-200/50 text-[#041C3C] pl-16 pr-6 p-7 rounded-3xl focus:outline-none focus:border-[#5CB4E4] transition-all duration-500 shadow-sm font-black uppercase tracking-[0.8em] text-2xl text-center font-outfit"
                                />
                            </div>
                            <div className="bg-[#5CB4E4]/5 p-6 rounded-[2rem] border border-[#5CB4E4]/10 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic opacity-60">Message: Check your inbox</p>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            isLoading={loading}
                            variant="primary"
                            size="xl"
                            className="w-full h-20 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-2xl active:scale-95 transition-all duration-500 text-[12px] tracking-[0.3em]"
                        >
                            Verify Code
                        </Button>
                        <div className="flex flex-col gap-6 text-center">
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={resendTimer > 0 || loading}
                                className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${resendTimer > 0 ? 'text-slate-300' : 'text-[#5CB4E4] hover:text-[#041C3C]'}`}
                            >
                                {resendTimer > 0 ? `Retry in ${resendTimer}s` : 'Resend Verification Code'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-[#041C3C] transition-all"
                            >
                                Cancel and Restart
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && userInfo && (
                    <form onSubmit={handleResetPassword} className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <div className="bg-slate-100/50 backdrop-blur-md rounded-[2.5rem] p-10 border border-slate-200/50 shadow-inner">
                            <h3 className="text-[11px] font-black text-[#041C3C] mb-8 flex items-center gap-5 uppercase tracking-[0.4em] font-outfit italic underline underline-offset-8 decoration-[#5CB4E4]/40">
                                <User size={20} className="text-[#5CB4E4]" />
                                Account Found
                            </h3>

                            <div className="space-y-5">
                                {[
                                    { label: 'Student ID', value: userInfo.userId },
                                    { label: 'Full Name', value: `${userInfo.firstName} ${userInfo.lastName}` },
                                    { label: 'Account Type', value: userInfo.role.toUpperCase() },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-5 border-b border-slate-200/50 last:border-0 hover:bg-white/40 px-4 rounded-2xl transition-all duration-500">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-outfit italic opacity-60">{item.label}</span>
                                        <span className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.15em] font-outfit">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {userInfo.role.toLowerCase() === 'admin' ? (
                            <div className="bg-rose-50 border border-rose-100 p-12 rounded-[3rem] space-y-8 animate-in shake-in">
                                <div className="flex items-center gap-6 text-rose-600">
                                    <Lock size={32} />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] font-outfit italic">Admin Password Reset Restricted</h4>
                                </div>
                                <p className="text-[11px] text-rose-700 leading-relaxed font-black uppercase tracking-[0.1em] font-outfit italic opacity-70">
                                    Password recovery for administrative accounts is restricted. Please contact the head administrator.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                                >
                                    Start Over
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                <div className="space-y-6">
                                    <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                        Select Account Type
                                    </label>
                                    <div className="grid grid-cols-1 gap-5">
                                        {userInfo.role.split(',').map((r: string) => r.trim().toLowerCase()).concat(['all']).filter((r: string, i: number, arr: string[]) => {
                                            if (r === 'all') return userInfo.role.split(',').length > 1;
                                            return true;
                                        }).map((role: string) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setSelectedRole(role)}
                                                className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-700 font-outfit ${selectedRole === role
                                                    ? 'border-[#5CB4E4] bg-white shadow-2xl scale-[1.02]'
                                                    : 'border-slate-100 bg-white/40 hover:bg-white/60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${selectedRole === role ? 'border-[#5CB4E4] bg-[#041C3C]' : 'border-slate-200'}`}>
                                                        {selectedRole === role && <div className="w-2 h-2 bg-[#5CB4E4] rounded-full animate-pulse" />}
                                                    </div>
                                                    <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${selectedRole === role ? 'text-[#041C3C]' : 'text-slate-400'}`}>
                                                        {role === 'all' ? 'All Roles' : `Role: ${role.toUpperCase()}`}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedRole && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                        <div className="space-y-4">
                                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                                New Password
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="••••••••••••"
                                                    required
                                                    className={`w-full bg-white/40 backdrop-blur-sm border pl-16 pr-16 p-6 rounded-3xl focus:outline-none transition-all duration-500 font-black uppercase tracking-[0.2em] text-[11px] font-outfit ${!isPasswordValid && newPassword.length > 0 ? 'border-rose-400' : 'border-slate-100 focus:border-[#5CB4E4] shadow-sm'}`}
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#5CB4E4] p-2">
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[#041C3C] text-[10px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-4 font-outfit italic opacity-60">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4]" />
                                                Confirm New Password
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5CB4E4] transition-colors duration-500" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="••••••••••••"
                                                    required
                                                    className={`w-full bg-white/40 backdrop-blur-sm border pl-16 pr-16 p-6 rounded-3xl focus:outline-none transition-all duration-500 font-black uppercase tracking-[0.2em] text-[11px] font-outfit ${!doPasswordsMatch && confirmPassword.length > 0 ? 'border-rose-400' : 'border-slate-100 focus:border-[#5CB4E4] shadow-sm'}`}
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#5CB4E4] p-2">
                                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            isLoading={loading}
                                            variant="primary"
                                            size="xl"
                                            className="w-full h-20 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#041C3C]/90 text-white shadow-2xl active:scale-95 transition-all duration-500 text-[12px] tracking-[0.4em]"
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                )}

                {step === 4 && (
                    <div className="text-center space-y-12 animate-in zoom-in-95 duration-1000">
                        <div className="w-32 h-32 bg-[#5CB4E4]/10 border-2 border-[#5CB4E4]/20 text-[#5CB4E4] rounded-[3rem] flex items-center justify-center mx-auto shadow-3xl">
                            <CheckCircle size={48} className="animate-bounce" />
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit">Password Reset Successful</h3>
                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed opacity-60 font-outfit">
                                Password updated successfully.<br />
                                You can now log in with your new password.
                            </p>
                        </div>
                        <Link
                            href="/login"
                            className="block w-full h-20 bg-[#041C3C] hover:bg-[#5CB4E4] text-white font-black uppercase tracking-[0.4em] text-[12px] rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl active:scale-95"
                        >
                            Return to Login
                        </Link>
                    </div>
                )}
            </div>

            {step !== 4 && (
                <div className="bg-slate-100/30 p-12 text-center border-t border-slate-100/50 group">
                    <Link href="/login" className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] hover:text-[#041C3C] transition-all flex items-center justify-center gap-6 font-outfit">
                        <ChevronLeft size={20} className="group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" /> Back to Login
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center gap-8">
                <div className="w-20 h-20 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin"></div>
                <p className="text-[#041C3C] text-[11px] font-black uppercase tracking-[0.3em] animate-pulse font-outfit">Loading...</p>
            </div>
        }>
            <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 w-full py-24 relative z-10 page-transition">
                <ForgotPasswordContent />
            </div>
        </Suspense>
    );
}
