"use client";
import { useState, useEffect, useRef } from "react";
import {
  getToken,
  getUser,
  API_URL,
  createAuthAxios,
  getProfilePictureUrl,
  logout,
  dataURLtoBlob,
  fetchCurrentUser,
} from "../../../utils/auth";
import Navbar from "../../../components/Navbar";
import IdentityBackground from "../../../components/IdentityBackground";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DashboardTabs from "@/components/ui/DashboardTabs";
import Link from "next/link";
import {
  User,
  Mail,
  MapPin,
  Save,
  Camera,
  Lock,
  Shield,
  ShieldCheck,
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  RefreshCw,
  Check,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Undo2,
  Edit,
  MessageSquare,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Fingerprint,
  Database,
  Info,
  GraduationCap,
  Clock,
  Calendar,
} from "lucide-react";
import axios from "axios";
import BackButton from "@/components/ui/BackButton";
import FaceEnrollmentScanner from "../../../components/FaceEnrollmentScanner";
import { useToast } from "../../../components/Toast";
import ConfirmModal from "../../../components/ConfirmModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InputField from "../../../components/ui/InputField";

// Interface Definitions
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
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "face" | "privacy" | "feedback"
  >("profile");

  // Consent state
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [consentLoading, setConsentLoading] = useState(false);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Face Photos State
  const [facePhotos, setFacePhotos] = useState<FacePhoto[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentAngle, setCurrentAngle] = useState("Front");
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEditingFaceData, setIsEditingFaceData] = useState(false);
  const [newFacePhotos, setNewFacePhotos] = useState<Record<string, string>>(
    {},
  );
  const [isTraining, setIsTraining] = useState(false);

  // Academic Settings State
  const [academicSettings, setAcademicSettings] = useState<{
    id: number;
    schoolYear: string;
    semester: string;
  } | null>(null);
  const [academicForm, setAcademicForm] = useState<{
    course: string;
    yearLevel: string;
    corFile: File | null;
    corPreview: string | null;
  }>({
    course: "",
    yearLevel: "",
    corFile: null,
    corPreview: null,
  });
  const [isSubmittingAcademic, setIsSubmittingAcademic] = useState(false);
  const [corVerifying, setCorVerifying] = useState(false);
  const [corVerified, setCorVerified] = useState(false);
  const [corVerificationResult, setCorVerificationResult] = useState<any>(null);

  // UI Message State
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "success" | "info";
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  useEffect(() => {
    setDeletedPhotoIds([]);
  }, [facePhotos]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    if (type === "success") {
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

        if (userData.role !== "student") {
          if (userData.role === "professor")
            window.location.href = "/professor/dashboard";
          else if (userData.role === "admin")
            window.location.href = "/admin/dashboard";
          else window.location.href = "/login";
          return;
        }

        setUser(userData);
        setFormData(userData);

        if (sessionStorage.getItem("token")) {
          sessionStorage.setItem("user", JSON.stringify(userData));
        }
        if (localStorage.getItem("token")) {
          localStorage.setItem("user", JSON.stringify(userData));
        }

        fetchFacePhotos(userData.id);
        if (userData.userId) {
          fetchConsentData(userData.userId);
        }
      } catch (error: any) {
        console.error("Failed to fetch user data:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          logout();
          return;
        }

        const storedUser = getUser();
        if (storedUser) {
          setUser(storedUser);
          setFormData(storedUser);
          setAcademicForm((prev) => ({
            ...prev,
            course: storedUser.course || "",
            yearLevel: storedUser.yearLevel || "",
          }));
          fetchFacePhotos(storedUser.id);
        } else {
          logout();
        }
      }
    };

    fetchUserData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "academic") {
      setActiveTab("profile");
    }

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

  const fetchFacePhotos = async (userId: number) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/users/profile/${userId}/face-photos`,
      );
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
        axios.get(`${API_URL}/api/consent/history/${userId}`),
      ]);

      setConsentStatus(statusRes.data);
      setConsentHistory(historyRes.data.history || []);
    } catch (error) {
      console.error("Failed to fetch consent data", error);
    } finally {
      setConsentLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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
        localStorage.setItem("user", JSON.stringify(formData));
        setIsEditing(false);
        showMessage("Profile updated successfully!", "success");
      } catch (error) {
        console.error("Failed to update profile", error);
        showMessage("Failed to update profile. Please try again.", "error");
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(
        passwordData.newPassword,
      )
    ) {
      showMessage("Password does not meet requirements", "error");
      return;
    }

    try {
      const token = getToken();
      await axios.put(
        `${API_URL}/api/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showMessage("Password changed successfully", "success");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Change password error:", error);
      showMessage(
        error.response?.data?.message || "Failed to change password",
        "error",
      );
    }
  };

  const handleCorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf";
      setAcademicForm({
        ...academicForm,
        corFile: file,
        corPreview: isPdf ? null : URL.createObjectURL(file),
      });
    }
  };

  const verifyCOR = async () => {
    if (!academicForm.corFile || !user) {
      showMessage(
        "Please upload your Certificate of Registration first",
        "error",
      );
      return;
    }

    setCorVerifying(true);
    setCorVerificationResult(null);

    try {
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
        certificateOfRegistration: base64Data,
      });

      setCorVerificationResult(response.data);

      if (response.data.valid) {
        setCorVerified(true);
        showMessage("COR Verified Successfully!", "success");
      } else {
        setCorVerified(false);
        showMessage(response.data.reason || "Verification failed", "error");
      }
    } catch (err: any) {
      console.error("COR verification error:", err);
      setCorVerified(false);
      const reason =
        err.response?.data?.reason ||
        err.response?.data?.message ||
        err.message ||
        "Verification failed";
      setCorVerificationResult({ valid: false, reason });
      showMessage(reason, "error");
    } finally {
      setCorVerifying(false);
    }
  };

  const handleAcademicUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !academicForm.corFile) return;
    if (!corVerified) {
      showMessage(
        "Please verify your Certificate of Registration first.",
        "error",
      );
      return;
    }

    setIsSubmittingAcademic(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(academicForm.corFile);
      reader.onload = async () => {
        const base64File = reader.result as string;

        try {
          const response = await axios.post(
            `${API_URL}/api/student/update-academic-data`,
            {
              userId: user.userId,
              studentId: user.id.toString(),
              course: academicForm.course,
              yearLevel: academicForm.yearLevel,
              corFile: base64File,
            },
          );

          showMessage(response.data.message, "success");

          const updatedUser = {
            ...user,
            course: academicForm.course,
            yearLevel: academicForm.yearLevel,
            lastVerifiedPeriodId: response.data.verifiedPeriodId,
          };
          setUser(updatedUser);
          setFormData(updatedUser);

          localStorage.setItem("user", JSON.stringify(updatedUser));
          sessionStorage.setItem("user", JSON.stringify(updatedUser));

          setCorVerified(false);
          setCorVerificationResult(null);
          setAcademicForm({
            course: "",
            yearLevel: "",
            corFile: null,
            corPreview: null,
          });
        } catch (error: any) {
          console.error("Academic update failed:", error);
          const errorMsg =
            error.response?.data?.message ||
            "Failed to update academic information.";
          const details = error.response?.data?.details;
          showMessage(details ? `${errorMsg}: ${details}` : errorMsg, "error");
        } finally {
          setIsSubmittingAcademic(false);
        }
      };
    } catch (error) {
      console.error("File reading error:", error);
      setIsSubmittingAcademic(false);
      showMessage("Failed to process file.", "error");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const formData = new FormData();
      formData.append("profilePicture", file);

      try {
        const response = await axios.post(
          `${API_URL}/api/users/profile/${user.id}/upload-photo`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        const updatedUser = {
          ...user,
          profilePicture: response.data.profilePicture,
        };
        setUser(updatedUser);
        setFormData(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        showMessage("Profile picture updated!", "success");
      } catch (error) {
        console.error("Failed to upload photo", error);
        showMessage("Failed to upload photo.", "error");
      }
    }
  };

  const generatePrivacyReport = (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Data Privacy Export Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Reference ID: ${data.export_info?.user_id || "N/A"}`, 14, 35);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("User Profile", 14, 45);

    const u = data.personal_information || {};
    const profileData = [
      ["Name", `${u.first_name || ""} ${u.last_name || ""}`],
      ["Student ID", u.user_id || "N/A"],
      ["Email", u.email || "N/A"],
      ["Course", u.course || "N/A"],
      ["Year Level", u.year_level?.toString() || "N/A"],
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Field", "Value"]],
      body: profileData,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
    });

    let lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Consent History", 14, lastY);

    const history = data.consent_history || [];
    const consentRows = history.map((c: any) => [
      c.consent_type,
      c.status,
      c.ip_address,
      new Date(c.timestamp).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: lastY + 5,
      head: [["Type", "Status", "IP Address", "Date"]],
      body: consentRows,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });

    lastY = (doc as any).lastAutoTable.finalY + 15;
    if (lastY > 250) {
      doc.addPage();
      lastY = 20;
    }
    doc.text("Attendance History (Recent)", 14, lastY);

    const attendance = data.attendance_records || [];
    const attendanceRows = attendance.map((a: any) => [
      new Date(a.date).toLocaleDateString(),
      a.status,
      a.time_in ? new Date(a.time_in).toLocaleTimeString() : "-",
      a.time_out ? new Date(a.time_out).toLocaleTimeString() : "-",
    ]);

    autoTable(doc, {
      startY: lastY + 5,
      head: [["Date", "Status", "Time In", "Time Out"]],
      body: attendanceRows,
      theme: "striped",
      headStyles: { fillColor: [147, 51, 234] },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 20,
        doc.internal.pageSize.height - 10,
      );
      doc.text("LabFace Privacy System", 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`LabFace-Data-Export-${data.export_info?.user_id || "user"}.pdf`);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const profileTabs = [
    { id: "profile", label: "Identity Profile", icon: User },
    { id: "face", label: "Biometric Records", icon: Sparkles },
    { id: "security", label: "Security", icon: Lock },
    { id: "privacy", label: "Privacy & Data Rights", icon: Shield },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
  ];

  if (!user || !formData) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center relative overflow-hidden font-outfit">
        <IdentityBackground />
        <div className="relative z-10 flex flex-col items-center gap-8 translate-y-[-2rem]">
            <div className="w-24 h-24 relative">
                <div className="absolute inset-0 border-[6px] border-identity-sky/10 rounded-full shadow-[0_0_30px_rgba(92,180,228,0.1)]"></div>
                <div className="absolute inset-0 border-[6px] border-identity-sky border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-4 bg-identity-sky/[0.03] rounded-full flex items-center justify-center backdrop-blur-sm border border-identity-sky/10">
                    <div className="w-3 h-3 bg-identity-sky rounded-full animate-pulse shadow-[0_0_15px_rgba(92,180,228,0.8)]"></div>
                </div>
            </div>
            <div className="space-y-3 text-center">
                <p className="font-black uppercase tracking-[0.5em] text-[11px] text-identity-navy/40 italic text-shadow-glow">LabFace Account Details</p>
                <p className="font-black uppercase tracking-[0.3em] text-[13px] text-identity-sky animate-pulse italic">Loading Profile...</p>
            </div>
        </div>
      </div>
    );
  }

  const profileImageSrc = getProfilePictureUrl(user.profilePicture);

  return (
    <div className="min-h-screen bg-transparent font-outfit text-slate-900 relative selection:bg-identity-sky/20 selection:text-identity-navy page-transition overflow-x-hidden">
      <IdentityBackground />
      <Navbar />

      {/* Global Message Modal - Upgraded to HUD Style */}
      {message && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-identity-navy/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="identity-glass max-w-md w-full overflow-hidden animate-scale-up border-2 border-white/40 rounded-[3.5rem] p-10 relative">
            <div className="corner-bracket-tl opacity-40 scale-75" />
            <div className="corner-bracket-br opacity-40 scale-75" />
            <div className={`flex items-center gap-6 mb-8 ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
              <div className={`p-4 rounded-2xl shadow-xl ${message.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                {message.type === "success" ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
              </div>
              <div>
                <h3 className="font-black text-2xl uppercase tracking-tighter italic leading-none">
                  {message.type === "success" ? "Success" : "Notification"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-60 italic">LabFace System Message</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm font-black uppercase tracking-[0.1em] leading-relaxed italic mb-10">
              {message.text}
            </p>
            <button
              onClick={() => setMessage(null)}
              className={`w-full py-5 rounded-2.5xl font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 italic border-b-[5px] ${
                message.type === "success"
                  ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                  : "bg-rose-500 text-white border-rose-600 shadow-rose-500/20"
              }`}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <Breadcrumbs />

        {/* Profile Hero Section */}
        <div className="mb-14 flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="p-5 bg-identity-navy text-white rounded-2.5xl border-2 border-identity-sky/20 shadow-2xl relative group overflow-hidden">
                  <User size={32} strokeWidth={2.5} className="relative z-10 filter drop-shadow-md" />
                  <div className="absolute inset-0 bg-identity-sky/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </div>
              <div>
                <p className="text-[11px] font-black text-identity-sky uppercase tracking-[0.5em] mb-2 italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-identity-sky animate-status-pulse shadow-[0_0_8px_rgba(92,180,228,0.8)]" />
                    Profile Verification
                </p>
                <h1 className="text-5xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                  My Profile
                </h1>
              </div>
            </div>
            
            <BackButton
              href="/student/dashboard"
              label="Back to Dashboard"
              className="group flex items-center gap-5 px-8 py-4 rounded-2.5xl bg-white/40 border-2 border-identity-sky/15 shadow-2xl hover:border-identity-sky hover:bg-white transition-all backdrop-blur-xl italic"
            />
        </div>

        {/* Global Action Bar */}
        <div className="mb-12 flex flex-col md:flex-row items-center gap-8">
             <div className="flex-1 w-full flex items-center gap-6 p-4 identity-glass rounded-[2.5rem] border border-white/40">
                <DashboardTabs 
                    tabs={profileTabs} 
                    activeTab={activeTab} 
                    onTabChange={(id) => setActiveTab(id as any)} 
                />
             </div>
             {activeTab === "profile" && (
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={`flex items-center gap-4 px-10 py-5 rounded-2.5xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl italic border-b-[5px] ${
                    isEditing
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                        : "bg-identity-navy text-white border-identity-sky/40 hover:bg-identity-sky transition-colors active:scale-95"
                    }`}
                >
                    {isEditing ? <><Save size={18} /> Save Changes</> : <><Edit size={18} /> Edit Profile</>}
                </button>
              )}
        </div>

        <div className="animate-fade-up">
          {activeTab === "profile" && (
            <div className="space-y-12">
              {/* Premium Academic Update Section */}
              {academicSettings && user && user.lastVerifiedPeriodId !== academicSettings.id && (
                <div className="identity-glass rounded-[3.5rem] p-12 border-2 border-identity-sky/30 shadow-3xl relative overflow-hidden group">
                  <div className="corner-bracket-tl opacity-30" />
                  <div className="corner-bracket-br opacity-30" />
                  <div className="flex flex-col xl:flex-row gap-16 relative z-10">
                    <div className="xl:w-[40%] space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-identity-sky/10 rounded-2.5xl text-identity-sky border border-identity-sky/20 shadow-inner">
                          <RefreshCw className="w-10 h-10 animate-spin-slow" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic leading-none">
                            Term Enrollment Verification
                          </h3>
                          <p className="text-[10px] font-black text-identity-sky uppercase tracking-[0.5em] mt-3 italic">Academic Status Verification Required</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 p-6 bg-identity-navy text-white rounded-2.5xl shadow-2xl relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Database size={40} />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">
                            <span>Active Academic Year</span>
                            <span className="text-identity-sky">{academicSettings.schoolYear}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">
                            <span>Current Semester</span>
                            <span className="text-identity-sky">{academicSettings.semester}</span>
                          </div>
                      </div>
                      
                      <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed italic">
                        Account synchronization requires a valid certificate of registration for the active academic cycle.
                      </p>
                    </div>

                    <div className="xl:w-[60%]">
                      <form onSubmit={handleAcademicUpdate} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <InputField
                            label="Academic Program"
                            type="text"
                            value={academicForm.course}
                            onChange={(e) => {
                              setAcademicForm({ ...academicForm, course: e.target.value });
                              setCorVerified(false);
                            }}
                            placeholder="e.g. BSIT"
                            required
                            icon={GraduationCap}
                          />
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-identity-navy uppercase tracking-[0.3em] ml-2 italic">
                              Account Status
                            </label>
                            <div className="relative">
                                <select
                                    value={academicForm.yearLevel}
                                    onChange={(e) => {
                                        setAcademicForm({ ...academicForm, yearLevel: e.target.value });
                                        setCorVerified(false);
                                    }}
                                    className="w-full px-8 py-5 bg-white/60 border-2 border-white/50 rounded-2.5xl text-identity-navy font-black text-[12px] uppercase tracking-[0.2em] focus:ring-4 focus:ring-identity-sky/10 focus:border-identity-sky transition-all outline-none appearance-none shadow-xl cursor-alias italic"
                                    required
                                >
                                    <option value="" className="text-slate-400">SELECT_LEVEL</option>
                                    {[1, 2, 3, 4, 5].map((y) => (
                                        <option key={y} value={y}>{y}{y === 1 ? "ST" : y === 2 ? "ND" : y === 3 ? "RD" : "TH"} YEAR</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-identity-sky">
                                    <ChevronRight size={20} className="rotate-90" />
                                </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-5">
                          <label className="text-[11px] font-black text-identity-navy uppercase tracking-[0.3em] ml-2 italic">
                            Certificate of Registry (PDF/IMG)
                          </label>
                          <div className="flex flex-col gap-6">
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
                                id="cor-upload"
                              />
                              <label
                                htmlFor="cor-upload"
                                className="flex flex-col items-center justify-center gap-6 p-10 bg-white/40 border-2 border-dashed border-identity-sky/20 rounded-[2.5rem] cursor-pointer hover:border-identity-sky hover:bg-white/80 transition-all group overflow-hidden shadow-inner"
                              >
                                <div className="p-5 bg-identity-sky/10 rounded-2xl text-identity-sky group-hover:scale-110 transition-transform shadow-lg">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 italic max-w-full truncate px-4">
                                  {academicForm.corFile ? academicForm.corFile.name : "LOAD_SOURCE_FILE"}
                                </span>
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={verifyCOR}
                              disabled={!academicForm.corFile || corVerifying || corVerified || isSubmittingAcademic}
                              className={`w-full py-6 rounded-2.5xl font-black text-[12px] uppercase tracking-[0.4em] flex items-center justify-center gap-5 transition-all shadow-2xl italic border-b-[5px] ${
                                corVerified
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : "bg-identity-navy text-white border-identity-sky/40 hover:bg-identity-sky disabled:opacity-30"
                              }`}
                            >
                              {corVerifying ? <RefreshCw className="animate-spin" size={20} /> : corVerified ? <Check size={20} /> : <ShieldCheck size={20} />}
                              {corVerifying ? "Analyzing Document..." : corVerified ? "Verified" : "Start Verification"}
                            </button>
                          </div>
                        </div>

                        {corVerificationResult && (
                          <div className={`p-8 rounded-[2.5rem] border-2 flex gap-8 animate-in slide-in-from-top-4 duration-500 ${corVerificationResult.valid ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"}`}>
                            <div className={`p-5 rounded-2xl h-fit border-b-4 ${corVerificationResult.valid ? "bg-emerald-500 text-white border-emerald-600 shadow-xl" : "bg-rose-500 text-white border-rose-600 shadow-xl"}`}>
                              {corVerificationResult.valid ? <Check size={28} /> : <X size={28} />}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-black text-2xl uppercase tracking-tighter italic leading-none ${corVerificationResult.valid ? "text-emerald-600" : "text-rose-600"}`}>
                                {corVerificationResult.valid ? "Analysis Complete" : "Error"}
                              </h4>
                              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-4 space-y-3 italic">
                                {corVerificationResult.valid ? (
                                  <div className="flex items-center gap-5 p-4 bg-white/50 rounded-xl border border-emerald-100">
                                    <span className="text-identity-navy">{corVerificationResult.extractedName}</span>
                                    <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                                    <span className="text-identity-navy">{corVerificationResult.extractedId}</span>
                                  </div>
                                ) : (
                                  <p className="text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100">{corVerificationResult.reason}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingAcademic || !corVerified}
                          className="w-full py-7 bg-identity-sky hover:bg-identity-navy disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-[13px] uppercase tracking-[0.5em] rounded-2.5xl transition-all shadow-3xl shadow-identity-sky/20 active:scale-95 italic border-b-[5px] border-identity-navy/20"
                        >
                          {isSubmittingAcademic ? "Saving..." : "Update Information"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Overview */}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Side: Summary Card */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="identity-glass rounded-[3.5rem] p-12 border-2 border-white/50 shadow-3xl text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-identity-sky/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-48 h-48 bg-white rounded-[3rem] p-4 shadow-3xl shadow-identity-navy/10 relative group-hover:scale-105 transition-transform duration-700 border-2 border-identity-sky/10">
                                {profileImageSrc ? (
                                <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover rounded-[2rem] shadow-inner" />
                                ) : (
                                <div className="w-full h-full bg-identity-navy/5 rounded-[2.2rem] flex items-center justify-center text-identity-sky font-black text-4xl italic">
                                    {user.firstName[0]}{user.lastName[0]}
                                </div>
                                )}
                                <button 
                                    onClick={triggerFileInput}
                                    className="absolute -bottom-4 -right-4 bg-identity-navy text-white p-5 rounded-2.5xl shadow-2xl hover:bg-identity-sky transition-all hover:rotate-12 active:scale-90 border-4 border-white"
                                >
                                    <Camera size={24} />
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>
                            
                            <div className="mt-12 space-y-3">
                                <h2 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic leading-none drop-shadow-sm">
                                    {user.firstName} {user.lastName}
                                </h2>
                                <p className="text-[11px] font-black text-identity-sky uppercase tracking-[0.5em] italic">User ID: {user.id}</p>
                            </div>
                            
                            <div className="mt-10 flex flex-wrap justify-center gap-3">
                                <span className="px-5 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] italic">Verified</span>
                                <span className="px-5 py-2.5 bg-identity-sky/10 text-identity-sky border border-identity-sky/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] italic">Student</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="identity-glass rounded-[3rem] p-10 border-2 border-white/50 shadow-2xl relative overflow-hidden italic">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-3 bg-identity-navy text-white rounded-xl shadow-lg">
                                <Fingerprint size={20} />
                            </div>
                            <h4 className="text-xl font-black text-identity-navy uppercase tracking-tighter">Account Status</h4>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: "System Status", value: "Active", color: "text-emerald-500" },
                                { label: "Last Update", value: new Date().toLocaleDateString(), color: "text-identity-sky" },
                                { label: "Security Level", value: "Secure", color: "text-identity-navy" }
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl border border-white">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{stat.label}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${stat.color}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Detailed Forms */}
                <div className="lg:col-span-8 space-y-12">
                  <div className="identity-glass rounded-[3.5rem] p-12 border-2 border-white/50 shadow-3xl relative overflow-hidden">
                    <div className="flex items-center gap-6 mb-12">
                      <div className="w-2 h-10 bg-identity-sky rounded-full shadow-[0_0_15px_rgba(92,180,228,0.5)]"></div>
                      <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Personal Information</h3>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {[
                        { label: "Given Name", name: "firstName", icon: User },
                        { label: "Surname", name: "lastName", icon: User },
                        { label: "Email Address", name: "email", icon: Mail },
                        { label: "Primary Address", name: "address", icon: MapPin },
                      ].map((field) => (
                        <InputField
                          key={field.name}
                          label={field.label}
                          name={field.name}
                          type={field.name === "email" ? "email" : "text"}
                          value={(formData as any)[field.name] || ""}
                          onChange={handleChange}
                          disabled={!isEditing}
                          icon={field.icon}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="identity-glass rounded-[3.5rem] p-12 border-2 border-white/50 shadow-3xl relative overflow-hidden">
                    <div className="flex items-center gap-6 mb-12">
                      <div className="w-2 h-10 bg-identity-navy rounded-full shadow-[0_0_15px_rgba(10,25,48,0.3)]"></div>
                      <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter italic">Academic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: "Student ID", value: formData.studentId || formData.schoolId, icon: Fingerprint },
                        { label: "Current Course", value: formData.course, icon: GraduationCap },
                        { label: "Year Level", value: formData.yearLevel ? `${formData.yearLevel} YEAR` : "UNSET", icon: Database },
                        { label: "Active Section", value: formData.section || "Pending", icon: MapPin },
                        { label: "Academic Year", value: academicSettings?.schoolYear, icon: FileText },
                        { label: "Semester", value: academicSettings?.semester, icon: Clock },
                      ].map((field, idx) => (
                        <div key={idx} className="identity-glass rounded-3xl p-8 border border-white shadow-xl group hover:border-identity-sky transition-all duration-500 relative overflow-hidden italic">
                          <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                              <field.icon size={32} />
                          </div>
                          <div className="flex items-center gap-5 mb-5 relative z-10">
                            <div className="bg-identity-sky/10 rounded-2xl p-4 text-identity-navy shadow-inner group-hover:bg-identity-sky group-hover:text-white transition-colors">
                              <field.icon size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                              {field.label}
                            </span>
                          </div>
                          <p className="text-[14px] font-black text-identity-navy uppercase tracking-[0.2em] relative z-10 pl-2">
                            {field.value || "NOT SET"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "face" && (!isEditingFaceData ? (
            <div className="space-y-12 animate-fade-in">
              <div className="identity-glass p-12 rounded-[3.5rem] border-2 border-white/50 shadow-3xl relative overflow-hidden group">
                <div className="corner-bracket-tl opacity-30" />
                <div className="corner-bracket-br opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/5 to-transparent"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-6">
                      <h3 className="text-identity-navy font-black uppercase text-4xl tracking-tighter italic leading-none drop-shadow-sm">
                        Biometrics
                      </h3>
                      <div className="px-5 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] italic">
                        Security Active
                      </div>
                    </div>
                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em] italic flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      5 captures recorded • Status: Complete
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingFaceData(true)}
                    className="bg-identity-navy text-white px-12 py-6 rounded-2.5xl font-black uppercase text-[12px] tracking-[0.4em] shadow-3xl shadow-identity-navy/20 hover:bg-identity-sky transition-all active:scale-95 flex items-center gap-5 italic border-b-[5px] border-identity-sky/40"
                  >
                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-1000" /> Update Facial Data
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
                {["Front", "Left", "Right", "Up", "Down"].map((angle) => {
                    const photo = facePhotos.find((p) => p.angle.toLowerCase() === angle.toLowerCase());
                    const photoUrl = photo ? getProfilePictureUrl(photo.photo_url) : null;
                    return (
                        <div key={angle} className="space-y-6 group animate-fade-up">
                            <div className="aspect-[3/4] rounded-[3rem] overflow-hidden border-2 border-white bg-white/40 relative shadow-2xl group-hover:shadow-identity-sky/20 group-hover:border-identity-sky/30 transition-all duration-700 backdrop-blur-md">
                                <div className="absolute inset-0 bg-blueprint opacity-5 pointer-events-none" />
                                {photoUrl ? (
                                <img src={photoUrl} alt={angle} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 filter saturate-[0.8] contrast-[1.1]" />
                                ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <User size={64} className="opacity-10 group-hover:opacity-20 transition-opacity" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">No Image Data</span>
                                </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-identity-navy/90 backdrop-blur-xl py-5 text-center border-t border-white/10 group-hover:bg-identity-sky transition-colors duration-500">
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">
                                        View: {angle}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
              </div>
              
              <div className="p-10 bg-identity-navy text-white rounded-[3rem] border-2 border-identity-sky/30 shadow-3xl flex items-start gap-8 relative overflow-hidden group italic">
                <div className="absolute top-0 right-0 scale-150 translate-x-1/4 -translate-y-1/4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-[2s]">
                    <Shield size={120} />
                </div>
                <div className="p-5 bg-identity-sky/10 rounded-2.5xl text-identity-sky border border-identity-sky/20 shadow-inner mt-1 relative z-10">
                    <Info size={28} />
                </div>
                <div className="space-y-3 relative z-10">
                    <h4 className="text-2xl font-black uppercase tracking-tighter">Security Guideline</h4>
                    <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-3xl">
                        Facial consistency is important for verification. Ensure captures are in well-lit environments for best results.
                    </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in space-y-12">
              <div className="flex items-center justify-between identity-glass p-10 rounded-[3rem] border-2 border-white/50 shadow-3xl">
                <div className="space-y-2">
                  <h3 className="text-identity-navy font-black uppercase text-3xl tracking-tighter italic">Prepare Camera</h3>
                  <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic">Synchronizing...</p>
                </div>
                <button
                  onClick={() => setIsEditingFaceData(false)}
                  className="bg-white/40 text-rose-600 hover:bg-rose-500 hover:text-white px-10 py-5 rounded-2.5xl font-black uppercase text-[11px] tracking-[0.4em] transition-all border-b-[5px] border-rose-600/30 hover:border-rose-700 italic shadow-xl"
                >
                  Cancel
                </button>
              </div>

              <div className="max-w-4xl mx-auto identity-glass rounded-[4rem] p-4 border-2 border-white/50 shadow-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-blueprint opacity-5 pointer-events-none" />
                <FaceEnrollmentScanner
                  requireAll={true}
                  selective={true}
                  initialCaptures={facePhotos.reduce((acc, p) => ({
                    ...acc,
                    [p.angle.toLowerCase()]: getProfilePictureUrl(p.photo_url),
                  }), {})}
                  onComplete={async (newCaptures) => {
                    setNewFacePhotos(newCaptures);
                    setIsTraining(true);
                    try {
                      const token = getToken();
                      await axios.post(`${API_URL}/api/auth/update-face-data`, {
                        userId: user?.id,
                        facePhotos: newCaptures,
                      }, {
                        headers: { Authorization: `Bearer ${token}` },
                      });

                      const authAxios = createAuthAxios();
                      const meRes = await authAxios.get(`${API_URL}/api/auth/me`);
                      setUser(meRes.data);
                      fetchFacePhotos(meRes.data.id);
                      localStorage.setItem("img_version", Date.now().toString());

                      showToast("Identity Profile Updated", "success");
                      setIsEditingFaceData(false);
                    } catch (err: any) {
                      console.error("Sync failed:", err);
                      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Connection Error";
                      showToast(`Sync Failed: ${errorMessage}`, "error");
                    } finally {
                      setIsTraining(false);
                    }
                  }}
                />
              </div>
            </div>
          ))}

          {activeTab === "security" && (
            <div className="max-w-3xl mx-auto py-12 animate-fade-in">
              <div className="text-center mb-16 space-y-6">
                <div className="w-28 h-28 bg-identity-navy text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl shadow-identity-navy/20 relative group overflow-hidden border-2 border-identity-sky/20">
                  <Lock size={44} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-identity-sky opacity-0 group-hover:opacity-20 transition-opacity" />
                </div>
                <h3 className="text-4xl font-black text-identity-navy uppercase tracking-tighter italic">Security Settings</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Security Update</p>
              </div>

              <form onSubmit={handleChangePassword} className="identity-glass p-14 rounded-[4rem] border-2 border-white shadow-3xl relative overflow-hidden" autoComplete="off">
                <div className="corner-bracket-tl opacity-20 scale-75" />
                <div className="corner-bracket-br opacity-20 scale-75" />
                <div className="space-y-10 relative z-10">
                  {[
                    { label: "Current Identity Key", name: "currentPassword", show: showCurrentPassword, setShow: setShowCurrentPassword },
                    { label: "New Access Credential", name: "newPassword", show: showNewPassword, setShow: setShowNewPassword },
                    { label: "Confirm Credential", name: "confirmPassword", show: showConfirmPassword, setShow: setShowConfirmPassword },
                  ].map((field) => (
                    <div key={field.name}>
                      <InputField
                        label={field.label}
                        name={field.name}
                        type={field.show ? "text" : "password"}
                        required
                        value={(passwordData as any)[field.name]}
                        onChange={handlePasswordChange}
                        icon={Lock}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => field.setShow(!field.show)}
                            className="text-identity-sky/40 hover:text-identity-sky transition-colors mr-3"
                          >
                            {field.show ? <EyeOff size={22} /> : <Eye size={22} />}
                          </button>
                        }
                      />
                      {field.name === "newPassword" && passwordData.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordData.newPassword) && (
                        <div className="p-5 bg-rose-50/50 rounded-2.5xl border border-rose-100 flex items-start gap-4 mt-6 animate-fade-in italic">
                          <AlertTriangle size={18} className="text-rose-500 mt-0.5" />
                          <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] leading-relaxed">
                            Invalid Password: At least 8 characters, [A-Z], [a-z], [0-9], & symbol required
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                    <button
                    type="submit"
                    className="w-full bg-identity-navy hover:bg-identity-sky text-white font-black py-7 rounded-2.5xl text-[12px] uppercase tracking-[0.5em] transition-all shadow-3xl shadow-identity-navy/20 active:scale-95 mt-8 italic border-b-[5px] border-identity-sky/40"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-12 animate-fade-in">
              <div className="identity-glass p-12 rounded-[3.5rem] border-2 border-white/50 shadow-3xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-3 h-full bg-identity-sky animate-pulse shadow-[0_0_20px_rgba(92,180,228,0.5)]"></div>
                <div className="p-6 bg-identity-navy text-white rounded-3xl shadow-2xl relative group-hover:rotate-12 transition-transform duration-700">
                  <Shield size={40} />
                </div>
                <div>
                  <h4 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-identity-navy">Privacy Center</h4>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-3xl italic">
                    All biometric and metadata points are handled in strict accordance with the PH Data Privacy Act of 2012 (RA 10173). Your identity is decentralized, encrypted, and owned exclusively by you.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 identity-glass rounded-[3.5rem] p-12 border-2 border-white/50 shadow-3xl relative overflow-hidden">
                    <h3 className="text-2xl font-black text-identity-navy mb-12 uppercase tracking-tighter italic flex items-center gap-5">
                        <FileText size={28} className="text-identity-sky" />
                        Access Logs & Consent Data
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Status Grid */}
                        <div className="space-y-6">
                            {[
                                { label: "Biometric Consent", status: consentStatus?.biometricAccepted },
                                { label: "Privacy Policy Auth", status: consentStatus?.privacyPolicyAccepted },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-8 bg-white/40 rounded-[2.5rem] border-2 border-white group hover:border-emerald-300 transition-all duration-500 shadow-xl italic">
                                    <span className="text-[11px] font-black text-identity-navy uppercase tracking-[0.3em]">{item.label}</span>
                                    <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl text-[9px] font-black border-2 uppercase tracking-[0.2em] italic ${item.status ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                                        {item.status ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                        {item.status ? "GRANTED" : "REVOKED"}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Action Hub */}
                        <div className="bg-identity-navy p-10 rounded-[2.5rem] shadow-3xl text-white relative overflow-hidden group border-b-[6px] border-identity-sky/40">
                            <div className="absolute inset-0 bg-blueprint opacity-5 pointer-events-none" />
                            <h5 className="text-[10px] font-black uppercase tracking-[0.5em] text-identity-sky mb-4 italic">Account Services</h5>
                            <div className="grid grid-cols-2 gap-6 relative z-10">
                                <button
                                    onClick={async () => {
                                        try {
                                        showToast("Preparing Academic Report...", "info");
                                        const res = await axios.post(`${API_URL}/api/data-rights/export`, { userId: user?.userId }, { headers: { Authorization: `Bearer ${getToken()}` } });
                                        generatePrivacyReport(res.data);
                                        showToast("Identity Report Exported", "success");
                                        } catch (error) { showToast("Export Failed", "error"); }
                                    }}
                                    className="flex flex-col items-center gap-5 p-8 bg-white/10 border border-white/10 rounded-3xl hover:bg-white hover:text-identity-navy transition-all active:scale-95 italic group/btn"
                                >
                                    <Download size={28} className="text-identity-sky group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Export Data</span>
                                </button>
                                
                                <button
                                    onClick={() => setConfirmModal({
                                        isOpen: true,
                                        title: "Delete Account",
                                        message: "Permanently delete your account? All data and face photos will be permanently deleted. This action is irreversible.",
                                        type: "danger",
                                        confirmText: "Delete Permanently",
                                        onConfirm: async () => {
                                            try {
                                                await axios.post(`${API_URL}/api/data-rights/delete`, { userId: user?.userId, reason: "Manual Account Deletion" }, { headers: { Authorization: `Bearer ${getToken()}` } });
                                                showToast("Account Deleted", "You have been logged out", "success");
                                                setConfirmModal(p => ({ ...p, isOpen: false }));
                                            } catch (e) { showToast("Action Failed", "Access Denied", "error"); setConfirmModal(p => ({ ...p, isOpen: false })); }
                                        }
                                    })}
                                    className="flex flex-col items-center gap-5 p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 italic group/purge"
                                >
                                    <Trash2 size={28} className="text-rose-500 group-hover/purge:text-white group-hover/purge:scale-110 transition-all" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Delete Account</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="animate-fade-in max-w-4xl mx-auto text-center py-20 space-y-16">
              <div className="space-y-8">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-[3.5rem] bg-identity-sky/10 text-identity-sky border-2 border-identity-sky/20 shadow-3xl mb-4 relative group">
                  <MessageSquare size={48} className="group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-identity-sky rounded-[3.5rem] animate-status-pulse opacity-10" />
                </div>
                <h2 className="text-5xl font-black text-identity-navy uppercase tracking-tighter italic leading-none drop-shadow-sm">System Feedback</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] leading-relaxed max-w-2xl mx-auto italic">
                  Optimizing your experience
                </p>
              </div>

              <div className="relative group mx-auto max-w-fit">
                <div className="absolute -inset-10 bg-gradient-to-tr from-identity-sky to-identity-navy rounded-[5rem] opacity-20 blur-3xl group-hover:opacity-40 transition-opacity duration-1000"></div>
                <div className="identity-glass p-12 rounded-[4rem] shadow-4xl relative z-10 border-2 border-white/80 group-hover:scale-[1.02] transition-transform duration-700">
                  <div className="relative p-6 bg-white rounded-[3rem] shadow-inner overflow-hidden border-2 border-identity-sky/5">
                    <img src="/feedback-qr.png" alt="Scan QR" className="w-72 h-72 object-contain filter drop-shadow-lg" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20 pointer-events-none" />
                  </div>
                  <div className="mt-12 pt-10 border-t-2 border-slate-100 flex items-center justify-center gap-6 text-identity-navy font-black text-[14px] uppercase tracking-[0.4em] italic">
                    <ExternalLink size={24} className="text-identity-sky animate-bounce-slow" /> 
                    Scan Code
                  </div>
                </div>
              </div>

              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
                Your data is protected by encryption
              </p>
            </div>
          )}
        </div>
      </main>




      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
