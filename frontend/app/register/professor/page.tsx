"use client";
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, ShieldCheck, Lock, Eye, EyeOff, X, CheckCircle, Upload, ChevronLeft, ChevronRight, Check, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import UpdateManager from '@/components/UpdateManager';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

function ProfessorRegisterContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        professorId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [consent, setConsent] = useState(false);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const token = getToken();
            if (token) {
                try {
                    const user = await fetchCurrentUser();
                    if (user) {
                        router.replace(user.role === 'professor' ? '/professor/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
                        return;
                    }
                } catch (e) {
                    console.error("Session verification failed", e);
                }
            }
            setIsCheckingAuth(false);
        };
        checkSession();
    }, [router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep1 = () => {
        if (!formData.professorId || !formData.firstName || !formData.lastName || !formData.email || !profilePicture) {
            showToast("Error", "Faculty information and ID photo are required.", "warning");
            return;
        }
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/register/professor`, {
                ...formData,
                idPhoto: profilePicture,
                consentGiven: true,
                consentVersion: CONSENT_VERSION
            });
            setShowSuccess(true);
        } catch (err: any) {
            showToast("Error", err.response?.data?.message || 'Faculty registration failed.', "error");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Academic Credentials', icon: User },
        { id: 2, title: 'Consent Agreements', icon: ShieldCheck },
        { id: 3, title: 'Account Security', icon: Lock },
    ];

    return (
        <main className="flex-grow container mx-auto px-6 pt-40 pb-32 relative z-10 w-full animate-in fade-in duration-1000">
            <div className="max-w-5xl mx-auto">
                {/* Stepper HUD */}
                <div className="mb-24 flex items-center justify-between relative px-12 md:px-32 font-outfit">
                    <div className="absolute left-20 md:left-40 right-20 md:right-40 top-12 h-[4px] bg-slate-100/50 -z-10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-[#5CB4E4] to-[#041C3C] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(92,180,228,0.5)]" 
                            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }} 
                        />
                    </div>
                    {steps.map(s => (
                        <div key={s.id} className="flex flex-col items-center gap-8 relative">
                            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center border-2 transition-all duration-700 relative ${
                                step >= s.id 
                                ? 'bg-[#041C3C] border-[#041C3C] text-white shadow-3xl scale-110' 
                                : 'bg-white/60 backdrop-blur-md border-slate-100 text-slate-300 transform scale-90'
                            }`}>
                                <s.icon size={28} className={step === s.id ? 'animate-pulse' : ''} />
                                {step > s.id && (
                                    <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-[1rem] border-4 border-white shadow-2xl animate-in zoom-in">
                                        <Check size={14} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-500 hidden md:block ${step === s.id ? 'text-[#041C3C]' : 'text-slate-300'}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="w-full bg-white/40 backdrop-blur-xl rounded-[4rem] shadow-3xl overflow-hidden border border-slate-100/50 animate-in slide-in-from-bottom-10 duration-1000 relative z-20">
                    <div className="bg-gradient-to-b from-[#041C3C]/5 to-transparent p-16 text-center border-b border-slate-100/50">
                        <h1 className="text-4xl md:text-6xl font-black text-[#041C3C] tracking-tighter uppercase mb-4 font-outfit italic">
                            Faculty Enrollment
                        </h1>
                        <div className="inline-flex items-center gap-4 py-3 px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                            Enroll New Faculty Account
                        </div>
                    </div>

                    <div className="p-10 md:p-20">
                        {step === 2 ? (
                            <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                <ConsentStep 
                                    consentType="registration" 
                                    onAccept={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                    onDecline={() => setStep(1)} 
                                />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-12">
                                {step === 1 && (
                                    <div className="space-y-12 animate-in fade-in duration-700">
                                        <div className="space-y-8">
                                            <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] font-outfit flex items-center gap-5 italic opacity-60 underline underline-offset-8 decoration-[#5CB4E4]/30">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full animate-pulse" />
                                                Faculty Information
                                            </h3>
                                            <InputField
                                                label="Faculty Identification Number"
                                                name="professorId"
                                                value={formData.professorId}
                                                onChange={handleInputChange}
                                                placeholder="XXXXX"
                                                maxLength={5}
                                                isRequired
                                                isValid={formData.professorId.length === 5}
                                                className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                            />

                                            <div className="space-y-6 pt-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">Upload Academic Identification</label>
                                                <label className={`flex flex-col items-center justify-center w-full h-80 border-4 border-dashed rounded-[3.5rem] cursor-pointer transition-all duration-700 overflow-hidden shadow-3xl bg-white/60 ${profilePicture ? 'border-[#5CB4E4]' : 'border-slate-200 hover:border-[#5CB4E4]'}`}>
                                                    {profilePicture ? (
                                                        <div className="relative w-full h-full p-6 animate-in zoom-in-95">
                                                            <img src={profilePicture} alt="ID Preview" className="w-full h-full object-contain rounded-[2.5rem]" />
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setProfilePicture(null)} 
                                                                className="absolute top-8 right-8 p-4 bg-rose-500 text-white rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-10"
                                                            >
                                                                <X size={20} strokeWidth={3}/>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center group p-10">
                                                            <div className="w-24 h-24 bg-white/80 backdrop-blur-md border border-slate-200 text-[#041C3C] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-all duration-700 shadow-2xl border-[#5CB4E4]/20">
                                                                <Upload size={40} className="text-[#5CB4E4]" />
                                                            </div>
                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] group-hover:text-[#041C3C] transition-colors">Upload ID photo</span>
                                                            <p className="text-[9px] text-slate-300 mt-4 uppercase tracking-[0.2em] italic font-outfit">JPEG or PNG required (Max 5MB)</p>
                                                        </div>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => setProfilePicture(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }} />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-8 pt-6">
                                            <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] font-outfit flex items-center gap-5 italic opacity-60 underline underline-offset-8 decoration-[#5CB4E4]/30">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full animate-pulse" />
                                                Personal Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <InputField
                                                    label="First Name"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="First Name"
                                                    isRequired
                                                    isValid={formData.firstName.length > 1}
                                                    className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                />
                                                <InputField
                                                    label="Last Name"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Last Name"
                                                    isRequired
                                                    isValid={formData.lastName.length > 1}
                                                    className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                />
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label="Academic Email Address"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        placeholder="faculty@pup.edu.ph"
                                                        isRequired
                                                        isValid={formData.email.endsWith('.edu.ph')}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-16 border-t border-slate-100/50">
                                            <Button 
                                                type="button" 
                                                onClick={handleNextStep1} 
                                                size="xl" 
                                                className="h-20 px-16 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-2xl active:scale-95 transition-all duration-500 text-[12px] tracking-[0.4em] group"
                                            >
                                                Proceed to Academic Agreements <ChevronRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-16 animate-in slide-in-from-bottom-10 duration-1000">
                                        <div className="text-center space-y-6">
                                            <div className="w-32 h-32 bg-[#5CB4E4]/10 border border-[#5CB4E4]/20 rounded-[3rem] flex items-center justify-center mx-auto shadow-3xl text-[#5CB4E4]">
                                                <Lock size={48} className="animate-pulse" />
                                            </div>
                                            <h3 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit">Account Security</h3>
                                            <div className="h-1 w-24 bg-gradient-to-r from-[#5CB4E4] to-transparent rounded-full mx-auto" />
                                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] font-outfit opacity-60">Create a secure password</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                                            <InputField
                                                label="Password"
                                                name="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••••••"
                                                isRequired
                                                showStrength
                                                isValid={formData.password.length >= 8}
                                                className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-[2.5rem]"
                                            />
                                            <InputField
                                                label="Confirm Password"
                                                name="confirmPassword"
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                placeholder="••••••••••••"
                                                isRequired
                                                isValid={formData.confirmPassword.length >= 8 && formData.confirmPassword === formData.password}
                                                className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-[2.5rem]"
                                            />
                                        </div>

                                        <div className="flex items-start gap-8 bg-slate-100/50 backdrop-blur-md p-10 rounded-[3rem] border border-slate-200/50 group hover:border-[#5CB4E4]/30 transition-all cursor-pointer shadow-inner max-w-3xl mx-auto" onClick={() => setConsent(!consent)}>
                                            <div className="relative pt-1 flex-shrink-0">
                                                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer hidden" id="consent-check" />
                                                <div className="w-8 h-8 border-2 border-slate-200 bg-white rounded-xl peer-checked:bg-[#041C3C] peer-checked:border-[#041C3C] transition-all overflow-hidden relative shadow-2xl">
                                                    <Check className="absolute inset-0 m-auto text-[#5CB4E4] opacity-0 peer-checked:opacity-100 transition-all w-6 h-6 scale-50 peer-checked:scale-100" strokeWidth={5} />
                                                </div>
                                            </div>
                                            <label className="text-[11px] text-[#041C3C] font-black uppercase tracking-[0.15em] leading-relaxed cursor-pointer opacity-70 group-hover:opacity-100 transition-all font-outfit italic">
                                                I acknowledge my responsibility as a faculty member and agree to the privacy policy regarding my personal information.
                                            </label>
                                        </div>

                                        <div className="flex justify-between items-center pt-20 border-t border-slate-100/50">
                                            <button 
                                                type="button" 
                                                onClick={() => setStep(2)} 
                                                className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-[#041C3C] transition-all flex items-center min-h-[48px] font-outfit group"
                                            >
                                                <ChevronLeft size={20} className="mr-4 group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" /> Back to Academic Agreements
                                            </button>
                                            <Button 
                                                type="submit" 
                                                disabled={!consent || loading || !formData.password || formData.password !== formData.confirmPassword} 
                                                isLoading={loading} 
                                                className="h-24 px-20 rounded-[3rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-3xl text-[13px] tracking-[0.5em] group"
                                            >
                                                Complete Registration <ArrowRight size={24} className="ml-6 group-hover:translate-x-2 transition-transform duration-500" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>

                <div className="mt-24 text-center pb-20 opacity-60">
                    <Link href="/login" className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] hover:text-[#041C3C] transition-all flex items-center justify-center min-h-[44px] font-outfit gap-6 group">
                        Already have an account? <span className="text-[#5CB4E4] group-hover:translate-x-2 transition-transform">Sign In</span>
                    </Link>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-[#041C3C]/40 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center animate-in fade-in duration-1000">
                    <div className="max-w-xl w-full bg-white border border-slate-100 p-20 rounded-[4.5rem] shadow-[0_50px_120px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden animate-in zoom-in-95 duration-700">
                        <div className="w-32 h-32 bg-slate-50 text-[#041C3C] rounded-[3rem] flex items-center justify-center mx-auto mb-12 shadow-3xl border border-slate-100">
                            <RefreshCw size={56} className="animate-spin duration-[4000ms]" />
                        </div>
                        <h2 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter mb-6 font-outfit italic">Account Under Academic Review</h2>
                        <div className="h-1 w-20 bg-[#5CB4E4]/30 rounded-full mx-auto mb-10" />
                        <p className="text-slate-500 mb-16 font-black uppercase text-[11px] tracking-[0.3em] leading-relaxed">
                            Faculty accounts require manual verification by the administration.<br />
                            You will be notified via email once your account has been verified.
                        </p>
                        <Button onClick={() => window.location.href = '/login'} className="w-full h-24 rounded-[3rem] bg-[#041C3C] text-white">
                            Return to Login
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}

const RefreshCw = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);

export default function ProfessorRegisterPage() {
    return (
        <div className="w-full relative selection:bg-identity-navy/10 page-transition">
            <Navbar />
            <Suspense fallback={
                <div className="min-h-screen flex flex-col items-center justify-center gap-8">
                    <div className="w-20 h-20 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin"></div>
                    <p className="text-[#041C3C] text-[11px] font-black uppercase tracking-[0.3em] animate-pulse font-outfit">Preparing Enrollment Portal...</p>
                </div>
            }>
                <ProfessorRegisterContent />
            </Suspense>
            <UpdateManager />
        </div>
    );
}
