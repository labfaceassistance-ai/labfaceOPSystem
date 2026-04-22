"use client";
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, ShieldCheck, Camera, CheckCircle, ChevronLeft, BookOpen, Shield, FileText, ArrowRight, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import FaceEnrollmentScanner from '@/components/FaceEnrollmentScanner';
import UpdateManager from '@/components/UpdateManager';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';

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
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [corPreviewUrl, setCorPreviewUrl] = useState<string | null>(null);

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
                    showToast('Progress Restored', 'Registration progress recovered.', 'info');
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
        { id: 1, title: 'Personal Details', icon: User },
        { id: 2, title: 'Academic Credentials', icon: ShieldCheck },
        { id: 3, title: 'Privacy Consent', icon: FileText },
        { id: 4, title: 'Biometric Enrollment', icon: Camera },
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
                showToast('Success', 'Academic credentials verified.', 'success');
            } else {
                showToast('Error', response.data.reason || 'Credentials could not be verified.', 'warning');
            }
        } catch (err: any) {
            showToast('Error', 'The verification server is currently unavailable.', 'error');
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
            showToast('Error', err.response?.data?.message || 'Failed to create student account.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin mb-6" />
                <p className="text-[#041C3C] font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="w-full relative selection:bg-identity-sky/[0.15] page-transition">
            <Navbar />
            
            <main className="flex-grow container mx-auto px-6 pt-40 pb-32 relative z-10 w-full animate-in fade-in duration-1000">
                <div className="max-w-5xl mx-auto">
                    {/* Stepper HUD */}
                    <div className="mb-16 flex items-center justify-between relative px-12 md:px-32 font-outfit">
                        <div className="absolute left-20 md:left-40 right-20 md:right-40 top-8 h-[3px] bg-slate-100/50 -z-10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-[#5CB4E4] to-[#041C3C] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(92,180,228,0.5)]" 
                                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }} 
                            />
                        </div>
                        {steps.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-4 relative">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all duration-700 relative ${
                                    step >= s.id 
                                    ? 'bg-[#041C3C] border-[#041C3C] text-white shadow-2xl scale-110' 
                                    : 'bg-white/60 backdrop-blur-md border-slate-100 text-slate-300 transform scale-90'
                                }`}>
                                    <s.icon size={20} className={step === s.id ? 'animate-pulse' : ''} />
                                    {step > s.id && (
                                        <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-[1rem] border-4 border-white shadow-2xl animate-in zoom-in">
                                            <CheckCircle size={14} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 hidden md:block ${step === s.id ? 'text-[#041C3C]' : 'text-slate-300'}`}>
                                    {s.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="w-full bg-white/40 backdrop-blur-xl rounded-[4rem] shadow-3xl overflow-hidden border border-slate-100/50 animate-in slide-in-from-bottom-10 duration-1000 relative z-20">
                        <div className="bg-gradient-to-b from-[#5CB4E4]/5 to-transparent p-16 text-center border-b border-slate-100/50">
                            <h1 className="text-4xl md:text-6xl font-black text-[#041C3C] tracking-tighter uppercase mb-4 font-outfit italic">
                                Student Registration
                            </h1>
                            <div className="inline-flex items-center gap-4 py-3 px-6 bg-[#041C3C] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-identity-navy/10 font-outfit">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-ping" />
                                Register for a new account
                            </div>
                        </div>

                        <div className="p-10 md:p-20">
                            <form onSubmit={handleSubmit} className="space-y-12">
                                {step === 1 && (
                                    <div className="space-y-12 animate-in fade-in duration-700">
                                        <div className="space-y-8">
                                            <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] font-outfit flex items-center gap-5 italic opacity-60 underline underline-offset-8 decoration-[#5CB4E4]/30">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full animate-pulse" />
                                                Personal Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label="Student ID"
                                                        name="studentId"
                                                        value={formData.studentId}
                                                        onChange={handleInputChange}
                                                        placeholder="YYYY-NNNNN-XX-N"
                                                        maxLength={15}
                                                        isRequired
                                                        isValid={formData.studentId.length === 15}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                    />
                                                </div>
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
                                                    placeholder="REQUIRED"
                                                    isRequired
                                                    isValid={formData.lastName.length > 1}
                                                    className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-8 pt-6">
                                            <h3 className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.4em] font-outfit flex items-center gap-5 italic opacity-60 underline underline-offset-8 decoration-[#5CB4E4]/30">
                                                <div className="w-2 h-2 bg-[#5CB4E4] rounded-full animate-pulse" />
                                                Academic Information
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                <div className="md:col-span-3">
                                                    <InputField
                                                        label="University Email"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        placeholder="user@link.pup.edu.ph"
                                                        isRequired
                                                        isValid={formData.email.endsWith('.edu.ph')}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                    />
                                                </div>
                                                <div className="space-y-6">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">Course</label>
                                                    <select 
                                                        name="course" 
                                                        value={formData.course} 
                                                        onChange={handleInputChange} 
                                                        className="w-full h-20 px-8 rounded-3xl bg-white/60 backdrop-blur-sm border border-slate-100 transition-all outline-none text-[#041C3C] font-black text-[11px] uppercase tracking-[0.2em] focus:border-[#5CB4E4] focus:ring-4 focus:ring-[#5CB4E4]/10 shadow-sm font-outfit appearance-none cursor-pointer"
                                                    >
                                                        <option value="" disabled hidden>Select Course</option>
                                                        <option value="BSIT">BS Information Technology</option>
                                                        <option value="DIT">Diploma in IT</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-6">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">Year Level</label>
                                                    <select 
                                                        name="yearLevel" 
                                                        value={formData.yearLevel} 
                                                        onChange={handleInputChange} 
                                                        className="w-full h-20 px-8 rounded-3xl bg-white/60 backdrop-blur-sm border border-slate-100 transition-all outline-none text-[#041C3C] font-black text-[11px] uppercase tracking-[0.2em] focus:border-[#5CB4E4] focus:ring-4 focus:ring-[#5CB4E4]/10 shadow-sm font-outfit appearance-none cursor-pointer"
                                                    >
                                                        <option value="" disabled hidden>Select Year</option>
                                                        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-6">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">Section</label>
                                                    <InputField
                                                        label=""
                                                        name="section"
                                                        value={formData.section}
                                                        onChange={handleInputChange}
                                                        placeholder="N-N"
                                                        isRequired
                                                        isValid={formData.section.length > 0}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-16 border-t border-slate-100/50">
                                            <Button
                                                type="button"
                                                onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                disabled={!formData.studentId || !formData.firstName || !formData.lastName || !formData.course || !formData.yearLevel}
                                                size="xl"
                                                className="h-20 px-16 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-2xl active:scale-95 transition-all duration-500 text-[12px] tracking-[0.4em] group"
                                            >
                                                Continue to Document Upload <ArrowRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 text-center">
                                        <div className="max-w-3xl mx-auto space-y-12">
                                            <div className="space-y-6">
                                                <h3 className="text-4xl md:text-5xl font-black text-[#041C3C] uppercase tracking-tighter font-outfit italic font-black">
                                                    Credential Verification
                                                </h3>
                                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] font-outfit opacity-60">Upload your Certificate of Registration</p>
                                            </div>

                                            <div className={`relative border-4 rounded-[4rem] p-16 transition-all duration-1000 overflow-hidden shadow-3xl group ${corVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-white/60 border-dashed border-slate-200 hover:border-[#5CB4E4] cursor-pointer'}`}>
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

                                                <div className="space-y-10 flex flex-col items-center justify-center relative">
                                                    {!corPreviewUrl ? (
                                                        <div className="w-32 h-32 bg-[#5CB4E4]/10 rounded-[3rem] flex items-center justify-center text-[#5CB4E4] border border-[#5CB4E4]/20 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                                                            <Upload size={48} />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-full h-[550px] rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-3xl bg-white p-2">
                                                            {formData.certificateOfRegistration instanceof File && formData.certificateOfRegistration.type.startsWith('image/') ? (
                                                                <img src={corPreviewUrl} alt="COR Preview" className="w-full h-full object-contain rounded-[3rem] bg-slate-50/50" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-8">
                                                                    <BookOpen size={80} className="text-[#5CB4E4]/40" />
                                                                    <div className="space-y-3">
                                                                        <span className="text-[12px] font-black text-[#041C3C] uppercase tracking-[0.4em] font-outfit">Document Secured</span>
                                                                        <p className="text-[9px] text-slate-400 font-outfit">File ready for analysis</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {corVerifying && (
                                                                <div className="absolute inset-0 bg-[#041C3C]/90 backdrop-blur-xl flex flex-col items-center justify-center z-20 animate-in fade-in duration-500">
                                                                    <div className="w-20 h-20 border-4 border-[#5CB4E4]/20 border-t-[#5CB4E4] rounded-full animate-spin mb-10 shadow-[0_0_30px_rgba(92,180,228,0.4)]" />
                                                                    <span className="text-[12px] font-black text-white uppercase tracking-[0.5em] font-outfit animate-pulse italic">Authenticating document...</span>
                                                                </div>
                                                            )}
                                                            {corVerified && (
                                                                <div className="absolute inset-0 bg-emerald-500/95 flex flex-col items-center justify-center text-white z-20 animate-in zoom-in-95 duration-700">
                                                                    <div className="bg-white p-8 rounded-[3rem] shadow-4xl mb-10 animate-bounce">
                                                                        <CheckCircle size={80} className="text-emerald-500" />
                                                                    </div>
                                                                    <span className="text-3xl font-black uppercase tracking-[0.6em] font-outfit italic">Verified</span>
                                                                    <div className="h-1 w-24 bg-white/30 rounded-full mt-6" />
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 opacity-80">Verification Complete</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        <div className="text-[12px] font-black uppercase tracking-[0.3em] text-[#041C3C] font-outfit italic">
                                                            {corPreviewUrl ? (formData.certificateOfRegistration as File).name : 'Upload Certificate of Registration'}
                                                        </div>
                                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5CB4E4] font-outfit opacity-60">Supported: PDF, JPG, PNG (Max 5MB)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-16 border-t border-slate-100/50">
                                            <button type="button" onClick={() => setStep(1)} className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-[#041C3C] transition-all flex items-center min-h-[48px] font-outfit group">
                                                <ChevronLeft size={20} className="mr-4 group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" /> Back to Personal Info
                                            </button>

                                            {formData.certificateOfRegistration && !corVerified && (
                                                <Button 
                                                    type="button" 
                                                    onClick={verifyCOR} 
                                                    isLoading={corVerifying}
                                                    className="h-20 px-16 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white"
                                                >
                                                    Verify Document
                                                </Button>
                                            )}

                                            {corVerified && (
                                                <Button 
                                                    type="button" 
                                                    onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className="h-20 px-16 rounded-[2.5rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white animate-in zoom-in-95 group"
                                                >
                                                    Continue to Consent <ArrowRight size={20} className="ml-5 group-hover:translate-x-2 transition-transform duration-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                        <ConsentStep
                                            consentType="registration"
                                            onAccept={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            onDecline={() => setStep(2)}
                                        />
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
                                        <div className="text-center space-y-4 mb-10">
                                            <h3 className="text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit">Face Enrollment</h3>
                                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] font-outfit opacity-60">Recording face captures for registration</p>
                                        </div>
                                        
                                        <FaceEnrollmentScanner
                                            initialCaptures={captures}
                                            onComplete={(c: Record<string, string>) => {
                                                setCaptures(c);
                                                setStep(5);
                                                showToast('Success', 'Face captures recorded successfully.', 'success');
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        />
                                        <div className="flex justify-start pt-16 border-t border-slate-100/50">
                                            <button 
                                                type="button" 
                                                onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                                className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-[#041C3C] transition-all flex items-center min-h-[48px] font-outfit group"
                                            >
                                                <ChevronLeft size={20} className="mr-4 group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" /> Back to Consent
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-16 animate-in slide-in-from-bottom-10 duration-1000">
                                        <div className="text-center space-y-6">
                                            <div className="w-32 h-32 bg-[#5CB4E4]/10 border border-[#5CB4E4]/20 rounded-[3rem] flex items-center justify-center mx-auto shadow-3xl text-[#5CB4E4]">
                                                <ShieldCheck size={56} className="animate-pulse" />
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

                                        <div className="flex justify-between items-center pt-20 border-t border-slate-100/50">
                                            <button 
                                                type="button" 
                                                onClick={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                                className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-[#041C3C] transition-all flex items-center min-h-[48px] font-outfit group"
                                            >
                                                <ChevronLeft size={20} className="mr-4 group-hover:-translate-x-2 transition-transform text-[#5CB4E4]" /> Back to Face Capture
                                            </button>

                                            <Button
                                                type="submit"
                                                isLoading={loading}
                                                disabled={!formData.password || formData.password !== formData.confirmPassword}
                                                className="h-24 px-20 rounded-[3rem] bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-4xl active:scale-95 transition-all duration-700 text-[13px] tracking-[0.5em] group"
                                            >
                                                Create Account <Shield size={24} className="ml-6 group-hover:rotate-12 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="mt-24 text-center pb-20 opacity-60">
                        <Link href="/login" className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] hover:text-[#041C3C] transition-all flex items-center justify-center min-h-[44px] font-outfit gap-6 group">
                            Already have an account? <span className="text-[#5CB4E4] group-hover:translate-x-2 transition-transform">Sign In</span>
                        </Link>
                    </div>
                </div>
            </main>

            {showSuccess && (
                <div className="fixed inset-0 bg-[#041C3C]/40 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-1000">
                    <div className="max-w-xl w-full bg-white p-20 rounded-[4.5rem] shadow-[0_50px_120px_-20px_rgba(0,0,0,0.3)] border border-slate-100 text-center animate-in zoom-in-95 duration-700">
                        <div className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto mb-12 border border-emerald-100 shadow-3xl animate-bounce">
                            <CheckCircle size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-[#041C3C] uppercase tracking-tighter mb-6 font-outfit italic">Registration Complete</h2>
                        <div className="h-1 w-20 bg-emerald-500/30 rounded-full mx-auto mb-10" />
                        <p className="text-slate-500 mb-16 font-black uppercase text-[11px] tracking-[0.3em] leading-relaxed">
                            Your student account has been<br />
                            successfully created.
                        </p>
                        <Button 
                            onClick={() => window.location.href = '/login'} 
                            className="w-full h-24 rounded-[3rem] bg-[#041C3C] hover:bg-emerald-500 text-white shadow-3xl"
                        >
                            Login Now
                        </Button>
                    </div>
                </div>
            )}

            <UpdateManager />
        </div>
    );
}
