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

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 172800) return 'Yesterday';
        return date.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
                <button
                    onClick={() => {
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            const user = JSON.parse(storedUser);
                            router.push(user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard');
                        }
                    }}
                    className="mb-4 text-brand-400 hover:text-brand-300 font-medium flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="bg-slate-900/50 rounded-2xl shadow-sm border border-slate-800 backdrop-blur-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Bell className="text-brand-400" /> Notifications
                            </h1>
                            {notifications.some(n => !n.is_read) && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                                >
                                    <Check size={16} /> Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-800">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-6 hover:bg-slate-800/30 transition-colors cursor-pointer ${!notification.is_read ? 'bg-brand-500/10' : ''}`}
                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-semibold mb-1 ${!notification.is_read ? 'text-brand-300' : 'text-white'}`}>
                                                {notification.title}
                                            </h3>
                                            <p className="text-slate-400 leading-relaxed">{notification.message}</p>
                                        </div>
                                        <div className="ml-4 flex flex-col items-end gap-2">
                                            <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                                                <Clock size={12} /> {formatDate(notification.created_at)}
                                            </span>
                                            {!notification.is_read && (
                                                <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Bell size={48} className="mx-auto text-slate-700 mb-4" />
                                <h3 className="text-lg font-medium text-white">No notifications</h3>
                                <p>You're all caught up!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
