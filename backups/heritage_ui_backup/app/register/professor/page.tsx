"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import axios from 'axios';
import { User, Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, X, CheckCircle, AlertCircle, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Shield, Clock, FileText, RefreshCw, GraduationCap, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser } from '../../../utils/auth';
import ConsentStep, { CONSENT_VERSION } from '../../../components/ConsentStep';
import { useToast } from '../../../components/Toast';
import { API_URL } from '../../../utils/auth';
import UpdateManager from '../../../components/UpdateManager';

export default function ProfessorRegisterPage() {
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
    const [isCheckingProfessorId, setIsCheckingProfessorId] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const handleNextStep1 = async () => {
        if (!formData.professorId || !formData.firstName || !formData.lastName || !formData.email || !profilePicture) {
            showToast("Required fields missing (Photo ID is mandatory)", "error");
            return;
        }
        setStep(2);
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
            showToast(err.response?.data?.message || 'Registration failed', "error");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) return (
        <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin text-primary mb-4" size={32} />
            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Initialising Faculty Secure...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-cream flex flex-col font-sans selection:bg-secondary selection:text-white">
            <Navbar />
            <div className="flex-grow container mx-auto px-6 pt-32 pb-20 flex items-center justify-center">
                <div className="max-w-2xl w-full">
                    {/* Stepper HUD */}
                    <div className="mb-14 flex items-center justify-between relative px-12 md:px-24">
                        <div className="absolute left-20 md:left-32 right-20 md:right-32 top-6 h-[2px] bg-primary/5 -z-10">
                            <div className="h-full bg-secondary transition-all duration-1000" style={{ width: `${(step - 1) * 50}%` }} />
                        </div>
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s ? 'bg-coffee border-secondary text-brand-cream shadow-3xl' : 'bg-white border-primary/5 text-primary/20'}`}>
                                    {s === 1 ? <User size={20} /> : s === 2 ? <ShieldCheck size={20} /> : <Lock size={20} />}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-4xl overflow-hidden border border-primary/5">
                        <div className="bg-coffee p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-5"></div>
                            <h1 className="relative z-10 text-3xl font-black text-brand-cream tracking-tighter uppercase mb-2">Faculty Onboarding</h1>
                            <p className="relative z-10 text-secondary/60 text-[10px] font-black tracking-[0.4em] uppercase">Professor Registry • Secure Clearance</p>
                        </div>

                        <div className="p-8 md:p-16">
                            {step === 2 ? (
                                <ConsentStep 
                                    consentType="registration" 
                                    onAccept={() => { setStep(3); window.scrollTo(0,0); }} 
                                    onDecline={() => router.push('/login')} 
                                />
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-10">
                                    {step === 1 && (
                                        <div className="space-y-10 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="col-span-full space-y-4">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 mb-1 ml-1">Faculty Identity Protocol</label>
                                                    <div className="relative">
                                                        <input name="professorId" value={formData.professorId} onChange={handleInputChange} placeholder="5-DIGIT SECURITY ID" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-black tracking-[0.2em] focus:border-secondary transition-all outline-none shadow-sm" maxLength={5} />
                                                        {isCheckingProfessorId && <RefreshCw size={18} className="absolute right-5 top-5 text-secondary animate-spin" />}
                                                    </div>
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 mb-4 ml-1 block">Institutional Verification Image</label>
                                                    <label className={`flex flex-col items-center justify-center w-full h-48 border-4 border-dashed rounded-[3rem] cursor-pointer transition-all ${profilePicture ? 'bg-secondary/5 border-secondary/20' : 'bg-primary/5 border-primary/5 hover:border-secondary/20'}`}>
                                                        {profilePicture ? (
                                                            <div className="relative w-full h-full p-4">
                                                                <img src={profilePicture} alt="ID Preview" className="w-full h-full object-contain" />
                                                                <button type="button" onClick={() => setProfilePicture(null)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg"><X size={16}/></button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center group">
                                                                <div className="w-16 h-16 bg-coffee text-brand-cream rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                                   <Upload size={24} />
                                                                </div>
                                                                <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Select Credentials (PDF/JPG)</span>
                                                            </div>
                                                        )}
                                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = () => setProfilePicture(reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }} />
                                                    </label>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Given Name</label>
                                                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="AS WRITTEN" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Family Name</label>
                                                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="AS WRITTEN" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                </div>
                                                <div className="col-span-full space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Academic Email</label>
                                                    <input name="email" value={formData.email} onChange={handleInputChange} placeholder="faculty@pup.edu.ph" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-6">
                                                <button type="button" onClick={handleNextStep1} className="bg-coffee text-brand-cream px-12 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-3xl hover:bg-black transition-all flex items-center gap-3">
                                                    Initialize Protocols <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-12 animate-fade-in">
                                            <div className="text-center mb-8">
                                                <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-2">Security Manifest</h3>
                                                <p className="text-primary/40 text-[10px] uppercase font-bold tracking-widest">Establish your administrative passphrase</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Security Key</label>
                                                    <div className="relative">
                                                        <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-5 text-primary/20 hover:text-primary">
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Confirm Primary Key</label>
                                                    <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleInputChange} className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-5 bg-primary/5 p-6 rounded-3xl border border-primary/5 group hover:border-secondary/20 transition-all">
                                                <div className="relative pt-1">
                                                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer hidden" id="consent-check" />
                                                    <div className="w-6 h-6 border-2 border-primary/10 rounded-lg peer-checked:bg-secondary peer-checked:border-secondary transition-all"></div>
                                                    <Check className="absolute inset-0 m-auto text-brand-cream opacity-0 peer-checked:opacity-100 transition-all" size={14} strokeWidth={4} />
                                                </div>
                                                <label htmlFor="consent-check" className="text-[10px] text-primary/60 font-bold uppercase tracking-wider leading-[1.8] cursor-pointer selection:bg-none">
                                                    I acknowledge the professional responsibility of laboratory oversight and agree to the institutional data processing framework.
                                                </label>
                                            </div>

                                            <div className="flex justify-between items-center pt-8">
                                                <button type="button" onClick={() => setStep(2)} className="text-primary/30 font-black uppercase text-[9px] tracking-widest hover:text-primary transition-all underline decoration-primary/5 pb-1">
                                                    « Review Consent
                                                </button>
                                                <button type="submit" disabled={!consent || loading} className="bg-coffee text-brand-cream px-14 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-4xl hover:bg-black transition-all disabled:opacity-20 active:scale-95">
                                                    {loading ? 'Committing...' : 'Commit Faculty Profile'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-16 text-center">
                        <Link href="/login" className="text-primary/40 text-[9px] font-black uppercase tracking-[0.3em] hover:text-secondary transition-all border-b border-primary/5 pb-1">
                            Existing Faculty Profile? Login Terminal
                        </Link>
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-coffee/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center animate-fade-in">
                    <div className="max-w-md w-full">
                        <div className="w-28 h-28 bg-secondary/20 text-secondary rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-4xl shadow-secondary/20 border border-secondary/10">
                            <Clock size={56} />
                        </div>
                        <h2 className="text-5xl font-black text-brand-cream uppercase tracking-tighter mb-4 leading-none">Awaiting Clearance</h2>
                        <p className="text-brand-cream/40 mb-12 font-medium uppercase text-[10px] tracking-[0.2em] leading-relaxed">Faculty accounts require manual administrative validation. <br /> Check your email for clearance protocols.</p>
                        <button onClick={() => window.location.href = '/login'} className="w-full bg-brand-cream text-coffee py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-3xl hover:scale-105 transition-all">
                            Retract to Login
                        </button>
                    </div>
                </div>
            )}
            <UpdateManager />
        </div>
    );
}
