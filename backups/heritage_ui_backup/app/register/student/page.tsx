"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import axios from 'axios';
import { User, Mail, Lock, ShieldCheck, Camera, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight, BookOpen, Check, RefreshCw, Edit2, Eye, EyeOff, Loader2, Shield, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, fetchCurrentUser } from '../../../utils/auth';
import ConsentStep, { CONSENT_VERSION } from '../../../components/ConsentStep';
import { useToast } from '../../../components/Toast';
import { API_URL } from '../../../utils/auth';
import FaceEnrollmentScanner from '../../../components/FaceEnrollmentScanner';
import UpdateManager from '../../../components/UpdateManager';

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
            localStorage.setItem('student_registration_progress', JSON.stringify({
                formData: { ...formData, password: '', confirmPassword: '' },
                step,
                captures,
                enrollmentCompleted: Object.keys(captures).length === 5
            }));
        }
    }, [formData, step, captures, isCheckingAuth]);

    const steps = [
        { id: 1, title: 'Identity', icon: User },
        { id: 2, title: 'Verify', icon: ShieldCheck },
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
        <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin text-primary mb-4" size={32} />
            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Initialising Heritage Secure...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-cream flex flex-col font-sans selection:bg-secondary selection:text-white">
            <Navbar />
            <div className="flex-grow container mx-auto px-6 pt-32 pb-20">
                <div className="max-w-4xl mx-auto">
                    {/* Stepper HUD: Heritage Style */}
                    <div className="mb-16 flex items-center justify-between relative px-4 md:px-14">
                        <div className="absolute left-10 md:left-24 right-10 md:right-24 top-6 h-[2px] bg-primary/5 -z-10">
                            <div className="h-full bg-secondary transition-all duration-1000" style={{ width: `${(step - 1) * 25}%` }} />
                        </div>
                        {steps.map(s => (
                            <div key={s.id} className="flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step >= s.id ? 'bg-coffee border-secondary text-brand-cream shadow-3xl' : 'bg-white border-primary/5 text-primary/20'}`}>
                                    <s.icon size={20} className={step === s.id ? 'animate-pulse' : ''} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] hidden md:block ${step >= s.id ? 'text-primary' : 'text-primary/20'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-4xl overflow-hidden border border-primary/5 group">
                        <div className="bg-coffee p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-5"></div>
                            <h1 className="relative z-10 text-4xl font-black text-brand-cream tracking-tighter uppercase mb-2">Heritage Registration</h1>
                            <p className="relative z-10 text-secondary/60 text-[10px] font-black tracking-[0.4em] uppercase">Student Identity Enrollment • PUP Mainframe 01</p>
                        </div>

                        <div className="p-8 md:p-16">
                            <form onSubmit={handleSubmit} className="space-y-10">
                                {step === 1 && (
                                    <div className="space-y-10 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="col-span-full">
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 mb-3 block ml-1">Identity Protocol (Institutional ID)</label>
                                                <input name="studentId" value={formData.studentId} onChange={handleInputChange} placeholder="YYYY-NNNNN-XX-N" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-black tracking-[0.2em] focus:border-secondary transition-all outline-none shadow-sm" maxLength={15} />
                                                {studentIdError && <p className="text-red-500 text-[9px] font-black uppercase mt-3 ml-1">{studentIdError}</p>}
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
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">University Communication Address</label>
                                                <input name="email" value={formData.email} onChange={handleInputChange} placeholder="iskolar@iskolarngbayan.pup.edu.ph" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Academic Program</label>
                                                <select name="course" value={formData.course} onChange={handleInputChange} className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm appearance-none cursor-pointer">
                                                    <option value="">SELECT PROGRAM</option>
                                                    <option value="BSIT">BS Information Technology</option>
                                                    <option value="DIT">Diploma in IT</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Registry Level</label>
                                                <select name="yearLevel" value={formData.yearLevel} onChange={handleInputChange} className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm appearance-none cursor-pointer">
                                                    <option value="">SELECT YEAR</option>
                                                    <option value="1">1ST YEAR</option>
                                                    <option value="2">2ND YEAR</option>
                                                    <option value="3">3RD YEAR</option>
                                                    <option value="4">4TH YEAR</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-10">
                                            <button type="button" onClick={() => setStep(2)} disabled={!formData.studentId || !formData.firstName || !formData.lastName} className="bg-coffee text-brand-cream px-12 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-3xl hover:bg-black disabled:opacity-30 transition-all flex items-center gap-3">
                                                Initialize Verification <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-10 animate-fade-in text-center">
                                        <div>
                                            <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-2">Registry Validation</h3>
                                            <p className="text-primary/40 text-[10px] uppercase font-bold tracking-widest">Upload your current Certificate of Registration (COR)</p>
                                        </div>

                                        <div className={`relative border-4 border-dashed rounded-[3rem] p-16 transition-all ${formData.certificateOfRegistration ? 'bg-secondary/5 border-secondary/20' : 'bg-primary/5 border-primary/5 hover:border-secondary/20'}`}>
                                            <input type="file" onChange={(e) => setFormData(prev => ({ ...prev, certificateOfRegistration: e.target.files?.[0] || '' }))} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="space-y-6">
                                                <div className="w-24 h-24 bg-coffee text-brand-cream rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                                                    <FileText size={40} />
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">
                                                    {typeof formData.certificateOfRegistration === 'string' ? "Select Document (PDF/JPG)" : (formData.certificateOfRegistration as File).name}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.certificateOfRegistration && !corVerified && (
                                            <button type="button" onClick={verifyCOR} className="w-full bg-secondary text-brand-cream p-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-primary transition-all shadow-xl">
                                                {corVerifying ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={20} />} Execute Neural OCR Sync
                                            </button>
                                        )}

                                        <div className="flex justify-between items-center pt-10">
                                            <button type="button" onClick={() => setStep(1)} className="text-primary/30 font-black uppercase text-[9px] tracking-widest hover:text-primary transition-all">
                                                « Correct Identity
                                            </button>
                                            {corVerified && (
                                                <button type="button" onClick={() => setStep(3)} className="bg-coffee text-brand-cream px-12 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-3xl hover:bg-black transition-all flex items-center gap-3">
                                                    Identity Consent <ChevronRight size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <ConsentStep 
                                        consentType="registration" 
                                        onAccept={() => { setStep(4); window.scrollTo(0,0); }} 
                                        onDecline={() => router.push('/login')} 
                                    />
                                )}

                                {step === 4 && (
                                    <div className="space-y-10 animate-fade-in">
                                        <FaceEnrollmentScanner 
                                            initialCaptures={captures}
                                            onComplete={(c) => { 
                                                setCaptures(c); 
                                                setStep(5); 
                                                showToast('Neural Pattern Secured', 'success'); 
                                            }} 
                                        />
                                        <div className="flex justify-start">
                                            <button type="button" onClick={() => setStep(3)} className="text-primary/30 font-black uppercase text-[9px] tracking-widest hover:text-primary transition-all">
                                                « Rewind Consent
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-2">Final Encryption</h3>
                                            <p className="text-primary/40 text-[10px] uppercase font-bold tracking-widest">Establish your high-security passphrase</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Secure Passphrase</label>
                                                <div className="relative">
                                                    <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-5 text-primary/20 hover:text-primary">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30 block ml-1">Confirm Identity Key</label>
                                                <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-white border-2 border-primary/5 rounded-3xl p-5 text-primary font-bold focus:border-secondary transition-all outline-none shadow-sm" />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={loading || !formData.password || formData.password !== formData.confirmPassword}
                                            className="w-full bg-coffee text-brand-cream py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-4xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20 mt-10"
                                        >
                                            {loading ? 'Committing to Mainframe...' : 'Commit Heritage Profile'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <Link href="/login" className="text-primary/40 text-[9px] font-black uppercase tracking-[0.3em] hover:text-secondary transition-all border-b border-primary/5 pb-1">
                            Existing Heritage Identity? Access Terminal
                        </Link>
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 bg-coffee/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center animate-fade-in">
                    <div className="max-w-md w-full">
                        <div className="w-28 h-28 bg-secondary/20 text-secondary rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-4xl shadow-secondary/20 border border-secondary/10">
                            <CheckCircle size={56} />
                        </div>
                        <h2 className="text-5xl font-black text-brand-cream uppercase tracking-tighter mb-4">Integrity Secured</h2>
                        <p className="text-brand-cream/40 mb-12 font-medium uppercase text-[10px] tracking-widest leading-relaxed">Your biometric profile has been successfully synchronized <br /> and committed to the LabFace Core.</p>
                        <button onClick={() => window.location.href = '/login'} className="w-full bg-brand-cream text-coffee py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-3xl hover:scale-105 transition-all">
                            Enter Operations Terminal
                        </button>
                    </div>
                </div>
            )}

            <UpdateManager />
        </div>
    );
}
