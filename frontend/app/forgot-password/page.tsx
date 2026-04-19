"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Lock, Key, ArrowRight, CheckCircle, ChevronLeft, Eye, EyeOff, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../utils/auth';

export default function ForgotPasswordPage() {
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Review Info & Reset Password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // Password validation
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

    // Timer effect
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
            setResendTimer(60); // Start 60s cooldown
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
            setResendTimer(60); // Reset timer
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
            console.log('OTP Verification Response:', response.data);

            if (response.data.user) {
                setUserInfo(response.data.user);
                setStep(3); // Go to review step
            } else {
                showToast('Unable to retrieve user information. Please try again.');
                console.error('No user data in response:', response.data);
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
            showToast('Passwords do not match');
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            showToast("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, { email, otp, newPassword });
            setStep(4); // Success step
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
            {/* Simple Header with Logo */}
            <div className="fixed w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 py-3">
                <div className="max-w-7xl mx-auto px-6 sm:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-5 group">
                            <div className="relative h-12 w-12 bg-black border border-brand-gold/20 rounded-2xl overflow-hidden shadow-2xl group-hover:scale-110 transition-transform">
                                <Image src="/logo.png" alt="LabFace Logo" width={48} height={48} className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="font-black text-2xl tracking-[0.2em] text-white uppercase group-hover:text-brand-gold transition-colors">LabFace</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex-grow container mx-auto px-6 pt-40 pb-20 flex items-center justify-center relative z-10">
                <div className="max-w-xl w-full bg-black/40 backdrop-blur-2xl rounded-[48px] shadow-3xl overflow-hidden border border-white/10 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="bg-gradient-to-br from-black/60 to-transparent p-12 text-center relative overflow-hidden border-b border-white/5">
                        <div className="relative z-10 space-y-3">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Identity Recovery</h2>
                            <p className="text-secondary/40 text-[10px] font-black uppercase tracking-[0.4em]">Initialize_Access_Restoration</p>
                        </div>
                    </div>

                    <div className="p-12">
                        {step === 1 && (
                            <form onSubmit={handleSendOTP} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4">
                                    <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                        Registry Email
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/20 group-focus-within:text-brand-gold transition-colors" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="USER@LABFACE.OPS"
                                            required
                                            className="w-full bg-black/60 border border-white/5 text-white pl-16 pr-6 py-5 rounded-2xl focus:outline-none focus:border-brand-gold transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10"
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full bg-brand-gold hover:bg-black hover:text-brand-gold disabled:bg-black/60 disabled:text-secondary/20 text-black font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-2xl transition-all duration-300 border border-brand-gold shadow-2xl active:scale-95 flex items-center justify-center gap-4 group"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-[3px] border-black/20 border-t-black rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Send Sync Code</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4">
                                    <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                        Verification Token
                                    </label>
                                    <div className="relative group">
                                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/20 group-focus-within:text-brand-gold transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="000000"
                                            required
                                            className="w-full bg-black/60 border border-white/5 text-white pl-16 pr-6 py-5 rounded-2xl focus:outline-none focus:border-brand-gold transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10"
                                        />
                                    </div>
                                    <p className="text-[9px] font-black text-secondary/20 uppercase tracking-[0.2em] ml-2 italic">Check your encrypted correspondence.</p>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full bg-brand-gold hover:bg-black hover:text-brand-gold disabled:bg-black/60 disabled:text-secondary/20 text-black font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-2xl transition-all duration-300 border border-brand-gold shadow-2xl active:scale-95 flex items-center justify-center gap-4"
                                >
                                    {loading ? 'Verifying Node...' : 'Validate Access'}
                                </button>
                                <div className="flex flex-col gap-4">
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={resendTimer > 0 || loading}
                                        className={`w-full text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${resendTimer > 0 ? 'text-secondary/10 cursor-not-allowed' : 'text-brand-gold/60 hover:text-brand-gold'}`}
                                    >
                                        {resendTimer > 0 ? `Retry Sync in ${resendTimer}s` : 'Resend Token'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setStep(1)} 
                                        className="w-full text-secondary/20 text-[9px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                                    >
                                        Modify Target Email
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 3 && !userInfo && (
                            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl space-y-4">
                                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em]">Synchronization Failure</p>
                                    <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-[0.2em] italic">Unable to load account matrix.</p>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full bg-black/60 border border-white/5 text-secondary/40 hover:text-white font-black uppercase tracking-[0.3em] text-[10px] py-5 rounded-2xl transition-all"
                                >
                                    Restart Protocol
                                </button>
                            </div>
                        )}

                        {step === 3 && userInfo && (
                            <form onSubmit={handleResetPassword} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-black/60 border border-white/5 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent opacity-50" />
                                    <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tighter relative z-10">
                                        <div className="bg-brand-gold/10 p-2 rounded-lg">
                                            <User size={20} className="text-brand-gold" />
                                        </div>
                                        Verified Identity
                                    </h3>

                                    <div className="space-y-5 relative z-10">
                                        {[
                                            { label: userInfo.role === 'student' ? 'ID_REF' : 'PROF_REF', value: userInfo.userId },
                                            { label: 'NAME_DATA', value: `${userInfo.firstName} ${userInfo.lastName}` },
                                            { label: 'ROLE_CLASS', value: userInfo.role.toUpperCase() },
                                        ].map((item, i) => (
                                            <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                                <span className="text-[9px] font-black text-secondary/20 uppercase tracking-[0.3em]">{item.label}</span>
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                            Primary Passkey
                                        </label>
                                        <div className="relative group">
                                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/20 group-focus-within:text-brand-gold transition-colors" size={20} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="NEW_PASSWORD"
                                                required
                                                className={`w-full bg-black/60 border pl-16 pr-16 py-5 rounded-2xl focus:outline-none transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10 ${!isPasswordValid && newPassword.length > 0
                                                    ? 'border-rose-500 focus:border-rose-500'
                                                    : 'border-white/5 focus:border-brand-gold'
                                                    }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-secondary/20 hover:text-brand-gold transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-secondary/30 text-[9px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                            <div className="w-1 h-1 bg-brand-gold rounded-full" />
                                            Confirm Alignment
                                        </label>
                                        <div className="relative group">
                                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/20 group-focus-within:text-brand-gold transition-colors" size={20} />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="REPEAT_PASSWORD"
                                                required
                                                className={`w-full bg-black/60 border pl-16 pr-16 py-5 rounded-2xl focus:outline-none transition-all shadow-inner font-black uppercase tracking-widest text-xs placeholder:text-secondary/10 ${!doPasswordsMatch && confirmPassword.length > 0
                                                    ? 'border-rose-500 focus:border-rose-500'
                                                    : 'border-white/5 focus:border-brand-gold'
                                                    }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-secondary/20 hover:text-brand-gold transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full bg-brand-gold hover:bg-black hover:text-brand-gold disabled:bg-black/60 disabled:text-secondary/20 text-black font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-2xl transition-all duration-300 border border-brand-gold shadow-2xl active:scale-95"
                                >
                                    {loading ? 'Committing Changes...' : 'Commit Passkey'}
                                </button>
                            </form>
                        )}

                        {step === 4 && (
                            <div className="text-center space-y-10 animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-emerald-500/10 shadow-2xl animate-bounce">
                                    <CheckCircle size={40} />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Protocol Success</h3>
                                    <p className="text-secondary/40 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                                        Identity Re-Verified · Passkey Updated<br />
                                        Secure Access Has Been Restored
                                    </p>
                                </div>
                                <Link 
                                    href="/login" 
                                    className="block w-full bg-brand-gold hover:bg-black hover:text-brand-gold text-black font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-2xl transition-all duration-300 border border-brand-gold shadow-2xl text-center"
                                >
                                    Proceed to Terminal
                                </Link>
                            </div>
                        )}
                    </div>

                    {step !== 4 && (
                        <div className="bg-black/60 border-t border-white/5 p-8 text-center">
                            <Link href="/login" className="text-[10px] text-brand-gold/60 font-black uppercase tracking-[0.4em] hover:text-brand-gold transition-all flex items-center justify-center gap-3 group">
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Terminal
                            </Link>
                        </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent opacity-50" />
                </div>
            </div>

            {/* Background Texture */}
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>
    );
}
