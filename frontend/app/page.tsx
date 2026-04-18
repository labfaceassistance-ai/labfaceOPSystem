"use client";
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Shield, Clock, BarChart3, CheckCircle, ArrowRight, Lock, Users, Zap, MapPin, Monitor, Calendar, ScanFace, FileText, ChevronRight, ShieldCheck, GraduationCap, School } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getToken, getUser } from '../utils/auth';

export default function Home() {
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [userRole, setUserRole] = useState<string | null>(null);
   const [academicSettings, setAcademicSettings] = useState<{ schoolYear: string; semester: string } | null>(null);

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
   }, []);

   const getDashboardPath = () => {
      const role = userRole?.toLowerCase() || '';
      if (role.includes('admin')) return '/admin/dashboard';
      if (role.includes('professor')) return '/professor/dashboard';
      return '/student/dashboard';
   };

   return (
      <main className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
         <Navbar />

         {/* Hero Section: Blueprint Style */}
         <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-56 flex flex-col items-center">
            {/* Visual Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center animate-fade-in">
               {/* Top Badge */}
               <div className="inline-flex items-center gap-3 py-2 px-6 rounded-full bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 mb-12">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></span>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/80 dark:text-brand-cream/80">PUP Lopez • Computer Laboratory</span>
               </div>

               <h1 className="text-8xl md:text-[11rem] font-black tracking-tighter mb-4 leading-none font-outfit">
                  <span className="text-primary dark:text-[#f7df9a]">Lab</span>
                  <span className="text-gold-gradient">Face</span>
               </h1>

               <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 font-outfit">
                  Next-Gen Biometric Attendance
               </h2>

               <p className="max-w-xl mx-auto text-xs md:text-sm text-white font-bold leading-relaxed mb-16 uppercase tracking-widest">
                  Revolutionizing the academic experience at the Polytechnic University of the <br className="hidden md:block" />
                  Philippines with <span className="text-white">real-time AI monitoring</span> and seamless digital logging.
               </p>

               <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md mx-auto">
                  <Link href={isLoggedIn ? getDashboardPath() : "/login"}
                     className="flex-1 px-10 py-7 bg-[#23170c] dark:bg-[#f7df9a] text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 transition-all text-center">
                     {isLoggedIn ? 'Access Dashboard' : 'Initialize Session'}
                  </Link>
                  <button
                     onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                     className="flex-1 px-10 py-6 bg-primary/5 dark:bg-white/5 border border-primary/20 dark:border-white/10 text-primary dark:text-brand-cream rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                     Scan Features <ChevronRight size={14} className="rotate-90" />
                  </button>
               </div>
            </div>
         </section>

         {/* Intelligent Face Detection Section (Image 2 Style) */}
         <section id="features" className="py-12 lg:py-20 max-w-[1131px] mx-auto px-10 flex items-center justify-center">
            <div className="relative rounded-[2.0rem] overflow-hidden bg-background border border-primary/10 dark:border-white/10 shadow-3xl group backdrop-blur-sm">
               {/* Background Image Wrapper (Right 60%) */}
               <div className="absolute inset-y-0 right-0 w-[55%] z-0">
                  <img
                     src="/pup-pylon-night.jpg"
                     alt="PUP Lopez Campus Night"
                     className="w-full h-full object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-[20s]"
                  />
                  {/* Stronger gradient to blend left side, natively adaptive to theme colors via background css variable */}
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent"></div>
               </div>

               <div className="relative z-10 flex flex-col lg:flex-row items-stretch min-h-[380px]">
                  {/* Campus Label */}
                  <div className="absolute top-6 left-8 text-[8px] font-black text-foreground/30 uppercase tracking-[0.4em] z-20">
                     Campus Night
                  </div>

                  {/* Context Box (Left 40%) */}
                  <div className="lg:w-[40%] z-10 p-8 lg:p-12 lg:pt-16 flex flex-col justify-center">
                     <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-[0.2em] mb-4 w-fit border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        System Online
                     </div>

                     <h3 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight leading-[0.9] font-outfit uppercase">
                        Intelligent Face <br /> Detection
                     </h3>

                     <p className="text-foreground/70 text-[9px] md:text-[10px] font-bold leading-relaxed mb-6 uppercase tracking-widest max-w-sm">
                        Seamlessly integrated with PUP Lopez Campus infrastructure for secure and rapid attendance tracking.
                     </p>

                     <div className="grid grid-cols-2 gap-4 pt-6 border-t border-foreground/10">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-center justify-center shrink-0">
                              <ScanFace size={16} />
                           </div>
                           <div className="text-foreground">
                              <p className="text-[11px] font-black uppercase tracking-widest">Contactless</p>
                              <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Entry</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={16} />
                           </div>
                           <div className="text-foreground">
                              <p className="text-[11px] font-black uppercase tracking-widest">Automated</p>
                              <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Logging</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right Side: Visual scanning frame */}
                  <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">

                     {/* ✅ Gradient fade to fix the hard cut */}
                     <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

                     <div className="relative w-64 h-64 lg:ml-12 z-20">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-500 rounded-tl-lg transition-all duration-500 group-hover:scale-110"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-500 rounded-tr-lg transition-all duration-500 group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-500 rounded-bl-lg transition-all duration-500 group-hover:scale-110"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-500 rounded-br-lg transition-all duration-500 group-hover:scale-110"></div>
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent animate-scan-y shadow-[0_0_10px_rgba(234,179,8,0.2)]"></div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* Stats Bar (Image 1 Style) */}
         <section className="bg-primary/5 dark:bg-white/[0.03] border-y border-primary/10 dark:border-white/5 py-16">
            <div className="max-w-6xl mx-auto px-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="flex flex-col items-center group">
                     <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/20 dark:border-white/10 flex items-center justify-center text-yellow-500 mb-5 group-hover:scale-110 transition-transform">
                        <MapPin size={24} />
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-primary dark:text-brand-cream tracking-[0.2em]">PUP Lopez Campus</h4>
                     <p className="text-[8px] font-bold text-primary/40 dark:text-brand-cream/30 uppercase tracking-[0.3em] mt-2">Quezon Province</p>
                  </div>
                  <div className="flex flex-col items-center group">
                     <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/20 dark:border-white/10 flex items-center justify-center text-yellow-500 mb-5 group-hover:scale-110 transition-transform">
                        <Monitor size={24} />
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-primary dark:text-brand-cream tracking-[0.2em]">Computer Laboratory</h4>
                     <p className="text-[8px] font-bold text-primary/40 dark:text-brand-cream/30 uppercase tracking-[0.3em] mt-2">Facility</p>
                  </div>
                  <div className="flex flex-col items-center group">
                     <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/20 dark:border-white/10 flex items-center justify-center text-yellow-500 mb-5 group-hover:scale-110 transition-transform">
                        <Calendar size={24} />
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-primary dark:text-brand-cream tracking-[0.2em]">{academicSettings?.schoolYear || 'A.Y. 2025-2026'}</h4>
                     <p className="text-[8px] font-bold text-primary/40 dark:text-brand-cream/30 uppercase tracking-[0.3em] mt-2">{academicSettings?.semester || '2nd Semester'}</p>
                  </div>
               </div>
            </div>
         </section>

         {/* Operational Protocol (Image 5 Style) */}
         <section className="py-32 lg:py-56 text-center">
            <div className="max-w-7xl mx-auto px-6">
               <h3 className="text-4xl md:text-7xl font-black text-primary dark:text-brand-cream uppercase tracking-tighter mb-4 font-outfit">
                  Operational Protocol
               </h3>
               <p className="text-primary/40 dark:text-brand-cream/30 font-bold uppercase text-[10px] md:text-xs tracking-[0.4em] mb-24">
                  Three steps to neural synchronization
               </p>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24 relative">
                  {/* Connecting Line */}
                  <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[1px] bg-primary/5 dark:bg-white/5 z-0"></div>

                  {[
                     { n: "01", t: "Registration", d: "Biometric enrollment and neural mapping of facial vectors." },
                     { n: "02", t: "Detection", d: "Passive CCTV scanning upon facility entry." },
                     { n: "03", t: "Verification", d: "Instantaneous ledger update and dashboard synchronization." }
                  ].map((step, i) => (
                     <div key={i} className="relative z-10 group">
                        {/* Protocol Badge */}
                        <div className="w-[120px] h-[120px] bg-primary/5 dark:bg-white/5 rounded-[3rem] border border-primary/10 dark:border-white/10 flex flex-col items-center justify-center mx-auto mb-10 group-hover:bg-primary group-hover:text-brand-cream dark:group-hover:bg-brand-cream dark:group-hover:text-black transition-all duration-500 shadow-xl">
                           <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-1 opacity-40">Protocol</p>
                           <p className="text-3xl font-black font-outfit">{step.n}</p>
                        </div>

                        <h4 className="text-xl md:text-2xl font-black text-primary dark:text-brand-cream uppercase tracking-tight mb-4">{step.t}</h4>
                        <p className="text-primary/50 dark:text-brand-cream/40 text-[9px] md:text-xs font-bold leading-relaxed uppercase tracking-wider max-w-[250px] mx-auto">
                           {step.d}
                        </p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Modern CTA Section (Image 4 Style) */}
         <section className="py-40 lg:py-60 px-6">
            <div className="max-w-7xl mx-auto relative rounded-[4rem] bg-primary dark:bg-black/60 border border-primary/10 dark:border-white/10 p-20 lg:p-40 overflow-hidden text-center flex flex-col items-center">
               {/* Grid Pattern */}
               <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')] pointer-events-none"></div>
               <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-transparent to-primary/50 dark:from-black/40 dark:to-black/40 pointer-events-none"></div>

               <div className="relative z-10 max-w-2xl">
                  <h2 className="text-4xl md:text-6xl font-black text-brand-cream leading-[0.85] tracking-tighter mb-8 font-outfit uppercase">
                     Modernize your <br />
                     <span className="text-yellow-500">Laboratory</span> <br />
                     Experience
                  </h2>

                  <p className="text-brand-cream/40 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-12">
                     Join the next generation of academic management. Secure, efficient, and AI-driven.
                  </p>

                  <Link href={isLoggedIn ? getDashboardPath() : "/register/student"}
                     className="inline-flex items-center gap-4 px-12 py-7 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-4xl hover:bg-white transition-all scale-105 active:scale-100 group">
                     Join the Network
                     <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </Link>
               </div>
            </div>
         </section>

         {/* Heritage Footer (Replicated from screenshot) */}
         <footer className="bg-primary/5 dark:bg-black text-primary/40 dark:text-brand-cream/40 py-24 lg:py-32 border-t border-primary/10 dark:border-white/5 transition-colors">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-32">
               {/* Column 1: Branding */}
               <div>
                  <div className="text-3xl font-black text-primary dark:text-brand-cream mb-8 font-outfit uppercase tracking-tighter">LabFace</div>
                  <p className="text-[10px] md:text-xs font-bold leading-relaxed uppercase tracking-widest opacity-80 max-w-sm">
                     Advancing biometric security and administrative efficiency for the Polytechnic University of the Philippines.
                  </p>
               </div>

               {/* Column 2: Quick Links */}
               <div>
                  <h4 className="text-primary dark:text-brand-cream font-black uppercase text-[10px] md:text-xs tracking-[0.4em] mb-8">Quick Links</h4>
                  <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70">
                     <li><Link href="/" className="hover:text-yellow-500 transition-colors">Home</Link></li>
                     <li><Link href="/login" className="hover:text-yellow-500 transition-colors">Login</Link></li>
                     <li><Link href="/register/student" className="hover:text-yellow-500 transition-colors">Student Registration</Link></li>
                  </ul>
               </div>

               {/* Column 3: Contact */}
               <div>
                  <h4 className="text-primary dark:text-brand-cream font-black uppercase text-[10px] md:text-xs tracking-[0.4em] mb-8">Contact</h4>
                  <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70">
                     <li>PUP Lopez Campus</li>
                     <li>Lopez, Quezon</li>
                     <li><a href="mailto:labfaceassistance@gmail.com" className="hover:text-yellow-500 transition-colors">labfaceassistance@gmail.com</a></li>
                  </ul>
               </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-primary/5 dark:border-white/5 flex flex-col items-center gap-2">
               <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">
                  © {new Date().getFullYear()} LabFace - PUP Lopez Campus. All rights reserved.
               </p>
               <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">
                  For support: <a href="mailto:labfaceassistance@gmail.com" className="text-yellow-600 dark:text-yellow-500 hover:underline">labfaceassistance@gmail.com</a>
               </p>
            </div>
         </footer>
      </main>
   );
}
