"use client";
import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Edit2,
  Save,
  RotateCcw,
  Download,
  Users,
  History,
  Camera,
  Upload,
  Ban,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import axios from "axios";
import ConfirmModal from "./ConfirmModal";

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number | null;
  className: string;
  initialView?: "list" | "history";
  isArchived?: boolean;
}

export default function ClassDetailsModal({
  isOpen,
  onClose,
  classId,
  className,
  initialView = "list",
  isArchived,
}: ClassDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "history">(initialView);
  const [filterDate, setFilterDate] = useState("");
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>(
    [],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>({});
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "danger" | "warning" | "success";
    confirmText: string;
    isAlert: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    isAlert: false,
    onConfirm: () => {},
  });

  // Excuse Modal State
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [excuseTarget, setExcuseTarget] = useState<any>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [excuseFile, setExcuseFile] = useState<File | null>(null);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelDate, setCancelDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Snapshot Modal State
  const [snapshotModal, setSnapshotModal] = useState<{
    isOpen: boolean;
    url: string;
    studentName: string;
    date: string;
  }>({ isOpen: false, url: "", studentName: "", date: "" });

  useEffect(() => {
    if (isOpen && classId) {
      fetchClassDetails();
    } else {
      setStudents([]);
      setSessions([]);
      setIsEditing(false);
      setPendingChanges({});
    }
  }, [isOpen, classId]);

  const fetchClassDetails = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/classes/${classId}/attendance-grid`,
      );
      setStudents(res.data.students || []);
      setSessions(res.data.sessions || []);
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClass = async () => {
    if (!cancelDate || !cancelReason) return;
    setIsCancelling(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/classes/${classId}/cancellations`,
        {
          date: cancelDate,
          reason: cancelReason,
        },
      );
      setIsCancelModalOpen(false);
      setCancelDate("");
      setCancelReason("");
      fetchClassDetails();
    } catch (e) {
      console.error("Cancellation failed:", e);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStatusChange = (
    enrollmentId: number,
    studentId: number,
    sessionId: number,
    status: string,
  ) => {
    if (status === "Excused") {
      const student = students.find((s) => s.enrollmentId === enrollmentId);
      const session = sessions.find((s) => s.id === sessionId);
      setExcuseTarget({
        student,
        session,
        logId: student.attendance.find((a: any) => a.sessionId === sessionId)
          ?.id,
      });
      setExcuseReason("");
      setExcuseFile(null);
      setIsExcuseModalOpen(true);
      return;
    }

    setPendingChanges((prev: any) => ({
      ...prev,
      [`${enrollmentId}-${sessionId}`]: {
        enrollmentId,
        studentId,
        sessionId,
        status,
      },
    }));

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId) return s;
        return {
          ...s,
          attendance: s.attendance.map((sess: any) => {
            if (sess.sessionId !== sessionId) return sess;
            return { ...sess, status, recognitionMethod: "Manual" };
          }),
        };
      }),
    );
  };

  const submitExcuse = async () => {
    if (!excuseReason) return;
    setIsSubmittingExcuse(true);
    try {
      let letterUrl = "";
      if (excuseFile) {
        const formData = new FormData();
        formData.append("file", excuseFile);
        const uploadRes = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/upload-excuse`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        letterUrl = uploadRes.data.url;
      }

      let targetLogId = excuseTarget.logId;

      if (!targetLogId) {
        const createRes = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/manual-update`,
          {
            enrollmentId: excuseTarget.student.enrollmentId,
            studentId: excuseTarget.student.studentId,
            sessionId: excuseTarget.session.id,
            status: "Absent",
          },
        );

        if (createRes.data && createRes.data.id) {
          targetLogId = createRes.data.id;
        } else {
          throw new Error("Failed to create attendance record");
        }
      }

      if (targetLogId) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/excuse`,
          {
            attendanceLogId: targetLogId,
            reason: excuseReason,
            letterUrl,
          },
        );
      }

      setIsExcuseModalOpen(false);
      fetchClassDetails();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingExcuse(false);
    }
  };

  const saveChanges = async () => {
    try {
      const updates = Object.values(pendingChanges);
      await Promise.all(
        updates.map((update: any) =>
          axios.put(
            `${process.env.NEXT_PUBLIC_API_URL || ""}/api/attendance/manual-update`,
            update,
          ),
        ),
      );
      setIsEditing(false);
      setPendingChanges({});
      fetchClassDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPendingChanges({});
    fetchClassDetails();
  };

  const downloadAttendance = () => {
    if (!classId) return;
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/classes/${classId}/export-attendance`,
      "_blank",
    );
  };

  const filteredSessions = sessions
    .filter((s) => {
      if (!filterDate) return true;
      return s.date.startsWith(filterDate);
    })
    .sort((a, b) => {
      const timeA = new Date(
        `${a.date.split("T")[0]}T${a.startTime}`,
      ).getTime();
      const timeB = new Date(
        `${b.date.split("T")[0]}T${b.startTime}`,
      ).getTime();
      return timeA - timeB;
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#041C3C]/40 backdrop-blur-2xl flex items-center justify-center z-50 animate-in fade-in duration-500 p-4 font-outfit">
      <div className="bg-white w-full max-w-[96vw] h-[92vh] rounded-3xl border border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 relative">
        {/* Background Decorations */}
        <div className="absolute inset-x-0 top-0 h-full z-0 opacity-[0.03] pointer-events-none bg-blueprint" />
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5CB4E4]/30 to-transparent z-20 animate-scan-y opacity-30 pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center p-6 md:p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-transparent relative z-10 shrink-0 gap-8">
          <div className="flex items-center gap-8">
            <div className="bg-[#041C3C] text-[#5CB4E4] p-5 rounded-[2rem] shadow-2xl border border-[#5CB4E4]/20">
              <FileText size={32} />
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-[#041C3C] uppercase tracking-tighter italic leading-none mb-3">
                {className}
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#5CB4E4] animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-70">
                  Class Overview:{" "}
                  {viewMode === "list"
                    ? "Student Profiles"
                    : "Attendance History"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-[#041C3C]/5 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode("list")}
                className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === "list" ? "bg-[#041C3C] text-white shadow-lg" : "text-slate-400 hover:text-[#041C3C] hover:bg-white"}`}
              >
                <Users size={14} /> Students
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === "history" ? "bg-[#041C3C] text-white shadow-lg" : "text-slate-400 hover:text-[#041C3C] hover:bg-white"}`}
              >
                <History size={14} /> History
              </button>
            </div>

            {viewMode === "history" && (
              <button
                onClick={downloadAttendance}
                className="flex items-center gap-3 px-8 py-5 bg-[#5CB4E4] hover:bg-[#041C3C] text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl shadow-identity-sky/20 active:scale-95 group"
              >
                <Download size={16} /> Export
              </button>
            )}

            {!isEditing ? (
              !isArchived &&
              viewMode === "history" && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-3 px-8 py-5 bg-[#041C3C] hover:bg-[#5CB4E4] text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl shadow-identity-navy/20 active:scale-95 group"
                >
                  <Edit2 size={16} /> Modify
                </button>
              )
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={cancelEdit}
                  className="px-8 py-5 bg-white/60 text-slate-500 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border border-slate-200 shadow-inner group hover:text-rose-500 italic"
                >
                  REVERT_CHANGES
                </button>
                <button
                  onClick={saveChanges}
                  className="px-8 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl active:scale-95"
                >
                  COMMIT_UPDATES
                </button>
              </div>
            )}

            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="w-14 h-14 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all duration-500 border border-rose-500/20 active:scale-90"
              title="Cancel Class"
            >
              <Ban size={24} />
            </button>
            <button
              onClick={onClose}
              className="w-14 h-14 flex items-center justify-center bg-white/60 hover:bg-[#041C3C] text-slate-400 hover:text-white rounded-2xl transition-all duration-500 border border-slate-200 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden p-8 md:p-14 relative z-10">
          {loading ? (
            <div className="fixed inset-0 bg-[#041C3C]/95 z-[60] flex items-center justify-center p-8 backdrop-blur-2xl font-outfit animate-in fade-in duration-500">
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="w-20 h-20 bg-white/10 rounded-3xl border border-white/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 border-2 border-[#5CB4E4] border-t-transparent rounded-3xl animate-spin" />
                  <Activity className="text-[#5CB4E4] w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">
                    Loading Data...
                  </h3>
                  <p className="text-[10px] font-black text-[#5CB4E4] uppercase tracking-[0.4em] italic opacity-60">
                    Synchronizing Class Records
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-w-0">
              {/* Stats Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                {[
                  {
                    label: "Students",
                    value: students.length,
                    suffix: "",
                    icon: Users,
                    color: "text-[#041C3C]",
                    bg: "bg-[#041C3C]/5",
                  },
                  {
                    label: "History",
                    value: sessions.length,
                    suffix: "Entries",
                    icon: Activity,
                    color: "text-[#5CB4E4]",
                    bg: "bg-[#5CB4E4]/5",
                  },
                  {
                    label: "Attendance Rate",
                    value:
                      sessions.length > 0
                        ? Math.round(
                            (students.reduce(
                              (acc, s) =>
                                acc +
                                s.attendance.filter(
                                  (a: any) =>
                                    a.status === "Present" ||
                                    a.status === "Late",
                                ).length,
                              0,
                            ) /
                              (students.length * sessions.length)) *
                              100,
                          )
                        : 0,
                    suffix: "%",
                    icon: ShieldCheck,
                    color: "text-emerald-500",
                    bg: "bg-emerald-50",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`${stat.bg} p-4 rounded-2xl border border-slate-100 relative group overflow-hidden transition-all duration-300 hover:shadow-md`}
                  >
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start mb-1">
                        <div
                          className={`p-2 rounded-lg bg-white shadow-sm ${stat.color}`}
                        >
                          <stat.icon size={16} />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                          {stat.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-2xl font-black ${stat.color} italic`}
                        >
                          {stat.value}
                          {stat.suffix}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Table Interface */}
              <div
                className={`flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-inner overflow-hidden ${isEditing ? "ring-8 ring-[#5CB4E4]/10 border-[#5CB4E4]/30" : ""}`}
              >
                {viewMode === "list" ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden font-outfit flex flex-col min-h-0 h-full">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#041C3C] text-white">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest italic">
                              Student Name
                            </th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest italic">
                              Student ID
                            </th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest italic">
                              Status
                            </th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest italic text-right">
                              Attendance %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((student: any) => (
                            <tr
                              key={student.enrollmentId}
                              className="hover:bg-slate-50 transition-all group"
                            >
                              <td className="px-8 py-3">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-lg bg-[#041C3C]/5 flex items-center justify-center text-[#041C3C] font-black text-[10px] group-hover:bg-[#5CB4E4] group-hover:text-white transition-all">
                                    {student.studentName.charAt(0)}
                                  </div>
                                  <span className="text-sm font-black text-[#041C3C] uppercase italic leading-none">
                                    {student.studentName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                  {student.studentNumber || "N/A"}
                                </span>
                              </td>
                              <td className="px-8 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${student.studentId ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`}
                                  />
                                  <span className="text-[10px] font-black text-[#041C3C] uppercase tracking-widest italic">
                                    {student.studentId
                                      ? "Enrolled"
                                      : "Not Registered"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-3 text-right">
                                <span className="text-base font-black text-[#041C3C] italic">
                                  {sessions.length > 0
                                    ? Math.round(
                                        (student.attendance.filter(
                                          (a: any) =>
                                            a.status === "Present" ||
                                            a.status === "Late",
                                        ).length /
                                          sessions.length) *
                                          100,
                                      )
                                    : 0}
                                  %
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Timeline Filters */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden font-outfit flex flex-col min-h-0 h-full">
                      <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-10 h-10 bg-[#041C3C] text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Calendar size={20} />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                              Filter History
                            </span>
                            <div className="relative">
                              <select
                                value={
                                  filterDate
                                    ? new Date(filterDate + "T00:00:00")
                                        .getMonth()
                                        .toString()
                                    : ""
                                }
                                onChange={(e) => {
                                  if (e.target.value === "") {
                                    setFilterDate("");
                                    return;
                                  }
                                  const currentYear = new Date().getFullYear();
                                  const month = parseInt(e.target.value) + 1;
                                  setFilterDate(
                                    `${currentYear}-${month.toString().padStart(2, "0")}-01`,
                                  );
                                }}
                                className="bg-white border-2 border-slate-200 rounded-xl px-6 py-2 text-[11px] font-black uppercase tracking-widest text-[#041C3C] appearance-none cursor-pointer hover:border-[#5CB4E4] transition-all pr-12 focus:outline-none focus:ring-2 focus:ring-[#5CB4E4]/20"
                              >
                                <option value="">All Months</option>
                                {[
                                  "JANUARY",
                                  "FEBRUARY",
                                  "MARCH",
                                  "APRIL",
                                  "MAY",
                                  "JUNE",
                                  "JULY",
                                  "AUGUST",
                                  "SEPTEMBER",
                                  "OCTOBER",
                                  "NOVEMBER",
                                  "DECEMBER",
                                ].map((m, i) => (
                                  <option key={i} value={i}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50">
                                <th className="px-8 py-4 text-[10px] font-black text-[#041C3C] uppercase tracking-widest border-b border-slate-200">
                                  Attendance Grid
                                </th>
                                {filteredSessions.map((session: any) => (
                                  <th
                                    key={session.id}
                                    className="px-6 py-4 border-b border-slate-200 min-w-[120px]"
                                  >
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                                        {new Date(session.date)
                                          .toLocaleDateString("en-US", {
                                            weekday: "short",
                                          })
                                          .toUpperCase()}
                                      </span>
                                      <span className="text-sm font-black text-[#041C3C] uppercase italic leading-none">
                                        {new Date(session.date)
                                          .toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })
                                          .toUpperCase()}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {students.map((student: any) => (
                                <tr
                                  key={student.enrollmentId}
                                  className="hover:bg-slate-50 transition-colors group"
                                >
                                  <td className="px-8 py-3 border-r border-slate-100">
                                    <div className="flex items-center gap-4">
                                      <div className="w-8 h-8 rounded-lg bg-[#041C3C]/5 flex items-center justify-center text-[#041C3C] font-black text-[10px]">
                                        {student.studentName.charAt(0)}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-black text-[#041C3C] uppercase italic leading-none mb-1">
                                          {student.studentName}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                          {student.studentNumber || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  {filteredSessions.map((session) => {
                                    const record = student.attendance.find(
                                      (a: any) => a.sessionId === session.id,
                                    );
                                    const status = record?.status || "Absent";
                                    return (
                                      <td
                                        key={session.id}
                                        className="px-4 py-3 text-center"
                                      >
                                        {isEditing ? (
                                          <select
                                            value={status}
                                            onChange={(e) =>
                                              handleStatusChange(
                                                student.enrollmentId,
                                                student.studentId,
                                                session.id,
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full bg-transparent text-center text-[10px] font-black uppercase tracking-widest cursor-pointer focus:outline-none transition-all rounded-lg py-1.5 ${
                                              status === "Present"
                                                ? "text-emerald-600 bg-emerald-50"
                                                : status === "Late"
                                                  ? "text-amber-600 bg-amber-50"
                                                  : status === "Absent"
                                                    ? "text-rose-600 bg-rose-50"
                                                    : "text-sky-600 bg-sky-50"
                                            }`}
                                          >
                                            <option value="Present">Present</option>
                                            <option value="Late">Late</option>
                                            <option value="Absent">Absent</option>
                                            <option value="Excused">Excused</option>
                                          </select>
                                        ) : (
                                          <span
                                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                              status === "Present"
                                                ? "text-emerald-600 bg-emerald-50"
                                                : status === "Late"
                                                  ? "text-amber-600 bg-amber-50"
                                                  : status === "Absent"
                                                    ? "text-rose-600 bg-rose-50"
                                                    : "text-sky-600 bg-sky-50"
                                            }`}
                                          >
                                            {status}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Modals Redesigned */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        isAlert={confirmModal.isAlert}
      />

      {isExcuseModalOpen && (
        <div className="fixed inset-0 bg-[#041C3C]/60 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white border border-white/20 w-full max-w-xl rounded-[4rem] shadow-4xl p-16 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-full z-0 opacity-[0.03] pointer-events-none bg-blueprint" />
            <div className="relative z-10 space-y-12">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-[#5CB4E4]/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-[#5CB4E4]/20 text-[#5CB4E4]">
                  <ShieldCheck size={40} />
                </div>
                <h3 className="text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic">
                  Manual Attendance Override
                </h3>
                <div className="h-1 w-20 bg-[#5CB4E4]/30 rounded-full mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">
                  Authorizing Manual Status Change
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-4 italic">
                    Student Name
                  </p>
                  <p className="text-2xl font-black text-[#041C3C] uppercase italic tracking-tight">
                    {excuseTarget?.student?.studentName}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 italic">
                    Reason for Exception
                  </label>
                  <textarea
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-[2rem] p-8 text-sm font-black text-[#041C3C] focus:ring-8 focus:ring-[#5CB4E4]/10 transition-all outline-none shadow-sm min-h-[160px] italic placeholder:text-slate-100"
                    placeholder="Enter the reason for this attendance change..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 italic">
                    Attach Document (Optional)
                  </label>
                  <label className="flex items-center gap-6 p-6 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:border-[#5CB4E4] hover:bg-slate-50 transition-all group">
                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-[#5CB4E4] shadow-xl group-hover:scale-110 transition-all">
                      <Upload size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-black text-[#041C3C] uppercase tracking-[0.2em] italic truncate">
                        {excuseFile
                          ? excuseFile.name
                          : "Click to Upload Document"}
                      </p>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">
                        LIMIT: 10_MB_JPG_PDF
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        e.target.files && setExcuseFile(e.target.files[0])
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-6 pt-10 border-t border-slate-100">
                <button
                  onClick={() => setIsExcuseModalOpen(false)}
                  className="flex-1 py-6 bg-white text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] rounded-[2rem] border border-slate-200 hover:bg-slate-50 transition-all italic"
                >
                  ABORT
                </button>
                <button
                  onClick={submitExcuse}
                  disabled={isSubmittingExcuse || !excuseReason}
                  className="flex-1 py-6 bg-[#041C3C] hover:bg-[#5CB4E4] text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-[2rem] shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-4 italic group"
                >
                  {isSubmittingExcuse ? "PROCESSING..." : "Confirm Update"}{" "}
                  <CheckCircle
                    size={18}
                    className="group-hover:scale-125 transition-transform"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-rose-950/40 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white border border-rose-100 w-full max-w-xl rounded-[4rem] shadow-4xl p-16 animate-in slide-in-from-bottom-10 duration-500 text-center">
            <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl border border-rose-100 text-rose-500">
              <Ban size={48} className="animate-pulse" />
            </div>
            <h3 className="text-4xl font-black text-[#041C3C] uppercase tracking-tighter italic mb-6">
              Archive Session
            </h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-12 opacity-60">
              Confirming permanent archival of class session
            </p>

            <div className="space-y-8 text-left mb-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 italic">
                  ARCHIVAL_DATE
                </label>
                <input
                  type="date"
                  value={cancelDate}
                  onChange={(e) => setCancelDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.8rem] p-6 text-sm font-black text-[#041C3C] focus:ring-8 focus:ring-rose-500/10 transition-all outline-none italic"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 italic">
                  Reason for Archiving
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.8rem] p-8 text-sm font-black text-[#041C3C] focus:ring-8 focus:ring-rose-500/10 transition-all outline-none italic min-h-[120px]"
                  placeholder="Enter reasoning for archival..."
                />
              </div>
            </div>

            <div className="flex gap-6">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-6 bg-white text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] rounded-[2rem] border border-slate-200 hover:bg-slate-50 transition-all italic"
              >
                ABORT
              </button>
              <button
                onClick={handleCancelClass}
                disabled={isCancelling || !cancelDate || !cancelReason}
                className="flex-1 py-6 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-[2rem] shadow-2xl shadow-rose-500/20 transition-all disabled:opacity-30 italic"
              >
                {isCancelling ? "PROCESSING..." : "ARCHIVE_SESSION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {snapshotModal.isOpen && (
        <div
          className="fixed inset-0 bg-[#041C3C]/80 backdrop-blur-3xl z-[110] flex items-center justify-center p-8 animate-in fade-in duration-500"
          onClick={() =>
            setSnapshotModal({
              isOpen: false,
              url: "",
              studentName: "",
              date: "",
            })
          }
        >
          <div
            className="bg-white/40 backdrop-blur-3xl w-full max-w-5xl rounded-[4.5rem] border border-white/20 shadow-4xl overflow-hidden animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-12 border-b border-white/20 flex justify-between items-center bg-white/60">
              <div className="flex items-center gap-8">
                <div className="bg-[#041C3C] text-[#5CB4E4] p-4 rounded-2xl shadow-xl">
                  <Camera size={24} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-[#041C3C] uppercase tracking-tighter italic leading-none mb-2">
                    Capture Snapshot
                  </h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">
                    Student: {snapshotModal.studentName} | Date:{" "}
                    {snapshotModal.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSnapshotModal({
                    isOpen: false,
                    url: "",
                    studentName: "",
                    date: "",
                  })
                }
                className="w-14 h-14 flex items-center justify-center bg-white/60 hover:bg-[#041C3C] text-slate-400 hover:text-white rounded-2xl transition-all duration-500 border border-slate-200 active:scale-90"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-16 flex items-center justify-center bg-slate-900 group">
              <img
                src={snapshotModal.url}
                alt="Capture Snapshot"
                className="max-w-full max-h-[60vh] object-contain rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transition-transform duration-1000 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/1200x800?text=OPTICAL_FEED_INTERRUPTED";
                  e.currentTarget.onerror = null;
                }}
              />
            </div>
            <div className="p-10 text-center bg-white/60">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.8em] italic animate-pulse">
                Establishing Visual Authenticity...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
