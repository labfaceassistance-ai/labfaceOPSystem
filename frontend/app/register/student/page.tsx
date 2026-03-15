"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import axios from 'axios';
import { User, Mail, Lock, ShieldCheck, Camera, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight, BookOpen, Check, RefreshCw, Edit2, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, getUser, fetchCurrentUser } from '../../../utils/auth';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { removeBackgroundHybrid } from '../../../lib/background-removal';
import ConsentStep, { CONSENT_VERSION } from '../../../components/ConsentStep';
import { useToast } from '../../../components/Toast';
import { API_URL } from '../../../utils/auth';
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
    const [currentAngle, setCurrentAngle] = useState<string>('front');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [certificateOfRegistration, setCertificateOfRegistration] = useState<string | null>(null);
    const [corError, setCorError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const profilePicInputRef = useRef<HTMLInputElement>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [studentIdError, setStudentIdError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emptyFields, setEmptyFields] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Consent state
    const [consentGiven, setConsentGiven] = useState(false);

    const [processingImage, setProcessingImage] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [corVerifying, setCorVerifying] = useState(false);
    const [corVerified, setCorVerified] = useState(false);
    const [corVerificationResult, setCorVerificationResult] = useState<any>(null);
    const [showCorPreview, setShowCorPreview] = useState(false);
    const [studentIdAvailable, setStudentIdAvailable] = useState(false);
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

    // Real-time validation for Student ID
    useEffect(() => {
        // Clear available status if empty or invalid length
        if (!formData.studentId || formData.studentId.length < 15) {
            setStudentIdAvailable(false);
            if (formData.studentId && formData.studentId.length > 0 && formData.studentId.length < 15) {
                setStudentIdError('Invalid format. Expected: YYYY-NNNNN-XX-N');
            } else {
                setStudentIdError('');
            }
            return;
        }

        // Don't validate if already checking
        if (isCheckingStudentId) {
            return;
        }

        // Debounce validation by 800ms
        const timeoutId = setTimeout(() => {
            const studentIdRegex = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;

            // Check if format is invalid
            if (!studentIdRegex.test(formData.studentId)) {
                setStudentIdAvailable(false);
                setStudentIdError('Invalid format. Expected: YYYY-NNNNN-XX-N');
                return;
            }

            // Check for dummy ID
            if (formData.studentId.startsWith('0000-00000')) {
                setStudentIdError('Invalid Student ID. Cannot use dummy ID 0000-00000.');
                setStudentIdAvailable(false);
                return;
            }

            // Clear any previous errors before checking
            setStudentIdError('');

            // Valid format, check availability
            checkUniqueness('userId', formData.studentId);
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [formData.studentId]);

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


    const angles = [
        { id: 'front', label: 'Front', instruction: 'Look directly at the camera' },
        { id: 'left', label: 'Left', instruction: 'Turn your head to the left' },
        { id: 'right', label: 'Right', instruction: 'Turn your head to the right' },
        { id: 'up', label: 'Up', instruction: 'Tilt your head upward' },
        { id: 'down', label: 'Down', instruction: 'Tilt your head downward' },
    ];

    const steps = [
        { id: 1, title: 'Personal Info', icon: User },
        { id: 2, title: 'Documents', icon: Upload },
        { id: 3, title: 'Consent', icon: ShieldCheck },
        { id: 4, title: 'Face Enrollment', icon: Camera },
        { id: 5, title: 'Security', icon: Lock },
    ];


    const formatStudentId = (value: string, inputType?: string) => {
        // Remove invalid chars but KEEP ALL hyphens for structure/positioning
        // Do NOT collapse hyphens or remove leading ones, as this shifts data (causing deletion)
        const raw = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

        // Split by user-provided hyphens to respect their intent 
        const parts = raw.split('-');

        const definitions = [
            { length: 4, regex: /^[0-9]*$/ },      // YYYY
            { length: 5, regex: /^[0-9]*$/ },      // NNNNN
            { length: 2, regex: /^[A-Z]*$/ },      // XX
            { length: 1, regex: /^[0-9]*$/ }       // N
        ];

        let result = '';
        let overflow = '';
        let lastSegmentFull = false;
        let processedSegments = 0;

        for (let i = 0; i < definitions.length; i++) {
            let segmentRaw = overflow + (parts[i] || '');
            if (!segmentRaw && i >= parts.length) break;

            const def = definitions[i];
            let segmentClean = '';
            let nextOverflow = '';

            let validCharsInSegment = 0;

            for (const char of segmentRaw) {
                if (segmentClean.length < def.length) {
                    if (def.regex.test(char)) {
                        segmentClean += char;
                        validCharsInSegment++;
                    } else {
                        // Context-Aware Overflow:
                        // 1. If segment is FULL: Always push (Standard preservation).
                        // 2. If segment has AT LEAST ONE valid char: Push (Preserve tail).
                        // 3. If DELETING: Always push (Safety Net). Never drop data during a delete op, even if it mismatches current empty slot.
                        //    This fixes the `2022---1` -> (del) -> `2022--1` -> `1` drops logic.
                        const isDeleting = inputType && inputType.includes('delete');

                        if (validCharsInSegment > 0 || isDeleting) {
                            nextOverflow += char;
                        }
                    }
                } else {
                    nextOverflow += char;
                }
            }
            // ALWAYS add separator if we are past the first segment, even if previous result was empty.
            // This ensures that if the first segment is deleted (-00305), the dash remains, anchoring the rest.
            if (i > 0) result += '-';
            result += segmentClean;

            overflow = nextOverflow;

            // Check if this specific segment is completely full
            if (segmentClean.length === def.length) {
                lastSegmentFull = true;
            } else {
                lastSegmentFull = false;
            }
            processedSegments++;
        }

        // Auto-append hyphen if:
        // 1. Not deleting (inputType doesn't contain 'delete')
        // 2. The last processed segment is full
        // 3. We are not at the very last segment (no hyphen after the N)
        const isDeleting = inputType && inputType.includes('delete');
        if (!isDeleting && lastSegmentFull && processedSegments < definitions.length) {
            result += '-';
        }

        return result;
    };

    const isDesktop = useMediaQuery('(min-width: 768px)');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value = e.target.value;
        const name = e.target.name;

        // Clear COR verification if any field that affects verification is changed
        if (['studentId', 'firstName', 'middleName', 'lastName', 'course', 'yearLevel'].includes(name)) {
            setCorVerified(false);
            setCorVerificationResult(null);
        }

        if (name === 'studentId') {
            setStudentIdError('');
            setStudentIdAvailable(false);
            // Cast nativeEvent to any to access inputType safely
            const inputType = (e.nativeEvent as any).inputType;
            const isDeleting = inputType && inputType.includes('delete');

            if (isDeleting) {
                // Rely on formatStudentId to handle structure. 
                // Middle dashes will be auto-restored by the formatter loop.
                // Trailing dashes will be deleted (allowing correction).
                // No manual slicing of 'before' characters.
            }

            value = formatStudentId(value, inputType);
        } else if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
            // Allow letters (English + Spanish), spaces, hyphens, apostrophes, periods (for suffixes), and numbers (for roman numerals/suffixes)
            value = value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9\s'.-]/g, '');
        } else if (name === 'email') {
            setEmailError('');
            setEmailAvailable(false);
        } else if (name === 'password') {
            setPasswordError('');
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'course' && value === 'Diploma in Information Technology' && formData.yearLevel === '4') {
            setFormData(prev => ({ ...prev, [name]: value, yearLevel: '1' }));
            return;
        }

        if (emptyFields.includes(name)) {
            setEmptyFields(prev => prev.filter(field => field !== name));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Block Deletion of Hyphens for Student ID to maintain structure
        if (e.currentTarget.name === 'studentId') {
            const target = e.currentTarget;
            const selectionStart = target.selectionStart;
            const selectionEnd = target.selectionEnd;
            const value = target.value;

            // Only block single character deletion (not range selections)
            if (selectionStart !== null && selectionStart === selectionEnd) {
                if (e.key === 'Backspace') {
                    // Cursor is AFTER the hyphen (indices 5, 11, 14)
                    // Block ONLY if there is data after the cursor (Structure Protection)
                    // If cursor is at the very end, allow deletion (Correction/Clearing)
                    if ((selectionStart === 5 || selectionStart === 11 || selectionStart === 14)
                        && value[selectionStart - 1] === '-'
                        && selectionStart < value.length) {
                        e.preventDefault();
                    }
                } else if (e.key === 'Delete') {
                    // Cursor is BEFORE the hyphen (indices 4, 10, 13)
                    // Block ONLY if there is data after the hyphen
                    if ((selectionStart === 4 || selectionStart === 10 || selectionStart === 13)
                        && value[selectionStart] === '-'
                        && selectionStart < value.length - 1) { // -1 because delete removes char at selectionStart
                        e.preventDefault();
                    }
                }
            }
        }
    };


    const verifyCOR = async () => {
        if (!formData.certificateOfRegistration) {
            showToast('Please upload your Certificate of Registration first');
            return;
        }

        setCorVerifying(true);
        setCorVerificationResult(null);

        try {

            // Convert file to base64
            let base64Data = '';
            if (typeof formData.certificateOfRegistration !== 'string') {
                base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(formData.certificateOfRegistration as File);
                });
            } else {
                base64Data = formData.certificateOfRegistration;
            }

            const response = await axios.post(`${API_URL}/api/auth/validate-cor`, {
                studentId: formData.studentId,
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                course: formData.course,
                yearLevel: parseInt(formData.yearLevel),
                certificateOfRegistration: base64Data
            });

            setCorVerificationResult(response.data);

            if (response.data.valid) {
                setCorVerified(true);

                // Auto-fill section if extracted and not already filled
                if (response.data.extractedSection && !formData.section) {
                    setFormData(prev => ({ ...prev, section: response.data.extractedSection }));
                }
            } else {
                setCorVerified(false);
                // Don't set general error - verification result box will show the details
            }
        } catch (err: any) {
            console.error('COR verification error:', err);
            setCorVerified(false);
            const reason = err.response?.data?.reason || err.response?.data?.message || err.message || 'Verification failed';
            setCorVerificationResult({ valid: false, reason });
            // Don't set general error - verification result box will show the details
        } finally {
            setCorVerifying(false);
        }
    };


    const currentUserIdRef = useRef(formData.studentId);

    useEffect(() => {
        currentUserIdRef.current = formData.studentId;
    }, [formData.studentId]);

    const checkUniqueness = async (field: 'userId' | 'email', value: string, skipDelay = false): Promise<boolean> => {
        if (!value) return true;

        // Race condition check for userId
        if (field === 'userId' && value !== currentUserIdRef.current) {
            return false;
        }

        if (field === 'userId') setIsCheckingStudentId(true);
        if (field === 'email') setIsCheckingEmail(true);

        if (!skipDelay) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Second race condition check
        if (field === 'userId' && value !== currentUserIdRef.current) {
            if (field === 'userId') setIsCheckingStudentId(false);
            return false;
        }

        try {
            const params: any = {
                field,
                value,
                registeringAs: 'student'
            };

            // When checking email, also pass the student ID so backend can check if it's the same user
            if (field === 'email' && formData.studentId) {
                params.userId = formData.studentId;
            }

            const response = await axios.get(`${API_URL}/api/auth/check-availability`, { params });

            // Final race condition check
            if (field === 'userId' && value !== currentUserIdRef.current) {
                setIsCheckingStudentId(false);
                return false;
            }

            if (field === 'userId') setIsCheckingStudentId(false);
            if (field === 'email') setIsCheckingEmail(false);

            // Check canProceed flag from backend
            if (!response.data.canProceed) {
                if (field === 'userId') {
                    setStudentIdError(response.data.message || 'Student ID is already registered');
                    setStudentIdAvailable(false);
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
                        setStudentIdError('');
                        setStudentIdAvailable(true);
                        // showToast(''); // Clear error, this is allowed
                    } else {
                        setStudentIdError('');
                        setStudentIdAvailable(true);
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
            if (field === 'userId') setIsCheckingStudentId(false);
            if (field === 'email') setIsCheckingEmail(false);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            if (field === 'userId') {
                setStudentIdError(`Unable to verify availability: ${msg}`);
                setStudentIdAvailable(false);
            }
            if (field === 'email') {
                setEmailError(`Unable to verify availability: ${msg}`);
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

    const handleStudentIdBlur = () => {
        if (formData.studentId.length > 0 && formData.studentId.length < 15) {
            setStudentIdError('Invalid format');
        } else if (formData.studentId) {
            checkUniqueness('userId', formData.studentId);
        }
    };

    const handlePasswordBlur = () => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (formData.password && !strongPasswordRegex.test(formData.password)) {
            setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        }
    };

    const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: mode
                }
            });

            setCameraActive(true);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("Error playing video:", e));
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            showToast("Could not access camera. Please allow permissions.");
        }
    };

    const toggleCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        if (cameraActive) {
            stopCamera();
            setTimeout(() => startCamera(newMode), 200);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const captureFromCamera = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) {
            showToast("Camera not ready. Please wait a moment.");
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            showToast("Failed to capture image.");
            return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Quality Validation
        try {
            setProcessingImage(true);
            setProcessingStatus('Checking quality...');
            const qualityRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://labface.site'}/api/auth/validate-face-quality`, { image: dataUrl });

            if (!qualityRes.data.valid) {
                showToast(qualityRes.data.error || "Image quality too poor (Dark/Blurry). Please retake.");
                setProcessingImage(false);
                return; // Stop processing
            }

            if (qualityRes.data.warning) {
                showToast("Warning: " + qualityRes.data.warning);
            }
        } catch (error) {
            console.error('Quality check failed:', error);
            // Optional: Fail open or warn? Let's warn but proceed if server error (to not block if AI down)
            // But if AI is down, registration fails anyway later.
        } finally {
            // setProcessingImage(false); // Keep true for background removal
        }

        // Process image with background removal
        setProcessingImage(true);

        try {
            const result = await removeBackgroundHybrid(
                dataUrl,
                (status) => setProcessingStatus(status)
            );

            setCaptures(prev => {
                const newCaptures = { ...prev, [currentAngle]: result.processedImage };
                return newCaptures;
            });

            setProcessingStatus(`Processed with ${result.method}`);
            setTimeout(() => setProcessingStatus(''), 2000);

            const nextAngleIndex = angles.findIndex(a => a.id === currentAngle) + 1;
            if (nextAngleIndex < angles.length && !captures[angles[nextAngleIndex].id]) {
                setCurrentAngle(angles[nextAngleIndex].id);
            }
        } catch (error) {
            console.error('Background removal failed:', error);
            // Use original image if processing fails
            setCaptures(prev => {
                const newCaptures = { ...prev, [currentAngle]: dataUrl };
                return newCaptures;
            });
            setProcessingStatus('Using original image');
            setTimeout(() => setProcessingStatus(''), 2000);
        } finally {
            setProcessingImage(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast("Please upload an image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;

            // Quality Validation
            try {
                setProcessingImage(true);
                setProcessingStatus('Checking quality...');
                const qualityRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://labface.site'}/api/auth/validate-face-quality`, { image: dataUrl });

                if (!qualityRes.data.valid) {
                    showToast(qualityRes.data.error || "Image quality too poor. Please choose another.");
                    setProcessingImage(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return; // Stop processing
                }

                if (qualityRes.data.warning) {
                    showToast("Warning: " + qualityRes.data.warning);
                }
            } catch (error) {
                console.error('Quality check failed:', error);
            }

            // Process image with background removal
            setProcessingImage(true);

            try {
                const result = await removeBackgroundHybrid(
                    dataUrl,
                    (status) => setProcessingStatus(status)
                );

                setCaptures(prev => {
                    const newCaptures = { ...prev, [currentAngle]: result.processedImage };
                    return newCaptures;
                });

                setProcessingStatus(`Processed with ${result.method}`);
                setTimeout(() => setProcessingStatus(''), 2000);

                const nextAngleIndex = angles.findIndex(a => a.id === currentAngle) + 1;
                if (nextAngleIndex < angles.length && !captures[angles[nextAngleIndex].id]) {
                    setCurrentAngle(angles[nextAngleIndex].id);
                }
            } catch (error) {
                console.error('Background removal failed:', error);
                // Use original image if processing fails
                setCaptures(prev => {
                    const newCaptures = { ...prev, [currentAngle]: dataUrl };
                    return newCaptures;
                });
                setProcessingStatus('Using original image');
                setTimeout(() => setProcessingStatus(''), 2000);
            } finally {
                setProcessingImage(false);
            }
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeCapture = (angle: string) => {
        setCaptures(prev => {
            const newCaptures = { ...prev };
            delete newCaptures[angle];
            return newCaptures;
        });
        setCurrentAngle(angle);
    };

    const handleNextStep1 = async () => {
        const newEmptyFields: string[] = [];
        if (!formData.studentId) newEmptyFields.push('studentId');
        if (!formData.firstName) newEmptyFields.push('firstName');
        // Middle Name is optional now
        if (!formData.lastName) newEmptyFields.push('lastName');
        if (!formData.email) newEmptyFields.push('email');
        if (!formData.course) newEmptyFields.push('course'); /* Course Required */
        if (!formData.yearLevel) newEmptyFields.push('yearLevel'); /* Year Level Required */

        if (newEmptyFields.length > 0) {
            setEmptyFields(newEmptyFields);
            showToast("Please fill in all personal information fields.");
            return;
        }

        const studentIdRegex = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;
        if (!studentIdRegex.test(formData.studentId)) {
            setStudentIdError('Invalid format');
            showToast("Invalid Student ID format. Expected: YYYY-NNNNN-XX-N");
            return;
        }

        if (formData.studentId.startsWith('0000-00000')) {
            setStudentIdError('Invalid format');
            showToast("Invalid Student ID. Cannot use dummy ID 0000-00000.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showToast("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        const [isStudentIdValid, isEmailValid] = await Promise.all([
            checkUniqueness('userId', formData.studentId, true),
            checkUniqueness('email', formData.email, true)
        ]);
        setLoading(false);

        if (!isStudentIdValid || !isEmailValid) {
            return;
        }

        setStep(2);
    };

    // Consent handlers
    const handleConsentAccept = () => {
        setConsentGiven(true);
        setStep(4);
        window.scrollTo(0, 0);
    };

    const handleConsentDecline = () => {
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

        setLoading(true);


        try {

            await axios.post(`${API_URL}/api/auth/register/student`, {
                studentId: formData.studentId,
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                email: formData.email,
                course: formData.course,
                yearLevel: parseInt(formData.yearLevel),
                section: formData.section || null,
                password: formData.password,
                facePhotos: captures,
                profilePicture: profilePicture,
                consentGiven: true,
                consentVersion: CONSENT_VERSION,
                consentText: 'Biometric data collection for attendance monitoring and identity verification'
            });


            setShowSuccess(true);

        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMsg = err instanceof Error ? (err as any).response?.data?.message || err.message : 'Registration failed.';

            // Show backend error message directly
            if (errorMsg.includes('already registered as student')) {
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
                userId: formData.studentId,
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
                <p className="mt-4 text-slate-400">Checking registration eligibility...</p>
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

            <div className="flex-grow container mx-auto px-4 pt-32 pb-12">
                <div className="max-w-4xl mx-auto">
                    {/* Step Indicator */}
                    <div className="mb-10 sticky top-20 z-40 bg-slate-950/95 backdrop-blur-sm py-4">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
                            <div
                                className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-brand-500 -z-10 transition-all duration-500 ease-in-out"
                                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>
                            {steps.map((s) => (
                                <div key={s.id} className={`flex flex-col items-center bg-slate-950 px-3 ${step >= s.id ? 'text-brand-400' : 'text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.id ? 'bg-brand-500 border-brand-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                                        <s.icon size={20} />
                                    </div>
                                    <span className="text-xs font-medium mt-2 text-center hidden sm:block">{s.title}</span>
                                    <span className="text-[10px] font-medium mt-1 text-center sm:hidden">{s.title.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl shadow-xl overflow-hidden border border-slate-800 backdrop-blur-sm">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white text-center border-b border-slate-800">
                            <h2 className="text-2xl font-bold">Student Registration</h2>
                            <p className="text-slate-300 text-sm mt-1">Join the LabFace system</p>
                        </div>

                        <div className="p-8">

                            {step === 3 ? (
                                <ConsentStep
                                    consentType="registration"
                                    onAccept={handleConsentAccept}
                                    onDecline={handleConsentDecline}
                                />
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {/* Step 1: Personal Info */}
                                    {step === 1 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm col-span-full">
                                                    <div className="p-2 bg-blue-500/20 rounded-full shrink-0">
                                                        <ShieldCheck size={20} />
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-bold block mb-0.5">Reference Your Certificate of Registration</span>
                                                        Make sure your inputted data is real and can be seen on your Certificate of Registration. Verification depends on this matching exactly.
                                                    </div>
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Student Number <span className="text-red-500">*</span></label>
                                                    <input
                                                        required
                                                        name="studentId"
                                                        value={formData.studentId}
                                                        placeholder="YYYY-NNNNN-XX-N"
                                                        className={`input-field w-full p-3 border ${emptyFields.includes('studentId') || studentIdError ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500`}
                                                        onChange={handleInputChange}
                                                        onKeyDown={handleKeyDown}
                                                        maxLength={15}
                                                    />
                                                    {studentIdError && (
                                                        <div>
                                                            <p className="text-red-400 text-xs mt-1">{studentIdError}</p>
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
                                                    {!studentIdError && studentIdAvailable && (
                                                        <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                                                            <CheckCircle size={14} /> Student ID is available
                                                        </p>
                                                    )}
                                                    {isCheckingStudentId && !studentIdError && !studentIdAvailable && (
                                                        <p className="mt-1 text-sm text-blue-400">Checking availability...</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name <span className="text-red-500">*</span></label>
                                                    <input name="firstName" value={formData.firstName} placeholder="First Name" required className={`input-field w-full p-3 border ${emptyFields.includes('firstName') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500`} onChange={handleInputChange} autoComplete="given-name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Middle Name <span className="text-slate-500">(Optional)</span></label>
                                                    <input name="middleName" value={formData.middleName} placeholder="Middle Name" className={`input-field w-full p-3 border ${emptyFields.includes('middleName') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500`} onChange={handleInputChange} autoComplete="additional-name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name <span className="text-red-500">*</span></label>
                                                    <input name="lastName" value={formData.lastName} placeholder="Last Name" required className={`input-field w-full p-3 border ${emptyFields.includes('lastName') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500`} onChange={handleInputChange} autoComplete="family-name" />
                                                </div>
                                                <div className="col-span-full">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            name="email"
                                                            value={formData.email}
                                                            type="email"
                                                            placeholder="student@iskolarngbayan.pup.edu.ph"
                                                            required
                                                            className={`input-field w-full pl-10 p-3 border ${emailError || emptyFields.includes('email') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg transition-all bg-slate-800 text-white placeholder-slate-500`}
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
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Course <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <BookOpen className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <select name="course" value={formData.course} className={`input-field w-full pl-10 p-3 border ${emptyFields.includes('course') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white`} onChange={handleInputChange}>
                                                            <option value="" disabled>Select Course</option>
                                                            <option value="Bachelor of Science in Information Technology">
                                                                {isDesktop ? "Bachelor of Science in Information Technology" : "BSIT (Bachelor of Science...)"}
                                                            </option>
                                                            <option value="Bachelor of Science in Office Administration">
                                                                {isDesktop ? "Bachelor of Science in Office Administration" : "BSOA (Bachelor of Science...)"}
                                                            </option>
                                                            <option value="Diploma in Information Technology">
                                                                {isDesktop ? "Diploma in Information Technology" : "DIT (Diploma in IT)"}
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Year Level <span className="text-red-500">*</span></label>
                                                    <select name="yearLevel" value={formData.yearLevel} className={`input-field w-full p-3 border ${emptyFields.includes('yearLevel') ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500'} rounded-lg focus:ring-2 transition-all bg-slate-800 text-white`} onChange={handleInputChange}>
                                                        <option value="" disabled>Select Year Level</option>
                                                        <option value="1">1st Year</option>
                                                        <option value="2">2nd Year</option>
                                                        <option value="3">3rd Year</option>
                                                        {formData.course !== 'Diploma in Information Technology' && <option value="4">4th Year</option>}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Section <span className="text-slate-500">(Optional)</span></label>
                                                    <input
                                                        name="section"
                                                        value={formData.section}
                                                        placeholder="1"
                                                        type="number"
                                                        min="1"
                                                        className="input-field w-full p-3 border border-slate-700 focus:outline-none focus:ring-brand-500 focus:border-brand-500 rounded-lg focus:ring-2 transition-all bg-slate-800 text-white placeholder-slate-500"
                                                        onChange={handleInputChange}
                                                    />
                                                    <p className="text-xs text-slate-500 mt-1">Leave blank if not specified on your COR</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleNextStep1}
                                                    disabled={loading}
                                                    className={`
                                                    ${formData.studentId &&
                                                            formData.firstName &&
                                                            formData.lastName &&
                                                            formData.email &&
                                                            formData.course &&
                                                            formData.yearLevel
                                                            ? 'bg-blue-600 hover:bg-blue-700 shadow-lg text-white'
                                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                        } 
                                                    px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                                                `}
                                                >
                                                    {loading ? 'Checking...' : 'Next Step'} <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Documents */}
                                    {step === 2 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm">
                                                <div className="p-2 bg-blue-500/20 rounded-full shrink-0">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <div className="text-sm">
                                                    <span className="font-bold block mb-0.5">Certificate of Registration (COR):</span>
                                                    Upload your Certificate of Registration to verify your enrollment. This document is required for validation.
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Upload Certificate of Registration</label>
                                                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-brand-500 transition-colors bg-slate-800">
                                                        {formData.certificateOfRegistration ? (
                                                            <div className="space-y-3">
                                                                <div className="relative">
                                                                    {/* File info with icons */}
                                                                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                                                                        <div className="flex items-center gap-3">
                                                                            <Upload size={20} className="text-green-400" />
                                                                            <div>
                                                                                <p className="text-sm font-medium text-slate-200">
                                                                                    {typeof formData.certificateOfRegistration === 'string'
                                                                                        ? 'Certificate of Registration'
                                                                                        : (formData.certificateOfRegistration as File).name}
                                                                                </p>
                                                                                <p className="text-xs text-slate-400">PDF Document</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {/* Eye icon to toggle preview */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowCorPreview(!showCorPreview)}
                                                                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-brand-400 hover:text-brand-300"
                                                                                title={showCorPreview ? "Hide preview" : "View preview"}
                                                                            >
                                                                                {showCorPreview ? <EyeOff size={20} /> : <Eye size={20} />}
                                                                            </button>
                                                                            {/* X icon to remove file */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, certificateOfRegistration: '' });
                                                                                    setCorVerified(false);
                                                                                    setCorVerificationResult(null);
                                                                                    setShowCorPreview(false);
                                                                                }}
                                                                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-red-400 hover:text-red-300"
                                                                                title="Remove file"
                                                                            >
                                                                                <X size={20} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Inline PDF preview */}
                                                                    {showCorPreview && formData.certificateOfRegistration && typeof formData.certificateOfRegistration !== 'string' && (
                                                                        <div className="mt-3 border border-slate-700 rounded-lg overflow-hidden">
                                                                            <iframe
                                                                                src={URL.createObjectURL(formData.certificateOfRegistration)}
                                                                                className="w-full h-96"
                                                                                title="COR Preview"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <Upload className="mx-auto text-slate-500" size={48} />
                                                                <div>
                                                                    <label htmlFor="cor-upload" className="cursor-pointer">
                                                                        <span className="text-brand-400 hover:text-brand-300 font-medium">Click to upload</span>
                                                                        <span className="text-slate-400"> or drag and drop</span>
                                                                    </label>
                                                                    <p className="text-xs text-slate-500 mt-1">PDF only, up to 10MB</p>
                                                                </div>
                                                                <input
                                                                    id="cor-upload"
                                                                    type="file"
                                                                    accept=".pdf,application/pdf"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            if (file.type !== 'application/pdf') {
                                                                                showToast('Please upload a PDF file');
                                                                                return;
                                                                            }
                                                                            if (file.size > 10 * 1024 * 1024) {
                                                                                showToast('File size must be less than 10MB');
                                                                                return;
                                                                            }
                                                                            setFormData({ ...formData, certificateOfRegistration: file });
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Verification Status */}
                                            {corVerificationResult && (
                                                <div className={`p-4 rounded-lg border ${corVerificationResult.valid ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                                                    <div className="flex items-start gap-3">
                                                        {corVerificationResult.valid ? (
                                                            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                                                        ) : (
                                                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className={`font-medium ${corVerificationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                                                                {corVerificationResult.valid ? 'COR Verified Successfully!' : 'COR Verification Failed'}
                                                            </p>
                                                            {!corVerificationResult.valid && (
                                                                <p className="text-sm text-slate-400 mt-1">{corVerificationResult.reason}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Verify Button */}
                                            {formData.certificateOfRegistration && !corVerified && (
                                                <button
                                                    type="button"
                                                    onClick={verifyCOR}
                                                    disabled={corVerifying}
                                                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {corVerifying ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" />
                                                            Verifying COR...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck size={18} />
                                                            Verify Certificate of Registration
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex justify-between pt-4">
                                                <button type="button" onClick={() => { setStep(1); showToast(''); }} className="text-slate-400 font-medium hover:text-slate-200 flex items-center gap-2">
                                                    <ChevronLeft size={18} /> Back
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!formData.certificateOfRegistration) {
                                                            showToast('Please upload your Certificate of Registration');
                                                            return;
                                                        }
                                                        if (!corVerified) {
                                                            showToast('Please verify your Certificate of Registration before proceeding');
                                                            return;
                                                        }
                                                        setStep(3);
                                                    }}
                                                    disabled={!corVerified}
                                                    className={`
                                                    ${corVerified
                                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
                                                    px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                                >
                                                    Next Step <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 4: Face Enrollment */}
                                    {step === 4 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <>
                                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm">
                                                    <div className="p-2 bg-blue-500/20 rounded-full shrink-0">
                                                        <Camera size={20} />
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-bold block mb-0.5">Instructions:</span>
                                                        <ul className="list-disc pl-5 space-y-0.5">
                                                            <li>Capture or upload photos for all 5 angles</li>
                                                            <li>Ensure good lighting and clear visibility</li>
                                                            <li>Remove glasses, hats, or masks</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Camera/Upload Section */}
                                                    <div className="space-y-4">
                                                        <div className="bg-slate-800 p-4 rounded-xl border-2 border-dashed border-slate-700">
                                                            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                                                                <Camera size={20} className="text-brand-400" />
                                                                Capture: {angles.find(a => a.id === currentAngle)?.label}
                                                            </h3>
                                                            <p className="text-sm text-slate-400 mb-4">{angles.find(a => a.id === currentAngle)?.instruction}</p>

                                                            {cameraActive ? (
                                                                <div className="space-y-3">
                                                                    <video
                                                                        ref={videoRef}
                                                                        autoPlay
                                                                        playsInline
                                                                        muted
                                                                        className="w-full aspect-square object-cover rounded-lg border-2 border-brand-500"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={captureFromCamera}
                                                                            className="flex-1 bg-brand-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                                                                        >
                                                                            <Camera size={18} />
                                                                            Capture Photo
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={stopCamera}
                                                                            className="px-4 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
                                                                        >
                                                                            <X size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    <div className="w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center">
                                                                        <Camera size={48} className="text-slate-600" />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startCamera()}
                                                                        className="w-full bg-brand-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        <Camera size={18} />
                                                                        Start Camera
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="relative mt-3">
                                                                <div className="absolute inset-0 flex items-center">
                                                                    <div className="w-full border-t border-slate-700"></div>
                                                                </div>
                                                                <div className="relative flex justify-center text-sm">
                                                                    <span className="px-2 bg-slate-800 text-slate-500">OR</span>
                                                                </div>
                                                            </div>

                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleFileUpload}
                                                                className="hidden"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="w-full mt-3 bg-slate-700 border-2 border-slate-600 text-slate-200 px-4 py-3 rounded-lg font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Upload size={18} />
                                                                Upload Photo
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Captured Photos Grid */}
                                                    <div className="space-y-4">
                                                        <h3 className="font-bold text-slate-200">Captured Photos ({Object.keys(captures).length}/5)</h3>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {angles.map((angle) => (
                                                                <div
                                                                    key={angle.id}
                                                                    className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${captures[angle.id]
                                                                        ? 'border-green-500'
                                                                        : currentAngle === angle.id
                                                                            ? 'border-brand-500 bg-brand-900/20'
                                                                            : 'border-slate-700 bg-slate-800'
                                                                        }`}
                                                                    onClick={() => setCurrentAngle(angle.id)}
                                                                >
                                                                    <div className="aspect-square">
                                                                        {captures[angle.id] ? (
                                                                            <>
                                                                                <img src={captures[angle.id]} alt={angle.label} className="w-full h-full object-cover" />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        removeCapture(angle.id);
                                                                                    }}
                                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                                <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 px-2 flex items-center gap-1">
                                                                                    <Check size={12} />
                                                                                    {angle.label}
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                                                                <User size={32} />
                                                                                <span className="text-xs mt-2 font-medium">{angle.label}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between pt-4">
                                                    <button type="button" onClick={() => { stopCamera(); setStep(2); showToast(''); }} className="text-slate-400 font-medium hover:text-slate-200 flex items-center gap-2">
                                                        <ChevronLeft size={18} /> Back
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { stopCamera(); setStep(5); showToast(''); }}
                                                        disabled={Object.keys(captures).length < 5}
                                                        className={`
                                                    ${Object.keys(captures).length >= 5
                                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
                                                    px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                                    >
                                                        Next Step <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </>

                                        </div>
                                    )}

                                    {/* Step 5: Security */}
                                    {step === 5 && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input name="password" value={formData.password} type={showPassword ? "text" : "password"} placeholder="••••••••" required className="input-field w-full pl-10 pr-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-800 text-white placeholder-slate-500" onChange={handleInputChange} onBlur={handlePasswordBlur} autoComplete="new-password" />
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
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input name="confirmPassword" value={formData.confirmPassword} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" required className="input-field w-full pl-10 pr-10 p-3 border border-slate-700 rounded-lg focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-800 text-white placeholder-slate-500" onChange={handleInputChange} autoComplete="new-password" />
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
                                                    className="mt-1 h-4 w-4 text-brand-600 focus:outline-none focus:ring-brand-500 border-slate-600 rounded bg-slate-700"
                                                />
                                                <label htmlFor="consent" className="text-xs text-slate-400">
                                                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 underline hover:text-blue-300">Terms and Conditions</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-400 underline hover:text-blue-300">Data Privacy Policy</button> of the university.
                                                </label>
                                            </div>

                                            <div className="flex justify-between pt-4">
                                                <button type="button" onClick={() => { setStep(4); showToast(''); }} className="text-slate-400 font-medium hover:text-slate-200 flex items-center gap-2">
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
                                                    {loading ? 'Registering...' : 'Create Account'} <ChevronRight size={20} />
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
                        <div className="bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative border border-slate-700">
                            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200">
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-bold text-brand-400 mb-4">Terms and Conditions</h3>
                            <div className="prose prose-sm text-slate-300 max-h-[60vh] overflow-y-auto">
                                <p className="mb-3"><strong>Polytechnic University of the Philippines - LabFace System</strong></p>
                                <p className="mb-3">By registering for an account, you agree to the following:</p>
                                <ul className="list-disc pl-5 space-y-2 mb-4">
                                    <li>You are a bona fide student of the Polytechnic University of the Philippines.</li>
                                    <li>The face data collected will be used strictly for automated attendance monitoring and identity verification within the laboratory premises.</li>
                                    <li>You will not attempt to spoof, bypass, or manipulate the facial recognition system.</li>
                                    <li>Any fraudulent activity detected will be reported to the university administration and may be subject to disciplinary actions as per the Student Handbook.</li>
                                </ul>
                                <p>By clicking &quot;I agree&quot; in the registration form, you certify that all information provided is accurate and true.</p>
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
                        <div className="bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative border border-slate-700">
                            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200">
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-bold text-brand-400 mb-4">Data Privacy Policy</h3>
                            <div className="prose prose-sm text-slate-300 max-h-[60vh] overflow-y-auto">
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
                        <div className="bg-slate-900 rounded-xl max-w-md w-full p-8 shadow-2xl animate-fade-in text-center border border-slate-700">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100 mb-2">Registration Successful</h3>
                            <p className="text-slate-400 mb-6">
                                Your account has been successfully created. You may now proceed to log in with your credentials.
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
