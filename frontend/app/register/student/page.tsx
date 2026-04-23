"use client";
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, ShieldCheck, Camera, CheckCircle, ChevronLeft, BookOpen, Shield, FileText, ArrowRight, Upload, Loader2, AlertTriangle, ShieldAlert, AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import FaceEnrollmentScanner from '@/components/FaceEnrollmentScanner';
import UpdateManager from '@/components/UpdateManager';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';
import BackButton from '@/components/ui/BackButton';
import IdentityTheftModal from '@/components/modals/IdentityTheftModal';
import IdentityBackground from '@/components/IdentityBackground';

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

    // Identity Conflict States
    const [idAvailability, setIdAvailability] = useState<{ checked: boolean; available: boolean; canProceed: boolean; canReport: boolean; message: string }>({ checked: false, available: true, canProceed: true, canReport: false, message: '' });
    const [emailAvailability, setEmailAvailability] = useState<{ checked: boolean; available: boolean; canProceed: boolean; canReport: boolean; message: string }>({ checked: false, available: true, canProceed: true, canReport: false, message: '' });
    const [checkingId, setCheckingId] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [showTheftModal, setShowTheftModal] = useState(false);
    const [conflictId, setConflictId] = useState('');

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
        { id: 1, title: 'Personal Information', icon: User },
        { id: 2, title: 'Academic Credentials', icon: ShieldCheck },
        { id: 3, title: 'Legal Agreements', icon: FileText },
        { id: 4, title: 'Face Enrollment', icon: Camera },
        { id: 5, title: 'Account Security', icon: Lock },
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
            setIdAvailability(prev => ({ ...prev, checked: false }));
        }
        if (name === 'email') {
            setEmailAvailability(prev => ({ ...prev, checked: false }));
        }

        // Reset year level if course changes and current year exceeds max
        if (name === 'course') {
            const maxYear = value === 'DIT' ? 3 : 4;
            if (parseInt(formData.yearLevel) > maxYear) {
                setFormData(prev => ({ ...prev, course: value, yearLevel: '' }));
                return;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Real-time Availability Checks
    useEffect(() => {
        const checkId = async () => {
            if (formData.studentId.length !== 15) return;
            setCheckingId(true);
            try {
                const res = await axios.get(`${API_URL}/api/auth/check-availability`, {
                    params: { field: 'userId', value: formData.studentId, registeringAs: 'student' }
                });
                setIdAvailability({ checked: true, ...res.data });
            } catch (e) {
                console.error("ID check failed", e);
            } finally {
                setCheckingId(false);
            }
        };

        const timer = setTimeout(checkId, 800);
        return () => clearTimeout(timer);
    }, [formData.studentId]);

    useEffect(() => {
        const checkEmail = async () => {
            if (!formData.email.includes('@') || formData.email.length < 5) return;
            setCheckingEmail(true);
            try {
                const res = await axios.get(`${API_URL}/api/auth/check-availability`, {
                    params: { field: 'email', value: formData.email, registeringAs: 'student' }
                });
                setEmailAvailability({ checked: true, ...res.data });
            } catch (e) {
                console.error("Email check failed", e);
            } finally {
                setCheckingEmail(false);
            }
        };

        const timer = setTimeout(checkEmail, 800);
        return () => clearTimeout(timer);
    }, [formData.email]);

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
            // Ensure COR is base64 if it's still a File object
            let finalCOR = formData.certificateOfRegistration;
            if (finalCOR instanceof File) {
                finalCOR = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(finalCOR as File);
                });
            }

            await axios.post(`${API_URL}/api/auth/register/student`, {
                ...formData,
                certificateOfRegistration: finalCOR,
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
        <div className="min-h-screen bg-transparent font-outfit select-none relative overflow-hidden">
            <IdentityBackground />
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-12 relative z-10 w-full animate-in fade-in duration-1000">
                <div className="max-w-5xl mx-auto">
                    {/* Header HUD */}
                    <div className="text-center mb-12 md:mb-16 animate-in fade-in slide-in-from-top-10 duration-1000">
                        <h1 className="text-4xl md:text-7xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit leading-none mb-4">
                            Student Registration
                        </h1>
                        <div className="inline-flex items-center gap-3 py-2 px-6 bg-[#041C3C]/5 text-[#041C3C]/60 text-[9px] font-black uppercase tracking-[0.3em] rounded-full border border-[#041C3C]/10 font-outfit">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5CB4E4] animate-pulse" />
                            Identity Enrollment Portal
                        </div>
                    </div>

                    {/* Stepper HUD */}
                    <div className="mb-6 md:mb-10 flex items-center justify-between relative px-2 md:px-32 font-outfit">
                        <div className="absolute left-8 md:left-40 right-8 md:right-40 top-8 md:top-8 h-[4px] md:h-[3px] bg-slate-200/50 -z-10 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-[#5CB4E4] via-[#041C3C] to-[#041C3C] transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(4,28,60,0.4)]"
                                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                            />
                        </div>
                        {steps.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-4 md:gap-6 relative group">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] md:rounded-[1.2rem] flex items-center justify-center border-2 transition-all duration-700 relative ${step >= s.id
                                    ? 'bg-[#041C3C] border-[#041C3C] text-white shadow-[0_15px_30px_-5px_rgba(4,28,60,0.3)] scale-110 z-10'
                                    : 'bg-white/80 backdrop-blur-md border-slate-200 text-slate-300 transform scale-90'
                                    }`}>
                                    <s.icon size={step >= s.id ? 24 : 18} className={`${step === s.id ? 'animate-pulse' : ''} transition-all`} />
                                    {step > s.id && (
                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-[0.8rem] border-[3px] border-white shadow-xl animate-in zoom-in duration-500">
                                            <CheckCircle size={12} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 block ${step === s.id ? 'text-[#041C3C] opacity-100' : 'text-slate-300 opacity-60'}`}>
                                        <span className="md:hidden">S{s.id}</span>
                                        <span className="hidden md:block">{s.title}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/40 backdrop-blur-3xl rounded-2xl md:rounded-[2.5rem] border border-white/40 shadow-4xl p-5 md:p-10 relative overflow-hidden animate-in slide-in-from-bottom-10 duration-1000 z-20">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#5CB4E4]/5 via-transparent to-[#041C3C]/5 opacity-50" />
                        
                        <div className="relative z-10">
                            {step < 6 && (
                                <div className="mb-10 md:mb-14 flex items-center gap-6 md:gap-8 animate-in slide-in-from-left-10 duration-700">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#041C3C] text-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#041C3C]/20 shrink-0 border-4 border-white">
                                        <span className="text-2xl md:text-4xl font-black italic">0{step}</span>
                                    </div>
                                    <div className="space-y-1 md:space-y-2">
                                        <h2 className="text-2xl md:text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic font-outfit leading-tight">
                                            {steps[step - 1].title}
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1 w-12 bg-[#5CB4E4] rounded-full" />
                                            <p className="text-[9px] md:text-[10px] font-black text-[#5CB4E4] uppercase tracking-[0.3em] opacity-80">Phase {step} of {steps.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                                <form onSubmit={handleSubmit} className="space-y-8 md:space-y-12">
                                    {step === 1 && (
                                        <div className="space-y-8 md:space-y-10 animate-in fade-in duration-700">
                                            <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                                <div className="md:col-span-2 space-y-4">
                                                    <InputField
                                                        label="Student ID"
                                                        name="studentId"
                                                        value={formData.studentId}
                                                        onChange={handleInputChange}
                                                        placeholder="YYYY-NNNNN-XX-N"
                                                        maxLength={15}
                                                        isRequired
                                                        isValid={formData.studentId.length === 15 && idAvailability.available}
                                                        error={!idAvailability.canProceed ? idAvailability.message : ''}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                        rightElement={checkingId ? <Loader2 size={18} className="animate-spin text-[#5CB4E4]" /> : null}
                                                    />
                                                    {idAvailability.checked && !idAvailability.available && (
                                                        <div className={`flex items-center justify-between p-6 rounded-2xl border ${idAvailability.canProceed ? 'bg-sky-50/50 border-sky-100' : 'bg-rose-50/50 border-rose-100'} animate-in slide-in-from-top-2 duration-500`}>
                                                            <div className="flex items-center gap-4">
                                                                {idAvailability.canProceed ? <AlertCircle size={18} className="text-sky-500" /> : <ShieldAlert size={18} className="text-rose-500" />}
                                                                <p className={`text-[10px] font-black uppercase tracking-wider ${idAvailability.canProceed ? 'text-sky-700' : 'text-rose-700'}`}>
                                                                    {idAvailability.message}
                                                                </p>
                                                            </div>
                                                            {idAvailability.canReport && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setConflictId(formData.studentId); setShowTheftModal(true); }}
                                                                    className="px-6 py-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:bg-rose-600 active:scale-95 transition-all"
                                                                >
                                                                    Report Conflict
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
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
                                                    placeholder="Last Name"
                                                    isRequired
                                                    isValid={formData.lastName.length > 1}
                                                    className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-8 pt-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                <div className="md:col-span-3 space-y-4">
                                                    <InputField
                                                        label="University Email"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        placeholder="user@iskolarngbayan.pup.edu.ph"
                                                        isRequired
                                                        isValid={formData.email.includes('@') && formData.email.endsWith('.edu.ph') && emailAvailability.available}
                                                        error={!emailAvailability.available ? emailAvailability.message : (formData.email.includes('@') && !formData.email.endsWith('.edu.ph')) ? 'University email required (.edu.ph)' : ''}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                        rightElement={checkingEmail ? <Loader2 size={18} className="animate-spin text-[#5CB4E4]" /> : null}
                                                    />
                                                    {emailAvailability.checked && !emailAvailability.available && (
                                                        <div className={`flex items-center justify-between p-6 rounded-2xl border ${emailAvailability.canProceed ? 'bg-sky-50/50 border-sky-100' : 'bg-rose-50/50 border-rose-100'} animate-in slide-in-from-top-2 duration-500`}>
                                                            <div className="flex items-center gap-4">
                                                                {emailAvailability.canProceed ? <AlertCircle size={18} className="text-sky-500" /> : <ShieldAlert size={18} className="text-rose-500" />}
                                                                <p className={`text-[10px] font-black uppercase tracking-wider ${emailAvailability.canProceed ? 'text-sky-700' : 'text-rose-700'}`}>
                                                                    {emailAvailability.message}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-6">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">
                                                        Course <span className="text-rose-500 ml-1">*</span>
                                                    </label>
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
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">
                                                        Year Level <span className="text-rose-500 ml-1">*</span>
                                                    </label>
                                                    <select
                                                        name="yearLevel"
                                                        value={formData.yearLevel}
                                                        onChange={handleInputChange}
                                                        className="w-full h-20 px-8 rounded-3xl bg-white/60 backdrop-blur-sm border border-slate-100 transition-all outline-none text-[#041C3C] font-black text-[11px] uppercase tracking-[0.2em] focus:border-[#5CB4E4] focus:ring-4 focus:ring-[#5CB4E4]/10 shadow-sm font-outfit appearance-none cursor-pointer"
                                                    >
                                                        <option value="" disabled hidden>Select Year</option>
                                                        {(formData.course === 'DIT' ? [1, 2, 3] : [1, 2, 3, 4]).map(y => <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-6">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#041C3C] ml-4 block font-outfit italic opacity-50">
                                                        Section <span className="text-rose-500 ml-1">*</span>
                                                    </label>
                                                    <InputField
                                                        label=""
                                                        name="section"
                                                        value={formData.section}
                                                        onChange={handleInputChange}
                                                        placeholder="N-N"
                                                        isRequired={false}
                                                        isValid={formData.section.length > 0}
                                                        className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-3xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-10 border-t border-slate-100/50 gap-4">
                                            <Button
                                                type="button"
                                                onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                disabled={!formData.studentId || !formData.firstName || !formData.lastName || !formData.course || !formData.yearLevel || !idAvailability.canProceed || !emailAvailability.canProceed}
                                                size="xl"
                                                className="h-16 px-12 rounded-2xl bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-xl active:scale-95 transition-all duration-500 text-[11px] tracking-[0.3em] group"
                                            >
                                                Continue <ArrowRight size={18} className="ml-4 group-hover:translate-x-2 transition-transform duration-500" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 text-center">
                                        <div className="max-w-3xl mx-auto space-y-12">
                                            <div className="space-y-6 pt-2">
                                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] font-outfit opacity-60">Upload your Certificate of Registration</p>
                                            </div>

                                            <div className={`relative border-4 rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 transition-all duration-1000 overflow-hidden shadow-3xl group ${corVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-white/60 border-dashed border-slate-200 hover:border-[#5CB4E4] cursor-pointer'}`}>
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
                                                        <div className="w-24 h-24 md:w-32 md:h-32 bg-[#5CB4E4]/10 rounded-2xl md:rounded-[3rem] flex items-center justify-center text-[#5CB4E4] border border-[#5CB4E4]/20 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                                                            <Upload size={36} className="md:w-12 md:h-12" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-full h-[350px] md:h-[550px] rounded-[1.5rem] md:rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-3xl bg-white p-1 md:p-2">
                                                            {formData.certificateOfRegistration instanceof File && formData.certificateOfRegistration.type.startsWith('image/') ? (
                                                                <img src={corPreviewUrl} alt="COR Preview" className="w-full h-full object-contain rounded-[1rem] md:rounded-[3rem] bg-slate-50/50" />
                                                            ) : (
                                                                <div className="w-full h-full relative">
                                                                    {/* Desktop Iframe */}
                                                                    <iframe src={corPreviewUrl} className="hidden md:block w-full h-full rounded-[1rem] md:rounded-[3rem] border-none" title="COR PDF Preview" />
                                                                    
                                                                    {/* Mobile Fallback */}
                                                                    <div className="md:hidden w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
                                                                        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[#5CB4E4] border border-slate-100">
                                                                            <BookOpen size={40} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <p className="text-[11px] font-black text-[#041C3C] uppercase tracking-[0.3em] font-outfit">PDF Document Attached</p>
                                                                            <p className="text-[9px] text-slate-400 font-outfit uppercase tracking-widest">Mobile preview limited</p>
                                                                        </div>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => window.open(corPreviewUrl, '_blank')}
                                                                            className="w-full py-4 bg-[#041C3C] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
                                                                        >
                                                                            Open Document
                                                                        </button>
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
                                                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex flex-col items-center justify-center text-emerald-600 z-20 animate-in zoom-in-95 duration-700">
                                                                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-4xl mb-4 md:mb-10 animate-bounce border-4 border-emerald-500">
                                                                        <CheckCircle size={48} className="md:w-20 md:h-20 text-emerald-500" />
                                                                    </div>
                                                                    <span className="text-xl md:text-3xl font-black uppercase tracking-[0.4em] md:tracking-[0.6em] font-outfit italic bg-white/80 px-8 py-3 rounded-2xl shadow-xl">Verified</span>
                                                                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-4 md:mt-8 opacity-80 text-emerald-700 bg-white/40 px-4 py-1 rounded-full">Verification Complete</p>
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

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100/50 gap-6">
                                            <BackButton
                                                label="Previous"
                                                onClick={() => setStep(1)}
                                                className="group font-outfit"
                                            />

                                            {formData.certificateOfRegistration && !corVerified && (
                                                <Button
                                                    type="button"
                                                    onClick={verifyCOR}
                                                    isLoading={corVerifying}
                                                    className="h-16 px-12 rounded-2xl bg-[#041C3C] hover:bg-[#5CB4E4] text-white"
                                                >
                                                    Verify
                                                </Button>
                                            )}

                                            {corVerified && (
                                                <Button
                                                    type="button"
                                                    onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className="h-16 px-12 rounded-2xl bg-[#041C3C] hover:bg-[#5CB4E4] text-white animate-in zoom-in-95 group"
                                                >
                                                    Continue <ArrowRight size={18} className="ml-4 group-hover:translate-x-2 transition-transform duration-500" />
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
                                    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
                                        <div className="text-center space-y-2 mb-6">
                                            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] font-outfit opacity-60">Identity Matrix Reconstruction</p>
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
                                        <div className="flex justify-start pt-16 border-t border-slate-100/50 gap-4">
                                            <BackButton
                                                label="Previous"
                                                onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                className="group font-outfit"
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-16 animate-in slide-in-from-bottom-10 duration-1000">
                                        <div className="text-center space-y-6">
                                            <div className="w-32 h-32 bg-[#5CB4E4]/10 border border-[#5CB4E4]/20 rounded-[3rem] flex items-center justify-center mx-auto shadow-3xl text-[#5CB4E4]">
                                                <ShieldCheck size={56} className="animate-pulse" />
                                            </div>
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
                                                error={formData.confirmPassword && formData.confirmPassword !== formData.password ? "Passwords do not match" : ""}
                                                isValid={formData.confirmPassword.length >= 8 && formData.confirmPassword === formData.password}
                                                className="bg-white/60 backdrop-blur-sm border-slate-100 rounded-[2.5rem]"
                                            />
                                        </div>

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100/50 gap-6">
                                            <BackButton
                                                label="Previous"
                                                onClick={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                className="group font-outfit"
                                            />

                                            <Button
                                                type="submit"
                                                isLoading={loading}
                                                disabled={!formData.password || formData.password !== formData.confirmPassword}
                                                className="h-16 px-14 rounded-2xl bg-[#041C3C] hover:bg-[#5CB4E4] text-white shadow-xl active:scale-95 transition-all duration-700 text-[11px] tracking-[0.3em] group"
                                            >
                                                Create Account <Shield size={20} className="ml-4 group-hover:rotate-12 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="mt-16 text-center pb-20 opacity-60 flex items-center justify-center gap-2 font-outfit">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">Already have an account?</p>
                        <Link href="/login" className="text-[#5CB4E4] hover:text-[#041C3C] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500">
                            Sign In
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
                        <h2 className="text-3xl md:text-5xl font-black text-[#041C3C] uppercase tracking-tighter mb-6 font-outfit italic leading-tight">Registration Complete</h2>
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

            {showTheftModal && (
                <IdentityTheftModal
                    isOpen={showTheftModal}
                    onClose={() => setShowTheftModal(false)}
                    reportedUserId={conflictId}
                />
            )}

            <UpdateManager />
        </div>
    );
}
