"use client";

import Link from 'next/link';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full">
            <div className={`relative z-10 max-w-2xl w-full text-center p-12 transition-all duration-700 identity-glass rounded-[3rem] shadow-xl border border-identity-sky/20 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                
                {/* 404 Icon Container */}
                <div className="mb-10 flex justify-center">
                    <div className="w-24 h-24 bg-identity-sky/10 rounded-2xl flex items-center justify-center border border-identity-sky/20 shadow-sm">
                        <AlertCircle className="w-12 h-12 text-identity-sky" strokeWidth={2} />
                    </div>
                </div>

                {/* 404 Text */}
                <div className="mb-10">
                    <h1 className="text-6xl md:text-8xl md:text-7xl md:text-9xl font-black text-identity-navy mb-4">
                        404
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-black text-identity-navy uppercase tracking-[0.15em] mb-4">
                        REQUESTED PAGE NOT FOUND
                    </h2>
                    <p className="text-sm md:text-base font-bold text-identity-navy/70 uppercase tracking-[0.15em] max-w-md mx-auto leading-relaxed">
                        The requested resource could not be located in the current environment.
                    </p>
                </div>

                {/* Search suggestion */}
                <div className="mb-10 p-6 bg-identity-bg rounded-2xl border border-identity-navy/10 text-center max-w-md mx-auto flex flex-col items-center gap-4">
                    <Search className="w-6 h-6 text-identity-sky" strokeWidth={2} />
                    <p className="text-xs font-bold text-identity-navy/70 uppercase tracking-[0.15em] leading-relaxed">
                        <span className="text-identity-navy font-black">TIP:</span> VERIFY THE URL OR USE THE SYSTEM CONTROLS BELOW TO RETURN.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 w-full sm:w-auto px-10 py-5 bg-identity-sky/10 text-identity-sky rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:bg-identity-sky hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-4"
                    >
                        <ArrowLeft size={18} />
                        GO BACK
                    </button>
                    
                    <Link
                        href="/"
                        className="flex-1 w-full sm:w-auto px-10 py-5 bg-identity-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-4"
                    >
                        <Home size={18} />
                        HOME DASHBOARD
                    </Link>
                </div>
            </div>
        </div>
    );
}
