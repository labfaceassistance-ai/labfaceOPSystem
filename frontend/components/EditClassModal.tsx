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
        if (!confirm(`Remove ${name} from class?`)) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/${classId}/students/${enrollmentId}`);
            fetchClassData();
        } catch (e) { console.error(e); alert('Failed to remove'); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-maroon-950 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-3xl flex flex-col overflow-hidden animate-scale-up">
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
                    <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                        <Edit2 size={24} className="text-brand-gold" /> Edit Class: {className}
                    </h2>
                    <button onClick={onClose} className="text-secondary/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/40">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'details' ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-gold/5' : 'text-secondary/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings size={16} /> General Info
                    </button>
                    {!isArchived && (
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'roster' ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-gold/5' : 'text-secondary/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Users size={16} /> Student Roster
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-maroon-950">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="animate-spin h-8 w-8 border-4 border-brand-gold/10 border-t-brand-gold rounded-full"></div>
                            <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Loading class data...</span>
                        </div>
                    ) : activeTab === 'details' ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2 ml-1">Subject Code</label>
                                    <input
                                        type="text"
                                        value={details.subject_code}
                                        onChange={e => setDetails({ ...details, subject_code: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2 ml-1">Subject Name</label>
                                    <input
                                        type="text"
                                        value={details.subject_name}
                                        onChange={e => setDetails({ ...details, subject_name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2 ml-1">Section</label>
                                    <input
                                        type="text"
                                        value={details.section}
                                        readOnly
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-secondary/40 uppercase tracking-widest cursor-not-allowed shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2 ml-1">School Year</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.school_year}
                                            readOnly
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-secondary/20 uppercase tracking-widest cursor-not-allowed shadow-inner"
                                        />
                                    ) : (
                                        <select
                                            value={details.school_year}
                                            onChange={e => setDetails({ ...details, school_year: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none transition-all shadow-inner"
                                            required
                                        >
                                            {schoolYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-2 ml-1">Semester</label>
                                    {isArchived ? (
                                        <input
                                            type="text"
                                            value={details.semester}
                                            readOnly
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-secondary/20 uppercase tracking-widest cursor-not-allowed shadow-inner"
                                        />
                                    ) : (
                                        <select
                                            value={details.semester}
                                            onChange={e => setDetails({ ...details, semester: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none transition-all shadow-inner"
                                            required
                                        >
                                            <option value="1st Semester">1st Semester</option>
                                            <option value="2nd Semester">2nd Semester</option>
                                            <option value="Summer">Summer</option>
                                        </select>
                                    )}
                                </div>

                                {/* Schedule Editor */}
                                <div className={`col-span-full bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner ${isArchived ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-4 ml-1">Schedule</label>
                                    {isArchived ? (
                                        <div className="space-y-2">
                                            {details.schedule.map((slot: any, idx: number) => (
                                                <div key={idx} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-[10px] font-black uppercase tracking-widest shadow-inner">
                                                    {slot.day} • {slot.startTime} - {slot.endTime}
                                                </div>
                                            ))}
                                            {details.schedule.length === 0 && <div className="text-secondary/20 text-[10px] font-black uppercase tracking-widest italic text-center py-4">No schedule set</div>}
                                        </div>
                                    ) : (
                                        details.schedule.map((slot: any, idx: number) => (
                                            <div key={idx} className="flex gap-3 mb-3 animate-slide-in">
                                                <select
                                                    value={slot.day}
                                                    onChange={e => handleScheduleChange(idx, 'day', e.target.value)}
                                                    className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold/50 transition-all shadow-inner"
                                                >
                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={e => handleScheduleChange(idx, 'startTime', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold/50 transition-all shadow-inner"
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                                <span className="text-secondary/20 self-center font-black">-</span>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={e => handleScheduleChange(idx, 'endTime', e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold/50 transition-all shadow-inner"
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>

                            <div className="flex justify-end pt-6 border-t border-white/10">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-brand-gold hover:bg-brand-gold/90 text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        activeTab === 'roster' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {previewData ? (
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                                <FileSpreadsheet size={20} className="text-emerald-400" /> Preview Changes
                                            </h3>
                                            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/5 text-[10px] font-black uppercase tracking-widest text-secondary/40 shadow-inner">
                                                Total in File: <span className="text-white">{previewData.summary.total_uploaded}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl shadow-inner">
                                                <div className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest mb-1">To Add</div>
                                                <div className="text-2xl font-black text-emerald-400 tracking-tighter">{previewData.summary.to_add}</div>
                                            </div>
                                            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl shadow-inner">
                                                <div className="text-red-400/60 text-[10px] font-black uppercase tracking-widest mb-1">To Remove</div>
                                                <div className="text-2xl font-black text-red-400 tracking-tighter">{previewData.summary.to_remove}</div>
                                            </div>
                                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl shadow-inner">
                                                <div className="text-secondary/40 text-[10px] font-black uppercase tracking-widest mb-1">Unchanged</div>
                                                <div className="text-2xl font-black text-white tracking-tighter">{previewData.summary.unchanged}</div>
                                            </div>
                                        </div>

                                        <div className="border border-white/10 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-black/20 shadow-inner">
                                            <table className="w-full text-left">
                                                <thead className="bg-black/60 text-[10px] font-black uppercase tracking-widest text-secondary/40 sticky top-0 border-b border-white/5">
                                                    <tr>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-[10px] font-black uppercase tracking-widest">
                                                    {previewData.changes.to_add.map((s: any, i: number) => (
                                                        <tr key={`add-${i}`} className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                                                            <td className="px-4 py-3 text-emerald-400">NEW</td>
                                                            <td className="px-4 py-3 text-white">{s.student_name}</td>
                                                            <td className="px-4 py-3 text-secondary/40 font-mono">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.to_remove.map((s: any, i: number) => (
                                                        <tr key={`rem-${i}`} className="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                                            <td className="px-4 py-3 text-red-400">REM</td>
                                                            <td className="px-4 py-3 text-secondary/20 line-through decoration-red-500/50">{s.student_name}</td>
                                                            <td className="px-4 py-3 text-secondary/20 font-mono line-through">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                    {previewData.changes.unchanged?.map((s: any, i: number) => (
                                                        <tr key={`uc-${i}`} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 text-secondary/20">KEEP</td>
                                                            <td className="px-4 py-3 text-secondary/40">{s.student_name}</td>
                                                            <td className="px-4 py-3 text-secondary/20 font-mono">{s.student_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                                            <button
                                                onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                                                className="px-6 py-2.5 text-secondary/40 hover:text-white font-black uppercase tracking-widest transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmUpload}
                                                disabled={uploading}
                                                className="bg-brand-gold hover:bg-brand-gold/90 text-black px-8 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-gold/10 transition-all flex items-center gap-2"
                                            >
                                                {uploading ? <div className="animate-spin h-4 w-4 border-2 border-black/50 border-t-black rounded-full" /> : <CheckCircle size={18} />}
                                                Confirm Update
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* CSV Upload */}
                                        <div className="bg-black/20 p-8 rounded-2xl border-2 border-dashed border-white/5 hover:border-brand-gold/20 transition-all group shadow-inner">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                                    <FileSpreadsheet size={32} className="text-emerald-400" />
                                                </div>
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">Batch Upload Roster</h3>
                                                <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest mb-6 max-w-xs">Upload CSV or Excel file to bulk add students.</p>
                                                
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
                                                        className="w-full max-w-xs bg-black/40 hover:bg-white/5 text-white border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-inner"
                                                    >
                                                        {uploading ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></div>
                                                        ) : <Upload size={18} className="text-brand-gold" />}
                                                        Select File
                                                    </button>
                                                    {uploadStatus && (
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${uploadStatus.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {uploadStatus}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Manual Add */}
                                        <div className="bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                                            <h3 className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-6 flex items-center gap-2 ml-1">
                                                <UserPlus size={16} className="text-brand-gold" /> Manually Add Student
                                            </h3>
                                            <form onSubmit={handleAddStudent} className="flex flex-col gap-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <input
                                                        type="text"
                                                        value={newStudentNumber}
                                                        onChange={e => setNewStudentNumber(formatStudentId(e.target.value))}
                                                        maxLength={15}
                                                        className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none shadow-inner"
                                                        placeholder="STUDENT ID"
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newFirstName}
                                                        onChange={e => setNewFirstName(e.target.value)}
                                                        className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none shadow-inner"
                                                        placeholder="FIRST NAME"
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newLastName}
                                                        onChange={e => setNewLastName(e.target.value)}
                                                        className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest focus:border-brand-gold/50 focus:outline-none shadow-inner"
                                                        placeholder="LAST NAME"
                                                        required
                                                    />
                                                </div>
                                                {formError && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest ml-1">{formError}</p>}
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="self-end bg-black/40 hover:bg-white/5 text-brand-gold border border-white/5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-inner"
                                                >
                                                    Add Student
                                                </button>
                                            </form>
                                        </div>

                                        {/* List */}
                                        <div>
                                            <h3 className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-4 ml-1 flex items-center justify-between">
                                                <span>Enrolled Students ({students.length})</span>
                                                <button onClick={fetchClassData} className="text-brand-gold hover:text-white transition-colors">
                                                    <Settings size={14} />
                                                </button>
                                            </h3>
                                            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden max-h-[400px] overflow-y-auto shadow-inner">
                                                <table className="w-full text-left">
                                                    <thead className="bg-black/60 text-secondary/40 text-[10px] font-black uppercase tracking-widest sticky top-0 border-b border-white/5">
                                                        <tr>
                                                            <th className="px-6 py-4 font-black">Name</th>
                                                            <th className="px-6 py-4 font-black">ID</th>
                                                            <th className="px-6 py-4 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 text-[10px] font-bold uppercase tracking-widest">
                                                        {students.map((s) => (
                                                            <tr key={s.enrollment_id} className="hover:bg-white/5 group transition-colors">
                                                                <td className="px-6 py-4 text-white">{s.full_name}</td>
                                                                <td className="px-6 py-4 text-secondary/40 font-mono">{s.user_id}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button
                                                                        onClick={() => removeStudent(s.enrollment_id, s.full_name)}
                                                                        className="text-secondary/20 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/5 transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {students.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="px-6 py-12 text-center text-secondary/20 font-black uppercase tracking-widest italic">
                                                                    No students enrolled yet
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
