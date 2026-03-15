"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700 relative">
                    <div className="absolute top-8 left-8">
                        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} className="mr-2" />
                            Back
                        </button>
                    </div>
                    <div className="mt-12">
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                            Privacy Policy
                        </h1>
                    </div>
                    <p className="text-slate-400 mb-8">
                        Effective Date: January 4, 2026 | Version 1.0
                    </p>

                    {/* Introduction */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
                        <p className="text-slate-300 leading-relaxed">
                            LabFace is committed to protecting your privacy and complying with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
                            This privacy policy explains how we collect, use, store, and protect your personal and biometric data.
                        </p>
                    </section>

                    {/* Data We Collect */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">1. Data We Collect</h2>
                        <div className="bg-slate-900/50 rounded-lg p-6 mb-4">
                            <h3 className="text-lg font-semibold mb-3 text-blue-400">Personal Information</h3>
                            <ul className="list-disc list-inside text-slate-300 space-y-2">
                                <li>Full name</li>
                                <li>Student/Employee ID number</li>
                                <li>Email address</li>
                                <li>Course and year level (for students)</li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-3 text-blue-400">Biometric Data (Sensitive Personal Information)</h3>
                            <ul className="list-disc list-inside text-slate-300 space-y-2">
                                <li>Face photographs</li>
                                <li>Facial biometric templates (512-dimensional embeddings)</li>
                                <li>Attendance records with timestamps</li>
                                <li>CCTV footage (processed in real-time, not permanently stored)</li>
                                <li>Liveness detection data (anti-spoofing verification)</li>
                            </ul>
                        </div>
                    </section>

                    {/* How We Use Your Data */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">2. How We Use Your Data</h2>
                        <p className="text-slate-300 mb-4">We use your data for the following purposes:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong>Identity Verification:</strong> To verify your identity during attendance tracking</li>
                            <li><strong>Attendance Tracking:</strong> To automatically mark your attendance using CCTV and facial recognition</li>
                            <li><strong>Fraud Prevention:</strong> To prevent attendance fraud and spoofing attacks using liveness detection</li>
                            <li><strong>Academic Records:</strong> To generate attendance reports for academic evaluation</li>
                            <li><strong>System Improvement:</strong> To improve recognition accuracy and system security</li>
                            <li><strong>Security Audits:</strong> To maintain system logs for security and compliance purposes</li>
                        </ul>
                    </section>

                    {/* Legal Basis */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">3. Legal Basis for Processing</h2>
                        <p className="text-slate-300 mb-4">
                            We process your biometric data based on your <strong>explicit consent</strong> as required by Section 13 of the Philippine Data Privacy Act.
                            You have the right to withdraw this consent at any time.
                        </p>
                    </section>

                    {/* Data Security */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Security Measures</h2>
                        <p className="text-slate-300 mb-4">We protect your data using industry-standard security measures:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">🔐 Encryption at Rest</h3>
                                <p className="text-sm text-slate-400">AES-256-GCM encryption for all biometric data stored in our database</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">🔒 Encryption in Transit</h3>
                                <p className="text-sm text-slate-400">TLS 1.3 encryption for all data transmitted over the network</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">👥 Access Controls</h3>
                                <p className="text-sm text-slate-400">Role-based access with authentication and authorization</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">📝 Audit Logging</h3>
                                <p className="text-sm text-slate-400">All data access and modifications are logged for security audits</p>
                            </div>
                        </div>
                    </section>

                    {/* Data Retention */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Retention</h2>
                        <p className="text-slate-300 mb-4">
                            We retain your data only as long as necessary for the purposes stated above:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong>Active Users:</strong> Data retained while you are enrolled or employed</li>
                            <li><strong>Graduated/Separated:</strong> Data deleted within 30 days after graduation or separation</li>
                            <li><strong>Audit Logs:</strong> Security logs retained for 1 year for compliance purposes</li>
                            <li><strong>CCTV Footage:</strong> Processed in real-time and not permanently stored</li>
                        </ul>
                    </section>

                    {/* Your Rights */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Rights Under Philippine Data Privacy Act</h2>
                        <p className="text-slate-300 mb-4">You have the following rights regarding your personal data:</p>

                        <div className="space-y-4">
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Access</h3>
                                <p className="text-sm text-slate-400">Request a copy of all personal data we hold about you</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Rectification</h3>
                                <p className="text-sm text-slate-400">Request correction of inaccurate or incomplete data</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Erasure</h3>
                                <p className="text-sm text-slate-400">Request deletion of your personal and biometric data</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Object</h3>
                                <p className="text-sm text-slate-400">Object to the processing of your data for specific purposes</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Data Portability</h3>
                                <p className="text-sm text-slate-400">Receive your data in a structured, machine-readable format</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-400 mb-2">✓ Right to Withdraw Consent</h3>
                                <p className="text-sm text-slate-400">Withdraw your consent for biometric data processing at any time</p>
                            </div>
                        </div>

                        <p className="text-slate-400 mt-4 text-sm">
                            To exercise any of these rights, please contact our Data Protection Officer (see contact information below).
                        </p>
                    </section>

                    {/* Data Sharing */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">7. Data Sharing and Disclosure</h2>
                        <p className="text-slate-300 mb-4">
                            We do not sell, rent, or trade your personal data. We may share your data only in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong>Authorized Personnel:</strong> Professors and administrators with legitimate educational interest</li>
                            <li><strong>Legal Requirements:</strong> When required by law or court order</li>
                            <li><strong>Emergency Situations:</strong> To protect health, safety, or security</li>
                        </ul>
                    </section>

                    {/* Breach Notification */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">8. Data Breach Notification</h2>
                        <p className="text-slate-300">
                            In the event of a data breach that may affect your personal data, we will:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                            <li>Notify the National Privacy Commission (NPC) within 72 hours</li>
                            <li>Notify affected individuals within 24 hours</li>
                            <li>Provide information about the breach and steps taken to mitigate harm</li>
                        </ul>
                    </section>



                    {/* Changes to Policy */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-white">9. Changes to This Policy</h2>
                        <p className="text-slate-300">
                            We may update this privacy policy from time to time. We will notify you of any material changes by:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
                            <li>Posting the updated policy on our website</li>
                            <li>Sending email notifications to registered users</li>
                            <li>Requesting renewed consent if required by law</li>
                        </ul>
                    </section>

                    {/* Footer */}
                    <div className="border-t border-slate-700 pt-6 mt-8">
                        <p className="text-slate-400 text-sm text-center">
                            Last Updated: January 4, 2026 | Version 1.0
                        </p>
                        <p className="text-slate-500 text-xs text-center mt-2">
                            This privacy policy complies with the Philippine Data Privacy Act of 2012 (RA 10173) and its Implementing Rules and Regulations
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
