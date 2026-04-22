"use client";
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Bell, Check, Clock, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

import IdentityBackground from '@/components/IdentityBackground';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const res = await axios.get(`${API_URL}/api/notifications/${user.id}`);
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            await axios.patch(`${API_URL}/api/notifications/user/${user.id}/read-all`);
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.patch(`${API_URL}/api/notifications/${id}/read`);
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
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 172800) return 'Yesterday';
        return date.toLocaleDateString().toUpperCase();
    };

    return (
        <div className="min-h-screen relative selection:bg-identity-sky/20">
            <IdentityBackground />
            <Navbar />

            <main className="max-w-5xl mx-auto px-6 pt-40 pb-20 relative z-10">
                <button
                    onClick={() => {
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            const user = JSON.parse(storedUser);
                            router.push(user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard');
                        }
                    }}
                    className="mb-8 text-identity-navy/60 hover:text-identity-navy font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 transition-all group bg-white/40 px-8 py-4 rounded-[1.5rem] border-2 border-white/40 backdrop-blur-md shadow-xl hover:scale-105 italic"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform" /> 
                    Back to Dashboard
                </button>

                <div className="identity-glass rounded-[3.5rem] shadow-4xl border-2 border-white/40 backdrop-blur-2xl overflow-hidden animate-fade-in bg-white/10">
                    <div className="p-10 md:p-14 border-b-2 border-identity-navy/5 bg-white/40">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                           <div className="flex items-center gap-6">
                               <div className="w-16 h-16 bg-identity-navy text-identity-sky rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/10">
                                   <Bell size={32} className="animate-pulse" />
                               </div>
                               <div>
                                   <h1 className="text-3xl md:text-5xl font-black text-identity-navy uppercase tracking-tighter italic">
                                       Academic Alerts & Notifications
                                   </h1>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">Communication Portal</p>
                               </div>
                           </div>
                            {notifications.some(n => !n.is_read) && (
                                <button
                                    onClick={markAllAsRead}
                                    className="px-8 py-4 bg-identity-sky text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-glow-blue hover:scale-105 transition-all flex items-center gap-3 italic border-2 border-white/10"
                                >
                                    <Check size={18} /> Mark All as Read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="divide-y-2 divide-identity-navy/5">
                        {loading ? (
                            <div className="p-24 text-center">
                                <div className="w-16 h-16 border-4 border-identity-sky border-t-transparent rounded-full animate-spin mx-auto shadow-glow-blue"></div>
                                <p className="mt-8 text-[11px] font-black text-identity-navy uppercase tracking-[0.4em] italic animate-pulse">Loading notifications...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-10 md:p-12 hover:bg-white/40 transition-all cursor-pointer group relative overflow-hidden ${!notification.is_read ? 'bg-identity-sky/[0.03]' : ''}`}
                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                >
                                    {/* Unread Indicator Bar */}
                                    {!notification.is_read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-identity-sky shadow-glow-blue"></div>
                                    )}

                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-4">
                                                {!notification.is_read && (
                                                    <span className="px-3 py-1 bg-identity-sky text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-md italic shadow-glow-blue animate-pulse">
                                                        New
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                                    <Clock size={12} /> {formatDate(notification.created_at)}
                                                </span>
                                            </div>
                                            <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tighter mb-3 italic ${!notification.is_read ? 'text-identity-navy underline decoration-identity-sky/20' : 'text-identity-navy/80'}`}>
                                                {notification.title}
                                            </h3>
                                            <p className="text-[12px] font-black text-slate-500 leading-relaxed uppercase tracking-widest italic opacity-70 group-hover:opacity-100 transition-opacity">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${!notification.is_read ? 'bg-identity-sky/10 border-identity-sky/40 text-identity-sky shadow-glow-blue rotate-12' : 'bg-white border-identity-navy/5 text-slate-300'}`}>
                                                <Bell size={24} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-32 text-center opacity-40">
                                <Bell size={80} className="mx-auto text-slate-300 mb-8" />
                                <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter italic">No New Notifications</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4 italic">Your notification log is currently empty</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
