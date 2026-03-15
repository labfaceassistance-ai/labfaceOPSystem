"use client";
import { useState } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import axios from 'axios';

interface FaceReScanProps {
    userId: number;
    onSuccess?: () => void;
}

const FACE_ANGLES = [
    { id: 'front', label: 'Front', instruction: 'Look straight at the camera' },
    { id: 'left', label: 'Left', instruction: 'Turn your head to the left' },
    { id: 'right', label: 'Right', instruction: 'Turn your head to the right' },
    { id: 'up', label: 'Up', instruction: 'Tilt your head up slightly' },
    { id: 'down', label: 'Down', instruction: 'Tilt your head down slightly' }
];

export default function FaceReScan({ userId, onSuccess }: FaceReScanProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentAngle, setCurrentAngle] = useState(0);
    const [capturedImages, setCapturedImages] = useState<{ [key: string]: File }>({});
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleCapture = (file: File) => {
        const angleId = FACE_ANGLES[currentAngle].id;
        setCapturedImages(prev => ({ ...prev, [angleId]: file }));

        if (currentAngle < FACE_ANGLES.length - 1) {
            setCurrentAngle(prev => prev + 1);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleCapture(e.target.files[0]);
        }
    };

    const removeImage = (angleId: string) => {
        const newImages = { ...capturedImages };
        delete newImages[angleId];
        setCapturedImages(newImages);
    };

    const handleSubmit = async () => {
        if (Object.keys(capturedImages).length !== 5) {
            setError('Please capture all 5 face angles');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const formData = new FormData();

            // Add all face images
            Object.entries(capturedImages).forEach(([angle, file]) => {
                formData.append('faceImages', file, `${angle}.jpg`);
            });
            formData.append('userId', userId.toString());

            // Upload to backend
            await axios.post(`${API_URL}/api/auth/update-face-data`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Generate and store embedding
            const firstImage = capturedImages['front'];
            const embeddingFormData = new FormData();
            embeddingFormData.append('image', firstImage);

            const embeddingResponse = await axios.post(
                `${API_URL}/generate-embedding`,
                embeddingFormData
            );

            if (embeddingResponse.data.embedding) {
                await axios.post(`${API_URL}/api/auth/update-embedding`, {
                    userId,
                    embedding: embeddingResponse.data.embedding
                });
            }

            setIsOpen(false);
            setCapturedImages({});
            setCurrentAngle(0);
            onSuccess?.();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update face data');
        } finally {
            setUploading(false);
        }
    };

    const allCaptured = Object.keys(capturedImages).length === 5;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-400 transition-colors"
            >
                <RefreshCw size={18} />
                Re-Scan Face
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white">Re-Scan Face Data</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        {/* Progress */}
                        <div className="mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-400">
                                    Progress: {Object.keys(capturedImages).length}/5
                                </span>
                                <span className="text-sm text-brand-400">
                                    {allCaptured ? 'All angles captured!' : 'Keep going...'}
                                </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-brand-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(Object.keys(capturedImages).length / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Current Angle Instruction */}
                        {!allCaptured && (
                            <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-6 mb-6 text-center">
                                <Camera size={48} className="mx-auto mb-3 text-brand-400" />
                                <h4 className="text-xl font-bold text-white mb-2">
                                    {FACE_ANGLES[currentAngle].label} View
                                </h4>
                                <p className="text-slate-300">
                                    {FACE_ANGLES[currentAngle].instruction}
                                </p>
                            </div>
                        )}

                        {/* Angle Grid */}
                        <div className="grid grid-cols-5 gap-3 mb-6">
                            {FACE_ANGLES.map((angle, idx) => (
                                <div
                                    key={angle.id}
                                    className={`relative aspect-square rounded-lg border-2 overflow-hidden ${capturedImages[angle.id]
                                            ? 'border-green-500'
                                            : idx === currentAngle
                                                ? 'border-brand-500 animate-pulse'
                                                : 'border-slate-700'
                                        }`}
                                >
                                    {capturedImages[angle.id] ? (
                                        <>
                                            <img
                                                src={URL.createObjectURL(capturedImages[angle.id])}
                                                alt={angle.label}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => removeImage(angle.id)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 text-center">
                                                <Check size={12} className="inline" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                                            <Camera size={20} className="text-slate-600 mb-1" />
                                            <span className="text-xs text-slate-500">{angle.label}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Upload Button */}
                        {!allCaptured && (
                            <div className="mb-6">
                                <label className="block w-full">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <div className="w-full py-3 bg-brand-500 text-white rounded-lg font-medium text-center cursor-pointer hover:bg-brand-400 transition-colors">
                                        Capture {FACE_ANGLES[currentAngle].label} View
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!allCaptured || uploading}
                                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Updating...' : 'Update Face Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
