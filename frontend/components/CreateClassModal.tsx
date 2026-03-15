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

                console.log('Fetched academic settings:', response.data); // Debug log

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-scale-up max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold text-white mb-6">Create New Class</h3>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm backdrop-blur-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Subject Code</label>
                        <input
                            name="subjectCode"
                            value={formData.subjectCode}
                            onChange={handleInputChange}
                            placeholder="COMP 20133"
                            required
                            className="input-field w-full p-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
                        <input
                            name="subjectName"
                            value={formData.subjectName}
                            onChange={handleInputChange}
                            placeholder="Data Structures and Algorithms"
                            required
                            className="input-field w-full p-2 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500"
                        />
                    </div>

                    {/* NEW: Course and Year Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Course</label>
                            <select
                                name="course"
                                value={formData.course}
                                onChange={handleInputChange}
                                className="input-field w-full p-2 border border-slate-700 rounded-lg bg-slate-800 text-white"
                            >
                                <option value="BSIT">BSIT</option>
                                <option value="DIT">DIT</option>
                                <option value="BSOA">BSOA</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Year Level {formData.course === 'DIT' && <span className="text-xs text-amber-400">(Max: 3rd)</span>}
                            </label>
                            <select
                                name="yearLevel"
                                value={formData.yearLevel}
                                onChange={handleInputChange}
                                className="input-field w-full p-2 border border-slate-700 rounded-lg bg-slate-800 text-white"
                            >
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                {maxYearLevel === 4 && <option value="4">4th Year</option>}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Section</label>
                        <input
                            name="section"
                            value={formData.section}
                            readOnly
                            placeholder="Auto-generated"
                            className="input-field w-full p-2 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1 italic">Automatically derived from Course and Year Level.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">School Year</label>
                            <div className="w-full p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white flex items-center">
                                <span className="font-semibold text-brand-400">{formData.schoolYear}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Set by admin</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
                            <div className="w-full p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white flex items-center">
                                <span className="font-semibold text-brand-400">{formData.semester}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Set by admin</p>
                        </div>
                    </div>

                    {/* ENHANCED: Required Roster Upload with File Preview */}
                    <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                        <label className="block text-sm font-bold text-brand-300 mb-2 flex items-center justify-between">
                            <span>Upload Class Roster <span className="text-red-400">*</span></span>
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 underline"
                            >
                                <Download size={14} /> Download Template
                            </button>
                        </label>

                        {rosterFile ? (
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Upload size={16} className="text-brand-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-300 truncate">{rosterFile.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                                    title="Remove file"
                                >
                                    <X size={18} />

                                </button>
                                <button
                                    type="button"
                                    onClick={handlePreviewFile}
                                    className="text-brand-400 hover:text-brand-300 ml-2 flex-shrink-0"
                                    title="Preview Students"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        ) : (
                            <input
                                id="roster-file-input"
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-400 cursor-pointer"
                            />
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                            Upload a spreadsheet with columns "Student Number" and "Name". Students without accounts will be enrolled but marked as "No Account".
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
                            <span>Class Schedule</span>
                            <button type="button" onClick={addSchedule} className="text-brand-400 text-xs font-bold hover:underline flex items-center gap-1">
                                <Plus size={14} /> Add Day
                            </button>
                        </label>
                        <div className="space-y-3">
                            {schedules.map((schedule, index) => (
                                <div key={index} className="flex gap-2 items-center bg-slate-800 p-2 rounded-lg border border-slate-700">
                                    <select
                                        value={schedule.day}
                                        onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                                        className="p-2 border border-slate-700 rounded text-sm bg-slate-900 text-white"
                                    >
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="time"
                                        value={schedule.startTime}
                                        onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                                        className="p-2 border border-slate-700 rounded text-sm bg-slate-900 text-white"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="time"
                                        value={schedule.endTime}
                                        onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                                        className="p-2 border border-slate-700 rounded text-sm bg-slate-900 text-white"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    {schedules.length > 1 && (
                                        <button type="button" onClick={() => removeSchedule(index)} className="text-red-400 hover:text-red-600">
                                            <Trash size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-400 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Creating...' : 'Create Class'}
                        </button>
                    </div>
                </form>

            </div>

            {/* Preview Modal */}
            {
                showPreview && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative animate-scale-up max-h-[80vh] flex flex-col">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-bold text-white mb-4">Class Roster Preview</h3>
                            <div className="overflow-auto flex-1 border border-slate-700 rounded-lg">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-800 text-slate-200 sticky top-0">
                                        <tr>
                                            {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                                                <th key={key} className="p-3 font-semibold border-b border-slate-700 whitespace-nowrap">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {previewData.length > 0 ? (
                                            previewData.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-800/50">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="p-3 whitespace-nowrap">
                                                            {val}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={100} className="p-8 text-center text-slate-500">
                                                    No data found in file.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >

    );
}
