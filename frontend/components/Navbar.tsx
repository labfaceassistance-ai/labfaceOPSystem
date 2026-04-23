"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, User, Bell, ChevronRight, Home as HomeIcon } from 'lucide-react';
import { getToken, getUser, logout } from '@/utils/auth';
import NotificationCenter from './NotificationCenter';
import { useNavigation } from '@/context/NavigationContext';

interface UserData {
    id: number;
    role: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
}

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [user, setUser] = useState<UserData | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const { tabs, activeTab, setActiveTab } = useNavigation();

    useEffect(() => {
        const storedUser = getUser();
        const token = getToken();

        if (storedUser && token) {
            setUser(storedUser);
        } else {
            setUser(null);
        }

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
    };

    const isAuthPage = pathname === '/login' || pathname.startsWith('/register');
    const isHomePage = pathname === '/';
    const isPrivacyPage = pathname === '/privacy-policy';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 font-outfit ${
            scrolled 
            ? 'h-16 bg-white/95 backdrop-blur-2xl shadow-md border-b border-slate-200' 
            : 'h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100/80 shadow-sm'
        }`}>
            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                {/* Logo Section */}
                <div className="flex items-center space-x-12">
                    <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 overflow-hidden rounded-full border border-slate-200 bg-white p-2">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl font-black text-identity-navy tracking-tight">
                            Lab<span className="text-identity-sky">Face</span>
                        </span>
                    </div>
                </div>

                {/* Dashboard Tabs in Middle */}
                {user && tabs && tabs.length > 0 && !isHomePage && !isAuthPage && (
                    <div className="hidden lg:flex items-center justify-center flex-1 max-w-xl px-4">
                        <div className="flex gap-2">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${
                                            isActive 
                                            ? 'text-identity-navy' 
                                            : 'text-slate-400 hover:text-identity-navy'
                                        }`}
                                    >
                                        {tab.label}
                                        {isActive && (
                                            <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-identity-sky animate-in slide-in-from-left-2 duration-300 shadow-[0_0_8px_rgba(92,180,228,0.5)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {user && !isAuthPage ? (
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-1">
                                {!user.role.includes('admin') && (
                                    <NotificationCenter />
                                )}

                                <div className="w-[1px] h-6 bg-slate-100 mx-1" />

                                <Link
                                    href={
                                        user.role?.toLowerCase().includes('admin') ? '/admin/profile' :
                                        user.role?.toLowerCase().includes('professor') ? '/professor/profile' :
                                        user.role?.toLowerCase().includes('student') ? '/student/profile' :
                                        '/profile'
                                    }
                                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-xl hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-identity-navy text-white flex items-center justify-center text-[10px] font-black group-hover:-translate-y-0.5 transition-transform shadow-sm">
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                    </div>
                                    <span className="hidden lg:block text-[10px] font-black text-identity-navy uppercase tracking-widest italic group-hover:text-identity-sky transition-colors">
                                        {user.firstName}
                                    </span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all group"
                                >
                                    <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </div>

                            {/* Mobile Actions */}
                            <div className="flex md:hidden items-center gap-1">
                                {user && !isAuthPage && !user.role.includes('admin') && (
                                    <NotificationCenter />
                                )}
                                
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="p-2 text-slate-400 hover:text-identity-navy transition-all"
                                >
                                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                                </button>
                            </div>
                        </div>
                    ) : !isAuthPage && !isHomePage && !isPrivacyPage ? (
                        <div className="flex items-center gap-6">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-identity-navy transition-all italic">Login</Link>
                            <Link 
                                href="/register/student" 
                                className="bg-identity-navy text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-identity-sky transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Get Started
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 space-y-4">
                        {user && tabs && tabs.length > 0 && !isHomePage && (
                            <div className="grid grid-cols-2 gap-2 pb-6 border-b border-slate-50">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setIsOpen(false); }}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic text-left transition-all ${
                                            activeTab === tab.id 
                                            ? 'bg-identity-sky/10 text-identity-navy' 
                                            : 'text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Link href="/notifications" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-identity-navy hover:bg-slate-50 transition-all italic">Notifications</Link>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all italic">Logout</button>
                    </div>
                </div>
            )}
        </nav>
    );
}
