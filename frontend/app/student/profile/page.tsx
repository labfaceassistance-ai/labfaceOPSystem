"use client";
import { useState, useEffect, useRef } from 'react';
import { getToken, getUser, API_URL, createAuthAxios, getProfilePictureUrl, logout, dataURLtoBlob, fetchCurrentUser } from '../../../utils/auth';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import { User, Mail, MapPin, Save, Camera, Lock, Shield, ShieldCheck, Image as ImageIcon, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, X, Upload, RefreshCw, Check, FileText, AlertTriangle, CheckCircle2, XCircle, Download, Trash2, Undo2, Edit, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import axios from 'axios';
import FaceEnrollmentScanner from '../../../components/FaceEnrollmentScanner';
import { useToast } from '../../../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserData {
    id: number;
    firstName: string;
    middleName?: string;
    lastName: string;
    email?: string;
    studentId?: string;
    schoolId?: string;
    course?: string;
    yearLevel?: string;
    section?: string;
    address?: string;
    profilePicture?: string;
    userId?: string;
    lastVerifiedPeriodId?: number;
}

interface FacePhoto {
    id: number;
    angle: string;
    photo_url: string;
}

export default function StudentProfile() {
    const { showToast } = useToast();
    const [user, setUser] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<UserData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'face' | 'privacy' | 'feedback'>('profile');

    // Consent state
    const [consentStatus, setConsentStatus] = useState<any>(null);
    const [consentHistory, setConsentHistory] = useState<any[]>([]);
    const [consentLoading, setConsentLoading] = useState(false);

    // Password State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Face Photos State
    const [facePhotos, setFacePhotos] = useState<FacePhoto[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [currentAngle, setCurrentAngle] = useState('Front');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    // UI Message State
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isEditingFaceData, setIsEditingFaceData] = useState(false);
    const [newFacePhotos, setNewFacePhotos] = useState<Record<string, string>>({});
    const [isTraining, setIsTraining] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Academic Settings State
    const [academicSettings, setAcademicSettings] = useState<{ id: number; schoolYear: string; semester: string } | null>(null);
    const [academicForm, setAcademicForm] = useState<{ course: string; yearLevel: string; corFile: File | null; corPreview: string | null }>({
        course: '',
        yearLevel: '',
        corFile: null,
        corPreview: null
    });
    const [isSubmittingAcademic, setIsSubmittingAcademic] = useState(false);
    const [corVerifying, setCorVerifying] = useState(false);
    const [corVerified, setCorVerified] = useState(false);
    const [corVerificationResult, setCorVerificationResult] = useState<any>(null);

    useEffect(() => {
        // Clear deleted IDs when face photos list is refreshed from server
        // This handles cases where we hard refresh data
        setDeletedPhotoIds([]);
    }, [facePhotos]);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        if (type === 'success') {
            setTimeout(() => setMessage(null), 5000);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                logout();
                return;
            }

            try {
                const authAxios = createAuthAxios();
                const response = await authAxios.get(`${API_URL}/api/auth/me`);

                const userData = response.data;

                // Role Guard: Ensure user is a student in this session
                if (userData.role !== 'student') {
                    console.warn(`[RoleGuard] Access denied for role: ${userData.role}. Redirecting to appropriate workspace.`);
                    if (userData.role === 'professor') window.location.href = '/professor/dashboard';
                    else if (userData.role === 'admin') window.location.href = '/admin/dashboard';
                    else window.location.href = '/login';
                    return;
                }

                setUser(userData);
                setFormData(userData);

                // Update storage (respecting where the user is currently stored)
                if (sessionStorage.getItem('token')) {
                    sessionStorage.setItem('user', JSON.stringify(userData));
                }
                if (localStorage.getItem('token')) {
                    localStorage.setItem('user', JSON.stringify(userData));
                }

                // Fetch face photos and consent data
                fetchFacePhotos(userData.id);
                if (userData.userId) {
                    fetchConsentData(userData.userId);
                }
            } catch (error: any) {
                console.error('Failed to fetch user data:', error);

                // If token is invalid, redirect to login
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                    return;
                }

                // Fallback to stored user data if API fails
                const storedUser = getUser();
                if (storedUser) {
                    console.log('Using cached user data');
                    setUser(storedUser);
                    setFormData(storedUser);
                    // Update academic form with current data
                    setAcademicForm(prev => ({
                        ...prev,
                        course: storedUser.course || '',
                        yearLevel: storedUser.yearLevel || ''
                    }));
                    fetchFacePhotos(storedUser.id);
                } else {
                    logout();
                }
            }
        };

        fetchUserData();

        // Handle direct tab access from URL
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'academic') {
            setActiveTab('profile'); // The academic update is currently in the profile tab
            // In the future we might want a dedicated 'academic' tab, 
            // but for now we'll ensure the academic alert is visible.
        }

        // Enumerate devices initially
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(device => device.kind === 'videoinput');
                setVideoDevices(videoInputs);
                if (videoInputs.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoInputs[0].deviceId);
                }
            } catch (err) {
                console.error("Error enumerating devices:", err);
            }
        };
        getDevices();

        // Fetch Academic Settings
        const fetchAcademicSettings = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/users/academic-settings`);
                setAcademicSettings(res.data);
            } catch (error) {
                console.error("Failed to fetch academic settings", error);
            }
        };
        fetchAcademicSettings();
    }, []);

    const profileTabs: ('profile' | 'face' | 'security' | 'privacy' | 'feedback')[] =
        ['profile', 'face', 'security', 'privacy', 'feedback'];

    const handleTabChange = (tab: 'profile' | 'face' | 'security' | 'privacy' | 'feedback') => {
        setActiveTab(tab);
        setIsEditing(false);
    };

    // useSwipe removed — hook deleted in Phase 2 cleanup; tab buttons remain fully functional

    const fetchLatestUserData = async (userId: number) => {
        try {
            const res = await axios.get(`${API_URL}/api/users/profile/${userId}`);
            setUser(prev => ({ ...prev, ...res.data }));
            setFormData(prev => ({ ...prev, ...res.data }));
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                localStorage.setItem('user', JSON.stringify({ ...parsed, ...res.data }));
            }
        } catch (error) {
            console.error("Failed to fetch latest user data", error);
        }
    };

    const fetchFacePhotos = async (userId: number) => {
        try {
            const res = await axios.get(`${API_URL}/api/users/profile/${userId}/face-photos`);
            setFacePhotos(res.data);
        } catch (error) {
            console.error("Failed to fetch face photos", error);
        }
    };

    const fetchConsentData = async (userId: string) => {
        try {
            setConsentLoading(true);

            const [statusRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/api/consent/status/${userId}`),
                axios.get(`${API_URL}/api/consent/history/${userId}`)
            ]);

            setConsentStatus(statusRes.data);
            setConsentHistory(historyRes.data.history || []);
        } catch (error) {
            console.error("Failed to fetch consent data", error);
        } finally {
            setConsentLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (formData) {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (formData && user) {
            try {
                await axios.put(`${API_URL}/api/users/profile/${user.id}`, formData);
                setUser(formData);
                localStorage.setItem('user', JSON.stringify(formData));
                setIsEditing(false);
                showMessage("Profile updated successfully!", 'success');
            } catch (error) {
                console.error("Failed to update profile", error);
                showMessage("Failed to update profile. Please try again.", 'error');
            }
        }
    };

    // ... (handleChangePassword stays same)

    const handleCorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isPdf = file.type === 'application/pdf';
            setAcademicForm({
                ...academicForm,
                corFile: file,
                corPreview: isPdf ? null : URL.createObjectURL(file)
            });
        }
    };

    const verifyCOR = async () => {
        if (!academicForm.corFile || !user) {
            showMessage('Please upload your Certificate of Registration first', 'error');
            return;
        }

        setCorVerifying(true);
        setCorVerificationResult(null);

        try {
            // Convert file to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(academicForm.corFile as File);
            });

            const response = await axios.post(`${API_URL}/api/auth/validate-cor`, {
                studentId: user.studentId || user.userId,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                course: academicForm.course,
                yearLevel: parseInt(academicForm.yearLevel),
                certificateOfRegistration: base64Data
            });

            setCorVerificationResult(response.data);

            if (response.data.valid) {
                setCorVerified(true);
                showMessage('COR Verified Successfully!', 'success');
            } else {
                setCorVerified(false);
                showMessage(response.data.reason || 'Verification failed', 'error');
            }
        } catch (err: any) {
            console.error('COR verification error:', err);
            setCorVerified(false);
            const reason = err.response?.data?.reason || err.response?.data?.message || err.message || 'Verification failed';
            setCorVerificationResult({ valid: false, reason });
            showMessage(reason, 'error');
        } finally {
            setCorVerifying(false);
        }
    };

    const handleAcademicUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !academicForm.corFile) return;
        if (!corVerified) {
            showMessage('Please verify your Certificate of Registration first.', 'error');
            return;
        }

        setIsSubmittingAcademic(true);
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(academicForm.corFile);
            reader.onload = async () => {
                const base64File = reader.result as string;

                try {
                    const response = await axios.post(`${API_URL}/api/student/update-academic-data`, {
                        userId: user.userId, // Send user_id string for verification service
                        studentId: user.id.toString(), // Send PK just in case
                        course: academicForm.course,
                        yearLevel: academicForm.yearLevel,
                        corFile: base64File
                    });

                    showMessage(response.data.message, 'success');

                    // Update local user state
                    const updatedUser = {
                        ...user,
                        course: academicForm.course,
                        yearLevel: academicForm.yearLevel,
                        lastVerifiedPeriodId: response.data.verifiedPeriodId
                    };
                    setUser(updatedUser);
                    setFormData(updatedUser);

                    // Update cache in both storages
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));

                    // Reset verification state
                    setCorVerified(false);
                    setCorVerificationResult(null);

                    // Clear form
                    setAcademicForm({ course: '', yearLevel: '', corFile: null, corPreview: null });

                } catch (error: any) {
                    console.error("Academic update failed:", error);
                    const errorMsg = error.response?.data?.message || "Failed to update academic information.";
                    const details = error.response?.data?.details;
                    showMessage(details ? `${errorMsg}: ${details}` : errorMsg, 'error');
                } finally {
                    setIsSubmittingAcademic(false);
                }
            };
        } catch (error) {
            console.error("File reading error:", error);
            setIsSubmittingAcademic(false);
            showMessage("Failed to process file.", 'error');
        }
    };

    const startCamera = async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            const constraints: MediaStreamConstraints = {
                video: {
                    ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: facingMode }),
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setCameraActive(true);
            setIsVideoReady(false);

            // Wait for the video element to be mounted
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    // Wait for video to have actual dimensions
                    const checkVideoReady = setInterval(() => {
                        if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                            console.log('✅ Video dimensions detected:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                            // Add a small safety delay for frames to actually start rendering
                            setTimeout(() => {
                                console.log('✅ Video stream stabilized and ready');
                                setIsVideoReady(true);
                            }, 200);
                            clearInterval(checkVideoReady);
                        }
                    }, 100);

                    videoRef.current.play().catch(e => console.error("Error playing video:", e));
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            showMessage("Could not access camera. Please ensure you have granted permission.", 'error');
        }
    };

    // Effect to handle camera switch when selection changes (if camera is already running)
    useEffect(() => {
        if (cameraActive && selectedDeviceId) {
            startCamera();
        }
    }, [selectedDeviceId]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
        setIsVideoReady(false);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        if (cameraActive) {
            stopCamera();
            setTimeout(startCamera, 100);
        }
    };

    const captureFromCamera = async () => {
        if (!videoRef.current || !isVideoReady) {
            showMessage("Camera is not ready yet. Please wait a moment.", 'error');
            return;
        }
        if (!user) return;

        setIsCapturing(true);

        // Debug logging
        console.log('📸 Capturing from video:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
            paused: videoRef.current.paused
        });

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        if (canvas.width === 0 || canvas.height === 0) {
            console.error('❌ Canvas has zero dimensions!');
            showMessage("Video not ready. Please wait and try again.", 'error');
            setIsCapturing(false);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            console.log('✅ Drew image to canvas:', canvas.width, 'x', canvas.height);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    console.log(`[DEBUG] Blob Created: size=${blob.size}, type=${blob.type}`);
                    if (blob.size === 0) {
                        console.error('❌ Created blob is 0 bytes!');
                        showMessage("Failed to capture image: Data is empty.", 'error');
                        setIsCapturing(false);
                        return;
                    }
                    const formData = new FormData();
                    formData.append('facePhoto', blob, `${currentAngle}.jpg`);
                    formData.append('angle', currentAngle);
                    // Skip automatic training in edit mode
                    formData.append('skipTraining', 'true');

                    try {
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                        const url = `${API_URL}/api/users/profile/${user.id}/upload-face-photo`;
                        console.log(`[DEBUG] Attempting upload to: ${url}`);
                        const response = await axios.post(url, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        console.log('[DEBUG] Upload Success response:', response.data);

                        fetchFacePhotos(user.id);
                        // Auto-advance to next angle
                        const angles = ['Front', 'Left', 'Right', 'Up', 'Down'];
                        const nextIndex = angles.findIndex(a => a.toLowerCase() === currentAngle.toLowerCase()) + 1;
                        if (nextIndex < angles.length) {
                            setCurrentAngle(angles[nextIndex]);
                        }
                        // Visual confirmation
                        showMessage("Photo captured! (Training pending)", 'success');
                    } catch (error: any) {
                        console.error("[DEBUG] Upload Error:", error.response?.data || error.message);
                        const errorMsg = error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            "Failed to save photo.";
                        showMessage(`Error: ${errorMsg}`, 'error');
                    } finally {
                        setIsCapturing(false);
                    }
                } else {
                    showMessage("Failed to create image from camera.", 'error');
                    setIsCapturing(false);
                }
            }, 'image/jpeg', 0.8);
        } else {
            showMessage("Failed to initialize canvas.", 'error');
            setIsCapturing(false);
        }
    };

    const handleFacePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, angle: string) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const formData = new FormData();
            formData.append('facePhoto', file);
            formData.append('angle', angle);

            try {
                await axios.post(`${API_URL}/api/users/profile/${user.id}/upload-face-photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                fetchFacePhotos(user.id);
                // Auto-advance to next angle
                const angles = ['Front', 'Left', 'Right', 'Up', 'Down'];
                const nextIndex = angles.findIndex(a => a.toLowerCase() === angle.toLowerCase()) + 1;
                if (nextIndex < angles.length) {
                    setCurrentAngle(angles[nextIndex]);
                }
                showMessage("Photo uploaded successfully!", 'success');
            } catch (error) {
                console.error("Failed to upload face photo", error);
                showMessage("Failed to upload photo.", 'error');
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const formData = new FormData();
            formData.append('profilePicture', file);

            try {
                const response = await axios.post(`${API_URL}/api/users/profile/${user.id}/upload-photo`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                setUser(updatedUser);
                setFormData(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                showMessage("Profile picture updated!", 'success');
            } catch (error) {
                console.error("Failed to upload photo", error);
                showMessage("Failed to upload photo.", 'error');
            }
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!user) return;
        try {
            // Optimistic update
            setDeletedPhotoIds(prev => [...prev, photoId]);
            await axios.delete(`${API_URL}/api/users/profile/${user.id}/face-photos/${photoId}`);
            // Don't refetch immediately to keep the "Undo" state visible
        } catch (error) {
            console.error("Failed to delete photo", error);
            setDeletedPhotoIds(prev => prev.filter(id => id !== photoId)); // Revert
            showMessage("Failed to delete photo.", 'error');
        }
    };

    const handleSaveFaceData = async () => {
        if (!user) return;
        setIsTraining(true);
        try {
            await axios.post(`${API_URL}/api/users/profile/${user.id}/train-model`);

            showMessage("Face data saved and model trained successfully!", 'success');
            setIsEditingFaceData(false);
            stopCamera();
        } catch (error: any) {
            console.error("Failed to train model", error);
            const errorMsg = error.response?.data?.message || "Failed to train model.";
            const errorDetails = error.response?.data?.details;

            // Log details to console for debugging
            if (errorDetails && Array.isArray(errorDetails)) {
                console.error("Error details:", errorDetails);
                // Show first few errors in the message
                const detailMsg = errorDetails.slice(0, 3).join('; ');
                showMessage(`${errorMsg}\n${detailMsg}`, 'error');
            } else {
                showMessage(errorMsg, 'error');
            }
        } finally {
            setIsTraining(false);
        }
    };

    const handleUndoDelete = async (photoId: number) => {
        if (!user) return;
        try {
            // Optimistic update
            setDeletedPhotoIds(prev => prev.filter(id => id !== photoId));
            await axios.post(`${API_URL}/api/users/profile/${user.id}/face-photos/${photoId}/restore`);
            fetchFacePhotos(user.id);
        } catch (error) {
            console.error("Failed to restore photo", error);
            setDeletedPhotoIds(prev => [...prev, photoId]); // Revert
            showMessage("Failed to restore photo.", 'error');
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (!user || !formData) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;


    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showMessage("New passwords do not match", 'error');
            return;
        }

        // Validate password strength pattern from JSX
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword)) {
            showMessage("Password does not meet requirements", 'error');
            return;
        }

        try {
            const token = getToken();
            await axios.put(`${API_URL}/api/auth/change-password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showMessage("Password changed successfully", 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error("Change password error:", error);
            showMessage(error.response?.data?.message || "Failed to change password", 'error');
        }
    };

    const profileImageSrc = getProfilePictureUrl(user.profilePicture);

    const generatePrivacyReport = (data: any) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Data Privacy Export Report", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Reference ID: ${data.export_info?.user_id || 'N/A'}`, 14, 35);

        // User Profile Section
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("User Profile", 14, 45);

        const user = data.personal_information || {};
        const profileData = [
            ["Name", `${user.first_name || ''} ${user.last_name || ''}`],
            ["Student ID", user.user_id || "N/A"],
            ["Email", user.email || "N/A"],
            ["Course", user.course || "N/A"],
            ["Year Level", user.year_level?.toString() || "N/A"]
        ];

        autoTable(doc, {
            startY: 50,
            head: [['Field', 'Value']],
            body: profileData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Consent History Section
        let lastY = (doc as any).lastAutoTable.finalY + 15;
        doc.text("Consent History", 14, lastY);

        const history = data.consent_history || [];
        const consentRows = history.map((c: any) => [
            c.consent_type,
            c.status,
            c.ip_address,
            new Date(c.timestamp).toLocaleString()
        ]);

        autoTable(doc, {
            startY: lastY + 5,
            head: [['Type', 'Status', 'IP Address', 'Date']],
            body: consentRows,
            theme: 'grid',
            headStyles: { fillColor: [46, 204, 113] }
        });

        // Attendance History Section
        lastY = (doc as any).lastAutoTable.finalY + 15;

        // Check if we need a new page
        if (lastY > 250) {
            doc.addPage();
            lastY = 20;
        }

        doc.text("Attendance History (Recent)", 14, lastY);

        const attendance = data.attendance_records || [];
        const attendanceRows = attendance.map((a: any) => [
            new Date(a.date).toLocaleDateString(),
            a.status,
            a.time_in ? new Date(a.time_in).toLocaleTimeString() : '-',
            a.time_out ? new Date(a.time_out).toLocaleTimeString() : '-'
        ]);

        autoTable(doc, {
            startY: lastY + 5,
            head: [['Date', 'Status', 'Time In', 'Time Out']],
            body: attendanceRows,
            theme: 'striped',
            headStyles: { fillColor: [142, 68, 173] }
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10);
            doc.text("LabFace Privacy System", 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`LabFace-Data-Export-${data.export_info?.user_id || 'user'}.pdf`);
    };

    console.log("Current formData:", formData);

    return (
        <div className="min-h-screen bg-slate-950 font-sans">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
                <div className="mb-6">
                    <Link href="/student/dashboard" className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors">
                        <ArrowLeft size={20} className="mr-2" />
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>
                </div>
                <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm overflow-hidden">
                    <div className="bg-brand-600 h-32 relative">
                        <div className="absolute -bottom-12 left-8">
                            <div className="relative group">
                                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg overflow-hidden">
                                    {profileImageSrc ? (
                                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-3xl">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <button
                                    onClick={triggerFileInput}
                                    className="absolute bottom-0 right-0 bg-gray-900 text-white p-2 rounded-full hover:bg-gray-700 transition-colors shadow-md z-10"
                                >
                                    <Camera size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 px-8 pb-8">
                        {message && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                                    <div className={`p-4 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                        <h3 className="font-bold text-lg">{message.type === 'success' ? 'Success' : 'Error'}</h3>
                                        <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-700 text-base leading-relaxed">{message.text}</p>
                                        <div className="mt-6 flex justify-end">
                                            <button
                                                onClick={() => setMessage(null)}
                                                className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${message.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                Okay
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* ... rest of the component */}

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
                                <p className="text-slate-400">{user.studentId || 'Student ID'}</p>
                            </div>
                            {activeTab === 'profile' && (
                                <button
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${isEditing ? 'bg-brand-500 text-white hover:bg-brand-400' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                                >
                                    {isEditing ? <><Save size={18} /> Save Changes</> : 'Edit Profile'}
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto border-b border-slate-700 mb-8 pb-0 scrollbar-hide">
                            <button
                                onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'profile' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Personal Info
                            </button>
                            <button
                                onClick={() => { setActiveTab('face'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'face' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Face Data
                            </button>
                            <button
                                onClick={() => { setActiveTab('security'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'security' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Security
                            </button>
                            <button
                                onClick={() => { setActiveTab('privacy'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'privacy' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Privacy & Consent
                            </button>
                            <button
                                onClick={() => { setActiveTab('feedback'); setIsEditing(false); }}
                                className={`pb-4 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'feedback' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Feedback
                            </button>
                        </div>

                        <div key={activeTab} className="tab-content-fade">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-8">
                                    {/* Academic Update Alert */}
                                    {academicSettings && user && user.lastVerifiedPeriodId !== academicSettings.id && (
                                        <div className="bg-amber-500/10 border border-amber-500/50 rounded-2xl p-6 sm:p-8 animate-fade-in">
                                            <div className="flex flex-col xl:flex-row gap-8">
                                                <div className="xl:w-1/3 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-amber-500/20 rounded-xl">
                                                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white">
                                                            Academic Update Required
                                                        </h3>
                                                    </div>
                                                    <p className="text-slate-300 leading-relaxed">
                                                        The current academic period is <span className="text-white font-semibold">{academicSettings.schoolYear} - {academicSettings.semester}</span>.
                                                        Please update your record and upload a new COR to maintain access to your classes.
                                                    </p>
                                                </div>

                                                <div className="xl:w-2/3">
                                                    <form onSubmit={handleAcademicUpdate} className="space-y-6 bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            {/* Course */}
                                                            <div className="space-y-2">
                                                                <label className="block text-sm font-medium text-slate-400 ml-1">Current Course</label>
                                                                <input
                                                                    type="text"
                                                                    value={academicForm.course}
                                                                    onChange={(e) => {
                                                                        setAcademicForm({ ...academicForm, course: e.target.value });
                                                                        setCorVerified(false);
                                                                    }}
                                                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none placeholder:text-slate-700"
                                                                    placeholder="e.g. BSIT"
                                                                    required
                                                                    disabled={isSubmittingAcademic || corVerifying}
                                                                />
                                                            </div>
                                                            {/* Year Level */}
                                                            <div className="space-y-2">
                                                                <label className="block text-sm font-medium text-slate-400 ml-1">Current Year Level</label>
                                                                <select
                                                                    value={academicForm.yearLevel}
                                                                    onChange={(e) => {
                                                                        setAcademicForm({ ...academicForm, yearLevel: e.target.value });
                                                                        setCorVerified(false);
                                                                    }}
                                                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                                                                    required
                                                                    disabled={isSubmittingAcademic || corVerifying}
                                                                >
                                                                    <option value="">Select Year Level</option>
                                                                    <option value="1">1st Year</option>
                                                                    <option value="2">2nd Year</option>
                                                                    <option value="3">3rd Year</option>
                                                                    <option value="4">4th Year</option>
                                                                    <option value="5">5th Year</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* COR Upload & Verification */}
                                                        <div className="space-y-3">
                                                            <label className="block text-sm font-medium text-slate-400 ml-1">Certificate of Registration (COR)</label>
                                                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*,application/pdf"
                                                                        onChange={(e) => {
                                                                            handleCorFileChange(e);
                                                                            setCorVerified(false);
                                                                            setCorVerificationResult(null);
                                                                        }}
                                                                        className="hidden"
                                                                        id="cor-upload-profile"
                                                                        disabled={isSubmittingAcademic || corVerifying}
                                                                    />
                                                                    <label
                                                                        htmlFor="cor-upload-profile"
                                                                        className="flex items-center justify-center gap-3 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white cursor-pointer hover:bg-slate-900 transition-all w-full group overflow-hidden"
                                                                    >
                                                                        <FileText className="w-5 h-5 text-brand-500 group-hover:scale-110 transition-transform" />
                                                                        <span className="truncate max-w-[200px] text-sm font-medium">
                                                                            {academicForm.corFile ? academicForm.corFile.name : 'Click to Upload COR Document'}
                                                                        </span>
                                                                    </label>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={verifyCOR}
                                                                    disabled={!academicForm.corFile || corVerifying || corVerified || isSubmittingAcademic}
                                                                    className={`px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${corVerified
                                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                                                                            : 'bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 disabled:translate-y-0 shadow-brand-600/20'
                                                                        }`}
                                                                >
                                                                    {corVerifying ? (
                                                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                                                    ) : corVerified ? (
                                                                        <Check className="w-5 h-5" />
                                                                    ) : (
                                                                        <ShieldCheck className="w-5 h-5" />
                                                                    )}
                                                                    {corVerifying ? 'Verifying...' : corVerified ? 'Verified' : 'Verify Now'}
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-1 flex items-center gap-2">
                                                                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                                PDF or Image (Max 10MB)
                                                            </p>
                                                        </div>

                                                        {/* Verification Results Alert */}
                                                        {corVerificationResult && (
                                                            <div className={`p-5 rounded-2xl border flex gap-4 animate-in slide-in-from-top-4 duration-500 ${corVerificationResult.valid
                                                                    ? 'bg-green-500/5 border-green-500/20'
                                                                    : 'bg-red-500/5 border-red-500/20'
                                                                }`}>
                                                                <div className={`p-2.5 rounded-full h-fit flex-shrink-0 ${corVerificationResult.valid ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                                                    }`}>
                                                                    {corVerificationResult.valid ? <Check size={20} /> : <X size={20} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`font-bold text-base ${corVerificationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {corVerificationResult.valid ? 'Identity Verified' : 'Verification Failed'}
                                                                    </div>
                                                                    <div className="text-sm text-slate-400 mt-2 space-y-2">
                                                                        {corVerificationResult.valid ? (
                                                                            <>
                                                                                <p className="flex items-center gap-2">
                                                                                    Matched: <span className="text-white font-semibold">{corVerificationResult.extractedName}</span>
                                                                                    <span className="text-slate-600">|</span>
                                                                                    <span className="text-white font-semibold">{corVerificationResult.extractedId}</span>
                                                                                </p>
                                                                                <p>Extracted Course: <span className="text-white font-semibold">{corVerificationResult.extractedCourse || 'N/A'}</span></p>
                                                                            </>
                                                                        ) : (
                                                                            <p className="text-red-300 font-medium bg-red-500/10 p-2 rounded-lg inline-block">{corVerificationResult.reason}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Preview Section */}
                                                        {academicForm.corPreview && (
                                                            <div className="mt-2 relative w-full sm:w-64 h-40 rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-950/80 shadow-inner group">
                                                                <img src={academicForm.corPreview} alt="COR Preview" className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none"></div>
                                                            </div>
                                                        )}

                                                        {/* Action Button */}
                                                        <button
                                                            type="submit"
                                                            disabled={isSubmittingAcademic || !corVerified}
                                                            className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-brand-600/30 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0.5"
                                                        >
                                                            {isSubmittingAcademic ? (
                                                                <span className="flex items-center justify-center gap-3">
                                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                                    Applying Changes...
                                                                </span>
                                                            ) : (
                                                                'Confirm & Submit Academic Update'
                                                            )}
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div className="space-y-6">

                                            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Personal Information</h3>


                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        name="firstName"
                                                        value={formData.firstName || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        name="lastName"
                                                        value={formData.lastName || ''}
                                                        onChange={handleChange}
                                                        disabled={!isEditing}
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-2.5 text-slate-500" size={18} />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email || ''}
                                                            onChange={handleChange}
                                                            disabled={!isEditing}
                                                            placeholder="email@example.com"
                                                            className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-900 disabled:text-slate-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Academic Details</h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Student ID</label>
                                                    <input
                                                        type="text"
                                                        value={formData.studentId || formData.schoolId || ''}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Course</label>
                                                    <input
                                                        type="text"
                                                        value={formData.course || ''}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Year Level</label>
                                                    <input
                                                        type="text"
                                                        value={formData.yearLevel || ''}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Section</label>
                                                    <input
                                                        type="text"
                                                        value={formData.section || 'Not specified'}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">School Year</label>
                                                    <input
                                                        type="text"
                                                        value={academicSettings?.schoolYear || 'Loading...'}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
                                                    <input
                                                        type="text"
                                                        value={academicSettings?.semester || 'Loading...'}
                                                        disabled
                                                        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-400 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Face Data Tab */}
                             {activeTab === 'face' && (
                                     !isEditingFaceData ? (
                                        <div className="space-y-8 animate-fade-in">
                                            {/* Header HUD */}
                                            <div className="bg-coffee p-8 rounded-[2rem] shadow-4xl border border-secondary/10 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-30"></div>
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <h3 className="text-brand-cream font-black uppercase text-xl tracking-tighter">Identity Core</h3>
                                                        <p className="text-secondary/60 text-[9px] font-black uppercase tracking-[0.3em]">Neural Pattern Secured • 5/5 Validated</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setIsEditingFaceData(true)}
                                                        className="bg-brand-cream text-coffee px-8 py-3 rounded-2xl font-black uppercase text-[9px] tracking-[0.3em] shadow-3xl hover:bg-white transition-all"
                                                    >
                                                        Re-Scan Biometrics
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Preview Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                                {['Front', 'Left', 'Right', 'Up', 'Down'].map((angle) => {
                                                    const photo = facePhotos.find(p => p.angle.toLowerCase() === angle.toLowerCase());
                                                    const photoUrl = photo ? getProfilePictureUrl(photo.photo_url) : null;
                                                    return (
                                                        <div key={angle} className="space-y-3">
                                                            <div className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-coffee/10 bg-white/50 relative group">
                                                                {photoUrl ? (
                                                                    <img src={photoUrl} alt={angle} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-coffee/20">
                                                                        <User size={32} />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-x-0 bottom-0 bg-coffee/80 backdrop-blur-md py-3 text-center">
                                                                    <span className="text-brand-cream text-[9px] font-black uppercase tracking-[0.2em]">{angle}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-fade-in space-y-10">
                                            <div className="flex items-center justify-between bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-coffee/5 shadow-2xl">
                                                <div className="space-y-1">
                                                    <h3 className="text-coffee font-black uppercase text-xl tracking-tighter">Biometric Resynchronization</h3>
                                                    <p className="text-coffee/40 text-[9px] font-black uppercase tracking-[0.3em]">Initializing Smart Pose Detection...</p>
                                                </div>
                                                <button 
                                                    onClick={() => setIsEditingFaceData(false)}
                                                    className="bg-brand-cream text-coffee/40 hover:text-coffee px-8 py-3 rounded-2xl font-black uppercase text-[9px] tracking-[0.3em] transition-all"
                                                >
                                                    Cancel Sync
                                                </button>
                                            </div>

                                            <FaceEnrollmentScanner 
                                                requireAll={false}
                                                initialCaptures={facePhotos.reduce((acc, p) => ({ ...acc, [p.angle.toLowerCase()]: getProfilePictureUrl(p.photo_url) }), {})}
                                                onComplete={async (newCaptures) => {
                                                    setNewFacePhotos(newCaptures);
                                                    setIsTraining(true);
                                                    try {
                                                        const formData = new FormData();
                                                        // Only send CHANGED photos (those that are newly captured in this session)
                                                        // We can distinguish because new captures are base64, initial are URLs
                                                        Object.entries(newCaptures).forEach(([angle, data]) => {
                                                            if (data.startsWith('data:')) {
                                                                const blob = dataURLtoBlob(data);
                                                                formData.append('faceImages', blob, `${angle}.jpg`);
                                                            }
                                                        });
                                                        
                                                        // Ensure we have at least one new image
                                                        if (formData.getAll('faceImages').length === 0) {
                                                            showToast('No new captures to sync', 'info');
                                                            setIsEditingFaceData(false);
                                                            return;
                                                        }

                                                        formData.append('userId', user?.id?.toString() || ''); 

                                                        const token = getToken();
                                                        await axios.post(`${API_URL}/api/auth/update-face-data`, formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                                                        });

                                                        // Refresh data
                                                        const authAxios = createAuthAxios();
                                                        const meRes = await authAxios.get(`${API_URL}/api/auth/me`);
                                                        setUser(meRes.data);
                                                        fetchFacePhotos(meRes.data.id);
                                                        
                                                        // Bump image version for cache busting
                                                        localStorage.setItem('img_version', Date.now().toString());
                                                        
                                                        showToast('Neural Identity Synchronized', 'success');
                                                        setIsEditingFaceData(false);
                                                    } catch (err) {
                                                        console.error("Sync failed:", err);
                                                        showToast('Sync Failed', 'error');
                                                    } finally {
                                                        setIsTraining(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="max-w-md">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Lock size={20} className="text-brand-500" /> Change Password
                                    </h3>
                                    <form onSubmit={handleChangePassword} className="space-y-4" autoComplete="off">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    name="currentPassword"
                                                    required
                                                    value={passwordData.currentPassword}
                                                    onChange={handlePasswordChange}
                                                    autoComplete="new-password"
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                                                >
                                                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    name="newPassword"
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    autoComplete="new-password"
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                                                >
                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                                                <p className="mt-1 text-xs text-red-400 flex items-start gap-1">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                    Must be at least 8 chars with uppercase, lowercase, number, and special char.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    autoComplete="new-password"
                                                    className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:outline-none focus:ring-brand-500 focus:border-brand-500 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    Passwords do not match
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-brand-500 text-white font-bold py-2 rounded-lg hover:bg-brand-400 transition-colors shadow-md"
                                        >
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Privacy & Consent Tab */}
                            {activeTab === 'privacy' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-center gap-3">
                                        <Shield size={20} />
                                        <div className="text-sm">
                                            <strong>Philippine Data Privacy Act Compliance</strong>
                                            <p className="text-blue-300 mt-1">Your privacy rights are protected under the Data Privacy Act of 2012</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <FileText size={20} className="text-brand-400" />
                                            Consent Status
                                        </h3>
                                        {consentLoading ? (
                                            <p className="text-slate-400">Loading...</p>
                                        ) : consentStatus ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                                    <span className="text-slate-300">Biometric Data</span>
                                                    {consentStatus.biometricAccepted ? (
                                                        <span className="flex items-center gap-2 text-green-400">
                                                            <CheckCircle2 size={18} /> Consented
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-yellow-400">
                                                            <AlertTriangle size={18} /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                                    <span className="text-slate-300">Privacy Policy</span>
                                                    {consentStatus.privacyPolicyAccepted ? (
                                                        <span className="flex items-center gap-2 text-green-400">
                                                            <CheckCircle2 size={18} /> Accepted
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-yellow-400">
                                                            <AlertTriangle size={18} /> Not Accepted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400">No consent data</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4">Consent History</h3>
                                        {consentHistory.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-700">
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Date</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Type</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Action</th>
                                                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Version</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {consentHistory.map((record: any, index: number) => (
                                                            <tr key={index} className="border-b border-slate-700/50">
                                                                <td className="py-3 px-3 text-slate-300">
                                                                    {new Date(record.timestamp).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-3 px-3 text-slate-300 capitalize">
                                                                    {record.consent_type.replace('_', ' ')}
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    {record.consent_given ? (
                                                                        <span className="text-green-400 flex items-center gap-1">
                                                                            <CheckCircle2 size={14} /> Accepted
                                                                        </span>
                                                                    ) : record.consent_text?.toLowerCase().includes('pending') ? (
                                                                        <span className="text-yellow-400 flex items-center gap-1">
                                                                            <AlertTriangle size={14} /> Pending Request
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-red-400 flex items-center gap-1">
                                                                            <XCircle size={14} /> Revoked
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-3 text-slate-400">v{record.consent_version}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400">No history</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4">Your Data Rights</h3>
                                        <p className="text-slate-400 mb-4 text-sm">Under the Philippine Data Privacy Act:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setMessage({ type: 'success', text: 'Generating PDF...' });
                                                        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                        const token = getToken();

                                                        const res = await axios.post(
                                                            `${API_URL}/api/data-rights/export`,
                                                            { userId: user?.userId },
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );

                                                        generatePrivacyReport(res.data);
                                                        setMessage({ type: 'success', text: 'Report downloaded!' });
                                                    } catch (error) {
                                                        console.error(error);
                                                        setMessage({ type: 'error', text: 'Export failed' });
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                <Download size={18} />
                                                <span className="font-medium">Export Report (PDF)</span>
                                            </button>
                                            <Link href="/privacy-policy" className="flex items-center justify-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                                                <FileText size={18} />
                                                <span className="font-medium">Privacy Policy</span>
                                            </Link>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Request data deletion? This cannot be undone.')) {
                                                        try {
                                                            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                                                            const token = getToken();
                                                            await axios.post(
                                                                `${API_URL}/api/data-rights/delete`,
                                                                { userId: user?.userId, reason: 'User requested' },
                                                                { headers: { Authorization: `Bearer ${token}` } }
                                                            );
                                                            setMessage({ type: 'success', text: 'Deletion request submitted (30 days)' });
                                                        } catch (error) {
                                                            console.error(error);
                                                            setMessage({ type: 'error', text: 'Request failed' });
                                                        }
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                                <span className="font-medium">Request Deletion</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Tab */}
                            {activeTab === 'feedback' && (
                                <div className="animate-fade-in max-w-2xl mx-auto text-center space-y-8 py-8">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 text-brand-500 mb-4">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">We Value Your Feedback</h2>
                                        <p className="text-slate-400 max-w-lg mx-auto">
                                            Help us improve LabFace by sharing your thoughts, suggestions, or reporting any issues you've encountered.
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl inline-block shadow-lg mx-auto">
                                        <img
                                            src="/feedback-qr.png"
                                            alt="Scan to provide feedback"
                                            className="w-48 h-48 object-contain"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500">Scan the QR code or click the button below</p>
                                        <a
                                            href="https://forms.gle/58sdJkHppikg8iMq7"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-md"
                                        >
                                            Open Feedback Form <ExternalLink size={18} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
}
