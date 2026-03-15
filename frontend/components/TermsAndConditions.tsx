import React from 'react';
import { X } from 'lucide-react';

interface TermsAndConditionsProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

export default function TermsAndConditions({ isOpen, onClose, onAccept }: TermsAndConditionsProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Terms and Conditions</h2>
                        <p className="text-sm text-slate-400 mt-1">LabFace System - PUP Lopez Campus</p>
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
                            Please read these Terms and Conditions carefully before using the LabFace System.
                        </p>
                    </div>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h3>
                        <p className="text-sm leading-relaxed">
                            By registering for and using the LabFace Web-Based CCTV Face Recognition System for Attendance
                            ("the System"), you agree to be bound by these Terms and Conditions. If you do not agree to
                            these terms, you may not use the System.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">2. System Purpose and Scope</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            The LabFace System is designed exclusively for:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li>Automated attendance monitoring in PUP Lopez Campus Computer Laboratory</li>
                            <li>Class enrollment and schedule management</li>
                            <li>Academic record keeping and reporting</li>
                            <li>Enhancing security and accountability in laboratory sessions</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">3. User Responsibilities</h3>
                        <p className="text-sm leading-relaxed mb-2">As a user of the System, you agree to:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li>Provide accurate and truthful information during registration</li>
                            <li>Maintain the confidentiality of your account credentials</li>
                            <li>Use the System only for its intended academic purposes</li>
                            <li>Comply with all university policies and regulations</li>
                            <li>Report any unauthorized access or security breaches immediately</li>
                            <li>Not attempt to circumvent or manipulate the facial recognition system</li>
                            <li>Not share your account with others or allow proxy attendance</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">4. Biometric Data Usage</h3>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                            <p className="text-sm leading-relaxed text-amber-200 mb-2">
                                <strong>Important Notice:</strong> You acknowledge and agree that:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm ml-4 text-amber-200">
                                <li>Your facial biometric data will be captured and stored for attendance verification</li>
                                <li>CCTV cameras will monitor the computer laboratory during class sessions</li>
                                <li>The System will automatically mark your attendance based on facial recognition</li>
                                <li>Attendance snapshots may be stored for verification and dispute resolution</li>
                                <li>You cannot use another person's identity for attendance purposes</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">5. Attendance Policy</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            The System operates under the following attendance rules:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li><strong className="text-white">Present:</strong> Detected within 15 minutes of class start time</li>
                            <li><strong className="text-white">Late:</strong> Detected more than 15 minutes after class start time</li>
                            <li><strong className="text-white">Absent:</strong> Not detected during the entire session</li>
                            <li>Entry and exit movements are tracked to ensure physical presence</li>
                            <li>Attendance disputes must be raised within 24 hours with supporting evidence</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">6. Account Security</h3>
                        <p className="text-sm leading-relaxed">
                            You are responsible for maintaining the security of your account. This includes:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>Creating a strong password (minimum 6 characters)</li>
                            <li>Not sharing your password with anyone</li>
                            <li>Logging out after each session, especially on shared devices</li>
                            <li>Reporting suspicious activity immediately to support@labface.site</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">7. System Availability</h3>
                        <p className="text-sm leading-relaxed">
                            While we strive to maintain 24/7 availability, the System may be temporarily unavailable due to:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>Scheduled maintenance and updates</li>
                            <li>Technical issues or emergencies</li>
                            <li>Network connectivity problems</li>
                            <li>Force majeure events</li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-2">
                            PUP Lopez Campus is not liable for attendance issues arising from system downtime beyond our control.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">8. Prohibited Activities</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            The following activities are strictly prohibited:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                            <li>Attempting to hack, reverse engineer, or compromise the System</li>
                            <li>Using photos, videos, or masks to deceive the facial recognition system</li>
                            <li>Accessing another user's account without authorization</li>
                            <li>Interfering with CCTV cameras or system infrastructure</li>
                            <li>Uploading malicious code or viruses</li>
                            <li>Harvesting or scraping user data</li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-2 text-red-400">
                            <strong>Violation of these terms may result in account suspension, academic sanctions,
                                and/or legal action.</strong>
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">9. Intellectual Property</h3>
                        <p className="text-sm leading-relaxed">
                            The LabFace System, including its source code, design, and documentation, is the intellectual
                            property of the development team and PUP Lopez Campus. Unauthorized reproduction, distribution,
                            or modification is prohibited.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">10. Limitation of Liability</h3>
                        <p className="text-sm leading-relaxed">
                            To the fullest extent permitted by law, PUP Lopez Campus and the LabFace development team
                            shall not be liable for:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>Inaccurate attendance records due to technical failures</li>
                            <li>Data loss or corruption</li>
                            <li>Unauthorized access resulting from user negligence</li>
                            <li>Indirect, incidental, or consequential damages</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">11. Modifications to Terms</h3>
                        <p className="text-sm leading-relaxed">
                            PUP Lopez Campus reserves the right to modify these Terms and Conditions at any time.
                            Users will be notified of significant changes via email or system notifications.
                            Continued use of the System after modifications constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">12. Termination</h3>
                        <p className="text-sm leading-relaxed">
                            Your access to the System may be terminated:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
                            <li>Upon graduation or withdrawal from PUP Lopez Campus</li>
                            <li>For violation of these Terms and Conditions</li>
                            <li>At your request by contacting support@labface.site</li>
                            <li>At the discretion of university administration</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">13. Governing Law</h3>
                        <p className="text-sm leading-relaxed">
                            These Terms and Conditions are governed by the laws of the Republic of the Philippines.
                            Any disputes shall be resolved in accordance with university policies and Philippine law.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">14. Contact Information</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            For questions or concerns regarding these Terms and Conditions:
                        </p>
                        <div className="bg-slate-800 rounded-lg p-4">
                            <p className="text-sm text-white font-medium">LabFace System Support</p>
                            <p className="text-sm text-slate-400">Email: support@labface.site</p>
                            <p className="text-sm text-slate-400">Polytechnic University of the Philippines - Lopez Campus</p>
                            <p className="text-sm text-slate-400">Computer Laboratory</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-white mb-3">15. Acknowledgment</h3>
                        <div className="bg-slate-800 border-l-4 border-brand-500 rounded-lg p-4">
                            <p className="text-sm leading-relaxed text-white">
                                By clicking "I Accept" below, you acknowledge that you have read, understood, and agree
                                to be bound by these Terms and Conditions. You also confirm that you are authorized to
                                use the LabFace System as a registered student or professor of PUP Lopez Campus.
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
