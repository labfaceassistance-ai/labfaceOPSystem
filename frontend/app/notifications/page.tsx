"use client";
import { useState, useEffect } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/ui/BackButton';
import { getToken, getUser } from '@/utils/auth';

interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    type?: 'success' | 'error' | 'info' | 'warning';
    category?: 'attendance' | 'class' | 'system' | 'security';
}

import IdentityBackground from '@/components/IdentityBackground';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const user = getUser();
            if (!user) return;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const res = await axios.get(`${API_URL}/api/notifications/${user.id}`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const user = getUser();
            if (!user) return;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            await axios.patch(`${API_URL}/api/notifications/user/${user.id}/read-all`, {}, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just Now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 172800) return 'Yesterday';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread' && n.is_read) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-transparent font-outfit select-none relative overflow-hidden">
            <IdentityBackground />
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-10">
                <BackButton
                    label="Back to Dashboard"
                    className="mb-6 bg-white/40 px-6 py-3 rounded-2xl border-2 border-white/40 backdrop-blur-md shadow-lg hover:scale-105 italic text-[11px] font-black uppercase tracking-widest"
                    onClick={() => {
                        const user = getUser();
                        if (user) {
                            const role = user.role?.toLowerCase() || '';
                            if (role.includes('admin')) router.push('/admin/dashboard');
                            else if (role.includes('professor')) router.push('/professor/dashboard');
                            else if (role.includes('student')) router.push('/student/dashboard');
                            else router.push('/');
                        } else {
                            // Fallback to previous page if no user info found
                            if (window.history.length > 1) window.history.back();
                            else router.push('/');
                        }
                    }}
                />
                <div className="identity-glass rounded-[2rem] shadow-3xl border-2 border-white/40 backdrop-blur-2xl overflow-hidden animate-fade-in bg-white/10">
                    <div className="p-4 md:p-6 border-b-2 border-identity-navy/5 bg-white/20">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                           <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-identity-navy text-identity-sky rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/10">
                                   <Bell size={20} className="animate-pulse" />
                               </div>
                               <div>
                                   <h1 className="text-xl md:text-2xl font-black text-identity-navy uppercase tracking-tighter italic">
                                       System <span className="text-identity-sky">Alerts</span>
                                   </h1>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic opacity-60">Identity Management Activity Logs</p>
                               </div>
                           </div>

                           <div className="flex items-center gap-3 bg-white/40 p-1.5 rounded-2xl border border-white/40 shadow-inner">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-5 py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all italic ${filter === 'all' ? 'bg-identity-navy text-white shadow-md' : 'text-slate-400 hover:text-identity-navy'}`}
                                >
                                    All Logs
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`px-5 py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all italic ${filter === 'unread' ? 'bg-identity-navy text-white shadow-md' : 'text-slate-400 hover:text-identity-navy'}`}
                                >
                                    Unread
                                </button>
                                {notifications.some(n => !n.is_read) && (
                                    <div className="w-[2px] h-6 bg-slate-200 mx-2" />
                                )}
                                {notifications.some(n => !n.is_read) && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-5 py-2 bg-identity-sky/10 text-identity-sky hover:bg-identity-sky hover:text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 italic border border-identity-sky/20"
                                    >
                                        <Check size={12} /> Clear All
                                    </button>
                                )}
                           </div>
                        </div>
                    </div>

                    <div className="divide-y-2 divide-identity-navy/5">
                        {loading ? (
                            <div className="p-24 text-center">
                                <div className="w-16 h-16 border-4 border-identity-sky border-t-transparent rounded-full animate-spin mx-auto shadow-glow-blue"></div>
                                <p className="mt-8 text-[11px] font-black text-identity-navy uppercase tracking-[0.4em] italic animate-pulse">Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-6 md:p-8 hover:bg-white/40 transition-all cursor-pointer group relative overflow-hidden ${!notification.is_read ? 'bg-identity-sky/[0.03]' : ''}`}
                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                >
                                    {/* Unread Indicator Bar */}
                                    {!notification.is_read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-identity-sky shadow-glow-blue"></div>
                                    )}

                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                {!notification.is_read && (
                                                    <span className="px-2 py-0.5 bg-identity-sky text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-md italic shadow-glow-blue animate-pulse">
                                                        New
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                                    <Clock size={10} /> {formatDate(notification.created_at)}
                                                </span>
                                            </div>
                                            <h3 className={`text-lg md:text-xl font-black uppercase tracking-tighter mb-2 italic ${!notification.is_read ? 'text-identity-navy underline decoration-identity-sky/20' : 'text-identity-navy/80'}`}>
                                                {notification.title}
                                            </h3>
                                            <p className="text-[10.5px] font-black text-slate-500 leading-relaxed uppercase tracking-widest italic opacity-70 group-hover:opacity-100 transition-opacity">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${!notification.is_read ? 'bg-identity-sky/10 border-identity-sky/40 text-identity-sky shadow-glow-blue rotate-12' : 'bg-white border-identity-navy/5 text-slate-300'}`}>
                                                <Bell size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-16 text-center opacity-40">
                                <Bell size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-black text-identity-navy uppercase tracking-tighter italic">No New Notifications</h3>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-3 italic">Your notification log is currently empty</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
