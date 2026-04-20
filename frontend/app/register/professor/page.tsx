"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, ShieldCheck, Lock, Eye, EyeOff, X, CheckCircle, Upload, ChevronLeft, ChevronRight, RefreshCw, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import { API_URL } from '@/utils/auth';
import UpdateManager from '@/components/UpdateManager';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

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
            showToast("Missing Protocol Data", "Personal information and Institutional Image ID are required for faculty verification.", "warning");
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
            showToast("Registration Protocol Failed", err.response?.data?.message || 'Access denied by system. Check your institutional credentials.', "error");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-identity-navy/20 border-t-identity-navy rounded-full animate-spin mb-4" />
                <p className="text-identity-navy font-black uppercase text-[10px] tracking-[0.3em]">Faculty Link Establishing...</p>
            </div>
        </div>
    );

    return (
        <div className="w-full relative selection:bg-identity-navy/10 page-transition">
            <Navbar />
            <div className="flex-grow container mx-auto px-6 pt-32 pb-20 flex items-center justify-center relative z-10 w-full">
                <div className="max-w-3xl w-full">
                    {/* Stepper HUD */}
                    <div className="mb-16 flex items-center justify-between relative px-4 md:px-14">
                        <div className="absolute left-10 md:left-24 right-10 md:right-24 top-6 h-[2px] bg-slate-100 -z-10 rounded-full">
                            <div className="h-full bg-identity-navy transition-all duration-700" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                        </div>
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex flex-col items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s ? 'bg-identity-navy border-identity-navy text-white shadow-lg scale-110' : 'bg-white border-slate-100 text-slate-300'}`}>
                                    {s === 1 ? <User size={20} /> : s === 2 ? <ShieldCheck size={20} /> : <Lock size={20} />}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="w-full identity-glass rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden border border-identity-navy/10 animate-fade-in relative z-20">
                        <div className="bg-identity-navy p-12 text-center relative border-b border-white/10">
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2 font-outfit">Faculty Onboarding</h1>
                            <p className="text-identity-sky text-[10px] font-black tracking-[0.4em] uppercase opacity-70">Institutional Registry Protocol</p>
                        </div>

                        <div className="p-8 md:p-16">
                            {step === 2 ? (
                                <ConsentStep 
                                    consentType="registration" 
                                    onAccept={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                    onDecline={() => setStep(1)} 
                                />
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-10">
                                    {step === 1 && (
                                        <div className="space-y-10 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="col-span-full">
                                                    <InputField
                                                        label="PROFESSOR ID (5-DIGIT REFERENCE)"
                                                        name="professorId"
                                                        value={formData.professorId}
                                                        onChange={handleInputChange}
                                                        placeholder="XXXXX"
                                                        maxLength={5}
                                                        isRequired
                                                        isValid={formData.professorId.length === 5}
                                                    />
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-identity-navy/60 mb-4 ml-2 block">INSTITUTIONAL VERIFICATION PROXY</label>
                                                    <label className={`flex flex-col items-center justify-center w-full h-56 border-4 border-dashed rounded-[3rem] cursor-pointer transition-all ${profilePicture ? 'bg-identity-navy/5 border-identity-navy/20' : 'bg-slate-50 border-slate-200 hover:border-identity-navy/20'}`}>
                                                        {profilePicture ? (
                                                            <div className="relative w-full h-full p-6">
                                                                <img src={profilePicture} alt="ID Preview" className="w-full h-full object-contain" />
                                                                <button type="button" onClick={() => setProfilePicture(null)} className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"><X size={16}/></button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center group">
                                                                <div className="w-16 h-16 bg-white border border-slate-100 text-identity-navy rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-md">
                                                                   <Upload size={24} />
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Select ID Image / PDF</span>
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

                                                <InputField
                                                    label="FIRST NAME"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="REQUIRED"
                                                    isRequired
                                                    isValid={formData.firstName.length > 1}
                                                />
                                                <InputField
                                                    label="LAST NAME"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="REQUIRED"
                                                    isRequired
                                                    isValid={formData.lastName.length > 1}
                                                />
                                                <div className="col-span-full">
                                                    <InputField
                                                        label="INSTITUTIONAL EMAIL ADDRESS"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        placeholder="FACULTY@PUP.EDU.PH"
                                                        isRequired
                                                        isValid={formData.email.endsWith('.edu.ph')}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-10 border-t border-slate-100">
                                                <Button type="button" onClick={handleNextStep1} size="xl">
                                                    NEXT PROTOCOL <ChevronRight size={18} className="ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-12 animate-fade-in">
                                            <div className="text-center mb-8">
                                                <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter mb-2 font-outfit">Access Registry</h3>
                                                <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.15em]">Establish your administrative access key</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <InputField
                                                    label="SECURE ACCESS KEY"
                                                    name="password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                                    isRequired
                                                    showStrength
                                                    isValid={formData.password.length >= 8}
                                                />
                                                <InputField
                                                    label="CONFIRM ACCESS KEY"
                                                    name="confirmPassword"
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                                    isRequired
                                                    isValid={formData.confirmPassword.length >= 8 && formData.confirmPassword === formData.password}
                                                />
                                            </div>

                                            <div className="flex items-start gap-5 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 group hover:border-identity-navy/20 transition-all cursor-pointer" onClick={() => setConsent(!consent)}>
                                                <div className="relative pt-1 flex-shrink-0">
                                                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer hidden" id="consent-check" />
                                                    <div className="w-6 h-6 border-2 border-slate-200 bg-white rounded-lg peer-checked:bg-identity-navy peer-checked:border-identity-navy transition-all"></div>
                                                    <Check className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-all w-4 h-4" strokeWidth={4} />
                                                </div>
                                                <label className="text-[10px] text-identity-navy font-bold uppercase tracking-wider leading-[1.8] cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity">
                                                    I acknowledge the professional responsibility of faculty oversight and agree to the institutional governance framework regarding biometric data.
                                                </label>
                                            </div>

                                            <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                                                <button type="button" onClick={() => setStep(2)} className="text-slate-300 font-black uppercase text-[10px] tracking-[0.15em] hover:text-identity-navy transition-all flex items-center min-h-[44px]">
                                                    <ChevronLeft size={16} className="mr-2" /> GO BACK
                                                </button>
                                                <Button type="submit" disabled={!consent || loading || !formData.password || formData.password !== formData.confirmPassword} isLoading={loading} size="xl">
                                                    COMMIT REGISTRY
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-16 text-center">
                        <Link href="/login" className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-identity-navy transition-all flex items-center justify-center min-h-[44px]">
                            EXISTING FACULTY PROFILE? ACCESS TERMINAL
                        </Link>
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center animate-fade-in">
                    <div className="max-w-md w-full bg-white border border-slate-100 p-12 rounded-[4rem] shadow-4xl relative overflow-hidden">
                        <div className="w-24 h-24 bg-identity-navy/5 text-identity-navy rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl border border-identity-navy/10">
                            <Clock size={48} className="animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter mb-4 font-outfit">Governance Pending</h2>
                        <p className="text-slate-600 mb-12 font-black uppercase text-[10px] tracking-[0.3em] leading-relaxed">Professor accounts require manual validation. <br /> Awaiting clearance from Administrative Core.</p>
                        <Button onClick={() => window.location.href = '/login'} size="xl" className="w-full">
                            RETURN TO TERMINAL
                        </Button>
                    </div>
                </div>
            )}
            <UpdateManager />
        </div>
    );
}

const Clock = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);
