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
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled || !isHomePage || isOpen ? 'bg-brand-900 shadow-lg py-2' : 'bg-transparent py-4'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href={user ? (
                            user.role.includes('admin') ? '/admin/dashboard' :
                                user.role.includes('professor') ? '/professor/dashboard' :
                                    user.role.includes('student') ? '/student/dashboard' :
                                        '/'
                        ) : '/'} className="flex items-center gap-3 group">
                            <div className="relative h-10 w-10 bg-white rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                                <Image src="/logo.png" alt="LabFace Logo" width={40} height={40} className="object-cover" />
                            </div>
                            <span className="font-bold text-xl sm:text-2xl tracking-tight text-white">LabFace</span>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">


                            {!user && !isAuthPage && (
                                <>
                                    {/* Login and Get Started buttons removed */}
                                </>
                            )}
                            {user && !isAuthPage && !isHomePage && (
                                <div className="flex items-center gap-4 relative">
                                    {/* Enhanced Notification Center - Hide for Admins */}
                                    {!user.role.includes('admin') && <NotificationCenter />}

                                    <Link href={
                                        user.role.toLowerCase().includes('admin') ? '/admin/profile' :
                                            user.role.toLowerCase().includes('professor') ? '/professor/profile' :
                                                '/student/profile'
                                    }
                                        className="flex items-center gap-2 group"
                                        title="Edit Profile">
                                        <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold border-2 border-brand-600 group-hover:border-brand-400 transition-all shadow-sm overflow-hidden">
                                            {user.profilePicture ? (
                                                <img
                                                    src={getProfilePictureUrl(user.profilePicture) || ''}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span>{user.firstName?.[0] || ''}{user.lastName?.[0] || ''}</span>
                                            )}
                                        </div>
                                    </Link>

                                    <button onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {!pathname.startsWith('/register') && !isHomePage && (
                        <div className="-mr-2 flex md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-brand-800 focus:outline-none transition-colors"
                            >
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-brand-900 border-b border-brand-800 shadow-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {!user && !isAuthPage && (
                            <>
                                <Link href="/login" className="block text-gray-300 hover:text-white hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium">Login</Link>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsRegisterModalOpen(true);
                                    }}
                                    className="block w-full text-left text-brand-400 hover:text-brand-300 hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium"
                                >
                                    Register
                                </button>
                            </>
                        )}
                        {user && isHomePage && (
                            <>
                                <div className="px-3 py-2 text-gray-400 text-sm">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard'} className="block text-white hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                                    <LayoutDashboard size={18} /> Go to Dashboard
                                </Link>
                                <button onClick={handleLogout} className="block w-full text-left text-red-400 hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                        {user && !isAuthPage && !isHomePage && (
                            <>
                                <div className="px-3 py-2 text-gray-400 text-sm">Signed in as {user.firstName} {user.lastName}</div>
                                <Link href={
                                    user.role === 'professor' ? '/professor/profile' :
                                        user.role === 'student' ? '/student/profile' :
                                            '/admin/profile'
                                } className="block text-white hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                                    <User size={18} /> Profile
                                </Link>
                                {(!user.role.includes('admin')) && (
                                    <Link href="/notifications" className="block text-white hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                                        <Bell size={18} /> Notifications
                                    </Link>
                                )}
                                <button onClick={handleLogout} className="block w-full text-left text-red-400 hover:bg-brand-800 px-3 py-2 rounded-md text-base font-medium flex items-center gap-2">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Registration Choice Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-up">
                        <button
                            onClick={() => setIsRegisterModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-white">Create Account</h3>
                            <p className="text-slate-400 mt-2">Choose your registration type</p>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href="/register/student"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-4 border-2 border-slate-800 rounded-xl hover:border-brand-500 hover:bg-brand-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-500 group-hover:text-white transition-colors border border-brand-500/20">
                                    <GraduationCap size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">Student</div>
                                    <div className="text-sm text-slate-400">Register with your student number</div>
                                </div>
                                <div className="ml-auto text-slate-500 group-hover:text-brand-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>

                            <Link
                                href="/register/professor"
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="flex items-center p-4 border-2 border-slate-800 rounded-xl hover:border-brand-500 hover:bg-brand-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-500 group-hover:text-white transition-colors border border-brand-500/20">
                                    <School size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">Professor</div>
                                    <div className="text-sm text-slate-400">Register with your faculty ID</div>
                                </div>
                                <div className="ml-auto text-slate-500 group-hover:text-brand-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
