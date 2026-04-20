"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { User, ShieldCheck, Camera, X, CheckCircle, ChevronLeft, BookOpen, Shield, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser, API_URL } from '@/utils/auth';
import ConsentStep, { CONSENT_VERSION } from '@/components/ConsentStep';
import { useToast } from '@/components/Toast';
import FaceEnrollmentScanner from '@/components/FaceEnrollmentScanner';
import UpdateManager from '@/components/UpdateManager';
import Button from '@/components/ui/Button';
import InputField from '@/components/ui/InputField';
import Skeleton from '@/components/ui/Skeleton';

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
                    showToast('Progress Restored', 'Welcome back! We have restored your registration progress.', 'info');
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
                showToast('Status Verified', 'Your academic credentials have been validated successfully.', 'success');
            } else {
                showToast('Verification Failed', response.data.reason || 'We could not validate your COR. Please check the details.', 'warning');
            }
        } catch (err: any) {
            showToast('Service Unavailable', 'Verification service is temporarily offline. Please try again later.', 'error');
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
            showToast('Registration Error', err.response?.data?.message || 'We encountered an error while creating your account.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mb-4" />
                <p className="text-identity-navy font-black uppercase text-[10px] tracking-[0.3em]">Protocols Initializing...</p>
            </div>
        </div>
    );

    return (
        <div className="w-full relative selection:bg-identity-sky/[0.15] page-transition">
            <Navbar />
            
            <div className="flex-grow container mx-auto px-6 pt-32 pb-20 relative z-10 w-full">
                <div className="max-w-4xl mx-auto">
                    {/* Stepper */}
                    <div className="mb-16 flex items-center justify-between relative px-4 md:px-14">
                        <div className="absolute left-10 md:left-24 right-10 md:right-24 top-6 h-[2px] bg-slate-100 -z-10 rounded-full overflow-hidden">
                            <div className="h-full bg-identity-sky transition-all duration-700" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }} />
                        </div>
                        {steps.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s.id ? 'bg-identity-sky border-identity-sky text-white shadow-lg scale-110' : 'bg-white border-slate-100 text-slate-300'}`}>
                                    <s.icon size={20} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] hidden md:block ${step >= s.id ? 'text-identity-navy' : 'text-slate-300'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>

                    <div className="w-full identity-glass rounded-[3rem] shadow-xl overflow-hidden border border-identity-sky/20 animate-fade-in relative z-20">
                        <div className="bg-identity-sky/5 p-12 text-center border-b border-identity-sky/10">
                            <h1 className="text-3xl md:text-5xl font-black text-identity-navy tracking-tighter uppercase mb-2 font-outfit">
                                Lab<span className="text-identity-sky">Face</span> Enrollment
                            </h1>
                            <p className="text-identity-sky text-[10px] font-black tracking-[0.4em] uppercase opacity-70">Student Identity Registry</p>
                        </div>

                        <div className="p-8 md:p-16">
                            <form onSubmit={handleSubmit} className="space-y-10">
                                {step === 1 && (
                                    <div className="space-y-10 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="col-span-full">
                                                <InputField
                                                    label="INSTITUTIONAL ID REFERENCE"
                                                    name="studentId"
                                                    value={formData.studentId}
                                                    onChange={handleInputChange}
                                                    placeholder="YYYY-NNNNN-XX-N"
                                                    maxLength={15}
                                                    isRequired
                                                    isValid={formData.studentId.length === 15}
                                                />
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
                                                    label="INSTITUTIONAL COMMUNICATION ADDRESS"
                                                    name="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="USER@LINK.PUP.EDU.PH"
                                                    isRequired
                                                    isValid={formData.email.endsWith('.edu.ph')}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-identity-navy/60 ml-2 block">ACADEMIC PROGRAM</label>
                                                <select name="course" value={formData.course} onChange={handleInputChange} className="w-full px-5 py-4 rounded-2xl bg-white/40 border-2 border-identity-sky/10 transition-all outline-none text-identity-navy font-bold text-sm focus:border-identity-sky">
                                                    <option value="" disabled hidden>--- SELECT PROGRAM ---</option>
                                                    <option value="BSIT">BS Information Technology</option>
                                                    <option value="DIT">Diploma in IT</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-identity-navy/60 ml-2 block">REGISTRY LEVEL</label>
                                                <select name="yearLevel" value={formData.yearLevel} onChange={handleInputChange} className="w-full px-5 py-4 rounded-2xl bg-white/40 border-2 border-identity-sky/10 transition-all outline-none text-identity-navy font-bold text-sm focus:border-identity-sky">
                                                    <option value="" disabled hidden>--- SELECT YEAR ---</option>
                                                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y}{y === 1 ? 'ST' : y === 2 ? 'ND' : y === 3 ? 'RD' : 'TH'} YEAR</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-12 border-t border-slate-100">
                                            <Button
                                                type="button"
                                                onClick={() => { setStep(2); window.scrollTo(0, 0); }}
                                                disabled={!formData.studentId || !formData.firstName || !formData.lastName || !formData.course || !formData.yearLevel}
                                                size="xl"
                                            >
                                                CONTINUE PROTOCOL <ArrowRight size={18} className="ml-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-12 animate-fade-in text-center">
                                        <div className="max-w-2xl mx-auto">
                                            <div className={`relative border-4 rounded-[4rem] p-12 transition-all duration-500 overflow-hidden ${corVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-dashed border-slate-100 hover:border-identity-sky/20'}`}>
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
                                                        <div className="w-24 h-24 bg-identity-sky/5 rounded-3xl flex items-center justify-center text-identity-sky border border-identity-sky/10">
                                                            <FileText size={32} />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-full h-80 rounded-[2.5rem] overflow-hidden border border-slate-100">
                                                            {formData.certificateOfRegistration instanceof File && formData.certificateOfRegistration.type.startsWith('image/') ? (
                                                                <img src={corPreviewUrl} alt="COR Preview" className="w-full h-full object-contain" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                                    <BookOpen size={48} className="text-slate-200" />
                                                                </div>
                                                            )}
                                                            
                                                            {corVerifying && (
                                                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                                                    <div className="w-10 h-10 border-4 border-identity-sky/20 border-t-identity-sky rounded-full animate-spin mb-4" />
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">ANALYZING...</span>
                                                                </div>
                                                            )}
                                                            {corVerified && (
                                                                <div className="absolute inset-0 bg-emerald-500/95 flex flex-col items-center justify-center text-white z-20">
                                                                    <CheckCircle size={56} className="mb-4" />
                                                                    <span className="text-sm font-black uppercase tracking-[0.4em]">VALIDATED</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-identity-navy">
                                                            {corPreviewUrl ? (formData.certificateOfRegistration as File).name : 'UPLOAD ENROLLMENT CREDENTIAL'}
                                                        </div>
                                                        <div className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">PDF, JPG, OR PNG (MAX 5MB)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                                            <button type="button" onClick={() => setStep(1)} className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center min-h-[44px]">
                                                <ChevronLeft size={16} className="mr-2" /> GO BACK
                                            </button>

                                            {formData.certificateOfRegistration && !corVerified && (
                                                <Button type="button" onClick={verifyCOR} isLoading={corVerifying} size="lg">
                                                    EXECUTE VALIDATION
                                                </Button>
                                            )}

                                            {corVerified && (
                                                <Button type="button" onClick={() => { setStep(3); window.scrollTo(0,0); }} size="lg">
                                                    CONTINUE PROTOCOL <ArrowRight size={18} className="ml-3" />
                                                </Button>
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
                                                showToast('Profile Secured', 'Your biometric profile has been successfully cached.', 'success');
                                                window.scrollTo(0, 0);
                                            }}
                                        />
                                        <div className="flex justify-start pt-8 border-t border-slate-100">
                                            <button type="button" onClick={() => { setStep(3); window.scrollTo(0,0); }} className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center min-h-[44px]">
                                                <ChevronLeft size={16} className="mr-2" /> GO BACK
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div className="text-center">
                                            <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter mb-2 font-outfit">Access Encryption</h3>
                                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">Establish your secure passkey</p>
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
                                                label="CONFIRM IDENTITY KEY"
                                                name="confirmPassword"
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                                isRequired
                                                isValid={formData.confirmPassword.length >= 8 && formData.confirmPassword === formData.password}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                                            <button type="button" onClick={() => { setStep(4); window.scrollTo(0,0); }} className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] hover:text-identity-navy transition-all flex items-center min-h-[44px]">
                                                <ChevronLeft size={16} className="mr-2" /> GO BACK
                                            </button>

                                            <Button
                                                type="submit"
                                                isLoading={loading}
                                                disabled={!formData.password || formData.password !== formData.confirmPassword}
                                                size="xl"
                                            >
                                                COMMIT REGISTRATION <Shield size={18} className="ml-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="mt-16 text-center pb-8">
                        <Link href="/login" className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] hover:text-identity-sky transition-all flex items-center justify-center min-h-[44px]">
                            ALREADY ENROLLED? SIGN IN TO TERMINAL
                        </Link>
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-fade-in">
                    <div className="max-w-md w-full bg-white p-12 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-slate-100 text-center">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-emerald-100 shadow-xl">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter mb-4 font-outfit">Integrity Secured</h2>
                        <p className="text-slate-600 mb-12 font-black uppercase text-[10px] tracking-[0.3em] leading-relaxed">Your identity protocol has been successfully <br /> committed to the LabFace Core.</p>
                        <Button onClick={() => window.location.href = '/login'} size="xl" className="w-full">
                            ENTER OPERATIONS TERMINAL
                        </Button>
                    </div>
                </div>
            )}

            <UpdateManager />
        </div>
    );
}
