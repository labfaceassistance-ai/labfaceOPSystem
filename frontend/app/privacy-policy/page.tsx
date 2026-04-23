"use client";
import { useRouter } from 'next/navigation';
import { Shield, Lock, Users, Server, Database, AlertCircle } from 'lucide-react';
import IdentityBackground from '@/components/IdentityBackground';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/ui/BackButton';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent font-outfit select-none relative overflow-hidden">
            <IdentityBackground />
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10 w-full">


                <div className="identity-glass rounded-[4rem] shadow-4xl overflow-hidden border-2 border-white/40 animate-fade-in relative z-20 bg-white/10 backdrop-blur-2xl">

                    {/* Header Area */}
                    <div className="bg-identity-navy p-8 lg:p-12 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blueprint-fine opacity-[0.05] pointer-events-none"></div>
                        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-transparent via-identity-sky/40 to-transparent"></div>
                        
                        {/* Standardized Back Button */}
                        <BackButton 
                            className="absolute top-10 left-12"
                            label="BACK"
                        />
                        
                        <div className="w-12 h-12 bg-white/5 border-2 border-white/10 rounded-xl flex items-center justify-center shadow-2xl mx-auto mb-4 relative z-10 text-identity-sky group-hover:scale-110 transition-transform duration-700">
                            <Shield size={24} className="drop-shadow-glow-blue" />
                        </div>
                        
                        <h1 className="relative z-10 text-2xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2 font-outfit">
                            PRIVACY POLICY
                        </h1>
                        <p className="relative z-10 text-identity-sky text-[9px] md:text-[10px] font-black tracking-[0.4em] uppercase opacity-80 decoration-identity-sky/30">
                            DATA PROTECTION & SECURITY
                        </p>
                        
                        <div className="mt-6 inline-flex items-center gap-3 bg-white/5 rounded-full px-5 py-1.5 border border-white/10 backdrop-blur-md">
                            <AlertCircle size={12} className="text-identity-sky animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/70">VER: 1.0.0 | JAN 2026</span>
                        </div>
                    </div>

                    <div className="p-10 md:p-20 bg-transparent space-y-16 text-slate-800 leading-relaxed">

                        {/* Introduction */}
                        <section className="space-y-6">
                            <div className="inline-flex items-center gap-6 py-2 px-6 rounded-xl bg-identity-navy/5 border-l-4 border-identity-sky w-full">
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-identity-navy">INTRODUCTION</h2>
                            </div>
                            <p className="font-medium text-sm md:text-base tracking-[0.05em] text-slate-600 leading-[1.8] opacity-80">
                                LABFACE IS COMMITTED TO PROTECTING YOUR PRIVACY AND COMPLYING WITH THE PHILIPPINE DATA PRIVACY ACT OF 2012 (REPUBLIC ACT NO. 10173).
                                THIS POLICY EXPLAINS HOW WE COLLECT, STORE, AND PROTECT YOUR PERSONAL AND BIOMETRIC INFORMATION.
                            </p>
                        </section>

                        {/* Data We Collect */}
                        <section className="space-y-10">
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-identity-navy border-b-2 border-identity-navy/5 pb-4">DATA WE COLLECT</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="identity-glass border-2 border-white/40 rounded-[2.5rem] p-10 shadow-2xl bg-white/20 hover:border-identity-sky/30 transition-all group">
                                    <div className="flex items-center gap-5 mb-8 border-b-2 border-identity-navy/5 pb-6">
                                        <div className="bg-identity-navy text-identity-sky p-3 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
                                        <h3 className="text-base font-black text-identity-navy uppercase tracking-[0.2em]">PERSONAL INFORMATION</h3>
                                    </div>
                                    <ul className="space-y-4">
                                        {['FULL NAME', 'STUDENT OR EMPLOYEE ID', 'EMAIL ADDRESS', 'ACADEMIC YEAR AND SECTION'].map((item, i) => (
                                            <li key={i} className="flex items-start gap-5 group/item">
                                                <div className="w-2 h-2 rounded-full bg-identity-sky mt-1.5 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                                                <span className="text-[11px] font-black text-slate-600 tracking-widest uppercase opacity-70 group-hover/item:opacity-100 transition-opacity">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="identity-glass border-2 border-white/40 rounded-[2.5rem] p-10 shadow-2xl bg-white/20 hover:border-identity-sky/30 transition-all group">
                                    <div className="flex items-center gap-5 mb-8 border-b-2 border-identity-navy/5 pb-6">
                                        <div className="bg-identity-navy text-identity-sky p-3 rounded-2xl group-hover:scale-110 transition-transform"><Database size={24} /></div>
                                        <h3 className="text-base font-black text-identity-navy uppercase tracking-[0.2em]">BIOMETRIC DATA</h3>
                                    </div>
                                    <ul className="space-y-4">
                                        {[
                                            'FACIAL FEATURES DATA',
                                            'AI RECOGNITION PATTERNS',
                                            'ATTENDANCE HISTORY LOGS',
                                            'AUTHENTICATION TOKENS',
                                            'TEMPORARY PROCESSING DATA'
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-5 group/item">
                                                <div className="w-2 h-2 rounded-full bg-identity-navy mt-1.5 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                                                <span className="text-[11px] font-black text-slate-600 tracking-widest uppercase opacity-70 group-hover/item:opacity-100 transition-opacity">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* How We Use Your Data */}
                        <section className="space-y-10 bg-identity-navy/5 p-12 md:p-16 rounded-[4rem] border-2 border-identity-navy/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Shield size={120} /></div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-identity-navy mb-8">HOW WE USE YOUR DATA</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                                {[
                                    { t: 'IDENTITY VERIFICATION', d: 'CONFIRMING YOUR IDENTITY WHEN ENTERING THE LAB.' },
                                    { t: 'ATTENDANCE TRACKING', d: 'AUTOMATICALLY RECORDING ATTENDANCE THROUGH THE CAMERA SYSTEM.' },
                                    { t: 'PREVENTING FRAUD', d: 'DETECTING FAKE PHOTOS OR VIDEOS TO ENSURE SECURITY.' },
                                    { t: 'ACADEMIC REPORTING', d: 'CREATING ATTENDANCE REPORTS FOR PROFESSORS.' },
                                    { t: 'SYSTEM IMPROVEMENT', d: 'IMPROVING THE ACCURACY OF OUR FACE RECOGNITION SYSTEM.' },
                                    { t: 'SECURITY AUDITS', d: 'RECORDING SYSTEM ACCESS FOR SECURITY COMPLIANCE.' }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/60 p-8 rounded-3xl border-2 border-white/60 flex flex-col gap-2 shadow-xl hover:scale-105 transition-transform cursor-default group">
                                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-identity-sky group-hover:text-identity-navy transition-colors">{item.t}</span>
                                        <span className="text-[11px] font-black text-slate-500 leading-relaxed uppercase tracking-widest opacity-70">{item.d}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Data Security Measures */}
                        <section className="space-y-10">
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-identity-navy border-b-2 border-identity-navy/5 pb-4">DATA SECURITY MEASURES</h2>
                            <p className="font-black text-sm md:text-base tracking-[0.05em] text-slate-500 mb-10 uppercase opacity-60">
                                WE PROTECT YOUR INFORMATION USING HIGH-LEVEL SECURITY STANDARDS:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { i: <Lock />, t: 'SECURE DATA STORAGE', d: 'ALL BIOMETRIC INFORMATION IS ENCRYPTED WHILE STORED IN OUR DATABASE.' },
                                    { i: <Server />, t: 'SECURE DATA TRANSFER', d: 'INFORMATION IS ENCRYPTED WHILE BEING SENT OVER THE NETWORK.' },
                                    { i: <Users />, t: 'ACCESS CONTROL', d: 'ONLY AUTHORIZED PERSONNEL CAN ACCESS SENSITIVE INFORMATION.' },
                                    { i: <Shield />, t: 'INTERNAL MONITORING', d: 'WE TRACK EVERY TIME DATA IS ACCESSED TO PREVENT MISUSE.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-8 items-center p-10 identity-glass border-2 border-white/40 rounded-[3rem] shadow-2xl bg-white/20 group hover:border-identity-sky/40 transition-all">
                                        <div className="bg-identity-navy text-identity-sky p-5 rounded-3xl shadow-xl group-hover:scale-110 transition-transform">
                                            {item.i}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black uppercase tracking-[0.25em] text-identity-navy mb-4">{item.t}</h3>
                                            <p className="text-[11px] font-black text-slate-500 leading-[1.8] uppercase tracking-widest opacity-70">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Your Rights */}
                        <section className="space-y-10">
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-identity-navy border-b-2 border-identity-navy/5 pb-4">YOUR DATA RIGHTS</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { t: 'RIGHT TO ACCESS', d: 'REQUEST A COPY OF THE DATA WE HAVE STORED ABOUT YOU.' },
                                    { t: 'RIGHT TO CORRECTION', d: 'ASK US TO UPDATE INCORRECT OR OUTDATED INFORMATION.' },
                                    { t: 'RIGHT TO DELETION', d: 'REQUEST TO PERMANENTLY DELETE YOUR BIOMETRIC RECORDS.' },
                                    { t: 'RIGHT TO OBJECT', d: 'ASK US TO STOP USING YOUR DATA FOR CERTAIN PURPOSES.' },
                                    { t: 'RIGHT TO PORTABILITY', d: 'REQUEST YOUR DATA IN A FORMAT YOU CAN USE ELSEWHERE.' },
                                    { t: 'WITHDRAW CONSENT', d: 'STOP USING THE SYSTEM AND REMOVE YOUR BIOMETRIC ACCESS.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-6 bg-white/40 p-8 rounded-[2.5rem] border-2 border-white/60 shadow-xl group hover:border-identity-navy/10 transition-all">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">!</div>
                                        <div>
                                            <span className="block text-[13px] font-black uppercase tracking-[0.2em] text-identity-navy mb-1">{item.t}</span>
                                            <span className="block text-[11px] font-black text-slate-500 leading-tight uppercase tracking-widest opacity-60">{item.d}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>
                </div>
            </main>

        </div>
    );
}
