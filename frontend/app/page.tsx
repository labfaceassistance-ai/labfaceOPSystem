"use client";
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Shield, Clock, BarChart3, CheckCircle, ArrowRight, Lock, Users, Zap, MapPin, Monitor, Calendar, ScanFace, FileText } from 'lucide-react';

import { useState, useEffect } from 'react';
import { getToken, getUser, getBackendUrl } from '../utils/auth';

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

    // Fetch academic settings
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

  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      try {
        const phtTime = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          hour12: false
        }).format(new Date());
        const hour = parseInt(phtTime, 10);
        setIsNight(hour < 6 || hour >= 18);
      } catch (error) {
        // Fallback to local time if timezone check fails
        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000 * 60 * 15); // Check every 15 mins
    return () => clearInterval(interval);
  }, []);

  const getDashboardPath = () => {
    const role = userRole?.toLowerCase() || '';
    if (role.includes('admin')) return '/admin/dashboard';
    if (role.includes('professor')) return '/professor/dashboard';
    return '/student/dashboard';
  };
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-32 pb-32 lg:pt-48 lg:pb-40">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500 blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-purple-600 blur-3xl"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-blue-400 blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <span className="inline-block py-1 px-3 rounded-full bg-brand-500/10 text-brand-400 text-sm font-semibold mb-6 border border-brand-500/20 backdrop-blur-sm">
              PUP Lopez Campus • Computer Laboratory
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">LabFace</span>
              <br />
              <span className="text-3xl md:text-5xl">AI-Powered Attendance System</span>
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-slate-300 mb-4 leading-relaxed">
              Web-Based CCTV Face Recognition Attendance Monitoring System for the Polytechnic University of the Philippines Lopez Campus Computer Laboratory
            </p>
            <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10">
              Transforming attendance tracking with next-generation AI face recognition technology. Secure, fast, and intelligent.
            </p>

            <div className="flex justify-center gap-4 flex-col sm:flex-row">
              <Link href={isLoggedIn ? getDashboardPath() : "/login"} className="px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-brand-500/50 flex items-center justify-center gap-2">
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={20} />
              </Link>
              <button
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg font-bold text-lg transition-all border border-slate-700 backdrop-blur-sm flex items-center justify-center"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative mx-auto max-w-5xl animate-slide-up">
            <div className="bg-slate-900/50 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 backdrop-blur-sm flex flex-col md:flex-row">
              {/* Left Content Panel */}
              <div className="p-8 md:p-12 flex flex-col justify-center items-center text-center bg-slate-900/80 text-white md:w-2/5 relative overflow-hidden backdrop-blur-md">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono mb-6 border border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    SYSTEM ONLINE
                  </div>

                  <h3 className="text-3xl font-bold mb-4">Intelligent Face Detection</h3>
                  <p className="text-slate-300 mb-8 leading-relaxed">
                    Seamlessly integrated with PUP Lopez Campus infrastructure for secure and rapid attendance tracking.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 border-t border-slate-800/50 w-full">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800/50 text-brand-400">
                        <ScanFace size={20} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">Contactless</div>
                        <div className="text-xs text-slate-400">Entry</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800/50 text-brand-400">
                        <FileText size={20} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">Automated</div>
                        <div className="text-xs text-slate-400">Logging</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative md:w-3/5 h-64 md:h-auto bg-slate-950 group overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60"
                  style={{ backgroundImage: `url(${isNight ? '/pup-pylon-night.jpg' : '/pup-pylon-day.jpg'})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-900/80 md:to-slate-900/40"></div>

                {/* Scanning Effect Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-brand-400/30 rounded-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-400"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent animate-scan"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-slate-900/50 py-12 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center justify-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4 text-brand-400 shadow-sm group-hover:shadow-md group-hover:bg-brand-500/20 transition-all border border-brand-500/20">
                <MapPin size={28} />
              </div>
              <div className="text-lg font-bold text-white">PUP Lopez Campus</div>
              <div className="text-sm text-slate-400">Quezon Province</div>
            </div>
            <div className="flex flex-col items-center justify-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4 text-brand-400 shadow-sm group-hover:shadow-md group-hover:bg-brand-500/20 transition-all border border-brand-500/20">
                <Monitor size={28} />
              </div>
              <div className="text-lg font-bold text-white">Computer Laboratory</div>
              <div className="text-sm text-slate-400">Facility</div>
            </div>
            <div className="flex flex-col items-center justify-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4 text-brand-400 shadow-sm group-hover:shadow-md group-hover:bg-brand-500/20 transition-all border border-brand-500/20">
                <Calendar size={28} />
              </div>
              <div className="text-lg font-bold text-white">
                {academicSettings ? `A.Y. ${academicSettings.schoolYear}` : 'A.Y. 2025-2026'}
              </div>
              <div className="text-sm text-slate-400">
                {academicSettings ? academicSettings.semester : 'Current Semester'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-brand-400 font-semibold tracking-wide uppercase text-sm mb-2">Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need for smart attendance</h3>
            <p className="max-w-2xl mx-auto text-xl text-slate-400">
              LabFace combines advanced hardware integration with a seamless software experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <Zap className="w-8 h-8 text-white" />,
                title: "Instant Recognition",
                desc: "Walk in and get marked present instantly. Our AI processes facial features in seconds.",
                color: "bg-blue-500"
              },
              {
                icon: <Lock className="w-8 h-8 text-white" />,
                title: "Data Security",
                desc: "Your biometric data is encrypted and stored securely. We prioritize privacy and data protection.",
                color: "bg-indigo-500"
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-white" />,
                title: "Real-time Analytics",
                desc: "Professors get instant insights into class attendance, tardiness, and student engagement.",
                color: "bg-purple-500"
              },
              {
                icon: <Clock className="w-8 h-8 text-white" />,
                title: "Time Saving",
                desc: "Eliminate roll calls and sign-in sheets. Save up to 15 minutes per class session.",
                color: "bg-pink-500"
              },
              {
                icon: <Shield className="w-8 h-8 text-white" />,
                title: "Anti-Spoofing",
                desc: "Advanced liveness detection prevents attendance fraud using photos or videos.",
                color: "bg-orange-500"
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-white" />,
                title: "Automated Reports",
                desc: "Generate PDF and Excel reports for grading and administrative records with one click.",
                color: "bg-green-500"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-slate-900/50 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow border border-slate-800 backdrop-blur-sm group">
                <div className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-xl text-slate-400">Simple steps to get started with LabFace</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {[
                { step: "01", title: "Register", desc: "Create your account and enroll your face data securely." },
                { step: "02", title: "Walk In", desc: "Enter the lab. The camera detects you automatically." },
                { step: "03", title: "Done", desc: "Attendance is recorded and visible on your dashboard." }
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/50 backdrop-blur-sm p-6 text-center rounded-xl border border-slate-800">
                  <div className="w-20 h-20 mx-auto bg-slate-900 border-4 border-brand-500 rounded-full flex items-center justify-center text-2xl font-bold text-brand-400 mb-6 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-brand-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to modernize your lab experience?</h2>
          <p className="text-xl text-slate-300 mb-10">Join students and professors using LabFace today.</p>
          <div className="flex justify-center gap-4 flex-col sm:flex-row">
            {isLoggedIn ? (
              <Link href={getDashboardPath()} className="px-8 py-4 bg-white text-brand-900 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg">
                Go to Your Dashboard
              </Link>
            ) : (
              <>
                <Link href="/register/student" className="px-8 py-4 bg-white text-brand-900 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg">
                  Register as Student
                </Link>
                <Link href="/register/professor" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors backdrop-blur-sm">
                  Register as Professor
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-bold text-white tracking-tight mb-4 block">LabFace</span>
            <p className="mb-4 max-w-sm">
              The official AI-powered attendance system for the Polytechnic University of the Philippines Lopez Campus Computer Laboratory.
            </p>

          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/register/student" className="hover:text-white transition-colors">Student Registration</Link></li>
              <li><Link href="/register/professor" className="hover:text-white transition-colors">Professor Registration</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://www.pup.edu.ph/lopez/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  PUP Lopez Campus
                </a>
              </li>
              <li>
                <a href="https://livelopez.gov.ph/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Lopez, Quezon
                </a>
              </li>
              <li>
                <a href="mailto:labfaceassistance@gmail.com" className="hover:text-white transition-colors">
                  labfaceassistance@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-900 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} LabFace - PUP Lopez Campus. All rights reserved.</p>
          <p className="mt-2 text-slate-500">
            For support: <a href="mailto:labfaceassistance@gmail.com" className="text-brand-400 hover:text-brand-300">labfaceassistance@gmail.com</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
