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
        <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500 blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-purple-600 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-blue-400 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className={`relative z-10 max-w-2xl w-full text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* 404 Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-full p-8 shadow-2xl">
                            <AlertCircle className="w-24 h-24 text-brand-400" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* 404 Text */}
                <div className="mb-6">
                    <h1 className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-400 to-brand-500 mb-4 animate-scale-in">
                        404
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
                        Page Not Found
                    </h2>
                    <p className="text-lg text-slate-400 max-w-md mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        Oops! The page you're looking for seems to have vanished into the digital void. Let's get you back on track.
                    </p>
                </div>

                {/* Search suggestion */}
                <div className="mb-8 p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl max-w-md mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center gap-3 text-slate-300">
                        <Search className="w-5 h-5 text-brand-400 flex-shrink-0" />
                        <p className="text-sm text-left">
                            <span className="font-semibold text-white">Tip:</span> Double-check the URL or use the navigation buttons below to find what you need.
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Link
                        href="/"
                        className="group px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-brand-500/50 flex items-center gap-2 w-full sm:w-auto justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <Home size={20} />
                        Go Home
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="group px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg font-bold text-lg border border-slate-700 backdrop-blur-sm flex items-center gap-2 w-full sm:w-auto justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft size={20} />
                        Go Back
                    </button>
                </div>

                {/* Additional links */}
                <div className="mt-12 pt-8 border-t border-slate-800 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <p className="text-sm text-slate-500 mb-4">Quick Links</p>
                    <div className="flex flex-wrap gap-4 justify-center text-sm">
                        <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
                            Login
                        </Link>
                        <span className="text-slate-700">•</span>
                        <Link href="/register/student" className="text-brand-400 hover:text-brand-300 transition-colors">
                            Student Registration
                        </Link>
                        <span className="text-slate-700">•</span>
                        <Link href="/register/professor" className="text-brand-400 hover:text-brand-300 transition-colors">
                            Professor Registration
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
