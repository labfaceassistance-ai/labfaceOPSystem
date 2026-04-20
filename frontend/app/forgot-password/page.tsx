"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Lock, Key, ArrowRight, CheckCircle, ChevronLeft, Eye, EyeOff, User } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../utils/auth';

export default function ForgotPasswordPage() {
    const { showToast } = useToast();
    const [step, setStep] = useState(1); 
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
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
            showToast('Verification code sent to your email.');
            setStep(2);
            setResendTimer(60);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to send OTP. Please check your email.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            showToast('Verification code resent to your email.');
            setResendTimer(60); 
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to resend OTP.');
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
            } else {
                showToast('Unable to retrieve user information. Please try again.');
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Invalid OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast('PASSKEYs do not match');
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            showToast("PASSKEY must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, { email, otp, newPassword });
            setStep(4); 
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 w-full py-20">
            <div className="w-full max-w-xl identity-glass rounded-[3rem] shadow-xl overflow-hidden animate-fade-in relative z-10 border border-identity-sky/20">
                {/* Header Area */}
                <div className="bg-identity-sky/5 p-12 text-center border-b border-identity-sky/10">
                    <h2 className="text-3xl font-black text-identity-navy uppercase tracking-tighter font-outfit mb-2">Identity Recovery</h2>
                    <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.15em]">Account Recovery</p>
                </div>

                <div className="p-12">
                    {step === 1 && (
                        <form onSubmit={handleSendOTP} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-identity-navy/70 ml-2">
                                    <div className="w-1.5 h-1.5 bg-identity-sky rounded-full" />
                                    EMAIL ADDRESS
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-identity-sky transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="USER@LABFACE.PH"
                                        required
                                        className="w-full bg-white border border-slate-200 text-identity-navy pl-16 pr-6 py-5 rounded-2xl focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/10 outline-none transition-all font-black uppercase tracking-[0.15em] text-xs"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-identity-sky hover:bg-identity-navy disabled:bg-slate-200 text-white font-black uppercase tracking-[0.15em] text-[10px] py-6 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                {loading ? 'Sending Code...' : (
                                    <>
                                        <span>Send Reset Code</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-identity-navy/70 ml-2">
                                    <div className="w-1.5 h-1.5 bg-identity-sky rounded-full" />
                                    Verification Token
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-identity-sky transition-colors">
                                        <Key size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="000000"
                                        required
                                        className="w-full bg-white border border-slate-200 text-identity-navy pl-16 pr-6 py-5 rounded-2xl focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/10 outline-none transition-all font-black uppercase tracking-[0.15em] text-xs tracking-[0.5em]"
                                    />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Check your email inbox.</p>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-identity-sky hover:bg-identity-navy text-white font-black uppercase tracking-[0.15em] text-[10px] py-6 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center"
                            >
                                {loading ? 'Verifying...' : 'Validate Token'}
                            </button>
                            <div className="flex flex-col gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={resendTimer > 0 || loading}
                                    className={`w-full text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-identity-sky hover:text-identity-navy'}`}
                                >
                                    {resendTimer > 0 ? `Retry in ${resendTimer}s` : 'Resend Token'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="w-full text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] hover:text-identity-navy transition-colors"
                                >
                                    Modify Target COMMUNICATION ADDRESS
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && !userInfo && (
                        <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl space-y-4">
                                <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em]">Synchronization Failure</p>
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Unable to load account details.</p>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="w-full bg-white border border-slate-200 text-identity-navy hover:text-identity-sky font-black uppercase tracking-[0.15em] text-[10px] py-5 rounded-2xl transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {step === 3 && userInfo && (
                        <form onSubmit={handleResetPassword} className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-identity-sky/5 border border-identity-sky/10 rounded-3xl p-8">
                                <h3 className="text-lg font-black text-identity-navy mb-6 flex items-center gap-4 uppercase tracking-tighter">
                                    <div className="bg-identity-sky/10 p-2 rounded-2xl">
                                        <User size={20} className="text-identity-sky" />
                                    </div>
                                    Verified Identity
                                </h3>

                                <div className="space-y-4">
                                    {[
                                        { label: userInfo.role === 'student' ? 'ID_REF' : 'PROF_REF', value: userInfo.userId },
                                        { label: 'NAME', value: `${userInfo.firstName} ${userInfo.lastName}` },
                                        { label: 'ROLE', value: userInfo.role.toUpperCase() },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.label}</span>
                                            <span className="text-[10px] font-black text-identity-navy uppercase tracking-[0.15em]">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-identity-navy/70 ml-2">
                                        <div className="w-1.5 h-1.5 bg-identity-sky rounded-full" />
                                        Primary Passkey
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-identity-sky transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="NEW PASSWORD"
                                            required
                                            className={`w-full bg-white border pl-16 pr-16 py-5 rounded-2xl focus:outline-none focus:ring-4 outline-none transition-all font-black uppercase tracking-[0.15em] text-xs ${!isPasswordValid && newPassword.length > 0
                                                ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10'
                                                : 'border-slate-200 focus:border-identity-sky focus:ring-identity-sky/10'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-identity-sky transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-identity-navy/70 ml-2">
                                        <div className="w-1.5 h-1.5 bg-identity-sky rounded-full" />
                                        Confirm Alignment
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-identity-sky transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="REPEAT PASSWORD"
                                            required
                                            className={`w-full bg-white border pl-16 pr-16 py-5 rounded-2xl focus:outline-none focus:ring-4 outline-none transition-all font-black uppercase tracking-[0.15em] text-xs ${!doPasswordsMatch && confirmPassword.length > 0
                                                ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/10'
                                                : 'border-slate-200 focus:border-identity-sky focus:ring-identity-sky/10'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-identity-sky transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-identity-sky hover:bg-identity-navy text-white font-black uppercase tracking-[0.15em] text-[10px] py-6 rounded-2xl transition-all shadow-xl active:scale-95"
                            >
                                {loading ? 'Committing...' : 'Commit Passkey'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-identity-sky/10 border border-identity-sky/20 text-identity-sky rounded-full flex items-center justify-center mx-auto shadow-md">
                                <CheckCircle size={40} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter">Success</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed">
                                    Identity Re-Verified Â· Passkey Updated<br />
                                    Secure Access Restored
                                </p>
                            </div>
                            <Link 
                                href="/login" 
                                className="block w-full bg-identity-navy hover:bg-identity-sky text-white font-black uppercase tracking-[0.15em] text-[10px] py-6 rounded-2xl transition-all shadow-xl active:scale-95 text-center"
                            >
                                Proceed to Terminal
                            </Link>
                        </div>
                    )}
                </div>

                {step !== 4 && (
                    <div className="bg-bg-base/50 p-8 text-center border-t border-slate-100">
                        <Link href="/login" className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] hover:text-identity-navy transition-all flex items-center justify-center gap-4 group">
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Terminal
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
