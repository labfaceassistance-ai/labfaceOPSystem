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
            <div className="fixed w-full z-50 bg-brand-900 shadow-lg py-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative h-10 w-10 bg-white rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                                <Image src="/logo.png" alt="LabFace Logo" width={40} height={40} className="object-cover" />
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-white">LabFace</span>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="flex-grow container mx-auto px-4 pt-32 pb-12 flex items-center justify-center">
                <div className="max-w-md w-full bg-slate-900/50 rounded-2xl shadow-xl overflow-hidden border border-slate-800 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-white text-center relative overflow-hidden border-b border-slate-800">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                            <p className="text-slate-300 text-sm">Recover access to your account</p>
                        </div>
                    </div>

                    <div className="p-8">

                        {step === 1 && (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your registered email"
                                            required
                                            className="input-field w-full pl-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-800 text-white placeholder-slate-500"
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white font-bold py-3 rounded-lg hover:bg-brand-400 transition-colors shadow-lg flex items-center justify-center gap-2">
                                    {loading ? 'Sending...' : 'Send Verification Code'} <ArrowRight size={18} />
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Verification Code</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="Enter 6-digit code"
                                            required
                                            className="input-field w-full pl-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-800 text-white placeholder-slate-500"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Check your email for the code.</p>
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white font-bold py-3 rounded-lg hover:bg-brand-400 transition-colors shadow-lg">
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={resendTimer > 0 || loading}
                                        className={`w-full text-sm font-medium ${resendTimer > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-brand-400 hover:text-brand-300 hover:underline'}`}
                                    >
                                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 text-sm hover:text-slate-200">
                                        Change Email
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 3 && !userInfo && (
                            <div className="text-center space-y-4">
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
                                    <p className="font-medium">Unable to load account information</p>
                                    <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Go Back to Email Entry
                                </button>
                            </div>
                        )}

                        {step === 3 && userInfo && (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <User size={20} className="text-brand-400" />
                                        Confirm Your Account
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                            <span className="text-sm text-slate-400">
                                                {userInfo.role === 'student' ? 'Student ID' : 'Professor ID'}
                                            </span>
                                            <span className="text-sm font-bold text-white">{userInfo.userId}</span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                            <span className="text-sm text-slate-400">Full Name</span>
                                            <span className="text-sm font-bold text-white">
                                                {userInfo.firstName} {userInfo.lastName}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                            <span className="text-sm text-slate-400">Role</span>
                                            <span className="text-sm font-bold text-white capitalize">{userInfo.role}</span>
                                        </div>

                                        {userInfo.role === 'student' && userInfo.course && (
                                            <>
                                                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                                                    <span className="text-sm text-slate-400">Course</span>
                                                    <span className="text-sm font-bold text-white">
                                                        {userInfo.course} - {userInfo.courseName}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-sm text-slate-400">Year Level</span>
                                                    <span className="text-sm font-bold text-white">{userInfo.yearLevel}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="New Password"
                                            required
                                            className={`input-field w-full pl-10 pr-10 p-3 border rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500 ${!isPasswordValid && newPassword.length > 0
                                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                : 'border-slate-700 focus:ring-brand-500 focus:border-brand-500'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {!isPasswordValid && newPassword.length > 0 ? (
                                        <p className="mt-1 text-xs text-red-400">
                                            Password must be at least 8 characters with uppercase, lowercase, number, and special char.
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Must be at least 8 characters with uppercase, lowercase, number, and special char.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm Password"
                                            required
                                            className={`input-field w-full pl-10 pr-10 p-3 border rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500 ${!doPasswordsMatch && confirmPassword.length > 0
                                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                : 'border-slate-700 focus:ring-brand-500 focus:border-brand-500'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {!doPasswordsMatch && confirmPassword.length > 0 && (
                                        <p className="mt-1 text-xs text-red-400">
                                            Passwords do not match.
                                        </p>
                                    )}
                                </div>

                                <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white font-bold py-3 rounded-lg hover:bg-brand-400 transition-colors shadow-lg">
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setUserInfo(null);
                                        setOtp('');
                                    }}
                                    className="w-full text-slate-400 hover:text-white text-sm transition-colors"
                                >
                                    Not you? Change email
                                </button>
                            </form>
                        )}

                        {step === 4 && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Password Reset Successful</h3>
                                <p className="text-slate-400 mb-6">
                                    Your password has been updated. You can now log in with your new credentials.
                                </p>
                                <Link href="/login" className="block w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-lg">
                                    Proceed to Login
                                </Link>
                            </div>
                        )}
                    </div>

                    {step !== 4 && (
                        <div className="bg-slate-900 border-t border-slate-800 p-4 text-center">
                            <Link href="/login" className="text-sm text-brand-400 font-medium hover:underline flex items-center justify-center gap-1">
                                <ChevronLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
