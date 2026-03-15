'use client';

import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ConsentStepProps {
    onAccept: () => void;
    onDecline: () => void;
    consentType: 'registration' | 'cctv' | 'data_processing';
}

export const CONSENT_VERSION = '1.0';

export default function ConsentStep({
    onAccept,
    onDecline,
    consentType
}: ConsentStepProps) {
    const [understood, setUnderstood] = useState(false);
    const [readToEnd, setReadToEnd] = useState(false);

    const consentContent = {
        registration: {
            title: 'Biometric Data Collection Consent',
            subtitle: 'Philippine Data Privacy Act Compliance',
            description: 'We will collect and process your facial biometric data for attendance tracking purposes.',
            details: [
                {
                    icon: '📸',
                    title: 'Face Photo Collection',
                    text: 'Your face photo will be captured and stored securely'
                },
                {
                    icon: '🔢',
                    title: 'Biometric Template Generation',
                    text: 'A mathematical representation (512-dimensional embedding) will be generated from your photo'
                },
                {
                    icon: '✅',
                    title: 'Attendance Verification',
                    text: 'Data will be used solely for automatic attendance tracking via CCTV'
                },
                {
                    icon: '🔒',
                    title: 'Data Security',
                    text: 'All biometric data is encrypted using AES-256-GCM encryption'
                }
            ],
            risks: [
                'Your biometric data is sensitive personal information',
                'Unauthorized access could lead to identity theft',
                'Data breach could compromise your privacy'
            ]
        },
        cctv: {
            title: 'CCTV Monitoring Consent',
            subtitle: 'Automatic Attendance Tracking',
            description: 'CCTV cameras will capture and analyze your image for automatic attendance marking.',
            details: [
                {
                    icon: '📹',
                    title: 'Real-time Monitoring',
                    text: 'CCTV footage will be analyzed in real-time during class sessions'
                },
                {
                    icon: '🎯',
                    title: 'Automatic Recognition',
                    text: 'Your face will be recognized automatically using FaceNet AI (99% accuracy)'
                },
                {
                    icon: '🛡️',
                    title: 'Liveness Detection',
                    text: 'Anti-spoofing technology verifies you are physically present (98% accuracy)'
                },
                {
                    icon: '⏱️',
                    title: 'Temporary Storage',
                    text: 'CCTV footage is processed in real-time and not permanently stored'
                }
            ],
            risks: [
                'You will be continuously monitored during class',
                'False positives may occur (less than 1%)',
                'System may log spoofing attempts if liveness fails'
            ]
        },
        data_processing: {
            title: 'Data Processing Consent',
            subtitle: 'General Data Usage',
            description: 'Your personal and biometric data will be processed for educational and administrative purposes.',
            details: [
                {
                    icon: '🔐',
                    title: 'Secure Storage',
                    text: 'Data stored with military-grade encryption (AES-256-GCM)'
                },
                {
                    icon: '👥',
                    title: 'Limited Access',
                    text: 'Access restricted to authorized personnel only (professors, admins)'
                },
                {
                    icon: '📅',
                    title: 'Retention Period',
                    text: 'Data retained only while you are enrolled, deleted within 30 days after graduation'
                },
                {
                    icon: '⚖️',
                    title: 'Your Rights',
                    text: 'You can access, correct, or delete your data anytime'
                }
            ],
            risks: [
                'Data may be shared with authorized school personnel',
                'Attendance records may be used for academic evaluation',
                'System logs may be used for security audits'
            ]
        }
    };

    const content = consentContent[consentType];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
        if (isAtBottom && !readToEnd) {
            setReadToEnd(true);
        }
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                            <Shield className="text-white" size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{content.title}</h2>
                            <p className="text-blue-100 text-sm">{content.subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div
                    className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar"
                    onScroll={handleScroll}
                >
                    {/* Important Notice */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                            <AlertCircle className="text-blue-400 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <p className="text-blue-100 font-semibold mb-2">Important Notice</p>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {content.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What This Means */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-4 text-white">What this means for you:</h3>
                        <div className="space-y-3">
                            {content.details.map((detail, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <span className="text-2xl flex-shrink-0">{detail.icon}</span>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{detail.title}</p>
                                        <p className="text-slate-400 text-sm mt-1">{detail.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Risks */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-yellow-200 mb-3 flex items-center gap-2">
                            <AlertCircle size={18} />
                            Potential Risks
                        </h3>
                        <ul className="space-y-2">
                            {content.risks.map((risk, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-300">
                                    <span className="text-yellow-400">⚠️</span>
                                    <span>{risk}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Your Rights */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold mb-3 text-white">Your Rights Under Philippine Data Privacy Act</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to Access & Copy</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to Correction</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to Deletion (Erasure)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to Withdraw Consent</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to Data Portability</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Right to File Complaint</span>
                            </div>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    {!readToEnd && (
                        <div className="text-center text-sm text-slate-400 animate-pulse mt-4">
                            ↓ Scroll down to continue ↓
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-900 p-6 border-t border-slate-700">
                    <div className="flex items-start gap-3 mb-6">
                        <input
                            type="checkbox"
                            id="understood"
                            checked={understood}
                            onChange={(e) => setUnderstood(e.target.checked)}
                            disabled={!readToEnd}
                            className="w-5 h-5 mt-1 cursor-pointer disabled:cursor-not-allowed rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="understood"
                            className={`text-sm ${readToEnd ? 'text-slate-300' : 'text-slate-500'} cursor-pointer select-none`}
                        >
                            I have read and understood the above information. I freely give my consent for the collection and processing of my biometric data as described.
                        </label>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onDecline}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 text-slate-300 hover:text-white"
                        >
                            <XCircle size={20} />
                            Decline
                        </button>
                        <button
                            type="button"
                            onClick={onAccept}
                            disabled={!understood || !readToEnd}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-all font-semibold flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-500/20 disabled:shadow-none"
                        >
                            <CheckCircle size={20} />
                            Accept & Continue
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                        Consent Version {CONSENT_VERSION} • Securely logged upon acceptance
                    </p>
                </div>
            </div>
        </div>
    );
}
