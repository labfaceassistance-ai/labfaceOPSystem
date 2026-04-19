"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, User, LayoutDashboard, GraduationCap, School, Bell, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getToken, getUser, logout, API_URL, getBackendUrl, getProfilePictureUrl } from '@/utils/auth';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';

interface UserData {
    id: number;
    role: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
}

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const pathname = usePathname();
    const [user, setUser] = useState<UserData | null>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const storedUser = getUser();
        const token = getToken();

        // Only set user if BOTH user data AND token exist
        if (storedUser && token) {
            setUser(storedUser);
        } else {
            setUser(null);
        }

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
    };

    const isAuthPage = pathname === '/login' || pathname.startsWith('/register');

    const isHomePage = pathname === '/';

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 identity-glass border-b border-identity-sky/10 shadow-lg py-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href={user ? (
                            user.role.includes('admin') ? '/admin/dashboard' :
                                user.role.includes('professor') ? '/professor/dashboard' :
                                    user.role.includes('student') ? '/student/dashboard' :
                                        '/'
                        ) : '/'} className="flex items-center gap-3 group">
                            <div className="relative h-10 w-10 bg-white rounded-full overflow-hidden shadow-xl group-hover:scale-105 transition-transform border border-brand-gold/20">
                                <Image src="/logo.png" alt="LabFace Logo" width={40} height={40} className="object-cover" />
                            </div>
                            <div className={`font-bold text-xl sm:text-2xl tracking-tight leading-none ${isHomePage ? '' : 'bg-black/5 px-2 py-1 rounded-lg backdrop-blur-sm border border-black/5'}`}>
                                <span className="text-identity-navy drop-shadow-sm">Lab</span>
                                <span className="text-identity-sky drop-shadow-sm">Face</span>
                            </div>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">


                            {!user && !isAuthPage && !isHomePage && (
                                <div className="flex items-center gap-4">
                                    <ThemeToggle />
                                </div>
                            )}
                            {user && !isAuthPage && (
                                <div className="flex items-center gap-4 relative">
                                    {!isHomePage && <ThemeToggle />}
                                    {!isHomePage && (
                                        <>
                                            {/* Enhanced Notification Center - Hide for Admins */}
                                            {!user.role.includes('admin') && <NotificationCenter />}
                                            <Link href={
                                                user.role.toLowerCase().includes('admin') ? '/admin/profile' :
                                                    user.role.toLowerCase().includes('professor') ? '/professor/profile' :
                                                        '/student/profile'
                                            }
                                                className="flex items-center gap-2 group"
                                                title="Edit Profile">
                                                <div className="w-10 h-10 rounded-full bg-identity-navy flex items-center justify-center text-white font-bold border-2 border-slate-200 group-hover:border-identity-sky transition-all shadow-lg overflow-hidden">
                                                    {user.profilePicture ? (
                                                        <img
                                                            src={getProfilePictureUrl(user.profilePicture) || ''}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{user.firstName?.[0] || ''}{user.lastName?.[0] || ''}</span>
                                                    )}
                                                </div>
                                            </Link>

                                            <button onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2">
                                                <LogOut size={16} /> Logout
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {!pathname.startsWith('/register') && !isHomePage && (
                        <div className="-mr-2 flex md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-brand-gold hover:bg-white/10 focus:outline-none transition-colors"
                            >
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full identity-glass border-b border-black/10 shadow-2xl animate-in slide-in-from-top-4 duration-200">
                    <div className="px-4 pt-4 pb-6 space-y-2">
                        {!user && !isAuthPage && (
                            <>
                                <Link href="/login" onClick={() => setIsOpen(false)} className="block text-identity-navy/40 hover:text-identity-navy hover:bg-black/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Login</Link>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsRegisterModalOpen(true);
                                    }}
                                    className="block w-full text-left text-identity-sky hover:bg-identity-sky/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-identity-sky/20"
                                >
                                    Register
                                </button>
                            </>
                        )}
                        {user && isHomePage && (
                            <>
                                <div className="px-4 py-2 text-[8px] font-black text-secondary/20 uppercase tracking-widest">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard'} onClick={() => setIsOpen(false)} className="block text-white hover:bg-white/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                                    <LayoutDashboard size={18} className="text-brand-gold" /> Go to Dashboard
                                </Link>
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full text-left text-red-400 hover:bg-red-400/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                        {user && !isAuthPage && !isHomePage && (
                            <>
                                <div className="px-4 py-2 text-[8px] font-black text-secondary/20 uppercase tracking-widest">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={
                                    user.role === 'professor' ? '/professor/profile' :
                                        user.role === 'student' ? '/student/profile' :
                                            '/admin/profile'
                                } onClick={() => setIsOpen(false)} className="block text-white hover:bg-white/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                                    <User size={18} className="text-brand-gold" /> Profile
                                </Link>
                                {(!user.role.includes('admin')) && (
                                    <Link href="/notifications" onClick={() => setIsOpen(false)} className="block text-white hover:bg-white/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                                        <Bell size={18} className="text-brand-gold" /> Notifications
                                    </Link>
                                )}
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full text-left text-red-500 hover:bg-red-500/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Registration Choice Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="identity-glass rounded-2xl shadow-3xl max-w-md w-full overflow-hidden animate-scale-up">
                        <div className="p-6 bg-black/5 border-b border-black/5 flex justify-between items-center">
                            <h3 className="text-xl font-black text-identity-navy uppercase tracking-tight">Create Account</h3>
                            <button
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="text-secondary/40 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-4">
                            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-6 text-center">Choose your registration type</p>
                            <Link
                                href="/register/student"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-brand-gold/50 transition-all group shadow-inner"
                            >
                                <div className="w-14 h-14 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center mr-5 group-hover:bg-brand-gold group-hover:text-black transition-all border border-brand-gold/20 shadow-inner">
                                    <GraduationCap size={28} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-white uppercase tracking-tight">Student</div>
                                    <div className="text-[8px] font-bold text-secondary/40 uppercase tracking-widest mt-1">Register with your student number</div>
                                </div>
                                <div className="ml-auto text-secondary/20 group-hover:text-brand-gold group-hover:translate-x-1 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>

                            <Link
                                href="/register/professor"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-brand-gold/50 transition-all group shadow-inner"
                            >
                                <div className="w-14 h-14 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center mr-5 group-hover:bg-brand-gold group-hover:text-black transition-all border border-brand-gold/20 shadow-inner">
                                    <School size={28} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-white uppercase tracking-tight">Professor</div>
                                    <div className="text-[8px] font-bold text-secondary/40 uppercase tracking-widest mt-1">Register with your faculty ID</div>
                                </div>
                                <div className="ml-auto text-secondary/20 group-hover:text-brand-gold group-hover:translate-x-1 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
