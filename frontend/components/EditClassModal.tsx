import { useState, useEffect, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import { X, UserPlus, Trash2, Save, Upload, AlertCircle, Settings, Users, FileSpreadsheet, CheckCircle, Search, UserMinus, Plus, Mail, Download, Edit2 } from 'lucide-react';
import axios from 'axios';

interface EditClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number | null;
    className: string;
    isArchived?: boolean;
    onSuccess: () => void;
}

export default function EditClassModal({ isOpen, onClose, classId, className, isArchived, onSuccess }: EditClassModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'roster'>('details');
    const [details, setDetails] = useState<any>({
        subject_code: '', subject_name: '', section: '', school_year: '', semester: '', schedule: []
    });
    const [students, setStudents] = useState<any[]>([]);
    const [previewData, setPreviewData] = useState<any>(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Manual add form
    const [newStudentNumber, setNewStudentNumber] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [formError, setFormError] = useState('');

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'info', confirmText: 'OK', isAlert: false, onConfirm: () => { } });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const schoolYears = Array.from({ length: 5 }, (_, i) => {
        const start = new Date().getFullYear() - 1 + i;
        return `${start}-${start + 1}`;
    });

    useEffect(() => {
        if (isOpen && classId) {
            fetchClassData();
            setActiveTab('details');
            setUploadStatus('');
            setPreviewData(null);
            setSelectedFile(null);
            setFormError('');
            setNewStudentNumber('');
            setNewFirstName('');
            setNewLastName('');
        }
    }, [isOpen, classId]);

    const fetchClassData = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}`);
            const cls = res.data.class;
            let schedule = [];
            try {
                schedule = typeof cls.schedule_json === 'string' ? JSON.parse(cls.schedule_json) : cls.schedule_json;
            } catch (e) { console.error('Schedule parse error', e); }

            setDetails({
                subject_code: cls.subject_code,
                subject_name: cls.subject_name,
                section: cls.section,
                school_year: cls.school_year || cls.academic_period?.school_year || '',
                semester: cls.semester || cls.academic_period?.semester || '',
                schedule: schedule || []
            });
            setStudents(res.data.students || []);
        } catch (error) {
            console.error('Error fetch class:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleChange = (idx: number, field: string, value: string) => {
        const newSchedule = [...details.schedule];
        newSchedule[idx] = { ...newSchedule[idx], [field]: value };
        setDetails({ ...details, schedule: newSchedule });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}`, {
                subjectCode: details.subject_code,
                subjectName: details.subject_name,
                section: details.section,
                schoolYear: details.school_year,
                semester: details.semester,
                schedule: details.schedule
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Update error', error);
            alert('Failed to update class');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/preview-roster`, formData);
            setPreviewData(res.data);
            setUploadStatus('');
        } catch (err: any) {
            setUploadStatus('Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/upload-roster`, formData);
            setPreviewData(null);
            setSelectedFile(null);
            fetchClassData();
            setUploadStatus('Upload successful!');
        } catch (err: any) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/students`, {
                studentNumber: newStudentNumber,
                firstName: newFirstName,
                lastName: newLastName
            });
            setNewStudentNumber('');
            setNewFirstName('');
            setNewLastName('');
            fetchClassData();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to add student');
        } finally {
            setSubmitting(false);
        }
    };

    const removeStudent = async (enrollmentId: number, name: string) => {
        if (!confirm(`Remove ${name} from class?`)) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/students/${enrollmentId}`);
            fetchClassData();
        } catch (e) { console.error(e); alert('Failed to remove'); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-slate-950 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Edit2 size={24} className="text-brand-500" /> Edit Class: {className}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'details' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <Settings size={16} /> General Info
                    </button>
                    {!isArchived && (
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'roster' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                            <Users size={16} /> Student Roster
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-slate-950">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full"></div>
                        </div>
                    ) : activeTab === 'details' ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Code</label>
                                    <input
                                        type="text"
                                        value={details.subject_code}
                                        onChange={e => setDetails({ ...details, subject_code: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Name</label>
                                    <input
                                        type="text"
                                        value={details.subject_name}
                                        onChange={e => setDetails({ ...details, subject_name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Section</label>
                                    <input
                                        type="text"
                                        value={details.section}
                                        readOnly
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">School Year</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.school_year}
                                            readOnly
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none cursor-not-allowed opacity-50"
                                        />
                                    ) : (
                                        <select
                                            value={details.school_year}
                                            onChange={e => setDetails({ ...details, school_year: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors"
                                            required
                                        >
                                            {schoolYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Semester</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.semester}
                                            readOnly
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none cursor-not-allowed opacity-50"
                                        />
                                    ) : (
                                        <select
                                            value={details.semester}
                                            onChange={e => setDetails({ ...details, semester: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors"
                                            required
                                        >
                                            <option value="1st Semester">1st Semester</option>
                                            <option value="2nd Semester">2nd Semester</option>
                                            <option value="Summer">Summer</option>
                                        </select>
                                    )}
                                </div>

                                {/* Schedule Editor */}
                                <div className={`col-span-full bg-slate-900 p-4 rounded-xl border border-slate-800 ${isArchived ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Schedule</label>
                                    {isArchived ? (
                                        <div className="space-y-2">
                                            {details.schedule.map((slot: any, idx: number) => (
                                                <div key={idx} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm">
                                                    {slot.day} • {slot.startTime} - {slot.endTime}
                                                </div>
                                            ))}
                                            {details.schedule.length === 0 && <div className="text-slate-500 text-sm italic">No schedule set</div>}
                                        </div>
                                    ) : (
                                        details.schedule.map((slot: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <select
                                                    value={slot.day}
                                                    onChange={e => handleScheduleChange(idx, 'day', e.target.value)}
                                                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                                                >
                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={e => handleScheduleChange(idx, 'startTime', e.target.value)}
                                                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                                                />
                                                <span className="text-slate-500 self-center">-</span>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={e => handleScheduleChange(idx, 'endTime', e.target.value)}
                                                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-800">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all"
                                >
                                    {submitting ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        activeTab === 'roster' && (
                            <div className="space-y-8">
                                {previewData ? (
                                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <FileSpreadsheet size={20} className="text-emerald-500" /> Preview Changes
                                            </h3>
                                            <div className="flex gap-2">
                                                <div className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-400">
                                                    Total in File: <span className="text-white font-bold">{previewData.summary.total_uploaded}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                                                <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">To Add</div>
                                                <div className="text-2xl font-bold text-emerald-500">{previewData.summary.to_add}</div>
                                            </div>
                                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                                                <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">To Remove</div>
                                                <div className="text-2xl font-bold text-red-500">{previewData.summary.to_remove}</div>
                                            </div>
                                            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Unchanged</div>
                                                <div className="text-2xl font-bold text-white">{previewData.summary.unchanged}</div>
                                            </div>
                                        </div>

                                        <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-800 text-xs text-slate-400 uppercase sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Status</th>
                                                        <th className="px-4 py-2 text-left">Name</th>
                                                        <th className="px-4 py-2 text-left">ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {previewData.changes.to_add.map((s: any, i: number) => (
                                                        <tr key={`add-${i}`} className="bg-emerald-500/5 hover:bg-emerald-500/10">
                                                            <td className="px-4 py-2 text-emerald-500 font-bold text-xs">NEW</td>
                                                            <td className="px-4 py-2 text-white">{s.student_name}</td>
                                                            <td className="px-4 py-2 text-slate-400 font-mono text-xs">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.to_remove.map((s: any, i: number) => (
                                                        <tr key={`rem-${i}`} className="bg-red-500/5 hover:bg-red-500/10">
                                                            <td className="px-4 py-2 text-red-500 font-bold text-xs">REM</td>
                                                            <td className="px-4 py-2 text-slate-300 line-through decoration-red-500/50">{s.student_name}</td>
                                                            <td className="px-4 py-2 text-slate-500 font-mono text-xs line-through">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.unchanged?.map((s: any, i: number) => (
                                                        <tr key={`uc-${i}`} className="hover:bg-slate-800/20">
                                                            <td className="px-4 py-2 text-slate-500 font-bold text-xs">KEEP</td>
                                                            <td className="px-4 py-2 text-slate-400">{s.student_name}</td>
                                                            <td className="px-4 py-2 text-slate-600 font-mono text-xs">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                            <button
                                                onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmUpload}
                                                disabled={uploading}
                                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
                                            >
                                                {uploading ? <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full" /> : <CheckCircle size={18} />}
                                                Confirm Update
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* CSV Upload */}
                                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 dashed-border">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <FileSpreadsheet size={16} className="text-emerald-500" /> Batch Upload Roster
                                            </h3>
                                            <div className="flex flex-col gap-4">
                                                <p className="text-xs text-slate-500">Upload a CSV or Excel file containing student numbers and names to bulk add students.</p>
                                                <div className="flex gap-3 items-center">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileUpload}
                                                        accept=".csv,.xlsx,.xls"
                                                        className="hidden"
                                                    />
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploading}
                                                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium border border-slate-600 transition-colors flex items-center gap-2"
                                                    >
                                                        {uploading ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></div>
                                                        ) : <Upload size={16} />}
                                                        Select File
                                                    </button>
                                                    {uploadStatus && (
                                                        <span className={`text-xs ${uploadStatus.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {uploadStatus}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Manual Add */}
                                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <UserPlus size={16} className="text-brand-500" /> Manually Add Student
                                            </h3>
                                            <form onSubmit={handleAddStudent} className="flex flex-col gap-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <input
                                                        type="text"
                                                        value={newStudentNumber}
                                                        onChange={e => setNewStudentNumber(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                                                        placeholder="Student ID"
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newFirstName}
                                                        onChange={e => setNewFirstName(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                                                        placeholder="First Name"
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newLastName}
                                                        onChange={e => setNewLastName(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                                                        placeholder="Last Name"
                                                        required
                                                    />
                                                </div>
                                                {formError && <p className="text-red-400 text-xs">{formError}</p>}
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="self-end bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Add Student
                                                </button>
                                            </form>
                                        </div>

                                        {/* List */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                                                Enrolled Students ({students.length})
                                            </h3>
                                            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden max-h-[400px] overflow-y-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-3 font-medium">Name</th>
                                                            <th className="px-4 py-3 font-medium">ID</th>
                                                            <th className="px-4 py-3 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {students.map((s) => (
                                                            <tr key={s.enrollment_id} className="hover:bg-slate-800/30">
                                                                <td className="px-4 py-3 text-slate-200">{s.full_name}</td>
                                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.user_id}</td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => removeStudent(s.enrollment_id, s.full_name)}
                                                                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                confirmText={confirmModal.confirmText}
                isAlert={confirmModal.isAlert}
            />
        </div >
    );
}
