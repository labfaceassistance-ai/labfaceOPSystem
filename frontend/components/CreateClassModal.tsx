"use client";
import { useState, useEffect } from 'react';
import { X, Plus, Trash, Upload, Download, Eye } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_URL, getToken } from '@/utils/auth';

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    professorId: string;
}

interface ScheduleItem {
    day: string;
    startTime: string;
    endTime: string;
}

export default function CreateClassModal({ isOpen, onClose, onSuccess, professorId }: CreateClassModalProps) {
    // Generate school years from current year to 2050
    const generateSchoolYears = () => {
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year <= 2050; year++) {
            years.push(`${year}-${year + 1}`);
        }
        return years;
    };

    const schoolYears = generateSchoolYears();

    const [formData, setFormData] = useState({
        subjectCode: '',
        subjectName: '',
        course: 'BSIT',
        yearLevel: '1',
        section: 'BSIT 1', // Initial default
        schoolYear: schoolYears[0], // Default to current school year
        semester: '1st Semester',
    });

    const [schedules, setSchedules] = useState<ScheduleItem[]>([
        { day: 'Monday', startTime: '08:00', endTime: '11:00' }
    ]);

    const [rosterFile, setRosterFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [loadingSettings, setLoadingSettings] = useState(true);

    // Preview State
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Fetch current academic settings on mount
    useEffect(() => {
        const fetchAcademicSettings = async () => {
            try {
                const token = getToken();
                const response = await axios.get(`${API_URL}/api/users/academic-settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Update form data with current settings
                setFormData(prev => ({
                    ...prev,
                    schoolYear: response.data.schoolYear,
                    semester: response.data.semester
                }));
            } catch (error) {
                console.error('Error fetching academic settings:', error);
                // Keep default values if fetch fails
            } finally {
                setLoadingSettings(false);
            }
        };

        if (isOpen) {
            setLoadingSettings(true);
            fetchAcademicSettings();
        } else {
            // Reset loading state when modal closes
            setLoadingSettings(true);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Handle course change with DIT year level logic
        if (name === 'course') {
            if (value === 'DIT' && formData.yearLevel === '4') {
                setFormData({
                    ...formData,
                    course: value,
                    yearLevel: '1',
                    section: `${value} 1` // Update section
                });
                return;
            }
            setFormData({
                ...formData,
                course: value,
                section: `${value} ${formData.yearLevel}` // Update section
            });
            return;
        }

        if (name === 'yearLevel') {
            setFormData({
                ...formData,
                yearLevel: value,
                section: `${formData.course} ${value}` // Update section
            });
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleScheduleChange = (index: number, field: keyof ScheduleItem, value: string) => {
        const newSchedules = [...schedules];
        newSchedules[index][field] = value;
        setSchedules(newSchedules);
    };

    const addSchedule = () => {
        setSchedules([...schedules, { day: 'Monday', startTime: '08:00', endTime: '11:00' }]);
    };

    const removeSchedule = (index: number) => {
        if (schedules.length > 1) {
            setSchedules(schedules.filter((_, i) => i !== index));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setRosterFile(e.target.files[0]);
            setError('');
        }
    };

    const removeFile = () => {
        setRosterFile(null);
        setPreviewData([]);
        // Reset file input
        const fileInput = document.getElementById('roster-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handlePreviewFile = async () => {
        if (!rosterFile) return;

        try {
            const data = await rosterFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Basic validation/filtering if needed, but for now just show raw data
            setPreviewData(jsonData);
            setShowPreview(true);
        } catch (err) {
            console.error("Error parsing file:", err);
            setError("Failed to parse the roster file.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate roster file is uploaded
        if (!rosterFile) {
            setError('Please upload a class roster file');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            // 1. Create Class
            const createResponse = await axios.post(`${API_URL}/api/classes`, {
                ...formData,
                professorId,
                schedule: schedules
            });

            const classId = createResponse.data.classId;

            // 2. Upload Roster (now required)
            if (classId) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', rosterFile);
                await axios.post(`${API_URL}/api/classes/${classId}/upload-roster`, formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            onSuccess();
            onClose();

            // Reset form
            setFormData({
                subjectCode: '',
                subjectName: '',
                course: 'BSIT',
                yearLevel: '1',
                section: 'BSIT 1',
                // Keep the current academic settings
                schoolYear: formData.schoolYear,
                semester: formData.semester,
            });
            setRosterFile(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent =
            "#,Student Number,Name\n" +
            "1,2021-12345-IT-1,Dela Cruz, Juan\n" +
            "2,2021-12346-IT-1,Santos, Maria\n" +
            "3,2021-12347-IT-1,Reyes, Pedro";

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "class_roster_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const maxYearLevel = formData.course === 'DIT' ? 3 : 4;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-identity-navy/20 backdrop-blur-md animate-fade-in">
            <div className="identity-glass border border-identity-sky/10 rounded-2xl shadow-3xl max-w-lg w-full p-8 relative animate-scale-up max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 hover:text-identity-navy transition-all p-2 hover:bg-white/60 rounded-xl"
                >
                    <X size={24} />
                </button>

                <h3 className="text-3xl font-black text-identity-navy mb-8 uppercase tracking-tight italic">Create New Class</h3>

                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-xl mb-8 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">Subject Code</label>
                        <input
                            name="subjectCode"
                            value={formData.subjectCode}
                            onChange={handleInputChange}
                            placeholder="COMP 20133"
                            required
                            className="w-full px-5 py-3.5 bg-white/60 border border-identity-sky/10 rounded-2xl text-xs font-bold text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/10 placeholder-slate-300 transition-all shadow-inner"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">Subject Name</label>
                        <input
                            name="subjectName"
                            value={formData.subjectName}
                            onChange={handleInputChange}
                            placeholder="Data Structures and Algorithms"
                            required
                            className="w-full px-5 py-3.5 bg-white/60 border border-identity-sky/10 rounded-2xl text-xs font-bold text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/10 placeholder-slate-300 transition-all shadow-inner"
                        />
                    </div>

                    {/* NEW: Course and Year Level */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">Course</label>
                            <select
                                name="course"
                                value={formData.course}
                                onChange={handleInputChange}
                                className="w-full px-5 py-4 bg-white/60 border border-identity-sky/10 rounded-2xl text-xs font-bold text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-inner appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_1rem_center] bg-no-repeat"
                            >
                                <option value="BSIT">BSIT</option>
                                <option value="DIT">DIT</option>
                                <option value="BSOA">BSOA</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">
                                Year Level {formData.course === 'DIT' && <span className="text-[10px] text-identity-sky">(MAX: 3RD)</span>}
                            </label>
                            <select
                                name="yearLevel"
                                value={formData.yearLevel}
                                onChange={handleInputChange}
                                className="w-full px-5 py-4 bg-white/60 border border-identity-sky/10 rounded-2xl text-xs font-bold text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/10 transition-all shadow-inner appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_1rem_center] bg-no-repeat"
                            >
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                {maxYearLevel === 4 && <option value="4">4th Year</option>}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">Section</label>
                        <input
                            name="section"
                            value={formData.section}
                            readOnly
                            placeholder="Auto-generated"
                            className="w-full px-5 py-4 bg-white/30 border border-identity-sky/5 rounded-2xl text-xs font-black text-slate-300 uppercase tracking-widest cursor-not-allowed shadow-inner italic"
                        />
                        <p className="text-[9px] text-slate-300 mt-2 italic font-bold uppercase tracking-[0.2em] ml-1">Metadata automatically derived from operational parameters.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">School Year</label>
                            <div className="w-full px-5 py-4 bg-white/40 border border-identity-sky/10 rounded-2xl text-xs font-black text-identity-sky uppercase tracking-widest shadow-inner flex items-center">
                                <span>{formData.schoolYear}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 italic">Semester</label>
                            <div className="w-full px-5 py-4 bg-white/40 border border-identity-sky/10 rounded-2xl text-xs font-black text-identity-sky uppercase tracking-widest shadow-inner flex items-center">
                                <span>{formData.semester}</span>
                            </div>
                        </div>
                    </div>

                    {/* ENHANCED: Required Roster Upload with File Preview */}
                    <div className="p-8 bg-identity-sky/5 border border-identity-sky/10 rounded-[2rem] shadow-inner">
                        <label className="block text-[10px] font-black text-identity-navy mb-4 flex items-center justify-between uppercase tracking-widest">
                            <span>Upload Class Roster <span className="text-rose-500">*</span></span>
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="text-[10px] text-identity-sky hover:text-identity-navy flex items-center gap-2 underline transition-all font-black"
                            >
                                <Download size={14} /> Download Template
                            </button>
                        </label>

                        {rosterFile ? (
                            <div className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-identity-sky/10 shadow-sm transition-all animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-identity-sky/10 rounded-xl flex items-center justify-center text-identity-sky">
                                        <Upload size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-identity-navy uppercase tracking-widest truncate italic">{rosterFile.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handlePreviewFile}
                                        className="text-identity-sky hover:text-identity-navy p-3 rounded-xl hover:bg-identity-sky/5 transition-all"
                                        title="Preview Students"
                                    >
                                        <Eye size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="text-rose-500 hover:text-rose-400 p-3 rounded-xl hover:bg-rose-50 transition-all"
                                        title="Remove file"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <input
                                    id="roster-file-input"
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    className="block w-full text-[10px] font-black uppercase tracking-widest text-slate-300 file:mr-6 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-[0.3em] file:bg-identity-navy file:text-white hover:file:bg-identity-sky cursor-pointer transition-all file:shadow-lg file:shadow-identity-navy/10"
                                />
                                <div className="absolute inset-x-0 bottom-0 py-2 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-black text-identity-sky uppercase tracking-[0.5em]">Spreadsheet Protocol Required</span>
                                </div>
                            </div>
                        )}

                        <p className="text-[9px] text-slate-300 mt-4 font-bold uppercase tracking-[0.2em] leading-relaxed italic border-t border-identity-sky/5 pt-4">
                            System accepts .XLSX, .XLS, or .CSV formats. Ensure columns include "Student Number" and "Name" for synchronization.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between ml-1 italic">
                            <span>Class Schedule Protocol</span>
                            <button type="button" onClick={addSchedule} className="px-4 py-1.5 bg-identity-sky/5 text-identity-sky text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-identity-sky/10 hover:bg-identity-sky hover:text-white transition-all">
                                <Plus size={14} className="inline mr-1" /> Add Matrix Day
                            </button>
                        </label>
                        <div className="space-y-4">
                            {schedules.map((schedule, index) => (
                                <div key={index} className="flex gap-4 items-center bg-white/40 p-3 rounded-2xl border border-identity-sky/10 shadow-inner group/schedule animate-in fade-in">
                                    <select
                                        value={schedule.day}
                                        onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                                        className="p-3 border border-identity-sky/10 rounded-xl text-[10px] font-black bg-white/60 text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 shadow-sm"
                                    >
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                    <div className="flex-1 flex gap-2 items-center">
                                        <input
                                            type="time"
                                            value={schedule.startTime}
                                            onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                                            className="flex-1 p-3 border border-identity-sky/10 rounded-xl text-xs font-black bg-white/60 text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 shadow-sm"
                                            style={{ colorScheme: 'light' }}
                                        />
                                        <span className="text-slate-200 font-black">/</span>
                                        <input
                                            type="time"
                                            value={schedule.endTime}
                                            onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                                            className="flex-1 p-3 border border-identity-sky/10 rounded-xl text-xs font-black bg-white/60 text-identity-navy uppercase tracking-widest focus:outline-none focus:border-identity-sky/50 shadow-sm"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                    {schedules.length > 1 && (
                                        <button type="button" onClick={() => removeSchedule(index)} className="text-rose-300 hover:text-rose-500 transition-all p-2 hover:bg-rose-50 rounded-xl">
                                            <Trash size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-10 flex justify-end gap-4 border-t border-identity-sky/5">
                        <button type="button" onClick={onClose} className="px-8 py-4 text-slate-400 hover:text-identity-navy hover:bg-white/60 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all">
                            Abort
                        </button>
                        <button type="submit" disabled={loading} className="px-12 py-4 bg-identity-navy text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-identity-sky transition-all shadow-xl shadow-identity-navy/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Synchronizing...
                                </>
                            ) : 'Initialize Class'}
                        </button>
                    </div>
                </form>

            </div>

            {/* Preview Modal */}
            {
                showPreview && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-identity-navy/40 backdrop-blur-xl animate-fade-in">
                        <div className="identity-glass border border-identity-sky/10 rounded-[2.5rem] shadow-3xl max-w-2xl w-full p-10 relative animate-scale-up max-h-[85vh] flex flex-col">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-identity-navy transition-all p-2 hover:bg-white/60 rounded-xl"
                            >
                                <X size={28} />
                            </button>
                            <h3 className="text-2xl font-black text-identity-navy mb-8 uppercase tracking-tight italic">Roster Matrix Preview</h3>
                            <div className="overflow-auto flex-1 border border-identity-sky/10 rounded-2xl bg-white/60 shadow-inner no-scrollbar">
                                <table className="w-full text-left text-[10px] font-bold text-identity-navy uppercase tracking-widest">
                                    <thead className="bg-identity-navy/5 text-identity-sky font-black sticky top-0 border-b border-identity-sky/10 backdrop-blur-md">
                                        <tr>
                                            {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                                                <th key={key} className="p-4 bg-white/40">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-identity-sky/5">
                                        {previewData.length > 0 ? (
                                            previewData.map((row, i) => (
                                                <tr key={i} className="hover:bg-identity-sky/5 transition-colors">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="p-4 whitespace-nowrap text-slate-500 font-bold">
                                                            {val}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={100} className="p-16 text-center text-slate-300 italic">
                                                    <Eye size={48} className="mx-auto mb-4 opacity-10" />
                                                    No operational data detected.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-8 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className="px-10 py-4 bg-identity-navy text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all shadow-xl shadow-identity-navy/10 hover:bg-identity-sky"
                                >
                                    Close Matrix View
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
