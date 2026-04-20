"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, User, LayoutDashboard, GraduationCap, School, Bell, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getToken, getUser, logout, API_URL, getBackendUrl, getProfilePictureUrl } from '@/utils/auth';
import NotificationCenter from './NotificationCenter';

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
    const [visible, setVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const storedUser = getUser();
        const token = getToken();

        if (storedUser && token) {
            setUser(storedUser);
        } else {
            setUser(null);
        }

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Background blur effect
            setScrolled(currentScrollY > 20);

            // Hide/Show logic
            if (currentScrollY > lastScrollY && currentScrollY > 10) {
                setVisible(false); // Scrolling down
            } else {
                setVisible(true); // Scrolling up
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleLogout = () => {
        logout();
    };

    const isAuthPage = pathname === '/login' || pathname.startsWith('/register');

    const isHomePage = pathname === '/';

    return (
        <nav className={`fixed w-full z-50 transition-all duration-500 identity-glass border-b border-identity-sky/10 shadow-lg py-2 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href={user ? (
                            user.role.includes('admin') ? '/admin/dashboard' :
                                user.role.includes('professor') ? '/professor/dashboard' :
                                    user.role.includes('student') ? '/student/dashboard' :
                                        '/'
                        ) : '/'} className="flex items-center gap-3 group">
                            <div className="relative h-10 w-10 bg-white rounded-full overflow-hidden shadow-xl group-hover:scale-105 transition-transform border border-identity-sky/20">
                                <Image src="/logo.png" alt="LabFace Logo" width={40} height={40} className="object-cover" />
                            </div>
                            <div className={`font-bold text-xl sm:text-2xl tracking-tight leading-none`}>
                                <span className="text-identity-navy drop-shadow-sm">Lab</span>
                                <span className="text-identity-sky drop-shadow-sm">Face</span>
                            </div>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">



                            {user && !isAuthPage && (
                                <div className="flex items-center gap-4 relative">
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
                                                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">{user.firstName?.[0] || ''}{user.lastName?.[0] || ''}</span>
                                                    )}
                                                </div>
                                            </Link>

                                            <button onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-white/5 px-6 py-3 min-h-[44px] min-w-[44px] rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-400/20 active:scale-95 shadow-sm hover:shadow-lg">
                                                <LogOut size={18} /> Logout
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
                                className="inline-flex items-center justify-center p-3 min-h-[44px] min-w-[44px] rounded-xl text-identity-sky hover:bg-identity-sky/10 focus:outline-none transition-all active:scale-90 border border-transparent hover:border-identity-sky/20"
                                title={isOpen ? "Close Menu" : "Open Menu"}
                            >
                                {isOpen ? <X size={28} /> : <Menu size={28} />}
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
                                <Link href="/login" onClick={() => setIsOpen(false)} className="block text-identity-navy/40 hover:text-identity-navy hover:bg-black/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all">Login</Link>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsRegisterModalOpen(true);
                                    }}
                                    className="block w-full text-left text-identity-sky hover:bg-identity-sky/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border border-identity-sky/20"
                                >
                                    Register
                                </button>
                            </>
                        )}
                        {user && isHomePage && (
                            <>
                                <div className="px-4 py-2 text-[8px] font-black text-secondary/20 uppercase tracking-[0.15em]">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard'} onClick={() => setIsOpen(false)} className="block text-identity-navy hover:bg-black/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all">
                                    <LayoutDashboard size={18} className="text-identity-sky" /> Go to Dashboard
                                </Link>
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full text-left text-red-400 hover:bg-red-400/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                        {user && !isAuthPage && !isHomePage && (
                            <>
                                <div className="px-4 py-2 text-[8px] font-black text-secondary/20 uppercase tracking-[0.15em]">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={
                                    user.role === 'professor' ? '/professor/profile' :
                                        user.role === 'student' ? '/student/profile' :
                                            '/admin/profile'
                                } onClick={() => setIsOpen(false)} className="block text-identity-navy hover:bg-black/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all">
                                    <User size={18} className="text-identity-sky" /> Profile
                                </Link>
                                {(!user.role.includes('admin')) && (
                                    <Link href="/notifications" onClick={() => setIsOpen(false)} className="block text-identity-navy hover:bg-black/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all">
                                        <Bell size={18} className="text-identity-sky" /> Notifications
                                    </Link>
                                )}
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full text-left text-red-500 hover:bg-red-500/5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Registration Choice Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-identity-navy/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="identity-glass rounded-3xl shadow-3xl max-w-md w-full overflow-hidden animate-scale-up border border-identity-sky/10">
                        <div className="p-8 bg-white/40 border-b border-identity-sky/5 flex justify-between items-center">
                            <h3 className="text-xl font-black text-identity-navy uppercase tracking-tight italic">Sign In</h3>
                            <button
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="text-slate-400 hover:text-identity-navy transition-all p-3 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/60 rounded-xl border border-transparent hover:border-identity-sky/10 active:scale-90"
                                title="Close Modal"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-8 text-center italic">Choose your operational role</p>
                            <Link
                                href="/register/student"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-6 bg-white/60 border border-identity-sky/10 rounded-[2rem] hover:border-identity-sky/50 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="w-16 h-16 bg-identity-sky/10 text-identity-sky rounded-2xl flex items-center justify-center mr-6 group-hover:bg-identity-sky group-hover:text-white transition-all border border-identity-sky/20 shadow-inner">
                                    <GraduationCap size={32} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-identity-navy uppercase tracking-tight text-lg italic">Student</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Register with your student number</div>
                                </div>
                                <div className="ml-auto text-slate-200 group-hover:text-identity-sky group-hover:translate-x-2 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>

                            <Link
                                href="/register/professor"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-6 bg-white/60 border border-identity-sky/10 rounded-[2rem] hover:border-identity-sky/50 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="w-16 h-16 bg-identity-navy/10 text-identity-navy rounded-2xl flex items-center justify-center mr-6 group-hover:bg-identity-navy group-hover:text-white transition-all border border-identity-navy/20 shadow-inner">
                                    <School size={32} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-identity-navy uppercase tracking-tight text-lg italic">Professor</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Register as a Professor</div>
                                </div>
                                <div className="ml-auto text-slate-200 group-hover:text-identity-navy group-hover:translate-x-2 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
