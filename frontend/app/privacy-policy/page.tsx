"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Lock, Users, Server, Database, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <div className="w-full relative selection:bg-identity-sky/10 min-h-screen">
            <Navbar />
            
            <div className="flex-grow container mx-auto px-6 pt-32 pb-20 relative z-10 w-full max-w-4xl">
                
                <div className="mb-8">
                    <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-identity-navy font-black uppercase text-[10px] tracking-[0.2em] transition-colors group bg-white/50 px-5 py-3 rounded-2xl border border-slate-200">
                        <ArrowLeft size={16} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                        Return to Previous Terminus
                    </button>
                </div>

                <div className="identity-glass rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden border border-identity-sky/20 animate-fade-in relative z-20">
                    
                    {/* Header Area */}
                    <div className="bg-identity-navy p-12 lg:p-16 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-blueprint-fine opacity-[0.03] pointer-events-none"></div>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-identity-sky/60 to-transparent"></div>
                        
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-8 relative z-10 text-identity-sky">
                            <Shield size={40} />
                        </div>
                        
                        <h1 className="relative z-10 text-3xl md:text-4xl md:text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-4 font-outfit">
                            Privacy Policy
                        </h1>
                        <p className="relative z-10 text-identity-sky text-[10px] md:text-xs font-black tracking-[0.4em] uppercase">
                            Data Protection & Security Framework
                        </p>
                        
                        <div className="mt-8 inline-flex items-center gap-2 bg-white/5 rounded-full px-5 py-2 border border-white/10">
                            <AlertCircle size={14} className="text-identity-sky" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Effective Date: January 4, 2026 | Version 1.0</span>
                        </div>
                    </div>

                    <div className="p-8 md:p-16 bg-white/50 backdrop-blur-sm space-y-12 text-slate-700 leading-relaxed">
                        
                        {/* Introduction */}
                        <section className="space-y-4">
                            <div className="inline-flex items-center gap-4 text-identity-navy mb-2">
                                <AlertCircle className="w-5 h-5 text-identity-sky" />
                                <h2 className="text-xl font-black uppercase tracking-tight">Introduction</h2>
                            </div>
                            <p className="font-bold text-sm tracking-wide text-slate-600">
                                LabFace is committed to protecting your privacy and complying with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
                                This privacy policy explains how we collect, use, store, and protect your personal and biometric data.
                            </p>
                        </section>

                        {/* Data We Collect */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-black uppercase tracking-tight text-identity-navy border-b border-slate-200 pb-3">1. Data We Collect</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                                        <div className="bg-identity-sky/10 p-2 rounded-2xl text-identity-sky"><Users size={20} /></div>
                                        <h3 className="text-sm font-black text-identity-navy uppercase tracking-[0.15em]">Personal Information</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {['Full name', 'Student/Employee ID number', 'Email address', 'Course and year level'].map((item, i) => (
                                            <li key={i} className="flex items-start gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-identity-sky mt-2 flex-shrink-0" />
                                                <span className="text-xs font-bold text-slate-600 tracking-wide">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                                        <div className="bg-identity-navy/5 p-2 rounded-2xl text-identity-navy"><Database size={20} /></div>
                                        <h3 className="text-sm font-black text-identity-navy uppercase tracking-[0.15em]">Biometric Data</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {[
                                            'Face photographs',
                                            'Biometric templates (512-dimensional)',
                                            'Attendance records with timestamps',
                                            'Liveness detection data',
                                            'Temporary CCTV processing buffers'
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-identity-navy mt-2 flex-shrink-0" />
                                                <span className="text-xs font-bold text-slate-600 tracking-wide">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* How We Use Your Data */}
                        <section className="space-y-6 bg-identity-sky/5 p-8 md:p-10 rounded-[2.5rem] border border-identity-sky/10">
                            <h2 className="text-xl font-black uppercase tracking-tight text-identity-navy mb-4">2. How We Use Your Data</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { t: 'Identity Verification', d: 'To verify your identity during laboratory access.' },
                                    { t: 'Attendance Tracking', d: 'To automatically log your presence via CCTV.' },
                                    { t: 'Fraud Prevention', d: 'To mitigate spoofing using liveness safeguards.' },
                                    { t: 'Academic Records', d: 'To generate official attendance reports.' },
                                    { t: 'System Improvement', d: 'To train internal recognition accuracy pipelines.' },
                                    { t: 'Security Audits', d: 'To log access for compliance reviews.' }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border border-identity-sky/10 flex flex-col gap-1 shadow-sm">
                                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-identity-sky">{item.t}</span>
                                        <span className="text-xs font-bold text-slate-600 leading-relaxed">{item.d}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Data Security Measures */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-black uppercase tracking-tight text-identity-navy border-b border-slate-200 pb-3">3. Data Security Measures</h2>
                            <p className="font-bold text-sm tracking-wide text-slate-500 mb-6">
                                We protect your data using industry-standard enterprise security measures:
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[
                                    { i: <Lock />, t: 'Encryption at Rest', d: 'AES-256-GCM encryption for all biometric data stored in our database.' },
                                    { i: <Server />, t: 'Encryption in Transit', d: 'TLS 1.3 encryption for all data transmitted over the network.' },
                                    { i: <Users />, t: 'Access Controls', d: 'Role-based access with multi-layered authentication.' },
                                    { i: <Shield />, t: 'Audit Logging', d: 'All data access and modifications are strictly logged.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-5 items-start p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                                        <div className="bg-identity-sky/10 text-identity-sky p-3 rounded-2xl">
                                            {item.i}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-identity-navy mb-2">{item.t}</h3>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Your Rights */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-black uppercase tracking-tight text-identity-navy border-b border-slate-200 pb-3">4. Rights Under Data Privacy Act</h2>
                            <div className="space-y-3">
                                {[
                                    { t: 'Right to Access', d: 'Request a copy of all personal data we hold about you.' },
                                    { t: 'Right to Rectification', d: 'Request correction of inaccurate or incomplete data.' },
                                    { t: 'Right to Erasure', d: 'Request deletion of your personal and biometric data.' },
                                    { t: 'Right to Object', d: 'Object to the processing of your data for specific purposes.' },
                                    { t: 'Right to Data Portability', d: 'Receive your data in a structured, machine-readable format.' },
                                    { t: 'Right to Withdraw Consent', d: 'Withdraw your consent for biometric data processing at any time.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black flex-shrink-0">âœ“</div>
                                        <div>
                                            <span className="block text-[11px] font-black uppercase tracking-[0.15em] text-identity-navy">{item.t}</span>
                                            <span className="block text-xs font-bold text-slate-500">{item.d}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>
                    
                    {/* Legal Footer */}
                    <div className="bg-slate-100 p-8 border-t border-slate-200 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                            This privacy policy complies with the Philippine Data Privacy Act of 2012 (RA 10173).
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-identity-sky">
                            LabFace Administration â€¢ PUP Lopez Campus
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
