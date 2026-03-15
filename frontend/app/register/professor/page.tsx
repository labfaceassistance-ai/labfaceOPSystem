"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import DataPrivacyConsent from '../../../components/DataPrivacyConsent';
import TermsAndConditions from '../../../components/TermsAndConditions';
import axios from 'axios';
import { User, Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, X, CheckCircle, AlertCircle, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, getUser, fetchCurrentUser } from '../../../utils/auth';
import ConsentStep, { CONSENT_VERSION } from '../../../components/ConsentStep';
import { useToast } from '../../../components/Toast';
import { API_URL } from '../../../utils/auth';

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
    const [professorIdError, setProfessorIdError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emptyFields, setEmptyFields] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [isCheckingProfessorId, setIsCheckingProfessorId] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Consent state
    // Consent state
    // Removed modal state, now using step
    const [consentGiven, setConsentGiven] = useState(false);


    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const profilePicInputRef = useRef<HTMLInputElement>(null);
    const [professorIdAvailable, setProfessorIdAvailable] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState(false);
    const [consent, setConsent] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [canReport, setCanReport] = useState(false);
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportSuccess, setReportSuccess] = useState(false);
    const [reportSuccessMessage, setReportSuccessMessage] = useState('');
    const [reportError, setReportError] = useState('');

    useEffect(() => {
        const checkSession = async () => {
            const token = getToken();
            if (token) {
                const startTime = Date.now();
                try {
                    const user = await fetchCurrentUser();

                    const elapsedTime = Date.now() - startTime;
                    const minDelay = 800;
                    if (elapsedTime < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
                    }

                    if (user) {
                        const dashboardPath = user.role === 'professor' ? '/professor/dashboard'
                            : user.role === 'admin' ? '/admin/dashboard'
                                : '/student/dashboard';
                        router.replace(dashboardPath);
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

    // Real-time validation for Professor ID
    useEffect(() => {
        // Clear available status if empty or invalid length
        if (!formData.professorId || formData.professorId.length < 5) {
            setProfessorIdAvailable(false);
            return;
        }

        // Don't validate if already checking
        if (isCheckingProfessorId) {
            return;
        }

        const timeoutId = setTimeout(() => {
            const professorIdRegex = /^\d{5}$/;

            // Check if format is invalid (not exactly 5 digits)
            if (!professorIdRegex.test(formData.professorId)) {
                setProfessorIdAvailable(false);
                setProfessorIdError('Invalid format. Must be exactly 5 digits.');
                return;
            }

            // Check for dummy ID
            if (formData.professorId === '00000') {
                setProfessorIdError('Invalid Professor ID. Cannot be 00000.');
                setProfessorIdAvailable(false);
                return;
            }

            // Valid format, check availability
            checkUniqueness('userId', formData.professorId);
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [formData.professorId]);

    // Real-time validation for Email
    useEffect(() => {
        // Only validate if email is not empty
        if (!formData.email) {
            return;
        }

        // Don't validate if already checking or if there's already an error
        if (isCheckingEmail || emailError) {
            return;
        }

        // Debounce validation by 800ms
        const timeoutId = setTimeout(() => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(formData.email)) {
                checkUniqueness('email', formData.email);
            } else if (formData.email.length > 0) {
                setEmailError('Please enter a valid email address');
            }
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    // Real-time validation for Password
    useEffect(() => {
        // Only validate if password is not empty
        if (!formData.password) {
            setPasswordError('');
            return;
        }

        // Debounce validation by 500ms
        const timeoutId = setTimeout(() => {
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

            if (!strongPasswordRegex.test(formData.password)) {
                setPasswordError('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
            } else {
                setPasswordError('');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.password]);

    const steps = [
        { id: 1, title: 'Personal Info', icon: User },
        { id: 2, title: 'Consent', icon: ShieldCheck },
        { id: 3, title: 'Security', icon: Lock },
    ];


    const handleNextStep1 = async () => {
        const newEmptyFields: string[] = [];
        if (!formData.professorId) newEmptyFields.push('professorId');
        if (!formData.firstName) newEmptyFields.push('firstName');
        if (!formData.lastName) newEmptyFields.push('lastName');
        if (!formData.email) newEmptyFields.push('email');
        if (!profilePicture) newEmptyFields.push('profilePicture');

        if (newEmptyFields.length > 0) {
            setEmptyFields(newEmptyFields);
            showToast("Please fill in all required fields, including ID photo.");
            return;
        }

        // Validate Professor ID format (numeric only, exactly 5 digits)
        if (!/^\d{5}$/.test(formData.professorId) || formData.professorId === '00000') {
            setProfessorIdError('Invalid format');
            showToast("Invalid Professor ID. Must be exactly 5 digits and cannot be 00000.");
            return;
        }

        if (professorIdError) {
            showToast("Please fix the Professor ID error.");
            return;
        }

        // Validate Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showToast("Please enter a valid email address.");
            return;
        }

        // Check uniqueness before proceeding
        setLoading(true);
        const isProfessorIdValid = await checkUniqueness('userId', formData.professorId);
        const isEmailValid = await checkUniqueness('email', formData.email);
        setLoading(false);

        if (!isProfessorIdValid || !isEmailValid) {
            return;
        }

        setStep(2);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'professorId') {
            setProfessorIdError('');
            setProfessorIdAvailable(false);
        } else if (name === 'email') {
            setEmailError('');
            setEmailAvailable(false);
        } else if (name === 'password') {
            setPasswordError('');
        }

        if (emptyFields.includes(name)) {
            setEmptyFields(prev => prev.filter(field => field !== name));
        }

        // For name fields, apply the same regex validation as students
        if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
            value = value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9\s'.-]/g, '');
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const currentUserIdRef = useRef(formData.professorId);

    useEffect(() => {
        currentUserIdRef.current = formData.professorId;
    }, [formData.professorId]);

    const checkUniqueness = async (field: 'userId' | 'email', value: string): Promise<boolean> => {
        if (!value) return true;

        // Check if value matches current input to avoid race conditions
        if (field === 'userId' && value !== currentUserIdRef.current) {
            return false;
        }

        if (field === 'userId') setIsCheckingProfessorId(true);
        if (field === 'email') setIsCheckingEmail(true);

        // Add a small artificial delay to prevent UI glitching and allow user to finish typing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check again after delay
        if (field === 'userId' && value !== currentUserIdRef.current) {
            if (field === 'userId') setIsCheckingProfessorId(false);
            return false;
        }

        try {
            const params: any = {
                field,
                value,
                registeringAs: 'professor'
            };

            // When checking email, also pass the professor ID so backend can check if it's the same user
            if (field === 'email' && formData.professorId) {
                params.userId = formData.professorId;
            }

            const response = await axios.get(`${API_URL}/api/auth/check-availability`, { params });

            // final check before setting state
            if (field === 'userId' && value !== currentUserIdRef.current) {
                setIsCheckingProfessorId(false);
                return false;
            }

            if (field === 'userId') setIsCheckingProfessorId(false);
            if (field === 'email') setIsCheckingEmail(false);

            // Check canProceed flag from backend
            if (!response.data.canProceed) {
                if (field === 'userId') {
                    setProfessorIdError(response.data.message || 'Professor ID is already registered');
                    setProfessorIdAvailable(false);
                    setCanReport(response.data.canReport || false); // Capture canReport flag
                }
                if (field === 'email') {
                    setEmailError(response.data.message || 'Email is already registered');
                    setEmailAvailable(false);
                }
                return false;
            } else {
                // Can proceed (either available or multi-role allowed)
                if (field === 'userId') {
                    if (!response.data.available && response.data.message) {
                        // Show info message for multi-role
                        setProfessorIdError('');
                        setProfessorIdAvailable(true);
                        showToast(''); // Clear error, this is allowed
                    } else {
                        setProfessorIdError('');
                        setProfessorIdAvailable(true);
                    }
                }
                if (field === 'email') {
                    setEmailError('');
                    setEmailAvailable(true);
                }
                return true;
            }
        } catch (error) {
            console.error('Error checking uniqueness:', error);
            if (field === 'userId') setIsCheckingProfessorId(false);
            if (field === 'email') setIsCheckingEmail(false);
            if (field === 'userId') {
                setProfessorIdError('Unable to verify availability. Please check connection.');
                setProfessorIdAvailable(false);
            }
            if (field === 'email') {
                setEmailError('Unable to verify availability. Please check connection.');
                setEmailAvailable(false);
            }
            return false;
        }
    };

    const handleEmailBlur = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            setEmailError('Please enter a valid email address');
        } else if (formData.email) {
            checkUniqueness('email', formData.email);
        }
    };

    const handleProfessorIdBlur = () => {
        if (formData.professorId.length > 0 && formData.professorId.length < 5) {
            setProfessorIdError('Invalid format');
        } else if (formData.professorId) {
            checkUniqueness('userId', formData.professorId);
        }
    };

    const handlePasswordBlur = () => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (formData.password && !strongPasswordRegex.test(formData.password)) {
            setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        }
    };

    // Consent handlers
    const handleConsentAccept = () => {
        setConsentGiven(true);
        setStep(3);
        window.scrollTo(0, 0);
    };

    const handleConsentDecline = () => {
        alert('You must consent to biometric data collection to register. You will be redirected to the login page.');
        window.location.href = '/login';
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showToast("Passwords do not match");
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(formData.password)) {
            setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
            showToast("Please fix the password error.");
            return;
        }

        // Validate Professor ID format (numeric only, exactly 5 digits)
        if (!/^\d{5}$/.test(formData.professorId)) {
            showToast("Invalid Professor ID. Must be exactly 5 digits.");
            setLoading(false);
            return;
        }

        setLoading(true);

        try {

            await axios.post(`${API_URL}/api/auth/register/professor`, {
                professorId: formData.professorId,
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                idPhoto: profilePicture, // Send ID photo as base64
                consentGiven: true,
                consentVersion: CONSENT_VERSION,
                consentText: 'Biometric data collection for attendance monitoring and identity verification'
            });

            setShowSuccess(true);

        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMsg = err instanceof Error ? (err as any).response?.data?.message || err.message : 'Registration failed.';

            // Show backend error message directly
            if (errorMsg.includes('already registered as professor')) {
                setStep(1);
                showToast(errorMsg);
            } else if (errorMsg.includes('cannot register as')) {
                setStep(1);
                showToast(errorMsg);
            } else if (errorMsg.includes('Email already registered')) {
                setStep(1);
                showToast(errorMsg);
            } else {
                showToast(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async () => {
        if (!reporterName || !reporterEmail) {
            setReportError('Please fill in your name and email');
            return;
        }

        setReportError('');

        try {
            const response = await axios.post(`${API_URL}/api/auth/report-identity-theft`, {
                userId: formData.professorId,
                reporterEmail,
                reporterName,
                description: reportDescription
            });

            // Show success modal with message from backend
            setReportSuccessMessage(response.data.message);
            setReportSuccess(true);
            setShowReportModal(false);
            setReporterName('');
            setReporterEmail('');
            setReportDescription('');
        } catch (error: any) {
            console.error('Error submitting report:', error);
            const errorMsg = error.response?.data?.error || 'Failed to submit report. Please try again.';
            setReportError(errorMsg);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400">Verifying session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
            <Navbar />

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-slate-900/90 rounded-2xl p-8 shadow-2xl border border-slate-700 max-w-sm w-full mx-4">
                        <div className="flex flex-col items-center space-y-4">
                            {/* Spinner */}
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            {/* Text */}
                            <div className="text-center">
                                <h3 className="text-xl font-semibold text-white mb-1">Creating your account...</h3>
                                <p className="text-slate-400 text-sm">Please wait while we set up your profile</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Identity Theft Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl shadow-red-500/30 border-2 border-red-500 max-w-md w-full animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="p-2 bg-red-500/30 rounded-full ring-2 ring-red-500/50">
                                    <AlertCircle className="text-red-400" size={24} />
                                </div>
                                Report Identity Theft
                            </h3>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-red-200 font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-400" />
                                Security Alert
                            </p>
                            <p className="text-xs text-slate-200 mt-2">
                                If you did not register this account, please provide your information below. Our admin team will investigate and contact you via email.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Your Full Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Your Email Address <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={reporterEmail}
                                    onChange={(e) => setReporterEmail(e.target.value)}
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Additional Details (Optional)
                                </label>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
                                    rows={3}
                                    placeholder="Provide any additional information that might help with the investigation..."
                                />
                            </div>

                            {reportError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                                    {reportError}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitReport}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-bold shadow-xl hover:shadow-red-500/70 flex items-center justify-center gap-2 ring-2 ring-red-500/50 hover:ring-red-500"
                                >
                                    <AlertCircle size={18} />
                                    Submit Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Success Modal */}
            {reportSuccess && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border-2 border-green-500/50 max-w-md w-full animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-4 bg-green-500/20 rounded-full mb-4">
                                <CheckCircle className="text-green-500" size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">
                                Report Submitted
                            </h3>
                            <p className="text-slate-300 mb-6 leading-relaxed">
                                {reportSuccessMessage}
                            </p>
                            <button
                                onClick={() => setReportSuccess(false)}
                                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-green-500/50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow container mx-auto px-4 pt-32 pb-12 flex items-center justify-center">
                <div className="max-w-2xl w-full">
                    {/* Step Indicator */}
                    <div className="mb-10 sticky top-20 z-40 bg-slate-950/95 backdrop-blur-sm py-4">
                        <div className="flex items-center justify-between relative max-w-xs mx-auto">
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
                            <div
                                className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-brand-500 -z-10 transition-all duration-500 ease-in-out"
                                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>
                            {steps.map((s) => (
                                <div key={s.id} className={`flex flex-col items-center bg-slate-950 px-2 ${step >= s.id ? 'text-brand-400' : 'text-slate-600'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.id ? 'bg-brand-500 border-brand-500 text-white' : 'bg-slate-900 border-slate-700'}`}>
                                        <s.icon size={18} />
                                    </div>
                                    <span className="text-xs font-medium mt-2">{s.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl shadow-xl overflow-hidden border border-slate-800 backdrop-blur-sm">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-white text-center relative overflow-hidden border-b border-slate-800">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-2">Professor Registration</h2>
                                <p className="text-slate-300">Create your faculty account to manage classes</p>
                            </div>
                        </div>

                        <div className="p-8">
                            {step === 2 ? (
                                <ConsentStep
                                    consentType="registration"
                                    onAccept={handleConsentAccept}
                                    onDecline={handleConsentDecline}
                                />
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {step === 1 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="col-span-full">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Professor ID <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            name="professorId"
                                                            value={formData.professorId}
                                                            placeholder="12345"
                                                            required
                                                            className={`input-field w-full pl-10 p-3 border ${professorIdError || emptyFields.includes('professorId') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-all text-white bg-slate-800 placeholder-slate-500`}
                                                            onChange={handleInputChange}
                                                            onBlur={handleProfessorIdBlur}
                                                            maxLength={5}
                                                        />
                                                    </div>
                                                    {professorIdError && (
                                                        <div>
                                                            <p className="mt-1 text-sm text-red-400">{professorIdError}</p>
                                                            {canReport && (
                                                                <div className="mt-3 p-4 bg-red-500/20 border-2 border-red-500/60 rounded-lg shadow-lg shadow-red-500/20">
                                                                    <p className="text-sm text-red-200 mb-3 font-semibold flex items-center gap-2">
                                                                        <AlertCircle size={16} className="text-red-400" />
                                                                        If you didn't register this account, report it immediately
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowReportModal(true)}
                                                                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-bold shadow-xl hover:shadow-red-500/70 animate-pulse hover:animate-none ring-2 ring-red-500/50 hover:ring-red-500"
                                                                    >
                                                                        <AlertCircle size={20} className="animate-pulse" />
                                                                        Report Identity Theft
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!professorIdError && professorIdAvailable && (
                                                        <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                                                            <CheckCircle size={14} /> Professor ID is available
                                                        </p>
                                                    )}
                                                    {isCheckingProfessorId && !professorIdError && !professorIdAvailable && (
                                                        <p className="mt-1 text-sm text-blue-400">Checking availability...</p>
                                                    )}
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Professor ID Photo <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <div className="flex items-center justify-center w-full">
                                                            <label htmlFor="id-photo-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 ${emptyFields.includes('profilePicture') ? 'border-red-500 border-dashed' : 'border-slate-700 border-dashed'} rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors`}>
                                                                {profilePicture ? (
                                                                    <div className="relative w-full h-full p-2">
                                                                        <img src={profilePicture} alt="ID Preview" className="w-full h-full object-contain rounded" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setProfilePicture(null);
                                                                                if (profilePicInputRef.current) profilePicInputRef.current.value = '';
                                                                            }}
                                                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                        <Upload className={`w-8 h-8 mb-2 ${emptyFields.includes('profilePicture') ? 'text-red-400' : 'text-slate-400'}`} />
                                                                        <p className={`mb-1 text-sm ${emptyFields.includes('profilePicture') ? 'text-red-400' : 'text-slate-400'}`}><span className="font-semibold">Click to upload</span> Professor ID</p>
                                                                        <p className="text-xs text-slate-500">PNG, JPG or JPEG</p>
                                                                    </div>
                                                                )}
                                                                <input
                                                                    id="id-photo-upload"
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    ref={profilePicInputRef}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            if (file.size > 5 * 1024 * 1024) {
                                                                                showToast("File size too large. Max 5MB.");
                                                                                return;
                                                                            }
                                                                            const reader = new FileReader();
                                                                            reader.onloadend = () => {
                                                                                setProfilePicture(reader.result as string);
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <p className={`mt-1 text-xs ${emptyFields.includes('profilePicture') ? 'text-red-400' : 'text-slate-500'}`}>Please upload a clear photo of your University ID for verification.</p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name <span className="text-red-500">*</span></label>
                                                    <input name="firstName" value={formData.firstName} placeholder="First Name" required className={`input-field w-full p-3 border ${emptyFields.includes('firstName') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-all text-white bg-slate-800 placeholder-slate-500`} onChange={handleInputChange} autoComplete="given-name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Middle Name <span className="text-slate-500">(Optional)</span></label>
                                                    <input name="middleName" value={formData.middleName} placeholder="Middle Name" className={`input-field w-full p-3 border ${emptyFields.includes('middleName') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500`} onChange={handleInputChange} autoComplete="additional-name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name <span className="text-red-500">*</span></label>
                                                    <input name="lastName" value={formData.lastName} placeholder="Last Name" required className={`input-field w-full p-3 border ${emptyFields.includes('lastName') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-all text-white bg-slate-800 placeholder-slate-500`} onChange={handleInputChange} autoComplete="family-name" />
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            name="email"
                                                            value={formData.email}
                                                            type="email"
                                                            placeholder="professor@pup.edu.ph"
                                                            required
                                                            className={`input-field w-full pl-10 p-3 border ${emailError || emptyFields.includes('email') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-all text-white bg-slate-800 placeholder-slate-500`}
                                                            onChange={handleInputChange}
                                                            onBlur={handleEmailBlur}
                                                            autoComplete="email"
                                                        />
                                                    </div>
                                                    {emailError && (
                                                        <p className="mt-1 text-sm text-red-400">{emailError}</p>
                                                    )}
                                                    {!emailError && emailAvailable && (
                                                        <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                                                            <CheckCircle size={14} /> Email is available
                                                        </p>
                                                    )}
                                                    {isCheckingEmail && !emailError && !emailAvailable && (
                                                        <p className="mt-1 text-sm text-blue-400">Checking availability...</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleNextStep1}
                                                    className={`${formData.professorId &&
                                                        formData.firstName &&
                                                        formData.lastName &&
                                                        formData.email &&
                                                        profilePicture
                                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                        } text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2`}
                                                >
                                                    Next Step <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Security */}
                                    {/* Step 3: Security (Face Enrollment & Password) */}
                                    {step === 3 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="space-y-6">

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Password <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input name="password" value={formData.password} type={showPassword ? "text" : "password"} placeholder="••••••••" required className="input-field w-full pl-10 pr-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-white bg-slate-800 placeholder-slate-500" onChange={handleInputChange} onBlur={handlePasswordBlur} autoComplete="new-password" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                    {passwordError ? (
                                                        <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Must be at least 8 characters with uppercase, lowercase, number, and special char.
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input name="confirmPassword" value={formData.confirmPassword} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" required className="input-field w-full pl-10 pr-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-white bg-slate-800 placeholder-slate-500" onChange={handleInputChange} autoComplete="new-password" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                                                            <AlertCircle size={14} />
                                                            Passwords do not match
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    id="consent"
                                                    checked={consent}
                                                    onChange={(e) => setConsent(e.target.checked)}
                                                    className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-600 rounded bg-slate-700"
                                                />
                                                <label htmlFor="consent" className="text-xs text-slate-400">
                                                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 underline hover:text-blue-300">Terms and Conditions</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-400 underline hover:text-blue-300">Data Privacy Policy</button> of the university.
                                                </label>
                                            </div>

                                            <div className="flex justify-between pt-4">
                                                <button type="button" onClick={() => { setStep(1); showToast(''); }} className="text-gray-500 font-medium hover:text-gray-300 flex items-center gap-2">
                                                    <ChevronLeft size={18} /> Back
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={loading || !consent || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword || !!passwordError}
                                                    className={`
                                                    ${consent && formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && !passwordError
                                                            ? 'bg-blue-600 hover:bg-blue-700 shadow-lg text-white'
                                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
                                                    font-bold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2
                                                `}
                                                >
                                                    {loading ? 'Registering...' : 'Create Account'} <ArrowRight size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            )}

                            <div className="text-center mt-6">
                                <Link href="/login" className="text-brand-400 font-medium hover:underline">
                                    Already have an account? Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms Modal */}
            {
                showTerms && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
                            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-bold text-brand-900 mb-4">Terms and Conditions</h3>
                            <div className="prose prose-sm text-gray-600 max-h-[60vh] overflow-y-auto">
                                <p className="mb-3"><strong>Polytechnic University of the Philippines - LabFace System</strong></p>
                                <p className="mb-3">By registering for an account, you agree to the following:</p>
                                <ul className="list-disc pl-5 space-y-2 mb-4">
                                    <li>You are a bona fide faculty member of the Polytechnic University of the Philippines.</li>
                                    <li>The face data collected will be used strictly for automated attendance monitoring and identity verification within the laboratory premises.</li>
                                    <li>You will not attempt to spoof, bypass, or manipulate the facial recognition system.</li>
                                    <li>Any fraudulent activity detected will be reported to the university administration and may be subject to disciplinary actions as per the Faculty Manual.</li>
                                </ul>
                                <p>By clicking "I agree" in the registration form, you certify that all information provided is accurate and true.</p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setShowTerms(false)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Privacy Modal */}
            {
                showPrivacy && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
                            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-bold text-brand-900 mb-4">Data Privacy Policy</h3>
                            <div className="prose prose-sm text-gray-600 max-h-[60vh] overflow-y-auto">
                                <p className="mb-3"><strong>Compliance with Republic Act 10173 (Data Privacy Act of 2012)</strong></p>
                                <p className="mb-3">LabFace values your privacy and is committed to protecting your personal data. In accordance with the Data Privacy Act of 2012 of the Philippines:</p>
                                <ul className="list-disc pl-5 space-y-2 mb-4">
                                    <li><strong>Collection:</strong> We collect your personal details (Name, ID, Email) and biometric data (Facial Embeddings) solely for attendance verification.</li>
                                    <li><strong>Storage:</strong> Your data is stored securely in our encrypted database and is accessible only to authorized personnel.</li>
                                    <li><strong>Usage:</strong> Your information will not be shared with third parties without your explicit consent, unless required by law.</li>
                                    <li><strong>Rights:</strong> You have the right to access, correct, and request the deletion of your data, subject to university policies on record retention.</li>
                                </ul>
                                <p>By proceeding, you consent to the processing of your personal and sensitive personal information for the stated purpose.</p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setShowPrivacy(false)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Success Modal */}
            {
                showSuccess && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl animate-fade-in text-center">
                            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending</h3>
                            <p className="text-gray-600 mb-6">
                                Your account is under verification. Please wait for the admin to verify it.
                            </p>
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors shadow-lg"
                            >
                                Proceed to Login
                            </button>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
