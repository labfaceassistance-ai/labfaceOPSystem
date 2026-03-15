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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col my-4">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Data Privacy Consent</h2>
                        <p className="text-sm text-slate-400 mt-1">Republic Act No. 10173 - Data Privacy Act of 2012</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                        <p className="text-sm text-brand-400 font-medium">
                            Please read this Data Privacy Notice carefully before proceeding with your registration.
                        </p>
                    </div>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">1. Introduction</h3>
                        <p className="text-sm leading-relaxed">
                            The Polytechnic University of the Philippines (PUP) Lopez Campus, through the LabFace System,
                            is committed to protecting your privacy and ensuring the security of your personal information.
                            This Data Privacy Notice explains how we collect, use, store, and protect your data in compliance
                            with Republic Act No. 10173, also known as the Data Privacy Act of 2012.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">2. Data Collection</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            We collect the following types of personal information:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li>Personal Identification: Name, Student/Professor ID, Email Address</li>
                            <li>Academic Information: Course, Year Level, Section, Class Enrollment</li>
                            <li>Biometric Data: Facial recognition images (5 angles) for attendance verification</li>
                            <li>Attendance Records: Time-in, time-out, attendance status, CCTV snapshots</li>
                            <li>Account Information: Password (encrypted), profile picture</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">3. Purpose of Data Processing</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            Your personal data will be processed for the following purposes:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li>Automated attendance monitoring using facial recognition technology</li>
                            <li>Class enrollment and academic record management</li>
                            <li>Communication regarding class schedules and attendance</li>
                            <li>Generation of attendance reports and analytics</li>
                            <li>System security and access control</li>
                            <li>Compliance with university policies and regulations</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">4. Data Storage and Security</h3>
                        <p className="text-sm leading-relaxed">
                            Your personal data is stored securely in encrypted databases and object storage systems.
                            We implement industry-standard security measures including:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>Encrypted password storage using bcrypt hashing</li>
                            <li>Secure HTTPS connections for all data transmission</li>
                            <li>Access controls limiting data access to authorized personnel only</li>
                            <li>Regular security audits and updates</li>
                            <li>Biometric data stored as encrypted vector embeddings</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">5. Data Sharing and Disclosure</h3>
                        <p className="text-sm leading-relaxed">
                            Your personal information will NOT be shared with third parties except:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>With your explicit consent</li>
                            <li>When required by law or court order</li>
                            <li>To authorized university officials for academic purposes</li>
                            <li>To your enrolled professors for class management</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">6. Your Rights as a Data Subject</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            Under the Data Privacy Act, you have the following rights:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li><strong className="text-white">Right to be Informed:</strong> You have the right to know how your data is being processed</li>
                            <li><strong className="text-white">Right to Access:</strong> You can request access to your personal data</li>
                            <li><strong className="text-white">Right to Rectification:</strong> You can update or correct your information through your profile</li>
                            <li><strong className="text-white">Right to Erasure:</strong> You can request deletion of your data (subject to retention policies)</li>
                            <li><strong className="text-white">Right to Object:</strong> You can object to certain data processing activities</li>
                            <li><strong className="text-white">Right to Data Portability:</strong> You can request a copy of your data in a structured format</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">7. Biometric Data Consent</h3>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                            <p className="text-sm leading-relaxed text-amber-200">
                                <strong>Special Notice:</strong> By providing your facial biometric data, you explicitly consent to:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2 text-amber-200">
                                <li>Capture and storage of your facial images from 5 different angles</li>
                                <li>Processing of these images into encrypted vector embeddings</li>
                                <li>Use of facial recognition technology for automated attendance</li>
                                <li>CCTV monitoring in the computer laboratory during class sessions</li>
                                <li>Storage of attendance snapshots for verification purposes</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">8. Data Retention</h3>
                        <p className="text-sm leading-relaxed">
                            Your personal data will be retained for the duration of your enrollment at PUP Lopez Campus
                            and for a period of five (5) years thereafter, in compliance with university record-keeping
                            policies and the Commission on Higher Education (CHED) requirements.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">9. Consent</h3>
                        <div className="bg-slate-800 border-l-4 border-brand-500 rounded-lg p-4">
                            <p className="text-sm leading-relaxed text-white">
                                By clicking "I Accept" below, you acknowledge that you have read, understood, and agree to
                                this Data Privacy Notice. You consent to the collection, processing, and storage of your
                                personal information, including biometric data, as described above.
                            </p>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onAccept();
                            onClose();
                        }}
                        className="px-6 py-2 rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-lg shadow-brand-500/20"
                    >
                        I Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
