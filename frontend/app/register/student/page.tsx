"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, Mail, Lock, ShieldCheck, Camera, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Check, RefreshCw, Edit2, Eye, EyeOff, Loader2, Shield, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import FaceEnrollmentScanner from '@/components/FaceEnrollmentScanner';
import UpdateManager from '@/components/UpdateManager';

// NEW: Biometric Identity Node Component for Consistency
const IdentityNode = ({ className = "", size = 120 }) => (
    <div className={`identity-node ${className}`} style={{ width: size, height: size }}>
       <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g>
             <path d="M100,30 Q60,30 50,80 T100,170 T150,80 Q140,30 100,30 Z" fill="none" stroke="currentColor" className="text-identity-sky" strokeWidth="2" />
             <line x1="100" y1="30" x2="100" y2="170" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="55" y1="110" x2="145" y2="110" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <circle cx="75" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="125" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="110" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="30" r="2" fill="currentColor" className="text-identity-navy" />
             <circle cx="100" cy="170" r="2" fill="currentColor" className="text-identity-navy" />
             <line x1="75" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
             <line x1="125" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
          </g>
       </svg>
    </div>
 );

export default function StudentRegisterPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        studentId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        course: '',
        yearLevel: '',
        section: '',
        password: '',
        confirmPassword: '',
        certificateOfRegistration: '' as string | File,
    });

    const [captures, setCaptures] = useState<Record<string, string>>({});
    const [corVerifying, setCorVerifying] = useState(false);
    const [corVerified, setCorVerified] = useState(false);
    const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);
    const [studentIdError, setStudentIdError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [corPreviewUrl, setCorPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (corPreviewUrl) URL.revokeObjectURL(corPreviewUrl);
        };
    }, [corPreviewUrl]);

    useEffect(() => {
        const checkSession = async () => {
            const savedData = localStorage.getItem('student_registration_progress');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    setFormData(prev => ({ ...prev, ...parsed.formData }));
                    if (parsed.captures) setCaptures(parsed.captures);
                    if (parsed.enrollmentCompleted) setStep(5);
                    else if (parsed.step) setStep(parsed.step);
                    showToast('Welcome back! Progress restored.', 'info');
                } catch (e) {
                    console.error("Failed to restore progress", e);
                }
            }

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

    useEffect(() => {
        if (!isCheckingAuth && step > 1) {
            const { certificateOfRegistration, password, confirmPassword, ...safeFormData } = formData;

            localStorage.setItem('student_registration_progress', JSON.stringify({
                formData: safeFormData,
                step,
                captures,
                enrollmentCompleted: Object.keys(captures).length === 5
            }));
        }
    }, [formData, step, captures, isCheckingAuth]);

    const steps = [
        { id: 1, title: 'Personal Info', icon: User },
        { id: 2, title: 'Documents', icon: ShieldCheck },
        { id: 3, title: 'Consent', icon: FileText },
        { id: 4, title: 'Biometrics', icon: Camera },
        { id: 5, title: 'Security', icon: Lock },
    ];

    const formatStudentId = (value: string) => {
        const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let result = '';
        if (raw.length > 0) result += raw.substring(0, 4);
        if (raw.length > 4) result += '-' + raw.substring(4, 9);
        if (raw.length > 9) result += '-' + raw.substring(9, 11);
        if (raw.length > 11) result += '-' + raw.substring(11, 12);
        return result;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value = e.target.value;
        const name = e.target.name;
        if (name === 'studentId') {
            value = formatStudentId(value);
            setStudentIdError('');
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const verifyCOR = async () => {
        if (!formData.certificateOfRegistration) return;
        setCorVerifying(true);
        try {
            let base64Data = '';
            if (typeof formData.certificateOfRegistration !== 'string') {
                base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(formData.certificateOfRegistration as File);
                });
            } else {
                base64Data = formData.certificateOfRegistration;
            }

            const response = await axios.post(`${API_URL}/api/auth/validate-cor`, {
                studentId: formData.studentId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                course: formData.course,
                yearLevel: parseInt(formData.yearLevel),
                certificateOfRegistration: base64Data
            });

            if (response.data.valid) {
                setCorVerified(true);
                showToast('Academic Status Verified', 'success');
            } else {
                showToast(response.data.reason || 'Verification failed', 'info');
            }
        } catch (err: any) {
            showToast('COR verification service unavailable', 'error');
        } finally {
            setCorVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/register/student`, {
                ...formData,
                facePhotos: captures,
                consentGiven: true,
                consentVersion: CONSENT_VERSION
            });
            localStorage.removeItem('student_registration_progress');
            setShowSuccess(true);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Registration failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-identity-sky mb-4" size={32} />
            <p className="text-identity-navy font-black uppercase text-[10px] tracking-widest animate-pulse">Initialising LabFace Identity...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-identity-sky selection:text-white relative overflow-x-hidden">
            <Navbar />
            
            {/* System Identity Nodes: Absolute Deep Background Layer */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.12] overflow-hidden">
                <IdentityNode className="top-[15%] left-[5%]" size={160} />
                <IdentityNode className="bottom-[10%] right-[5%]" size={220} />
                <IdentityNode className="top-[45%] right-[10%]" size={110} />
                <IdentityNode className="bottom-[35%] left-[8%]" size={140} />
            </div>

            <div className="flex-grow container mx-auto px-6 pt-32 pb-20 relative z-10">
                <div className="max-w-4xl mx-auto">
                    {/* Stepper HUD: Premium Linear Style */}
                    <div className="mb-16 flex items-center justify-between relative px-4 md:px-14">
                        <div className="absolute left-10 md:left-24 right-10 md:right-24 top-6 h-[2.5px] bg-slate-100 -z-10 rounded-full">
                            <div className="h-full bg-identity-sky transition-all duration-1000 shadow-[0_0_10px_rgba(14,165,233,0.3)]" style={{ width: `${(step - 1) * 25}%` }} />
                        </div>
                        {steps.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center border-2 transition-all duration-500 ${step >= s.id ? 'bg-identity-sky border-identity-sky text-white shadow-xl shadow-identity-sky/20' : 'bg-white border-slate-100 text-slate-300'}`}>
                                    <s.icon size={20} className={step === s.id ? 'animate-pulse' : ''} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] hidden md:block ${step >= s.id ? 'text-identity-navy' : 'text-slate-300'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>

                    <div className="identity-glass rounded-[3rem] shadow-3xl overflow-hidden border border-slate-100 animate-fade-in">
                        <div className="bg-identity-navy p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-identity-sky/40 to-transparent" />
                            <h1 className="relative z-10 text-4xl font-black text-white tracking-tighter uppercase mb-2 font-outfit">
                                Lab<span className="text-identity-sky">Face</span> Registration
                            </h1>
                            <p className="relative z-10 text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase">Student Identity Enrollment Protocol</p>
                        </div>

                        <div className="p-8 md:p-16 bg-white/40">
                            <form onSubmit={handleSubmit} className="space-y-10">
                                {step === 1 && (
                                    <div className="space-y-10 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                                            <div className="col-span-full">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block ml-2">Identity Protocol (Institutional ID)</label>
                                                <div className="relative group">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <Shield size={20} />
                                                    </div>
                                                    <input
                                                        name="studentId"
                                                        value={formData.studentId}
                                                        onChange={handleInputChange}
                                                        placeholder="YYYY-NNNNN-XX-N"
                                                        className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-8 py-5 text-identity-navy placeholder:text-slate-200 font-black tracking-[0.15em] focus:border-identity-sky focus:ring-4 focus:ring-identity-sky/5 transition-all outline-none shadow-sm"
                                                        maxLength={15}
                                                    />
                                                    {formData.studentId.length >= 10 && (
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                            {formData.studentId.length === 15 ? (
                                                                <CheckCircle className="text-emerald-500" size={24} />
                                                            ) : (
                                                                <Loader2 className="animate-spin text-identity-sky/30" size={24} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3 group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Given Name</label>
                                                <input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Firstname" className="w-full bg-white border border-slate-200 rounded-2xl px-8 py-5 text-identity-navy placeholder:text-slate-200 font-bold focus:border-identity-sky outline-none transition-all shadow-sm" />
                                            </div>
                                            <div className="space-y-3 group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Family Name</label>
                                                <input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Surname" className="w-full bg-white border border-slate-200 rounded-2xl px-8 py-5 text-identity-navy placeholder:text-slate-200 font-bold focus:border-identity-sky outline-none transition-all shadow-sm" />
                                            </div>

                                            <div className="col-span-full space-y-3 group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">University Communication Address</label>
                                                <div className="relative group">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <Mail size={20} />
                                                    </div>
                                                    <input
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        placeholder="iskolar@iskolarngbayan.pup.edu.ph"
                                                        className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-8 py-5 text-identity-navy placeholder:text-slate-200 font-bold focus:border-identity-sky outline-none transition-all shadow-sm"
                                                    />
                                                    {formData.email.length > 5 && (
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                            {formData.email.includes('@') && formData.email.includes('.') ? (
                                                                <CheckCircle className="text-emerald-500" size={24} />
                                                            ) : (
                                                                <Loader2 className="animate-spin text-identity-sky/30" size={24} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3 relative group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Academic Program</label>
                                                <div className="relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <select name="course" value={formData.course} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-12 py-5 text-identity-navy font-bold focus:border-identity-sky transition-all outline-none shadow-sm appearance-none cursor-pointer">
                                                        <option value="" disabled hidden>SELECT PROGRAM</option>
                                                        <option value="BSIT">BS Information Technology</option>
                                                        <option value="DIT">Diploma in IT</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                                                </div>
                                            </div>

                                            <div className="space-y-3 relative group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Registry Level</label>
                                                <div className="relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <Check size={20} />
                                                    </div>
                                                    <select name="yearLevel" value={formData.yearLevel} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-12 py-5 text-identity-navy font-bold focus:border-identity-sky transition-all outline-none shadow-sm appearance-none cursor-pointer">
                                                        <option value="" disabled hidden>SELECT YEAR</option>
                                                        <option value="1">1ST YEAR</option>
                                                        <option value="2">2ND YEAR</option>
                                                        <option value="3">3RD YEAR</option>
                                                        <option value="4">4TH YEAR</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-12 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => { setStep(2); window.scrollTo(0, 0); }}
                                                disabled={!formData.studentId || !formData.firstName || !formData.lastName || !formData.course || !formData.yearLevel}
                                                className="bg-identity-sky text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-xl hover:bg-identity-navy disabled:opacity-30 transition-all flex items-center gap-3 active:scale-95 group"
                                            >
                                                Initialize Verification <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-12 animate-fade-in text-center">
                                        <div>
                                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter mb-3 font-outfit">Registry Validation</h3>
                                            <p className="text-slate-400 text-[11px] uppercase font-bold tracking-[0.2em]">Upload your Certificate of Registration (COR)</p>
                                        </div>

                                        <div className="max-w-2xl mx-auto">
                                            <div className={`relative border-2 rounded-[3.5rem] p-12 transition-all duration-500 overflow-hidden ${corVerified
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-500/10'
                                                    : corPreviewUrl
                                                        ? 'bg-slate-50 border-identity-sky/20 shadow-xl'
                                                        : 'bg-white border-dashed border-slate-200 hover:border-identity-sky/40 hover:bg-identity-sky/[0.02]'
                                                }`}>

                                                {!corVerified && (
                                                    <input
                                                        type="file"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setFormData(prev => ({ ...prev, certificateOfRegistration: file }));
                                                                setCorPreviewUrl(URL.createObjectURL(file));
                                                                setCorVerified(false);
                                                            }
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                    />
                                                )}

                                                <div className="space-y-8 flex flex-col items-center justify-center relative">
                                                    {!corPreviewUrl ? (
                                                        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300">
                                                            <Upload size={40} />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-full h-72 rounded-3xl overflow-hidden border border-slate-200 bg-white">
                                                            {formData.certificateOfRegistration instanceof File && formData.certificateOfRegistration.type.startsWith('image/') ? (
                                                                <img src={corPreviewUrl} alt="COR Preview" className="w-full h-full object-contain" />
                                                            ) : (
                                                                <iframe src={`${corPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full border-none" />
                                                            )}
                                                            
                                                            {corVerifying && (
                                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                                                                    <Loader2 className="animate-spin text-identity-sky mb-4" size={48} />
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-identity-navy">Neural Syncing...</span>
                                                                </div>
                                                            )}
                                                            {corVerified && (
                                                                <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                                                                    <CheckCircle size={64} className="mb-4" />
                                                                    <span className="text-[14px] font-black uppercase tracking-[0.3em]">VALIDATED</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-2 pointer-events-none">
                                                        <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${corVerified ? 'opacity-0' : 'text-identity-navy'}`}>
                                                            {corPreviewUrl ? (formData.certificateOfRegistration as File).name : 'Select Official Enrollment Proxy'}
                                                        </div>
                                                        {!corVerified && !corPreviewUrl && (
                                                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">PDF, JPG, or PNG Format Required</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100 px-2">
                                            <button type="button" onClick={() => setStep(1)} className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center gap-2">
                                                <ChevronLeft size={16} /> Return Back
                                            </button>

                                            {formData.certificateOfRegistration && !corVerified && !corVerifying && (
                                                <button type="button" onClick={verifyCOR} className="bg-identity-navy text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-xl hover:bg-black transition-all flex items-center gap-3">
                                                    <ShieldCheck size={18} className="text-identity-sky" /> Execute Profile Scan
                                                </button>
                                            )}

                                            {corVerified && (
                                                <button type="button" onClick={() => { setStep(3); window.scrollTo(0,0); }} className="bg-identity-sky text-white px-10 py-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl hover:bg-identity-navy transition-all flex items-center gap-3 animate-fade-in group">
                                                    Proceed to Legal Consent <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <ConsentStep
                                        consentType="registration"
                                        onAccept={() => { setStep(4); window.scrollTo(0, 0); }}
                                        onDecline={() => setStep(2)}
                                    />
                                )}

                                {step === 4 && (
                                    <div className="space-y-10 animate-fade-in">
                                        <FaceEnrollmentScanner
                                            initialCaptures={captures}
                                            onComplete={(c: Record<string, string>) => {
                                                setCaptures(c);
                                                setStep(5);
                                                showToast('Neural Pattern Secured', 'success');
                                                window.scrollTo(0, 0);
                                            }}
                                        />
                                        <div className="flex justify-between items-center pt-8 border-t border-slate-100 px-2">
                                            <button type="button" onClick={() => { setStep(3); window.scrollTo(0,0); }} className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center gap-2">
                                                <ChevronLeft size={16} /> Return Back
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div className="text-center">
                                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter mb-2 font-outfit">Identity Encryption</h3>
                                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.3em]">Establish your secure access key</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4 group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Secure Passkey</label>
                                                <div className="relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <Lock size={18} />
                                                    </div>
                                                    <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-16 py-5 text-identity-navy placeholder:text-slate-200 font-bold focus:border-identity-sky outline-none transition-all shadow-sm" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-identity-sky transition-colors">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-4 group">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block ml-2">Confirm Identity Key</label>
                                                <div className="relative">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-identity-sky transition-colors">
                                                        <CheckCircle size={18} />
                                                    </div>
                                                    <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded-2xl pl-16 pr-16 py-5 text-identity-navy placeholder:text-slate-200 font-bold focus:border-identity-sky outline-none transition-all shadow-sm" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100 px-2 mt-6">
                                            <button type="button" onClick={() => { setStep(4); window.scrollTo(0,0); }} className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center gap-2">
                                                <ChevronLeft size={16} /> Return Back
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={loading || !formData.password || formData.password !== formData.confirmPassword}
                                                className="bg-identity-sky text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl hover:bg-identity-navy disabled:opacity-20 transition-all flex items-center gap-3 group active:scale-95"
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={18} />}
                                                Finalize Registration
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <Link href="/login" className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-identity-sky transition-all border-b border-slate-200 pb-2">
                            Already Enrolled? Sign In to Terminal
                        </Link>
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-identity-navy/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center animate-fade-in">
                    <div className="max-w-md w-full">
                        <div className="w-28 h-28 bg-white/10 text-identity-sky rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-3xl">
                            <CheckCircle size={56} />
                        </div>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 font-outfit">Integrity Secured</h2>
                        <p className="text-slate-400 mb-12 font-medium uppercase text-[10px] tracking-widest leading-relaxed">Your biometric profile has been successfully <br /> committed to the LabFace Identity Core.</p>
                        <button onClick={() => window.location.href = '/login'} className="w-full bg-identity-sky text-white py-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:bg-white hover:text-identity-navy transition-all">
                            Enter Operations Terminal
                        </button>
                    </div>
                </div>
            )}

            <UpdateManager />
        </div>
    );
}
