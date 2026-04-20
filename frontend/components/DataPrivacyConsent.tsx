import React from 'react';
import { X } from 'lucide-react';

interface DataPrivacyConsentProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

export default function DataPrivacyConsent({ isOpen, onClose, onAccept }: DataPrivacyConsentProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-start justify-center z-[100] p-4 pt-20 overflow-y-auto animate-fade-in">
            <div className="bg-maroon-950 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col my-4 relative">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Data Privacy Consent</h2>
                        <p className="text-[10px] font-black text-brand-gold/60 uppercase tracking-[0.3em] mt-2">Republic Act No. 10173 · Data Privacy Act of 2012</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-secondary/40 hover:text-white transition-all p-3 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 relative z-10 custom-scrollbar">
                    <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-2xl p-5 shadow-inner">
                        <p className="text-[11px] text-brand-gold font-black uppercase tracking-[0.15em] leading-relaxed">
                            Please read this Data Privacy Notice carefully before proceeding with your registration. Your privacy is protected by the Persistence Layer.
                        </p>
                    </div>

                    <div className="space-y-12">
                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                1. Introduction
                            </h3>
                            <p className="text-xs leading-relaxed text-secondary/40 font-medium uppercase tracking-wide">
                                The Polytechnic University of the Philippines (PUP) Lopez Campus, through the LabFace System,
                                is committed to protecting your privacy and ensuring the security of your personal information.
                                This Data Privacy Notice explains how we collect, use, store, and protect your data in compliance
                                with Republic Act No. 10173, also known as the Data Privacy Act of 2012.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                2. Data Collection
                            </h3>
                            <p className="text-xs leading-relaxed text-secondary/40 font-medium uppercase tracking-wide mb-4">
                                We collect the following types of personal information:
                            </p>
                            <ul className="space-y-3 text-[10px] font-bold text-secondary/40 uppercase tracking-[0.15em] ml-4">
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Personal Identification: Name, Student/Professor ID, Email Address</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Academic Information: Course, Year Level, Section, Class Enrollment</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Biometric Data: Facial recognition images (5 angles) for attendance verification</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Attendance Records: Time-in, time-out, attendance status, CCTV snapshots</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Account Information: Password (encrypted), profile picture</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                3. Purpose of Data Processing
                            </h3>
                            <p className="text-xs leading-relaxed text-secondary/40 font-medium uppercase tracking-wide mb-4">
                                Your personal data will be processed for the following purposes:
                            </p>
                            <ul className="space-y-3 text-[10px] font-bold text-secondary/40 uppercase tracking-[0.15em] ml-4">
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Automated attendance monitoring using facial recognition technology</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Class enrollment and academic record management</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Communication regarding class schedules and attendance</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Generation of attendance reports and analytics</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>System security and access control</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Compliance with university policies and regulations</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                4. Data Storage and Security
                            </h3>
                            <p className="text-xs leading-relaxed text-secondary/40 font-medium uppercase tracking-wide">
                                Your personal data is stored securely in encrypted databases and object storage systems.
                                We implement industry-standard security measures including:
                            </p>
                            <ul className="space-y-3 text-[10px] font-bold text-secondary/40 uppercase tracking-[0.15em] ml-4 mt-4">
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Encrypted password storage using bcrypt hashing</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Secure HTTPS connections for all data transmission</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Access controls limiting data access to authorized personnel only</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Regular security audits and updates</li>
                                <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold rounded-full"></div>Biometric data stored as encrypted vector embeddings</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                7. Biometric Data Consent
                            </h3>
                            <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-2xl p-6 shadow-inner">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold mb-4 leading-relaxed">
                                    Special Notice: By providing your facial biometric data, you explicitly consent to:
                                </p>
                                <ul className="space-y-3 text-[9px] font-bold text-brand-gold/70 uppercase tracking-[0.15em] ml-4">
                                    <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold/40 rounded-full"></div>Capture and storage of your facial images from 5 different angles</li>
                                    <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold/40 rounded-full"></div>Processing of these images into encrypted vector embeddings</li>
                                    <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold/40 rounded-full"></div>Use of facial recognition technology for automated attendance</li>
                                    <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold/40 rounded-full"></div>CCTV monitoring in the computer laboratory during class sessions</li>
                                    <li className="flex items-center gap-3"><div className="w-1 h-1 bg-brand-gold/40 rounded-full"></div>Storage of attendance snapshots for verification purposes</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-white mb-4 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-6 h-px bg-brand-gold/30"></span>
                                9. Final Acknowledgment
                            </h3>
                            <div className="bg-white/5 border-l-4 border-brand-gold rounded-r-xl p-5">
                                <p className="text-[10px] font-bold leading-relaxed text-white uppercase tracking-[0.15em]">
                                    By clicking "I Accept" below, you acknowledge that you have read, understood, and agree to
                                    this Data Privacy Notice. You consent to the collection, processing, and storage of your
                                    personal information, including biometric data, as described above.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-white/5 flex gap-4 justify-end relative z-10 bg-maroon-950">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-secondary/40 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => {
                            onAccept();
                            onClose();
                        }}
                        className="px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-brand-gold text-black hover:brightness-110 transition-all shadow-xl shadow-brand-gold/10 active:scale-95"
                    >
                        Accept Terms
                    </button>
                </div>
            </div>
        </div>
    );
}
