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
import FaceEnrollmentScanner from "../../../components/FaceEnrollmentScanner";
import { useToast } from "../../../components/Toast";
import ConfirmModal from "../../../components/ConfirmModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InputField from "../../../components/ui/InputField";

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

const IdentityNode = ({ className = "", size = 120 }) => (
  <div
    className={`identity-node opacity-[0.15] ${className}`}
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <g>
        <path
          d="M100,30 Q60,30 50,80 T100,170 T150,80 Q140,30 100,30 Z"
          fill="none"
          stroke="currentColor"
          className="text-identity-sky"
          strokeWidth="2"
        />
        <line
          x1="100"
          y1="30"
          x2="100"
          y2="170"
          stroke="currentColor"
          className="text-identity-navy"
          strokeWidth="1"
        />
        <line
          x1="60"
          y1="80"
          x2="140"
          y2="80"
          stroke="currentColor"
          className="text-identity-navy"
          strokeWidth="1"
        />
        <line
          x1="55"
          y1="110"
          x2="145"
          y2="110"
          stroke="currentColor"
          className="text-identity-navy"
          strokeWidth="1"
        />
        <circle
          cx="75"
          cy="80"
          r="3"
          fill="currentColor"
          className="text-identity-sky"
        />
        <circle
          cx="125"
          cy="80"
          r="3"
          fill="currentColor"
          className="text-identity-sky"
        />
        <circle
          cx="100"
          cy="110"
          r="3"
          fill="currentColor"
          className="text-identity-sky"
        />
        <circle
          cx="100"
          cy="30"
          r="2"
          fill="currentColor"
          className="text-identity-navy"
        />
        <circle
          cx="100"
          cy="170"
          r="2"
          fill="currentColor"
          className="text-identity-navy"
        />
        <line
          x1="75"
          y1="80"
          x2="100"
          y2="110"
          stroke="currentColor"
          className="text-identity-sky"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <line
          x1="125"
          y1="80"
          x2="100"
          y2="110"
          stroke="currentColor"
          className="text-identity-sky"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      </g>
    </svg>
  </div>
);

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

  if (!user || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-identity-sky"></div>
      </div>
    );
  }

  const profileImageSrc = getProfilePictureUrl(user.profilePicture);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-identity-sky/30">
      <Navbar />

      {/* Global Message Modal */}
      {message && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-identity-navy/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-3xl max-w-md w-full overflow-hidden animate-scale-up border border-slate-200">
            <div
              className={`p-8 flex items-center gap-4 ${message.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
            >
              <div
                className={`p-3 rounded-2xl ${message.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
              >
                {message.type === "success" ? (
                  <CheckCircle size={28} />
                ) : (
                  <AlertCircle size={28} />
                )}
              </div>
              <div>
                <h3 className="font-black text-xl uppercase tracking-tighter leading-none">
                  {message.type === "success" ? "Updated" : "System Alert"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] mt-1 opacity-60">
                  Identity Core Feedback
                </p>
              </div>
            </div>
            <div className="p-10">
              <p className="text-slate-500 text-sm font-black uppercase tracking-[0.15em] leading-relaxed">
                {message.text}
              </p>
              <button
                onClick={() => setMessage(null)}
                className={`w-full mt-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 ${
                  message.type === "success"
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-rose-500 text-white shadow-rose-500/20"
                }`}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative pt-24 pb-20 overflow-hidden">
        {/* 4-Layer Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.05),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(14,165,233,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <IdentityNode
            className="top-[10%] left-[5%] -rotate-12 scale-150"
            size={200}
          />
          <IdentityNode
            className="top-[60%] right-[8%] rotate-12 scale-125"
            size={180}
          />
          <IdentityNode
            className="bottom-[15%] left-[12%] -rotate-6 scale-110"
            size={150}
          />
          <IdentityNode
            className="top-[40%] left-[25%] rotate-45 opacity-5"
            size={100}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Navigation Bar */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-identity-sky/10 p-3 rounded-2xl text-identity-sky shadow-sm">
                <User size={24} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-identity-navy uppercase tracking-tighter leading-none">
                  Identity Profile
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">
                  Management of Personal Biometric Data
                </p>
              </div>
            </div>
            <Link
              href="/student/dashboard"
              className="group flex items-center gap-4 px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-identity-sky/50 transition-all w-fit"
            >
              <ArrowLeft
                size={18}
                className="text-identity-sky group-hover:-translate-x-1 transition-transform"
              />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-identity-navy">
                Return to Terminal
              </span>
            </Link>
          </div>

          <div className="identity-glass rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-200/50 overflow-hidden bg-white/40 backdrop-blur-xl">
            {/* Profile Header */}
            <div className="h-64 bg-identity-sky relative overflow-hidden">
              <IdentityNode className="top-0 right-0 -translate-y-1/2 translate-x-1/2 scale-150 rotate-12" />
              <IdentityNode className="bottom-0 left-0 translate-y-1/2 -translate-x-1/2 scale-125 opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>

              {/* Profile Image & Summary */}
              <div className="absolute -bottom-16 left-12 flex items-end gap-8">
                <div className="relative group">
                  <div className="w-40 h-40 bg-identity-sky/10 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden border-4 border-white transition-transform group-hover:scale-105 duration-500">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-[2rem]"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 rounded-[2rem] flex items-center justify-center text-identity-sky font-black text-3xl md:text-4xl font-outfit uppercase">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]">
                      <Camera size={32} className="text-white" />
                    </div>
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
                    className="absolute bottom-2 right-2 bg-identity-navy text-white p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-identity-sky transition-all shadow-xl z-10 scale-110"
                  >
                    <Camera size={20} />
                  </button>
                </div>
                <div className="mb-6 pb-2">
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-md leading-none">
                      {user.firstName} {user.lastName}
                    </h1>
                    {corVerified && (
                      <ShieldCheck
                        size={28}
                        className="text-emerald-400 drop-shadow-sm"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-white/80 font-black text-[10px] uppercase tracking-[0.4em]">
                    <span className="flex items-center gap-2">
                      <Fingerprint size={14} className="text-white" />{" "}
                      {user.studentId || "ID UNKNOWN"}
                    </span>
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full"></span>
                    <span className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-white" />{" "}
                      {user.course || "PENDING ASSIGNMENT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-8 right-8">
                {activeTab === "profile" && (
                  <button
                    onClick={() =>
                      isEditing ? handleSave() : setIsEditing(true)
                    }
                    className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl backdrop-blur-md border ${
                      isEditing
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20"
                        : "bg-white/20 text-white border-white/30 hover:bg-white/30 active:scale-95"
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Save size={18} className="animate-pulse" /> Finalize
                        Changes
                      </>
                    ) : (
                      "Edit Identity"
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="pt-24 px-12 pb-16">
              {/* Custom Tab Switcher */}
              <div className="flex gap-4 p-2 bg-slate-50/50 backdrop-blur-md rounded-[2rem] mb-12 border border-slate-100/50 shadow-inner max-w-fit mx-auto">
                {[
                  { id: "profile", label: "Persona", icon: User },
                  { id: "face", label: "Biometrics", icon: Sparkles },
                  { id: "security", label: "Security", icon: Lock },
                  { id: "privacy", label: "Privacy", icon: Shield },
                  { id: "feedback", label: "Signals", icon: MessageSquare },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-4 px-8 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                      activeTab === tab.id
                        ? "bg-identity-navy text-white shadow-xl shadow-identity-navy/20 scale-105"
                        : "text-slate-400 hover:text-identity-navy hover:bg-white"
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="tab-content-fade">
                {activeTab === "profile" && (
                  <div className="space-y-12">
                    {/* Premium Academic Update Section */}
                    {academicSettings &&
                      user &&
                      user.lastVerifiedPeriodId !== academicSettings.id && (
                        <div className="relative overflow-hidden group">
                          <div className="absolute inset-0 bg-identity-sky rounded-[3rem] opacity-5 group-hover:opacity-10 transition-opacity"></div>
                          <div className="bg-white border-2 border-identity-sky/20 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 relative z-10 shadow-xl">
                            <div className="flex flex-col xl:flex-row gap-12">
                              <div className="xl:w-[35%] space-y-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-4 bg-identity-sky/10 rounded-2xl text-identity-sky">
                                    <RefreshCw className="w-8 h-8 animate-spin-slow" />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter leading-tight">
                                      COR Verification Required
                                    </h3>
                                    <p className="text-[9px] font-black text-identity-sky uppercase tracking-[0.3em] mt-1">
                                      Pending Class Approval
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                    <span>Active Term</span>
                                    <span className="text-identity-navy">
                                      {academicSettings.schoolYear}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                    <span>Semester</span>
                                    <span className="text-identity-navy">
                                      {academicSettings.semester}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] leading-relaxed">
                                  Upload your COR to verify enrollment.
                                </p>
                              </div>

                              <div className="xl:w-[65%]">
                                <form
                                  onSubmit={handleAcademicUpdate}
                                  className="space-y-8"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <InputField
                                        label="Assigned Course"
                                        type="text"
                                        value={academicForm.course}
                                        onChange={(e) => {
                                          setAcademicForm({
                                            ...academicForm,
                                            course: e.target.value,
                                          });
                                          setCorVerified(false);
                                        }}
                                        placeholder="E.G. BSIT"
                                        required
                                        icon={GraduationCap}
                                      />
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">
                                        Academic Year
                                      </label>
                                      <select
                                        value={academicForm.yearLevel}
                                        onChange={(e) => {
                                          setAcademicForm({
                                            ...academicForm,
                                            yearLevel: e.target.value,
                                          });
                                          setCorVerified(false);
                                        }}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-identity-navy font-black text-sm uppercase tracking-[0.15em] focus:ring-4 focus:ring-identity-sky/10 focus:border-identity-sky transition-all outline-none appearance-none shadow-inner cursor-pointer"
                                        required
                                      >
                                        <option value="">Choose Level</option>
                                        {[1, 2, 3, 4, 5].map((y) => (
                                          <option key={y} value={y}>
                                            {y}
                                            {y === 1
                                              ? "st"
                                              : y === 2
                                                ? "nd"
                                                : y === 3
                                                  ? "rd"
                                                  : "th"}{" "}
                                            Year
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">
                                      Certificate of Registration (COR)
                                    </label>
                                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-4">
                                      <div className="flex-1 w-full">
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
                                        />
                                        <label
                                          htmlFor="cor-upload-profile"
                                          className="flex items-center justify-center gap-4 px-8 py-5 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 cursor-pointer hover:border-identity-sky hover:bg-identity-sky/5 transition-all w-full group overflow-hidden"
                                        >
                                          <FileText className="w-6 h-6 text-identity-sky" />
                                          <span className="truncate max-w-[250px] text-[10px] font-black uppercase tracking-[0.15em]">
                                            {academicForm.corFile
                                              ? academicForm.corFile.name
                                              : "Upload Credentials"}
                                          </span>
                                        </label>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={verifyCOR}
                                        disabled={
                                          !academicForm.corFile ||
                                          corVerifying ||
                                          corVerified ||
                                          isSubmittingAcademic
                                        }
                                        className={`px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 ${
                                          corVerified
                                            ? "bg-emerald-50 text-emerald-500 border border-emerald-200"
                                            : "bg-identity-navy text-white hover:bg-identity-sky disabled:opacity-30"
                                        }`}
                                      >
                                        {corVerifying ? (
                                          <RefreshCw
                                            className="animate-spin"
                                            size={18}
                                          />
                                        ) : corVerified ? (
                                          <Check size={18} />
                                        ) : (
                                          <ShieldCheck size={18} />
                                        )}
                                        {corVerifying
                                          ? "Validating..."
                                          : corVerified
                                            ? "Verified"
                                            : "Verify Enrollment"}
                                      </button>
                                    </div>
                                  </div>

                                  {corVerificationResult && (
                                    <div
                                      className={`p-8 rounded-[2rem] border-2 flex gap-6 animate-in slide-in-from-top-4 duration-500 ${
                                        corVerificationResult.valid
                                          ? "bg-emerald-50 border-emerald-100"
                                          : "bg-rose-50 border-rose-100"
                                      }`}
                                    >
                                      <div
                                        className={`p-4 rounded-2xl h-fit ${corVerificationResult.valid ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : "bg-rose-500 text-white shadow-xl shadow-rose-500/20"}`}
                                      >
                                        {corVerificationResult.valid ? (
                                          <Check size={24} />
                                        ) : (
                                          <X size={24} />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <h4
                                          className={`font-black text-lg uppercase tracking-tighter leading-none ${corVerificationResult.valid ? "text-emerald-600" : "text-rose-600"}`}
                                        >
                                          {corVerificationResult.valid
                                            ? "Identity Match Found"
                                            : "Validation Error"}
                                        </h4>
                                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mt-3 space-y-2">
                                          {corVerificationResult.valid ? (
                                            <p className="flex items-center gap-4">
                                              <span className="text-identity-navy">
                                                {
                                                  corVerificationResult.extractedName
                                                }
                                              </span>
                                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                              <span className="text-identity-navy">
                                                {
                                                  corVerificationResult.extractedId
                                                }
                                              </span>
                                            </p>
                                          ) : (
                                            <p className="text-rose-500">
                                              {corVerificationResult.reason}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    type="submit"
                                    disabled={
                                      isSubmittingAcademic || !corVerified
                                    }
                                    className="w-full py-6 bg-identity-sky hover:bg-identity-navy disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-[12px] uppercase tracking-[0.4em] rounded-[2rem] transition-all shadow-3xl shadow-identity-sky/20 active:scale-[0.98]"
                                  >
                                    {isSubmittingAcademic
                                      ? "Synchronizing Class Name..."
                                      : "Commit Academic Update"}
                                  </button>
                                </form>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Profile Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-16">
                      <div className="space-y-10">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-8 bg-identity-sky rounded-full"></div>
                          <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter">
                            Personal Details
                          </h3>
                        </div>
                        <div className="space-y-8">
                          {[
                            {
                              label: "Primary Name",
                              name: "firstName",
                              icon: User,
                            },
                            {
                              label: "Family Name",
                              name: "lastName",
                              icon: User,
                            },
                            {
                              label: "Cognitive Link (Email)",
                              name: "email",
                              icon: Mail,
                            },
                          ].map((field) => (
                            <div key={field.name}>
                              <InputField
                                label={field.label}
                                name={field.name}
                                type={field.name === "email" ? "email" : "text"}
                                value={(formData as any)[field.name] || ""}
                                onChange={handleChange}
                                disabled={!isEditing}
                                icon={field.icon}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-10">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-8 bg-identity-navy rounded-full"></div>
                          <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter">
                            Academic Classes
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-8">
                          {[
                            {
                              label: "Entity ID",
                              value: formData.studentId || formData.schoolId,
                              icon: Fingerprint,
                            },
                            {
                              label: "Mapped Course",
                              value: formData.course,
                              icon: GraduationCap,
                            },
                            {
                              label: "Academic Year",
                              value: formData.yearLevel,
                              icon: Database,
                            },
                            {
                              label: "Assigned Section",
                              value: formData.section || "NOT_ASSIGNED",
                              icon: MapPin,
                            },
                            {
                              label: "Term Reference",
                              value: academicSettings?.schoolYear,
                              icon: FileText,
                            },
                            {
                              label: "Temporal Phase",
                              value: academicSettings?.semester,
                              icon: Clock,
                            },
                          ].map((field, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-sm group hover:border-identity-sky/30 transition-all"
                            >
                              <div className="flex items-center gap-4 mb-3">
                                <div className="bg-identity-sky/10 rounded-2xl p-3 text-identity-navy border border-identity-sky/10 shadow-sm group-hover:scale-110 transition-transform">
                                  <field.icon size={14} />
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                  {field.label}
                                </span>
                              </div>
                              <p className="text-[11px] font-black text-identity-navy uppercase tracking-[0.15em] truncate">
                                {field.value || "N/A"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "face" &&
                  (!isEditingFaceData ? (
                    <div className="space-y-12 animate-fade-in">
                      {/* Header HUD */}
                      <div className="bg-identity-navy p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-3xl border border-white/5 relative overflow-hidden group">
                        <IdentityNode className="top-0 right-0 -translate-y-1/2 translate-x-1/2 opacity-20 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/20 to-transparent opacity-30"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <h3 className="text-white font-black uppercase text-3xl tracking-tighter leading-none">
                                Face Profile
                              </h3>
                              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[8px] font-black uppercase tracking-[0.15em]">
                                Secured
                              </div>
                            </div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">
                              5 of 5 Biometric Nodes Updated Latest Sync:{" "}
                              {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setIsEditingFaceData(true)}
                            className="bg-identity-sky text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-identity-sky/30 hover:bg-white hover:text-identity-navy transition-all active:scale-95 flex items-center gap-4"
                          >
                            <RefreshCw size={16} /> Re-Scan Identity
                          </button>
                        </div>
                      </div>

                      {/* Preview Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                        {["Front", "Left", "Right", "Up", "Down"].map(
                          (angle) => {
                            const photo = facePhotos.find(
                              (p) =>
                                p.angle.toLowerCase() === angle.toLowerCase(),
                            );
                            const photoUrl = photo
                              ? getProfilePictureUrl(photo.photo_url)
                              : null;
                            return (
                              <div key={angle} className="space-y-4 group">
                                <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 border-slate-100 bg-white relative shadow-lg group-hover:shadow-2xl group-hover:border-identity-sky/50 transition-all duration-500">
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={angle}
                                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                      <User size={48} className="opacity-20" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 bg-identity-navy/90 backdrop-blur-md py-4 text-center border-t border-white/10 translate-y-1 transition-transform group-hover:translate-y-0">
                                    <span className="text-white text-[9px] font-black uppercase tracking-[0.3em]">
                                      {angle}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
                        <Info
                          className="text-identity-sky flex-shrink-0 mt-1"
                          size={20}
                        />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-relaxed">
                          Keep your photos updated to ensure you are accurately
                          recognized during classes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fade-in space-y-12">
                      <div className="flex items-center justify-between bg-white/50 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl">
                        <div className="space-y-1">
                          <h3 className="text-identity-navy font-black uppercase text-2xl tracking-tighter">
                            Biometric Override
                          </h3>
                          <p className="text-identity-sky text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                            Starting Camera...
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEditingFaceData(false)}
                          className="bg-slate-100 text-slate-400 hover:text-rose-500 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] transition-all border border-slate-200 hover:border-rose-200"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="max-w-3xl mx-auto">
                        <FaceEnrollmentScanner
                          requireAll={true}
                          initialCaptures={facePhotos.reduce(
                            (acc, p) => ({
                              ...acc,
                              [p.angle.toLowerCase()]: getProfilePictureUrl(
                                p.photo_url,
                              ),
                            }),
                            {},
                          )}
                          onComplete={async (newCaptures) => {
                            setNewFacePhotos(newCaptures);
                            setIsTraining(true);
                            try {
                              const token = getToken();
                              await axios.post(
                                `${API_URL}/api/auth/update-face-data`,
                                {
                                  userId: user?.id,
                                  facePhotos: newCaptures,
                                },
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );

                              const authAxios = createAuthAxios();
                              const meRes = await authAxios.get(
                                `${API_URL}/api/auth/me`,
                              );
                              setUser(meRes.data);
                              fetchFacePhotos(meRes.data.id);
                              localStorage.setItem(
                                "img_version",
                                Date.now().toString(),
                              );

                              showToast("Data Successfully Updated", "success");
                              setIsEditingFaceData(false);
                            } catch (err) {
                              console.error("Sync failed:", err);
                              showToast(
                                "Protocol Communication Error",
                                "error",
                              );
                            } finally {
                              setIsTraining(false);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}

                {activeTab === "security" && (
                  <div className="max-w-2xl mx-auto py-8">
                    <div className="text-center mb-16">
                      <div className="w-20 h-20 bg-identity-navy rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-identity-navy/20 text-white">
                        <Lock size={32} />
                      </div>
                      <h3 className="text-3xl font-black text-identity-navy uppercase tracking-tighter">
                        Security Protocols
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">
                        Rotate keys regularly for optimal safety
                      </p>
                    </div>

                    <form
                      onSubmit={handleChangePassword}
                      className="space-y-8 bg-slate-50/50 p-12 rounded-[3rem] border border-slate-100 shadow-inner"
                      autoComplete="off"
                    >
                      {[
                        {
                          label: "Current Phrase",
                          name: "currentPassword",
                          type: "password",
                          show: showCurrentPassword,
                          setShow: setShowCurrentPassword,
                        },
                        {
                          label: "New Signature",
                          name: "newPassword",
                          type: "password",
                          show: showNewPassword,
                          setShow: setShowNewPassword,
                        },
                        {
                          label: "Confirm Signature",
                          name: "confirmPassword",
                          type: "password",
                          show: showConfirmPassword,
                          setShow: setShowConfirmPassword,
                        },
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
                                className="text-slate-300 hover:text-identity-sky transition-colors mr-2"
                              >
                                {field.show ? (
                                  <EyeOff size={20} />
                                ) : (
                                  <Eye size={20} />
                                )}
                              </button>
                            }
                          />
                          {field.name === "newPassword" &&
                            passwordData.newPassword &&
                            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(
                              passwordData.newPassword,
                            ) && (
                              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-4 mt-4 animate-in slide-in-from-top-2">
                                <XCircle
                                  size={16}
                                  className="text-rose-500 mt-0.5"
                                />
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.15em] leading-relaxed">
                                  Requires: 8+ Chars, [A-Z], [a-z], [0-9],
                                  [@!#$]
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                      <button
                        type="submit"
                        className="w-full bg-identity-navy hover:bg-identity-sky text-white font-black py-6 rounded-[2rem] text-[10px] uppercase tracking-[0.4em] transition-all shadow-3xl shadow-identity-navy/20 active:scale-[0.98] mt-4"
                      >
                        Update Security Key
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === "privacy" && (
                  <div className="space-y-12">
                    <div className="bg-identity-sky/5 border border-identity-sky/10 text-identity-navy p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-identity-sky"></div>
                      <div className="p-5 bg-white rounded-3xl text-identity-sky shadow-xl">
                        <Shield size={32} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">
                          Philippine Data Privacy Act
                        </h4>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed max-w-2xl">
                          Your privacy is our core mandate. We are fully
                          compliant with the Data Privacy Act of 2012 (RA
                          10173). Your biometric data is encrypted and never
                          shared.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 border border-slate-200 shadow-xl">
                        <h3 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter flex items-center gap-4">
                          <FileText size={24} className="text-identity-sky" />
                          Active Consents
                        </h3>
                        {consentLoading ? (
                          <div className="flex justify-center p-12">
                            <RefreshCw className="animate-spin text-slate-200" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {[
                              {
                                label: "Privacy Consent",
                                status: consentStatus?.biometricAccepted,
                              },
                              {
                                label: "Privacy Policy Agreement",
                                status: consentStatus?.privacyPolicyAccepted,
                              },
                            ].map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-emerald-200 transition-all"
                              >
                                <span className="text-[10px] font-black text-identity-navy uppercase tracking-[0.15em]">
                                  {item.label}
                                </span>
                                <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl text-[9px] font-black border border-emerald-500/10 uppercase tracking-[0.1em] italic">
                                  {item.status ? (
                                    <CheckCircle2 size={14} />
                                  ) : (
                                    <AlertTriangle size={14} />
                                  )}
                                  {item.status ? "Consented" : "Awaiting"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 border border-slate-200 shadow-xl overflow-hidden">
                        <h3 className="text-xl font-black text-identity-navy mb-8 uppercase tracking-tighter">
                          Timeline Logs
                        </h3>
                        <div className="overflow-x-auto max-h-[300px] pr-4 scrollbar-hide table-responsive-wrapper">
                          <table className="w-full text-[9px] font-black uppercase tracking-[0.15em] leading-none">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="text-left py-4 text-slate-400">
                                  Date Log
                                </th>
                                <th className="text-left py-4 text-slate-400">
                                  Parameter
                                </th>
                                <th className="text-right py-4 text-slate-400">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {consentHistory.map(
                                (record: any, index: number) => (
                                  <tr
                                    key={index}
                                    className="group hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="py-5 text-slate-500">
                                      {new Date(
                                        record.timestamp,
                                      ).toLocaleDateString()}
                                    </td>
                                    <td className="py-5 text-identity-navy">
                                      {record.consent_type.replace("_", " ")}
                                    </td>
                                    <td className="py-5 text-right">
                                      <span
                                        className={
                                          record.consent_given
                                            ? "text-emerald-500"
                                            : "text-rose-500"
                                        }
                                      >
                                        {record.consent_given
                                          ? "SYNCED"
                                          : "REVOKED"}
                                      </span>
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-3xl text-white relative overflow-hidden group">
                      <IdentityNode className="bottom-0 right-0 translate-y-1/3 translate-x-1/3 opacity-10 group-hover:scale-125 transition-transform duration-[2s]" />
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">
                        Identity Rights Hub
                      </h3>
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-12">
                        Exercise your digital sovereignty
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <button
                          onClick={async () => {
                            try {
                              showToast("Generating PDF Report...", "info");
                              const API_URL =
                                process.env.NEXT_PUBLIC_API_URL || "";
                              const token = getToken();
                              const res = await axios.post(
                                `${API_URL}/api/data-rights/export`,
                                { userId: user?.userId },
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );
                              generatePrivacyReport(res.data);
                              showToast("Identity Report Exported", "success");
                            } catch (error) {
                              showToast("Export Failed", "error");
                            }
                          }}
                          className="flex flex-col items-center gap-6 p-10 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white hover:text-identity-navy transition-all group active:scale-95"
                        >
                          <Download
                            size={32}
                            className="text-identity-sky group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                            Export Data
                          </span>
                        </button>

                        <Link
                          href="/privacy-policy"
                          className="flex flex-col items-center gap-6 p-10 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white hover:text-identity-navy transition-all group active:scale-95"
                        >
                          <FileText
                            size={32}
                            className="text-identity-sky group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                            Terms of Service
                          </span>
                        </Link>

                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Identity Deletion",
                              message:
                                "Request total identity deletion? All facial profile data will be permanently deleted. This cannot be undone.",
                              type: "danger",
                              confirmText: "Delete Identity",
                              onConfirm: async () => {
                                try {
                                  const API_URL =
                                    process.env.NEXT_PUBLIC_API_URL || "";
                                  const token = getToken();
                                  await axios.post(
                                    `${API_URL}/api/data-rights/delete`,
                                    {
                                      userId: user?.userId,
                                      reason: "Manual Delete",
                                    },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    },
                                  );
                                  showToast(
                                    "Action Successful",
                                    "Account Deletion Started",
                                    "success",
                                  );
                                  setConfirmModal((prev) => ({
                                    ...prev,
                                    isOpen: false,
                                  }));
                                } catch (error) {
                                  showToast(
                                    "Action Failed",
                                    "Request Failed",
                                    "error",
                                  );
                                  setConfirmModal((prev) => ({
                                    ...prev,
                                    isOpen: false,
                                  }));
                                }
                              },
                            });
                          }}
                          className="flex flex-col items-center gap-6 p-10 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] hover:bg-rose-500 hover:text-white transition-all group active:scale-95"
                        >
                          <Trash2
                            size={32}
                            className="text-rose-500 group-hover:scale-110 group-hover:text-white transition-all"
                          />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                            Delete Account
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "feedback" && (
                  <div className="animate-fade-in max-w-3xl mx-auto text-center py-16 space-y-12">
                    <div className="space-y-6">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-identity-sky/10 text-identity-sky mb-4 shadow-inner">
                        <MessageSquare size={44} />
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-identity-navy uppercase tracking-tighter">
                        Feedback Form
                      </h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-relaxed max-w-xl mx-auto">
                        Help improve LabFace. Your feedback is sent directly to
                        our developer team.
                      </p>
                    </div>

                    <div className="relative group mx-auto max-w-fit">
                      <div className="absolute -inset-4 bg-gradient-to-tr from-identity-sky to-identity-navy rounded-[3.5rem] opacity-20 blur-2xl group-hover:opacity-40 transition-opacity"></div>
                      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-3xl relative z-10 border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                        <img
                          src="/feedback-qr.png"
                          alt="Scan QR"
                          className="w-64 h-64 object-contain grayscale-0 group-hover:grayscale-0 transition-all"
                        />
                        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-4 text-identity-navy font-black text-[12px] uppercase tracking-[0.3em]">
                          <ExternalLink
                            size={20}
                            className="text-identity-sky"
                          />{" "}
                          Scan to Synchronize
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em] mt-10">
                      Your data is encrypted securely.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t border-slate-200/50 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
            LabFace Identity Management v2.0 {new Date().getFullYear()}
          </p>
        </div>
      </footer>

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
