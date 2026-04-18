"use client";
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Shield, Clock, BarChart3, CheckCircle, ArrowRight, Lock, Users, Zap, MapPin, Monitor, Calendar, ScanFace, FileText, ChevronRight, ShieldCheck } from 'lucide-react';
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
    <main className="min-h-screen bg-brand-cream flex flex-col font-sans text-primary">
      <Navbar />

      {/* Hero Section: Heritage Cream & Coffee Style */}
      <section className="relative pt-32 pb-40 lg:pt-56 lg:pb-60 overflow-hidden">
        {/* Animated Heritage Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
           <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-bloom"></div>
           <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px] animate-bloom"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-8 border border-primary/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              PUP Lopez • Heritage Security Terminal
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-primary tracking-tighter mb-8 leading-[0.85] uppercase">
              LabFace <br />
              <span className="text-2xl md:text-4xl text-secondary/70 font-bold tracking-[0.2em]">Next-Gen Biometrics</span>
            </h1>
            
            <p className="mt-8 max-w-2xl mx-auto text-lg text-primary/60 font-medium leading-relaxed mb-12">
              The official AI-powered attendance monitoring mainframe for the Polytechnic University of the Philippines Lopez Campus.
            </p>

            <div className="flex justify-center gap-6 flex-col sm:flex-row max-w-lg mx-auto">
              <Link href={isLoggedIn ? getDashboardPath() : "/login"} className="px-10 py-5 bg-coffee text-brand-cream rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-3xl hover:bg-black flex items-center justify-center gap-3 active:scale-95">
                {isLoggedIn ? 'Access Dashboard' : 'Initialize Terminal'} <ChevronRight size={18} />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-5 bg-white border-2 border-primary/10 text-primary rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all hover:border-primary/30 flex items-center justify-center backdrop-blur-md"
              >
                Inspect Core
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Info Section */}
      <section className="bg-white/50 backdrop-blur-md py-16 border-y border-primary/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <MapPin size={24} />, title: "Lopez Campus", sub: "PUP Main Laboratory" },
              { icon: <Monitor size={24} />, title: "Computer Lab", sub: "Production Terminal" },
              { icon: <Calendar size={24} />, title: academicSettings?.schoolYear || "2025-2026", sub: academicSettings?.semester || "Current Term" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-primary/5 text-secondary rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:bg-primary group-hover:text-brand-cream border border-primary/5">
                  {stat.icon}
                </div>
                <div className="text-sm font-black text-primary uppercase tracking-widest">{stat.title}</div>
                <div className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] mt-1">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-secondary font-black uppercase text-[10px] tracking-[0.5em] mb-4">Core Protocols</h2>
            <h3 className="text-4xl md:text-5xl font-black text-primary uppercase tracking-tighter">Laboratory Automation</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap />, title: "Sub-Second Identification", desc: "Instant biometric verification as users cross the laboratory threshold." },
              { icon: <ShieldCheck />, title: "Encrypted Data Vault", desc: "Military-grade encryption for all facial embeddings and metadata." },
              { icon: <BarChart3 />, title: "Neural Analytics", desc: "Real-time insights into student attendance and laboratory usage patterns." },
              { icon: <Clock />, title: "Latency Reduction", desc: "Optimized AI pipeline ensures near-zero delay in record commitment." },
              { icon: <Lock />, title: "Privacy Safeguards", desc: "Strict adherence to Data Privacy protocols with local-first processing." },
              { icon: <CheckCircle />, title: "Autonomous Logging", desc: "Hands-free attendance management for faculty and students." }
            ].map((f, i) => (
              <div key={i} className="glass-card rounded-[2.5rem] p-10 hover:shadow-2xl transition-all group border border-primary/5">
                <div className="w-14 h-14 bg-coffee text-brand-cream rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-all">
                  {f.icon}
                </div>
                <h4 className="text-lg font-black text-primary uppercase tracking-tighter mb-4">{f.title}</h4>
                <p className="text-primary/50 text-sm font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works: Coffee Style */}
      <section className="py-32 bg-coffee relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 z-0"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-4xl font-black text-brand-cream uppercase tracking-tighter mb-16">Operational Flow</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-secondary/20 z-0"></div>
              
              {[
                { n: "01", t: "Initialize", d: "Securely enroll your biometric profile into the system." },
                { n: "02", t: "Navigate", d: "Pass through the Laboratory CCTV monitoring zone." },
                { n: "03", t: "Validate", d: "Review your autonomous attendance log in the dashboard." }
              ].map((step, i) => (
                <div key={i} className="relative z-10 group">
                  <div className="w-20 h-20 bg-brand-cream text-coffee rounded-full flex items-center justify-center mx-auto mb-8 font-black text-xl shadow-3xl border-4 border-secondary/20 group-hover:scale-110 transition-all">
                    {step.n}
                  </div>
                  <h3 className="text-xl font-black text-brand-cream uppercase tracking-widest mb-4">{step.t}</h3>
                  <p className="text-brand-cream/60 text-sm font-medium leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[150px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-5xl font-black text-primary uppercase tracking-tighter mb-8 leading-[0.9]">
            Secure your <br />
            <span className="text-secondary italic">Academic Legacy</span>
          </h2>
          <p className="text-primary/50 font-bold uppercase text-xs tracking-[0.3em] mb-12">Autonomous Verification • Live in Laboratory 1 & 2</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            {!isLoggedIn ? (
              <>
                <Link href="/register/student" className="px-12 py-5 bg-coffee text-brand-cream rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-3xl hover:bg-black transition-all">
                    Register Student
                </Link>
                <Link href="/register/professor" className="px-12 py-5 bg-white border-2 border-primary/20 text-primary rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-primary/5 transition-all">
                    Faculty Access
                </Link>
              </>
            ) : (
              <Link href={getDashboardPath()} className="px-16 py-6 bg-coffee text-brand-cream rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-4xl hover:scale-105 transition-all">
                Access Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Heritage Footer */}
      <footer className="bg-primary text-brand-cream/40 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2">
            <div className="text-3xl font-black text-brand-cream uppercase tracking-widest mb-6">LabFace</div>
            <p className="max-w-xs text-sm font-medium leading-relaxed">
              Official Biometric Attendance & Identity Verification Mainframe for the Polytechnic University of the Philippines Lopez Campus.
            </p>
          </div>
          <div>
            <h4 className="text-brand-cream font-black uppercase text-[10px] tracking-[0.3em] mb-6">Protocols</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest">
              <li><Link href="/login" className="hover:text-secondary transition-colors">Access Terminal</Link></li>
              <li><Link href="/register/student" className="hover:text-secondary transition-colors">Enroll Student</Link></li>
              <li><Link href="/register/professor" className="hover:text-secondary transition-colors">Enroll Faculty</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-brand-cream font-black uppercase text-[10px] tracking-[0.3em] mb-6">Sector 01</h4>
            <p className="text-xs font-bold leading-loose">
              PUP Lopez Campus <br />
              Lopez, Quezon <br />
              Philippines, 4316
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-24 pt-12 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.5em] text-center opacity-30">
          © {new Date().getFullYear()} LabFace Operations • All Integrity Verified
        </div>
      </footer>
    </main>
  );
}
