"use client";

import React from 'react';
import Link from 'next/link';

export default function IdentityFooter() {
    return (
        <footer className="relative w-full z-10 border-t border-[#041C3C]/10 mt-auto pt-20 pb-12 bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-32">
                {/* Column 1: Branding */}
                <div className="flex flex-col items-start text-left">
                   <div className="text-3xl font-black mb-8 font-outfit tracking-tighter whitespace-nowrap">
                      <span className="text-[#041C3C]">Lab</span>
                      <span className="text-[#5CB4E4]">Face</span>
                   </div>
                   <p className="text-[10px] md:text-xs font-bold leading-relaxed uppercase tracking-[0.15em] text-[#041C3C]/70 max-w-sm">
                      Advancing biometric security and administrative efficiency for the Polytechnic University of the Philippines.
                   </p>
                </div>

                {/* Column 2: Quick Links */}
                <div className="flex flex-col items-start text-left">
                   <h4 className="text-[#041C3C] font-black uppercase text-[10px] md:text-xs tracking-[0.15em] mb-8">Quick Links</h4>
                   <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-[#041C3C]/70">
                      <li><Link href="/" className="hover:text-[#5CB4E4] transition-colors">Home</Link></li>
                      <li><Link href="/login" className="hover:text-[#5CB4E4] transition-colors">Login</Link></li>
                      <li><Link href="/register/student" className="hover:text-[#5CB4E4] transition-colors">Register</Link></li>
                   </ul>
                </div>

                {/* Column 3: Contact */}
                <div className="flex flex-col items-start text-left">
                   <h4 className="text-[#041C3C] font-black uppercase text-[10px] md:text-xs tracking-[0.15em] mb-8">Support</h4>
                   <ul className="space-y-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-[#041C3C]/70">
                      <li><a href="mailto:labfaceassistance@gmail.com" className="hover:text-[#5CB4E4] transition-colors">Contact Support</a></li>
                      <li><a href="https://www.pup.edu.ph/lopez/" target="_blank" rel="noopener noreferrer" className="hover:text-[#5CB4E4] transition-colors">PUP Lopez Campus</a></li>
                      <li><a href="https://livelopez.gov.ph/" target="_blank" rel="noopener noreferrer" className="hover:text-[#5CB4E4] transition-colors">Lopez, Quezon</a></li>
                   </ul>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-[#041C3C]/10 flex flex-col items-center gap-4 text-[#041C3C] font-black uppercase tracking-[0.15em] text-[10px] text-center">
                <p>© {new Date().getFullYear()} LABFACE - PUP LOPEZ CAMPUS. ALL RIGHTS RESERVED.</p>
                <div className="flex gap-8">
                    <Link href="/privacy-policy" className="text-[#5CB4E4] hover:text-[#041C3C] transition-colors underline underline-offset-4">Privacy Policy</Link>
                </div>
            </div>
        </footer>
    );
}
