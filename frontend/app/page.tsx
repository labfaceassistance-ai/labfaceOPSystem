"use client";
import React, { useState, useEffect } from 'react';

import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Shield, Clock, BarChart3, CheckCircle, ArrowRight, Lock, Users, Zap, MapPin, Monitor, Calendar, ScanFace, FileText, ChevronRight, ShieldCheck, GraduationCap, School } from 'lucide-react';
import { getToken, getUser } from '../utils/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [userRole, setUserRole] = useState<string | null>(null);
   const [academicSettings, setAcademicSettings] = useState<{ schoolYear: string; semester: string } | null>(null);
   const [isDayTime, setIsDayTime] = useState(true);
   const router = useRouter();

   useEffect(() => {
      const token = getToken();
      const user = getUser();
      if (token && user) {
         setIsLoggedIn(true);
         setUserRole(user.role);
      }

      const fetchSettings = async () => {
         try {
            const response = await fetch('/api/public/academic-settings');
            if (response.ok) {
               const data = await response.json();
               setAcademicSettings(data);
            }
         } catch (error) {
            console.error('Failed to fetch academic settings:', error);
         }
      };
      fetchSettings();

      // âœ… Determine if it is currently daytime (6 AM to 6 PM)
      const hour = new Date().getHours();
      setIsDayTime(hour >= 6 && hour < 18);
   }, []);

   const getDashboardPath = () => {
      const role = userRole?.toLowerCase() || '';
      if (role.includes('admin')) return '/admin/dashboard';
      if (role.includes('professor')) return '/professor/dashboard';
      return '/student/dashboard';
   };

   return (
      <div className="w-full relative selection:bg-identity-sky/30">

         <Navbar />

         {/* Hero Section: Blueprint Style */}
         <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-56 flex flex-col items-center z-10">
            {/* Visual Background Pattern - Enhanced Blueprint Grid */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-blueprint"></div>
            <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none bg-blueprint-fine"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center animate-fade-in">
               {/* Top Badge: Location & Status */}
               <div className="inline-flex items-center gap-4 py-2.5 px-6 rounded-full bg-identity-navy/[0.03] border border-identity-sky/30 shadow-[0_0_15px_rgba(92,180,228,0.1)] mb-12 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-identity-sky animate-pulse shadow-[0_0_10px_rgba(92,180,228,1)]"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-identity-navy/90">PUP Lopez Computer Laboratory</span>
               </div>

               <h1 className="text-6xl md:text-8xl lg:text-[11rem] font-black tracking-tight mb-4 leading-none font-outfit relative z-20">
                  <span className="text-identity-navy">Lab</span>
                  <span className="text-identity-sky">Face</span>
               </h1>

               <h2 className="text-lg md:text-xl font-black text-identity-navy/60 uppercase tracking-[0.2em] mb-8 font-outfit max-w-4xl mx-auto leading-relaxed text-center px-4">
                  Digital Face-Based Attendance Monitoring System for <br className="hidden md:block" />
                  PUP Lopez Campus Computer Laboratory 1
               </h2>

               <p className="max-w-xl mx-auto text-xs md:text-sm text-slate-700 font-black leading-relaxed mb-16 uppercase tracking-[0.15em] text-center force-bold">
                  Secure, real-time facial recognition for the <br className="hidden md:block" />
                  Polytechnic University of the Philippines.
               </p>

               <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-sm sm:max-w-md mx-auto">
                  <Link href={isLoggedIn ? getDashboardPath() : "/login"}
                     className="flex-1 px-10 py-6 bg-identity-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-center">
                     {isLoggedIn ? 'Dashboard' : 'Login'}
                  </Link>
                  <button
                     onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                     className="flex-1 px-10 py-6 bg-identity-sky text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                     See Features
                  </button>
               </div>
            </div>
         </section>

         {/* Intelligent Face Detection Section */}
         <section id="features" className="relative py-12 lg:py-20 max-w-6xl mx-auto px-6 flex items-center justify-center z-[1]">
            <div className="relative w-full rounded-[2.0rem] overflow-hidden identity-glass border border-identity-sky/10 shadow-3xl group flex flex-col lg:flex-row items-stretch min-h-[420px]">

               {/* Left Side: Technical Info (Solid Half) */}
               <div className="lg:w-1/2 p-10 lg:p-14 lg:pt-16 flex flex-col justify-center relative bg-slate-50 z-10 border-r border-slate-100">
                  {/* Cyber Brackets */}
                  <div className="corner-bracket-tl"></div>
                  <div className="corner-bracket-br"></div>

                  <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-identity-sky/10 text-identity-sky text-[8px] font-black uppercase tracking-[0.2em] mb-6 w-fit border border-identity-sky/20">
                     <span className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse"></span>
                     Attendance Monitoring Enabled
                  </div>

                  <h3 className="text-3xl md:text-4xl md:text-5xl font-black text-identity-navy mb-4 leading-tight font-outfit uppercase">
                     Biometric Attendance <br /> Monitoring
                  </h3>

                  <p className="text-slate-800 text-[10px] md:text-xs font-bold leading-relaxed mb-10 uppercase tracking-[0.15em] max-w-sm">
                     Fast and secure attendance for the PUP Lopez Computer Laboratory. Record your entry instantly with AI technology.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pt-10 border-t border-slate-200">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-identity-sky/10 text-identity-sky rounded-2xl flex items-center justify-center shrink-0 border border-identity-sky/20">
                           <ScanFace size={24} />
                        </div>
                        <div className="text-identity-navy">
                           <p className="text-[12px] font-black uppercase tracking-[0.15em]">Face</p>
                           <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.15em]">Documentation</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-identity-sky/10 text-identity-sky rounded-2xl flex items-center justify-center shrink-0 border border-identity-sky/20">
                           <FileText size={24} />
                        </div>
                        <div className="text-identity-navy">
                           <p className="text-[12px] font-black uppercase tracking-[0.15em]">Instant</p>
                           <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.15em]">Documentation</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Side: Campus Imagery (Imagery Half) */}
               <div className="lg:w-1/2 relative overflow-hidden bg-identity-navy/5 min-h-[300px] lg:min-h-full">
                  <img
                     src={isDayTime ? "/pup-pylon-day.jpg" : "/pup-pylon-night.jpg"}
                     alt={`PUP Lopez Campus ${isDayTime ? 'Day' : 'Night'}`}
                     className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-[10s]"
                  />
                  {/* Subtle technical overlay for depth */}
                  <div className="absolute inset-0 bg-identity-navy/10 group-hover:bg-transparent transition-colors duration-500"></div>

                  {/* Visual scanning frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="relative w-64 h-64">
                        {/* Viewfinder Corners - Themed Blue */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-identity-sky rounded-tl-xl shadow-[0_0_10px_rgba(92,180,228,0.3)]"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-identity-sky rounded-tr-xl shadow-[0_0_10px_rgba(92,180,228,0.3)]"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-identity-sky rounded-bl-xl shadow-[0_0_10px_rgba(92,180,228,0.3)]"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-identity-sky rounded-br-xl shadow-[0_0_10px_rgba(92,180,228,0.3)]"></div>

                        {/* Animated Scan Line */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-identity-sky to-transparent animate-scan-y shadow-[0_0_15px_rgba(92,180,228,0.5)] z-30"></div>
                     </div>
                  </div>

                  {/* Campus Day/Night Label */}
                  <div className="absolute bottom-6 right-8 text-[8px] font-black text-white uppercase tracking-[0.4em] z-20 bg-black/20 p-2 backdrop-blur-sm rounded-lg">
                     Campus {isDayTime ? 'Day' : 'Night'}
                  </div>
               </div>
            </div>
         </section>

         {/* Stats Bar */}
         <section className="relative bg-identity-navy/[0.03] border-y border-identity-navy/10 py-16 z-10">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                  <div className="flex flex-col items-center group p-8 rounded-[2.5rem] bg-white border border-identity-navy/5 shadow-xl text-center hover:border-identity-sky/30 transition-all">
                     <div className="w-16 h-16 rounded-2xl bg-identity-sky/10 border border-identity-sky/20 flex items-center justify-center text-identity-sky mb-6 group-hover:scale-110 transition-transform shadow-sm">
                        <MapPin size={28} />
                     </div>
                     <h4 className="text-lg md:text-xl font-black uppercase text-identity-navy tracking-tight w-full">PUP Lopez Campus</h4>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 w-full">Quezon Province</p>
                  </div>
                  <div className="flex flex-col items-center group p-8 rounded-[2.5rem] bg-white border border-identity-navy/5 shadow-xl text-center hover:border-identity-sky/30 transition-all">
                     <div className="w-16 h-16 rounded-2xl bg-identity-sky/10 border border-identity-sky/20 flex items-center justify-center text-identity-sky mb-6 group-hover:scale-110 transition-transform shadow-sm">
                        <Monitor size={28} />
                     </div>
                     <h4 className="text-lg md:text-xl font-black uppercase text-identity-navy tracking-tight w-full">ICT Laboratory 1</h4>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 w-full">Active Facility Center</p>
                  </div>
                  <div className="flex flex-col items-center group p-8 rounded-[2.5rem] bg-white border border-identity-navy/5 shadow-xl text-center hover:border-identity-sky/30 transition-all">
                     <div className="w-16 h-16 rounded-2xl bg-identity-sky/10 border border-identity-sky/20 flex items-center justify-center text-identity-sky mb-6 group-hover:scale-110 transition-transform shadow-sm">
                        <Calendar size={28} />
                     </div>
                     <h4 className="text-lg md:text-xl font-black uppercase text-identity-navy tracking-tight w-full">{academicSettings?.schoolYear || 'A.Y. 2025-2026'}</h4>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 w-full">{academicSettings?.semester || '2nd Semester'}</p>
                  </div>
               </div>
            </div>
         </section>

         {/* Why LabFace? Section - Benefit Focused */}
         <section className="relative py-24 lg:py-40 bg-white overflow-hidden z-10">
            {/* Subtle Blueprint Grid */}
            <div className="absolute inset-0 opacity-[0.03] bg-blueprint pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
               <h3 className="text-3xl md:text-5xl md:text-6xl font-black tracking-tighter mb-4 font-outfit">
                  <span className="text-identity-navy">Why use </span>
                  <span className="text-identity-navy">Lab</span><span className="text-identity-sky">Face</span><span className="text-identity-navy">?</span>
               </h3>
               <p className="text-slate-600 font-bold uppercase text-[10px] md:text-xs tracking-[0.4em] mb-20 max-w-2xl mx-auto">
                  Transforming the laboratory experience through efficiency and innovation
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {[
                     {
                        t: "One-Second Attendance",
                        d: "Just walk in and our AI records your presence in less than a second. No lines, no IDs, no hassle.",
                        i: <Zap size={32} />
                     },
                     {
                        t: "Guaranteed Accuracy",
                        d: "Biometric mapping ensures 100% accurate results. No more manual errors or proxy attendance issues.",
                        i: <CheckCircle size={32} />
                     },
                     {
                        t: <>Total <br /> Convenience</>,
                        d: "Automated logs are synced instantly. Professors and students get real-time visibility without paperwork.",
                        i: <Users size={32} />
                     }
                  ].map((item, i) => (
                     <div key={i} className="p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white border border-slate-100 shadow-xl hover:border-identity-sky/30 transition-all group text-center flex flex-col items-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-identity-sky/10 border border-identity-sky/20 flex items-center justify-center text-identity-sky mb-10 shadow-sm group-hover:scale-110 group-hover:bg-identity-navy group-hover:text-white transition-all duration-500 mx-auto">
                           {React.cloneElement(item.i as React.ReactElement, { size: 40 })}
                        </div>
                        <h4 className="text-xl md:text-2xl font-black text-identity-navy uppercase tracking-tight mb-4 w-full">{item.t}</h4>
                        <p className="text-slate-700 text-xs font-bold leading-relaxed uppercase tracking-wider w-full">{item.d}</p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Active Protocol */}
         {/* Security Framework Section */}
         <section className="relative py-20 lg:py-40 text-center bg-slate-50 z-10 transition-colors">
            {/* Opaque Mask for Header */}
            <div className="max-w-7xl mx-auto px-6 relative z-10">
               <h3 className="text-3xl md:text-5xl md:text-7xl font-black text-identity-navy uppercase tracking-tighter mb-4 font-outfit bg-slate-50 inline-block px-4 md:px-8">
                   Standard Operating Protocol
                </h3>
               <p className="text-slate-600 font-bold uppercase text-[10px] md:text-xs tracking-[0.4em] mb-16">
                  A seamless three-step verification process
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-24 relative">
                  {/* Connecting Line */}
                  <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[1px] bg-slate-200 z-0"></div>
                  {[
                     { n: "01", t: "Face Enrollment", d: "Quickly enroll your biometric profile into the university system." },
                     { n: "02", t: "Automatic Detection", d: "The system identifies you upon laboratory entry." },
                     { n: "03", t: "Instant Logging", d: "Your attendance is updated immediately on the dashboard." }
                  ].map((step, i) => (
                      <div key={i} className="relative z-10 group">
                        {/* Protocol Badge - Enlarged and high contrast */}
                        <div className="w-[160px] h-[160px] bg-white rounded-[4rem] border border-slate-100 flex flex-col items-center justify-center mx-auto mb-10 group-hover:bg-identity-navy group-hover:text-white transition-all duration-500 shadow-2xl relative overflow-hidden group-hover:scale-105">
                           {/* Subtle blueprint grid inside circle */}
                           <div className="absolute inset-0 opacity-5 bg-blueprint-fine pointer-events-none"></div>
                           <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-1 opacity-40 z-10">Step</p>
                           <p className="text-4xl md:text-5xl font-black font-outfit z-10">{step.n}</p>
                        </div>

                        <h4 className="text-xl md:text-2xl font-black text-identity-navy uppercase tracking-tight mb-4">{step.t}</h4>
                        <p className="text-slate-800 text-[10px] md:text-xs font-bold leading-relaxed uppercase tracking-wider max-w-[250px] mx-auto">
                           {step.d}
                        </p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Modern CTA Section */}
         <section className="relative py-40 lg:py-60 px-6 z-10">
            <div className="max-w-7xl mx-auto relative rounded-[4rem] bg-identity-navy border border-white/10 p-20 lg:p-40 overflow-hidden text-center flex flex-col items-center">
               {/* Grid Pattern - Blueprint Style */}
               <div className="absolute inset-0 opacity-[0.1] bg-blueprint pointer-events-none"></div>
               <div className="absolute inset-0 opacity-[0.05] bg-blueprint-fine pointer-events-none"></div>
               <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60 pointer-events-none"></div>

               <div className="relative z-10 max-w-2xl">
                  <h2 className="text-3xl md:text-4xl md:text-5xl md:text-6xl font-black text-white leading-[0.85] tracking-tighter mb-8 font-outfit uppercase">
                     Modernize your <br />
                     <span className="text-identity-sky">Laboratory</span> <br />
                     Experience
                  </h2>

                  <p className="text-white/70 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-12">
                     Join the next generation of academic management. Secure, efficient, and AI-driven.
                  </p>

                  <Link href={isLoggedIn ? getDashboardPath() : "/register/student"}
                     className="inline-flex items-center gap-4 px-12 py-7 bg-identity-sky text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow-4xl hover:scale-105 active:scale-95 transition-all group">
                     Create Account
                     <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </Link>
               </div>
            </div>
         </section>



      </div>
   );
}