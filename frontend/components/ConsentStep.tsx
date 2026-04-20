"use client";

import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, XCircle, ChevronDown, Lock, Zap } from 'lucide-react';

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
            title: 'Face Registration Consent',
            subtitle: 'Data Privacy Act · Data Privacy Security',
            description: 'We will capture and archive 5 perspective face registration photos for continuous identity verification.',
            details: [
                {
                    icon: <Zap size={20} className="text-identity-sky" />,
                    title: 'Biolayer Capture',
                    text: '5 perspective angles captured for reconstruction'
                },
                {
                    icon: <Lock size={20} className="text-identity-sky" />,
                    title: 'Vector Generation',
                    text: 'Encrypted 512-dimensional face profiles'
                },
                {
                    icon: <CheckCircle size={20} className="text-identity-sky" />,
                    title: 'Active Verification',
                    text: 'Real-time laboratory presence confirmation'
                },
                {
                    icon: <Shield size={20} className="text-identity-sky" />,
                    title: 'GCM Encryption',
                    text: 'AES-256-GCM hardware-level protection'
                }
            ],
            risks: [
                'Biometric signatures are permanent identity markers',
                'Encryption prevents interception but data is stored indefinitely',
                'System identifies spoofing attempts in real-time'
            ]
        },
        cctv: {
            title: 'CCTV Consent',
            subtitle: 'Continuous Verification',
            description: 'Intelligent CCTV nodes will analyze your presence in real-time for automated logging.',
            details: [
                {
                    icon: <Zap size={20} className="text-identity-sky" />,
                    title: 'Real-time Detection',
                    text: 'Laboratory nodes maintain persistent connection'
                },
                {
                    icon: <Shield size={20} className="text-identity-sky" />,
                    title: 'FaceNet Logic',
                    text: 'High-fidelity Recognition (99.2% System Accuracy)'
                },
                {
                    icon: <CheckCircle size={20} className="text-identity-sky" />,
                    title: 'Sentry Protocol',
                    text: 'Liveness detection identifies biological subjects'
                },
                {
                    icon: <Lock size={20} className="text-identity-sky" />,
                    title: 'Transient Buffer',
                    text: 'Video data is processed and flushed from memory'
                }
            ],
            risks: [
                'Continuous monitoring during laboratory sessions',
                'Minimal detection variance may occur in fluctuating light',
                'Unauthorized presence triggers administrative alerts'
            ]
        },
        data_processing: {
            title: 'Data Retention Policy',
            subtitle: 'Persistence & Governance',
            description: 'Your biometric and academic signatures will be processed for secure laboratory oversight.',
            details: [
                {
                    icon: <Lock size={20} className="text-identity-sky" />,
                    title: 'Data Security',
                    text: 'Military-grade persistence using hardware HSM'
                },
                {
                    icon: <Zap size={20} className="text-identity-sky" />,
                    title: 'Role Isolation',
                    text: 'Strict access control via AuthGuard encryption'
                },
                {
                    icon: <CheckCircle size={20} className="text-identity-sky" />,
                    title: 'Data Retention',
                    text: 'Purged 5 years after academic cycle completion'
                },
                {
                    icon: <Shield size={20} className="text-identity-sky" />,
                    title: 'Digital Sovereignty',
                    text: 'Right to request full account deletion'
                }
            ],
            risks: [
                'Records are utilized for official academic evaluation',
                'Metadata is archived for security audit compliance',
                'Authorized oversight is mandatory for lab access'
            ]
        }
    };

    const content = consentContent[consentType];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 80;
        if (isAtBottom && !readToEnd) {
            setReadToEnd(true);
        }
    };

    return (
        <div className="w-full animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 relative">
                {/* Header */}
                <div className="bg-identity-navy p-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-identity-sky/20 via-transparent to-transparent" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="bg-identity-sky p-4 rounded-[1.5rem] shadow-2xl text-white">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none font-outfit">{content.title}</h2>
                            <p className="text-[10px] font-black text-identity-sky/80 uppercase tracking-[0.3em] mt-3">{content.subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div
                    className="p-10 overflow-y-auto max-h-[55vh] custom-scrollbar space-y-12 bg-[#F8FAFC]"
                    onScroll={handleScroll}
                >
                    {/* Important Notice */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-identity-sky opacity-20" />
                        <div className="flex gap-6">
                            <AlertCircle className="text-identity-sky flex-shrink-0 mt-1" size={24} />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Data Privacy Policy</p>
                                <p className="text-identity-navy text-xs font-black uppercase tracking-[0.15em] leading-relaxed">
                                    {content.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What This Means */}
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-black text-identity-navy uppercase tracking-[0.25em] flex items-center gap-3">
                            <span className="w-8 h-px bg-identity-sky/30"></span>
                            Privacy Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {content.details.map((detail, idx) => (
                                <div key={idx} className="flex gap-5 p-6 bg-white rounded-2xl border border-slate-100 hover:border-identity-sky/30 transition-all group shadow-sm">
                                    <div className="shrink-0 scale-100 group-hover:scale-110 transition-transform duration-500">
                                        {detail.icon}
                                    </div>
                                    <div>
                                        <p className="font-black text-identity-navy text-[10px] uppercase tracking-[0.15em]">{detail.title}</p>
                                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em] mt-2 leading-relaxed">{detail.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Risks */}
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-8">
                        <h3 className="text-[10px] font-black text-rose-600 mb-5 flex items-center gap-3 uppercase tracking-[0.15em]">
                            <AlertCircle size={14} />
                            Strategic Risks
                        </h3>
                        <ul className="space-y-4">
                            {content.risks.map((risk, idx) => (
                                <li key={idx} className="flex gap-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] leading-relaxed">
                                    <span className="text-rose-500 shrink-0">⚠</span>
                                    <span>{risk}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Your Rights */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-[10px] font-black mb-6 text-identity-navy uppercase tracking-[0.15em]">Digital Sovereignty Rights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                            {[
                                { text: "Right to Vector Access", icon: <CheckCircle size={14} className="text-identity-sky/40" /> },
                                { text: "Right to Rectification", icon: <CheckCircle size={14} className="text-identity-sky/40" /> },
                                { text: "Right to Data Deletion", icon: <CheckCircle size={14} className="text-identity-sky/40" /> },
                                { text: "Right to Revoke Consent", icon: <CheckCircle size={14} className="text-identity-sky/40" /> },
                                { text: "Right to Data Portability", icon: <CheckCircle size={14} className="text-identity-sky/40" /> },
                                { text: "Right to File Governance", icon: <CheckCircle size={14} className="text-identity-sky/40" /> }
                            ].map((right, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    {right.icon}
                                    <span className="group-hover:text-identity-navy transition-colors">{right.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    {!readToEnd && (
                        <div className="text-center pt-4">
                            <p className="text-[9px] font-black text-identity-sky/60 animate-bounce tracking-[0.4em] uppercase flex flex-col items-center gap-3">
                                Advance to Validate
                                <ChevronDown size={14} />
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white p-10 border-t border-slate-100 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                    <div className="flex items-start gap-5 mb-10">
                        <div className="relative flex items-center shrink-0">
                            <input
                                type="checkbox"
                                id="understood"
                                checked={understood}
                                onChange={(e) => setUnderstood(e.target.checked)}
                                disabled={!readToEnd}
                                className="w-6 h-6 rounded-lg border-slate-200 bg-slate-50 text-identity-sky focus:ring-identity-sky/20 cursor-pointer disabled:cursor-not-allowed transition-all"
                            />
                        </div>
                        <label
                            htmlFor="understood"
                            className={`text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed cursor-pointer select-none transition-colors ${readToEnd ? 'text-identity-navy' : 'text-slate-300'}`}
                        >
                            I have read the policy and agree to the collection of my photos for attendance.
                        </label>
                    </div>

                    <div className="flex gap-5">
                        <button
                            type="button"
                            onClick={onDecline}
                            className="flex-1 px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-identity-navy hover:bg-white hover:border-identity-navy/20 active:scale-95"
                        >
                            Decline
                        </button>
                        <button
                            type="button"
                            onClick={onAccept}
                            disabled={!understood || !readToEnd}
                            className="flex-1 px-10 py-5 bg-identity-sky text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-identity-sky/20 hover:brightness-110 disabled:opacity-20 disabled:grayscale active:scale-95 border border-identity-sky"
                        >
                            I Agree
                        </button>
                    </div>

                    <p className="text-[8px] font-black text-slate-300 mt-8 text-center uppercase tracking-[0.3em]">
                        POL-ID-LOG v{CONSENT_VERSION} · CRYPTOGRAPHIC LOG ESTABLISHED
                    </p>
                </div>
            </div>
        </div>
    );
}
