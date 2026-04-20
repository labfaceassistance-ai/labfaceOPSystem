"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function IdentityFooter() {
    const pathname = usePathname();
    const isAuthPage = ['/login', '/register/student', '/register/professor', '/forgot-password', '/admin/login'].includes(pathname);

    if (isAuthPage) return null;

    return (
        <footer className="relative w-full z-10 border-t border-identity-navy/10 mt-auto pt-20 pb-12 bg-bg-base">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 lg:gap-32">
                {/* Column 1: Branding */}
                <div>
                   <div className="text-3xl font-black mb-8 font-outfit tracking-tighter uppercase whitespace-nowrap">
                      <span className="text-identity-navy">Lab</span>
                      <span className="text-identity-sky">Face</span>
                   </div>
                   <p className="text-[10px] md:text-xs font-bold leading-relaxed uppercase tracking-[0.15em] text-identity-navy/70 max-w-sm">
                      Advancing biometric security and administrative efficiency for the Polytechnic University of the Philippines.
                   </p>
                </div>

                {/* Column 2: Quick Links */}
                <div>
                   <h4 className="text-identity-navy font-black uppercase text-[10px] md:text-xs tracking-[0.15em] mb-8">Quick Links</h4>
                   <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-identity-navy/70">
                      <li><Link href="/" className="hover:text-identity-sky transition-colors">Home</Link></li>
                      <li><Link href="/login" className="hover:text-identity-sky transition-colors">Login</Link></li>
                      <li><Link href="/register/student" className="hover:text-identity-sky transition-colors">Student Registration</Link></li>
                   </ul>
                </div>

                {/* Column 3: Contact */}
                <div>
                   <h4 className="text-identity-navy font-black uppercase text-[10px] md:text-xs tracking-[0.15em] mb-8">Contact</h4>
                   <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-identity-navy/70">
                      <li><a href="https://www.pup.edu.ph/lopez/" target="_blank" rel="noopener noreferrer" className="hover:text-identity-sky transition-colors">PUP Lopez Campus</a></li>
                      <li><a href="https://livelopez.gov.ph/" target="_blank" rel="noopener noreferrer" className="hover:text-identity-sky transition-colors">Lopez, Quezon</a></li>
                      <li><a href="mailto:labfaceassistance@gmail.com" className="hover:text-identity-sky transition-colors">labfaceassistance@gmail.com</a></li>
                   </ul>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-identity-navy/10 flex flex-col items-center gap-4 text-identity-navy font-black uppercase tracking-[0.15em] text-[10px] text-center">
                <p>© {new Date().getFullYear()} <span className="normal-case">LabFace</span> - PUP LOPEZ CAMPUS. ALL RIGHTS RESERVED.</p>
                <p>For support: <a href="mailto:labfaceassistance@gmail.com" className="text-identity-sky hover:underline">labfaceassistance@gmail.com</a></p>
            </div>
        </footer>
    );
}
