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
                className="flex items-center gap-3 px-6 py-3 bg-brand-gold text-black rounded-xl font-black uppercase text-[10px] tracking-[0.15em] hover:brightness-110 transition-all shadow-xl shadow-brand-gold/10 active:scale-95"
            >
                <RefreshCw size={16} />
                Update Face Data
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-maroon-950 border border-white/10 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto relative custom-scrollbar">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Update Face Data</h3>
                                <p className="text-[10px] font-black text-brand-gold/60 uppercase tracking-[0.3em] mt-2">Update Profile Picture</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-secondary/40 hover:text-white transition-all p-3 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/10"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl mb-8 flex items-center gap-3 relative z-10">
                                <span className="text-rose-500">⚠</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{error}</span>
                            </div>
                        )}

                        {/* Progress */}
                        <div className="mb-10 relative z-10">
                            <div className="flex justify-between mb-3 text-[10px] font-black uppercase tracking-[0.2em]">
                                <span className="text-secondary/40">
                                    Photo Status: {Object.keys(capturedImages).length}/5
                                </span>
                                <span className="text-brand-gold/80">
                                    {allCaptured ? 'Full alignment captured' : 'Awaiting perspectives...'}
                                </span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 shadow-inner overflow-hidden">
                                <div
                                    className="bg-brand-gold h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(245,189,79,0.4)]"
                                    style={{ width: `${(Object.keys(capturedImages).length / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Current Angle Instruction */}
                        {!allCaptured && (
                            <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-[32px] p-10 mb-10 text-center relative z-10 overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-brand-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-brand-gold/20 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                                        <Camera size={40} className="text-brand-gold" />
                                    </div>
                                    <h4 className="text-xl font-black text-white mb-2 uppercase tracking-[0.1em]">
                                        {FACE_ANGLES[currentAngle].label} Perspective
                                    </h4>
                                    <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.2em]">
                                        {FACE_ANGLES[currentAngle].instruction}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Angle Grid */}
                        <div className="grid grid-cols-5 gap-4 mb-10 relative z-10">
                            {FACE_ANGLES.map((angle, idx) => (
                                <div
                                    key={angle.id}
                                    className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-500 shadow-xl ${capturedImages[angle.id]
                                            ? 'border-brand-gold'
                                            : idx === currentAngle
                                                ? 'border-brand-gold/60 animate-pulse bg-brand-gold/5'
                                                : 'border-white/5 bg-black/40'
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
                                                className="absolute top-1.5 right-1.5 bg-rose-600/90 text-white rounded-lg p-1.5 hover:bg-rose-600 transition-colors shadow-lg"
                                            >
                                                <X size={10} />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-brand-gold/90 backdrop-blur-md text-black text-[8px] font-black py-1 text-center uppercase tracking-[0.15em]">
                                                Locked
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                                            <Camera size={18} className="text-secondary/40 mb-1" />
                                            <span className="text-[7px] font-black uppercase tracking-[0.15em] text-secondary/40">{angle.label}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Upload Button */}
                        {!allCaptured && (
                            <div className="mb-10 relative z-10">
                                <label className="block w-full">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <div className="w-full py-5 bg-black/40 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] text-center cursor-pointer hover:bg-white/5 hover:border-brand-gold/30 transition-all shadow-inner active:scale-95 group">
                                        Save <span className="text-brand-gold group-hover:underline">{FACE_ANGLES[currentAngle].label}</span> Photo
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-4 relative z-10 bg-maroon-950 pt-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-8 py-4 bg-white/5 border border-white/10 text-secondary/40 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                Abandon
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!allCaptured || uploading}
                                className="flex-1 px-10 py-4 bg-brand-gold text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-brand-gold/20 hover:brightness-110 disabled:opacity-20 disabled:grayscale transition-all active:scale-95 border border-brand-gold"
                            >
                                {uploading ? 'Archiving...' : 'Update Photos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
