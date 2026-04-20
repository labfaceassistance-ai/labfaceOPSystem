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

    const formatStudentId = (value: string) => {
        if (!value) return '';
        const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        let result = '';
        const definitions = [
            { length: 4, type: 'num' },   // YYYY
            { length: 5, type: 'num' },   // NNNNN
            { length: 2, type: 'char' },  // AA
            { length: 1, type: 'num' }    // N
        ];

        let currentPos = 0;
        for (let i = 0; i < definitions.length; i++) {
            const def = definitions[i];
            let segment = '';
            
            for (let j = 0; j < def.length && currentPos < raw.length; j++) {
                const char = raw[currentPos];
                if (def.type === 'num' && /[0-9]/.test(char)) {
                    segment += char;
                    currentPos++;
                } else if (def.type === 'char' && /[A-Z]/.test(char)) {
                    segment += char;
                    currentPos++;
                } else {
                    // Skip invalid char and continue
                    currentPos++;
                    j--; 
                }
            }

            if (segment.length > 0) {
                if (i > 0) result += '-';
                result += segment;
            }
            
            if (segment.length < def.length) break;
        }

        return result;
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
        setConfirmModal({
            isOpen: true,
            title: 'Remove Student',
            message: `Are you sure you want to remove "${name}" from this class cohort? This action will disconnect all attendance metrics for this specific class context.`,
            type: 'danger',
            confirmText: 'Remove Student',
            isAlert: false,
            onConfirm: async () => {
                try {
                    await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/students/${enrollmentId}`);
                    fetchClassData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false, isAlert: false }));
                } catch (e) { 
                    console.error(e); 
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to remove student from class fragment.',
                        type: 'danger',
                        confirmText: 'OK',
                        isAlert: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false, isAlert: false }))
                    });
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-identity-navy/20 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="identity-glass w-full max-w-4xl max-h-[90vh] rounded-3xl border border-identity-sky/10 shadow-3xl flex flex-col overflow-hidden animate-scale-up">
                <div className="flex justify-between items-center p-8 border-b border-identity-sky/10 bg-white/40">
                    <h2 className="text-2xl font-black text-identity-navy flex items-center gap-3 uppercase tracking-tight italic">
                        <Edit2 size={24} className="text-identity-sky" /> Edit Class: {className}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-identity-navy transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-identity-sky/10 bg-white/40">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${activeTab === 'details' ? 'text-white bg-identity-navy' : 'text-slate-400 hover:text-identity-navy hover:bg-white/60'}`}
                    >
                        <Settings size={16} /> General Info
                    </button>
                    {!isArchived && (
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${activeTab === 'roster' ? 'text-white bg-identity-navy' : 'text-slate-400 hover:text-identity-navy hover:bg-white/60'}`}
                        >
                            <Users size={16} /> Student Roster
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto p-8 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="animate-spin h-10 w-10 border-4 border-identity-sky/10 border-t-identity-sky rounded-full"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] italic animate-pulse">Synchronizing class data...</span>
                        </div>
                    ) : activeTab === 'details' ? (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 ml-1">Subject Code</label>
                                    <input
                                        type="text"
                                        value={details.subject_code}
                                        onChange={e => setDetails({ ...details, subject_code: e.target.value })}
                                        className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-sm font-bold text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 ml-1">Subject Name</label>
                                    <input
                                        type="text"
                                        value={details.subject_name}
                                        onChange={e => setDetails({ ...details, subject_name: e.target.value })}
                                        className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-sm font-bold text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 ml-1">Section</label>
                                    <input
                                        type="text"
                                        value={details.section}
                                        readOnly
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-[0.15em] cursor-not-allowed shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 ml-1">School Year</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.school_year}
                                            readOnly
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-[0.15em] cursor-not-allowed shadow-inner"
                                        />
                                    ) : (
                                        <select
                                            value={details.school_year}
                                            onChange={e => setDetails({ ...details, school_year: e.target.value })}
                                            className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-sm font-bold text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:outline-none transition-all shadow-inner"
                                            required
                                        >
                                            {schoolYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-3 ml-1">Semester</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.semester}
                                            readOnly
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-[0.15em] cursor-not-allowed shadow-inner"
                                        />
                                    ) : (
                                        <select
                                            value={details.semester}
                                            onChange={e => setDetails({ ...details, semester: e.target.value })}
                                            className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-sm font-bold text-identity-navy uppercase tracking-[0.15em] focus:border-identity-sky/50 focus:outline-none transition-all shadow-inner"
                                            required
                                        >
                                            <option value="1st Semester">1st Semester</option>
                                            <option value="2nd Semester">2nd Semester</option>
                                            <option value="Summer">Summer</option>
                                        </select>
                                    )}
                                </div>

                                {/* Schedule Editor */}
                                <div className={`col-span-full bg-identity-sky/5 p-8 rounded-2xl border border-identity-sky/10 shadow-inner ${isArchived ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-5 ml-1">Schedule Configuration</label>
                                    {isArchived ? (
                                        <div className="space-y-3">
                                            {details.schedule.map((slot: any, idx: number) => (
                                                <div key={idx} className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-3 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] shadow-inner">
                                                    {slot.day} • {slot.startTime} - {slot.endTime}
                                                </div>
                                            ))}
                                            {details.schedule.length === 0 && <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.15em] italic text-center py-4">No schedule set</div>}
                                        </div>
                                    ) : (
                                        details.schedule.map((slot: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 mb-4 animate-slide-in">
                                                <select
                                                    value={slot.day}
                                                    onChange={e => handleScheduleChange(idx, 'day', e.target.value)}
                                                    className="bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-2.5 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky/50 transition-all shadow-inner"
                                                >
                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={e => handleScheduleChange(idx, 'startTime', e.target.value)}
                                                    className="flex-1 bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-2.5 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky/50 transition-all shadow-inner"
                                                    style={{ colorScheme: 'light' }}
                                                />
                                                <span className="text-slate-200 self-center font-black">-</span>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={e => handleScheduleChange(idx, 'endTime', e.target.value)}
                                                    className="flex-1 bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-2.5 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky/50 transition-all shadow-inner"
                                                    style={{ colorScheme: 'light' }}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>

                            <div className="flex justify-end pt-8 border-t border-identity-sky/10">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-identity-navy hover:bg-identity-navy/90 text-white px-10 py-4 rounded-xl font-black uppercase tracking-[0.15em] flex items-center gap-3 shadow-lg shadow-identity-navy/20 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {submitting ? 'Updating Class...' : <><Save size={18} /> Update Logic</>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        activeTab === 'roster' && (
                            <div className="space-y-10 animate-in fade-in duration-300">
                                {previewData ? (
                                    <div className="bg-white/40 p-8 rounded-2xl border border-identity-sky/10 shadow-inner space-y-8">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xl font-black text-identity-navy flex items-center gap-3 uppercase tracking-tight italic">
                                                <FileSpreadsheet size={24} className="text-emerald-500" /> Preview List
                                            </h3>
                                            <div className="px-4 py-2 rounded-xl bg-white border border-identity-sky/10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 shadow-inner">
                                                Registered Students: <span className="text-identity-navy">{previewData.summary.total_uploaded}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-inner">
                                                <div className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.15em] mb-2">New Registrations</div>
                                                <div className="text-3xl font-black text-emerald-600 tracking-tighter">{previewData.summary.to_add}</div>
                                            </div>
                                            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-inner">
                                                <div className="text-rose-500/60 text-[10px] font-black uppercase tracking-[0.15em] mb-2">To Deprovision</div>
                                                <div className="text-3xl font-black text-rose-600 tracking-tighter">{previewData.summary.to_remove}</div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-2">Maintained</div>
                                                <div className="text-3xl font-black text-identity-navy tracking-tighter">{previewData.summary.unchanged}</div>
                                            </div>
                                        </div>

                                        <div className="border border-identity-sky/10 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto bg-white/40 shadow-inner table-responsive-wrapper">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 sticky top-0 border-b border-identity-sky/5">
                                                    <tr>
                                                        <th className="px-6 py-4">Status Vector</th>
                                                        <th className="px-6 py-4">Identity Name</th>
                                                        <th className="px-6 py-4">Unique ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-identity-sky/5 text-[10px] font-black uppercase tracking-[0.15em]">
                                                    {previewData.changes.to_add.map((s: any, i: number) => (
                                                        <tr key={`add-${i}`} className="bg-emerald-50/30 hover:bg-emerald-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 rounded bg-emerald-500 text-white text-[8px]">PROVISION</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-identity-navy">{s.student_name}</td>
                                                            <td className="px-6 py-4 text-slate-400 font-mono">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.to_remove.map((s: any, i: number) => (
                                                        <tr key={`rem-${i}`} className="bg-rose-50/30 hover:bg-rose-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 rounded bg-rose-500 text-white text-[8px]">TERMINATE</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-400 line-through decoration-rose-500/50">{s.student_name}</td>
                                                            <td className="px-6 py-4 text-slate-300 font-mono line-through">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.unchanged?.map((s: any, i: number) => (
                                                        <tr key={`uc-${i}`} className="hover:bg-identity-sky/5 transition-colors">
                                                            <td className="px-6 py-4 font-black text-slate-300">STABLE</td>
                                                            <td className="px-6 py-4 text-slate-500">{s.student_name}</td>
                                                            <td className="px-6 py-4 text-slate-300 font-mono">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex justify-end gap-6 pt-8 border-t border-identity-sky/10">
                                            <button
                                                onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                                                className="px-8 py-3 text-slate-400 hover:text-identity-navy font-black uppercase tracking-[0.15em] transition-colors italic"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmUpload}
                                                disabled={uploading}
                                                className="bg-identity-navy hover:bg-identity-navy/90 text-white px-10 py-4 rounded-xl font-black uppercase tracking-[0.15em] shadow-lg shadow-identity-navy/20 transition-all flex items-center gap-3 active:scale-95"
                                            >
                                                {uploading ? <div className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full" /> : <CheckCircle size={20} />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* CSV Upload */}
                                        <div className="bg-white/40 p-10 rounded-3xl border-2 border-dashed border-identity-sky/10 hover:border-identity-sky transition-all group shadow-inner">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-20 h-20 bg-identity-sky/10 rounded-3xl flex items-center justify-center mb-6 border border-identity-sky/20 group-hover:scale-110 transition-transform shadow-lg">
                                                    <FileSpreadsheet size={36} className="text-identity-sky" />
                                                </div>
                                                <h3 className="text-xl font-black text-identity-navy uppercase tracking-[0.15em] mb-2 italic">Batch Roster Synchronization</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-8 max-w-sm">Upload a standardized CSV or Excel dataset to synchronize student records with the central registry.</p>
                                                
                                                <div className="flex flex-col items-center gap-4 w-full">
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
                                                        className="w-full max-w-md bg-white hover:bg-identity-sky/5 text-identity-navy border border-identity-sky/10 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-inner active:scale-95"
                                                    >
                                                        {uploading ? (
                                                            <div className="animate-spin h-5 w-5 border-2 border-identity-navy/50 border-t-identity-navy rounded-full"></div>
                                                        ) : <Upload size={20} className="text-identity-sky" />}
                                                        Upload File
                                                    </button>
                                                    {uploadStatus && (
                                                        <div className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] mt-4 flex items-center gap-2 border ${uploadStatus.startsWith('Error') ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                            <AlertCircle size={14} /> {uploadStatus}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Manual Add */}
                                        <div className="bg-white/40 p-8 rounded-3xl border border-identity-sky/10 shadow-inner">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-8 flex items-center gap-3 ml-1">
                                                <UserPlus size={20} className="text-identity-sky" /> Manual Identity Assignment
                                            </h3>
                                            <form onSubmit={handleAddStudent} className="flex flex-col gap-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="relative group">
                                                        <input
                                                            type="text"
                                                            value={newStudentNumber}
                                                            onChange={e => setNewStudentNumber(formatStudentId(e.target.value))}
                                                            maxLength={15}
                                                            className="w-full bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky focus:outline-none shadow-inner transition-all"
                                                            placeholder="STUDENT ID"
                                                            required
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={newFirstName}
                                                        onChange={e => setNewFirstName(e.target.value)}
                                                        className="bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky focus:outline-none shadow-inner transition-all"
                                                        placeholder="GIVEN NAME"
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newLastName}
                                                        onChange={e => setNewLastName(e.target.value)}
                                                        className="bg-white/60 border border-identity-sky/10 rounded-xl px-4 py-4 text-identity-navy text-[10px] font-black uppercase tracking-[0.15em] focus:border-identity-sky focus:outline-none shadow-inner transition-all"
                                                        placeholder="SURNAME"
                                                        required
                                                    />
                                                </div>
                                                {formError && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-[0.15em] ml-1 flex items-center gap-2"><AlertCircle size={14} /> {formError}</div>}
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="self-end bg-identity-navy hover:bg-identity-navy/90 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                >
                                                    {submitting ? 'Registering...' : 'Link Identity'}
                                                </button>
                                            </form>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between ml-1">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-3">
                                                    <Users size={18} className="text-identity-sky" /> Provisioned Students ({students.length})
                                                </h3>
                                                <button onClick={fetchClassData} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-identity-sky hover:text-identity-navy bg-identity-sky/5 rounded-xl transition-all hover:rotate-180">
                                                    <Settings size={18} />
                                                </button>
                                            </div>
                                            <div className="bg-white/40 rounded-3xl border border-identity-sky/10 overflow-hidden max-h-[500px] shadow-inner table-responsive-wrapper">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] sticky top-0 border-b border-identity-sky/5">
                                                        <tr>
                                                            <th className="px-8 py-5">Full Digital Identity</th>
                                                            <th className="px-8 py-5">Unique Reference</th>
                                                            <th className="px-8 py-5 text-right">Administrative Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-identity-sky/5 text-[10px] font-bold uppercase tracking-[0.15em]">
                                                        {students.map((s) => (
                                                            <tr key={s.enrollment_id} className="hover:bg-identity-sky/5 group transition-colors">
                                                                <td className="px-8 py-5 text-identity-navy">{s.full_name}</td>
                                                                <td className="px-8 py-5 text-slate-400 font-mono">{s.user_id}</td>
                                                                <td className="px-8 py-5 text-right">
                                                                    <button
                                                                        onClick={() => removeStudent(s.enrollment_id, s.full_name)}
                                                                        className="text-slate-300 hover:text-rose-500 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-rose-50 transition-all active:scale-95"
                                                                    >
                                                                        <UserMinus size={20} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {students.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-[0.15em] italic">
                                                                    No provisioned identities found
                                                                </td>
                                                            </tr>
                                                        )}
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
