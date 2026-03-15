"use client";
import { useState, useEffect, useRef } from 'react';
import { getToken, getUser, API_URL, createAuthAxios, getProfilePictureUrl, logout } from '../../../utils/auth';
import Navbar from '../../../components/Navbar';
import { useSwipe } from '../../../hooks/useSwipe';
import Link from 'next/link';
import { User, Mail, MapPin, Save, Camera, Lock, Shield, Image as ImageIcon, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, X, Upload, RefreshCw, Check, FileText, AlertTriangle, CheckCircle2, XCircle, Download, Trash2, Undo2, Edit, MessageSquare, ExternalLink } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserData {
    id: number;
    firstName: string;
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
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
                    fetchFacePhotos(storedUser.id);
                } else {
                    window.location.href = '/login';
                }
            }
        };

        fetchUserData();
        fetchUserData();

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

    useSwipe(
        () => {
            const currentIndex = profileTabs.indexOf(activeTab);
            const nextIndex = Math.min(currentIndex + 1, profileTabs.length - 1);
            if (nextIndex !== currentIndex) {
                handleTabChange(profileTabs[nextIndex]);
            }
        },
        () => {
            const currentIndex = profileTabs.indexOf(activeTab);
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (prevIndex !== currentIndex) {
                handleTabChange(profileTabs[prevIndex]);
            }
        },
        50
    );

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
            setAcademicForm({
                ...academicForm,
                corFile: file,
                corPreview: URL.createObjectURL(file)
            });
        }
    };

    const handleAcademicUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !academicForm.corFile) return;

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
                    localStorage.setItem('user', JSON.stringify(updatedUser)); // Update cache

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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">

                                        {/* Academic Update Alert */}
                                        {academicSettings && user && user.lastVerifiedPeriodId !== academicSettings.id && (
                                            <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-6 mb-8 animate-fade-in">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-amber-500/20 rounded-full">
                                                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-white mb-2">
                                                            Academic Update Required
                                                        </h3>
                                                        <p className="text-slate-300 mb-4">
                                                            The current academic period is <span className="text-white font-semibold">{academicSettings.schoolYear} - {academicSettings.semester}</span>.
                                                            Please update your course and year level, and upload a new Certificate of Registration (COR) for validation.
                                                        </p>

                                                        {/* Update Form */}
                                                        <form onSubmit={handleAcademicUpdate} className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Course */}
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-400 mb-1">Course</label>
                                                                    <input
                                                                        type="text"
                                                                        value={academicForm.course}
                                                                        onChange={(e) => setAcademicForm({ ...academicForm, course: e.target.value })}
                                                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                                                                        placeholder="e.g. BSCS"
                                                                        required
                                                                        disabled={isSubmittingAcademic}
                                                                    />
                                                                </div>
                                                                {/* Year Level */}
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-400 mb-1">Year Level</label>
                                                                    <select
                                                                        value={academicForm.yearLevel}
                                                                        onChange={(e) => setAcademicForm({ ...academicForm, yearLevel: e.target.value })}
                                                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                                                                        required
                                                                        disabled={isSubmittingAcademic}
                                                                    >
                                                                        <option value="">Select Year Level</option>
                                                                        <option value="1">1st Year</option>
                                                                        <option value="2">2nd Year</option>
                                                                        <option value="3">3rd Year</option>
                                                                        <option value="4">4th Year</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* COR Upload */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-400 mb-1">Upload COR (Image)</label>
                                                                <div className="flex items-center gap-4">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleCorFileChange}
                                                                        className="hidden"
                                                                        id="cor-upload"
                                                                        required={!academicForm.corFile}
                                                                        disabled={isSubmittingAcademic}
                                                                    />
                                                                    <label htmlFor="cor-upload" className={`flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors border border-slate-600 ${isSubmittingAcademic ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                        <Upload size={18} />
                                                                        {academicForm.corFile ? 'Change File' : 'Select File'}
                                                                    </label>
                                                                    {academicForm.corFile && (
                                                                        <span className="text-sm text-green-400 flex items-center gap-1">
                                                                            <CheckCircle size={14} /> File Selected
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Preview */}
                                                                {academicForm.corPreview && (
                                                                    <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden border border-slate-600">
                                                                        <img src={academicForm.corPreview} alt="COR Preview" className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex justify-end pt-2">
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmittingAcademic}
                                                                    className={`px-6 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${isSubmittingAcademic ? 'bg-slate-600 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500'}`}
                                                                >
                                                                    {isSubmittingAcademic ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save size={18} />}
                                                                    {isSubmittingAcademic ? 'Verifying...' : 'Submit & Verify'}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

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
                            )}

                            {/* Face Data Tab */}
                            {activeTab === 'face' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg text-slate-300 text-sm opacity-80 hover:opacity-100 transition-opacity">
                                        <strong className="text-white">Instructions:</strong>
                                        <ul className="list-disc pl-5 mt-1 space-y-1">
                                            <li>Capture or upload photos for all 5 angles (Front, Left, Right, Up, Down).</li>
                                            <li>Ensure good lighting and clear visibility.</li>
                                            <li>Remove glasses, hats, or masks.</li>
                                            <li>Click on a tile to select which angle to capture.</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Camera/Upload Section */}
                                        {isEditingFaceData && (
                                            <div className="space-y-4">
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
                                                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                                        <Camera size={20} className="text-brand-500" />
                                                        Capture: {currentAngle} View
                                                    </h3>

                                                    {cameraActive ? (
                                                        <div className="space-y-3">
                                                            <div className="relative">
                                                                <video
                                                                    ref={videoRef}
                                                                    autoPlay
                                                                    playsInline
                                                                    muted
                                                                    className="w-full aspect-[4/3] object-cover rounded-lg border-2 border-brand-500 bg-black"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={toggleCamera}
                                                                    className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm p-2 rounded-full text-white hover:bg-white/40 transition-colors"
                                                                    title="Switch Camera"
                                                                >
                                                                    <RefreshCw size={20} />
                                                                </button>

                                                                {/* Camera Selection Dropdown (Desktop Only) */}
                                                                {videoDevices.length > 1 && (
                                                                    <div className="absolute top-2 left-2 z-10 hidden md:block">
                                                                        <select
                                                                            value={selectedDeviceId}
                                                                            onChange={(e) => {
                                                                                setSelectedDeviceId(e.target.value);
                                                                                // Restart camera if active
                                                                                if (cameraActive) {
                                                                                    stopCamera();
                                                                                    // Small delay to allow cleanup
                                                                                    setTimeout(() => {
                                                                                        // We need to trigger startCamera, but ensuring the new ID is used
                                                                                        // The state update is async, but inside the function we use the state directly.
                                                                                        // However, startCamera uses selectedDeviceId from state, which might not be updated yet in this closure if we call it immediately.
                                                                                        // Actually, better to just rely on user clicking start or handle it via effect if we wanted auto-switch.
                                                                                        // For now, let's just stop and user can start again, OR simple hack:
                                                                                        // But startCamera reads state. We can pass deviceId to startCamera optionally?
                                                                                        // Let's keep it simple: simpler to just let user restart or auto-restart with a small timeout which usually picks up the new state in next render? No, that's flaky.
                                                                                        // Best approach: useEffect dependency? No, that might trigger unwanted starts.
                                                                                        // Let's make startCamera accept an optional deviceId override
                                                                                    }, 100);
                                                                                    // Actually, simply setting state here and then having an effect re-start camera if it was active?
                                                                                    // Let's modify the onChange to just set state, and we can add a button to apply or just let them toggle.
                                                                                    // OR: The user asked for "choose if they want to use that camera format". 
                                                                                    // Let's try to make it live switch if possible.
                                                                                }
                                                                            }}
                                                                            className="bg-black/50 text-white text-xs p-1 rounded backdrop-blur-sm border border-white/20 outline-none"
                                                                        >
                                                                            {videoDevices.map(device => (
                                                                                <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                                                                                    {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={captureFromCamera}
                                                                    disabled={isCapturing || !isVideoReady}
                                                                    className={`flex-1 bg-brand-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 ${(isCapturing || !isVideoReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <Camera size={18} />
                                                                    {isCapturing ? 'Saving...' : !isVideoReady ? 'Loading...' : 'Capture Photo'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={stopCamera}
                                                                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="w-full aspect-[4/3] bg-gray-200 rounded-lg flex items-center justify-center">
                                                                <Camera size={48} className="text-gray-400" />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={startCamera}
                                                                className="w-full bg-brand-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Camera size={18} />
                                                                Start Camera
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="relative mt-3">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <div className="w-full border-t border-gray-300"></div>
                                                        </div>
                                                        <div className="relative flex justify-center text-sm">
                                                            <span className="px-2 bg-gray-50 text-gray-500">OR</span>
                                                        </div>
                                                    </div>

                                                    <label className="cursor-pointer w-full mt-3 bg-slate-900 border border-slate-700 text-slate-300 px-4 py-3 rounded-lg font-bold hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                                                        <Upload size={18} />
                                                        Upload Photo
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFacePhotoUpload(e, currentAngle)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Captured Photos Grid */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-white">Captured Photos ({facePhotos.length}/5)</h3>
                                                {!isEditingFaceData && (
                                                    <button
                                                        onClick={() => {
                                                            setIsEditingFaceData(true);
                                                            startCamera();
                                                        }}
                                                        className="text-sm bg-slate-800 text-slate-300 border border-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                                                    >
                                                        <Edit size={14} /> Edit Face Data
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['Front', 'Left', 'Right', 'Up', 'Down'].map((angle) => {
                                                    const photo = facePhotos.find(p => p.angle.toLowerCase() === angle.toLowerCase());
                                                    // If photo is in deleted list, treat it as non-existent (show empty slot)
                                                    const isDeleted = photo && deletedPhotoIds.includes(photo.id);
                                                    const photoUrl = (photo && !isDeleted) ? `${API_URL}${photo.photo_url}` : null;

                                                    // DEBUG: Check why image isn't showing
                                                    if (photo) {
                                                        console.log(`[DEBUG] Rendering ${angle}:`, {
                                                            id: photo.id,
                                                            stored_url: photo.photo_url,
                                                            final_url: photoUrl,
                                                            api_url: API_URL
                                                        });
                                                    }

                                                    const isSelected = currentAngle.toLowerCase() === angle.toLowerCase();

                                                    return (
                                                        <div
                                                            key={angle}
                                                            className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${photoUrl
                                                                ? 'border-green-500'
                                                                : isSelected
                                                                    ? 'border-brand-500 bg-slate-800/80 ring-1 ring-brand-500'
                                                                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                                                                }`}
                                                            onClick={() => {
                                                                if (isEditingFaceData) {
                                                                    setCurrentAngle(angle);
                                                                }
                                                            }}
                                                        >
                                                            <div className="aspect-square relative">
                                                                {photoUrl && photo ? (
                                                                    <div className="w-full h-full relative group">
                                                                        <img src={photoUrl} alt={angle} className="w-full h-full object-cover" />
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 px-2 flex items-center gap-1">
                                                                            <Check size={12} />
                                                                            {angle}
                                                                        </div>
                                                                        {isEditingFaceData && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeletePhoto(photo.id);
                                                                                }}
                                                                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700"
                                                                                title="Delete Photo"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                                        <User size={32} />
                                                                        <span className="text-xs mt-2 font-medium text-slate-500">{angle}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                {isEditingFaceData && (
                                                    <div className="mt-4 flex justify-end gap-3">
                                                        <button
                                                            onClick={() => {
                                                                setIsEditingFaceData(false);
                                                                stopCamera();
                                                            }}
                                                            className="px-4 py-2 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            disabled={facePhotos.length < 5 || isTraining}
                                                            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 ${facePhotos.length === 5 && !isTraining ? 'bg-brand-600 hover:bg-brand-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'}`}
                                                            onClick={handleSaveFaceData}
                                                        >
                                                            <Save size={18} />
                                                            {isTraining ? 'Training Model...' : 'Save Face Data'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                                    {consentStatus.consent_status === 'given' ? (
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
                                                    {consentStatus.privacy_policy_accepted ? (
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
