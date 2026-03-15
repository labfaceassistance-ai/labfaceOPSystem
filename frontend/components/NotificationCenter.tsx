/**
 * Enhanced Notification Center
 * Categorized, snooze-able notifications with quick actions
 */

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Clock, X, Trash2, Check } from 'lucide-react';
import axios from 'axios';
import { getToken, getUser } from '../utils/auth';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    category: 'attendance' | 'class' | 'system' | 'security';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    snoozedUntil?: string;
    actionUrl?: string;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const user = getUser();
            if (!user) return;
            const userId = user.id;

            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(`${API_URL}/api/notifications/${userId}`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(response.data);
            setUnreadCount(response.data.filter((n: any) => !n.is_read).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.patch(`${API_URL}/api/notifications/${id}/read`,
                { read: true },
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`
                    }
                }
            );
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };



    const markAllAsRead = async () => {
        try {
            const user = getUser();
            if (!user) return;
            const userId = user.id;

            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.patch(`${API_URL}/api/notifications/user/${userId}/read-all`, {}, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.delete(`${API_URL}/api/notifications/${id}/delete`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            // No need to fetch, already updated UI locally
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };




    const snoozeNotification = async (id: string, hours: number) => {
        const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, snoozedUntil } : n)
        );
        // In production, save to backend
    };

    const filteredNotifications = notifications.filter((n: any) => {
        if (filter === 'unread' && n.is_read) return false;
        if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
        if (n.snoozedUntil && new Date(n.snoozedUntil) > new Date()) return false;
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'error': return AlertCircle;
            case 'warning': return AlertCircle;
            default: return Info;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-500 bg-green-500/10';
            case 'error': return 'text-red-500 bg-red-500/10';
            case 'warning': return 'text-yellow-500 bg-yellow-500/10';
            default: return 'text-blue-500 bg-blue-500/10';
        }
    };

    return (
        <>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 top-16 w-96 bg-slate-900 rounded-lg shadow-2xl border border-slate-800 z-50 max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-white">Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === 'all'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === 'unread'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                Unread ({unreadCount})
                            </button>
                        </div>

                        {/* Category Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        >
                            <option value="all">All Categories</option>
                            <option value="attendance">Attendance</option>
                            <option value="class">Classes</option>
                            <option value="system">System</option>
                            <option value="security">Security</option>
                        </select>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="w-full mt-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                Mark All as Read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notif: any) => {
                                const Icon = getIcon(notif.type);
                                const colorClass = getTypeColor(notif.type);

                                return (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${!notif.is_read ? 'bg-slate-800/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-4 items-start">
                                            <div className={`w-10 h-10 rounded-lg ${colorClass} flex-shrink-0 flex items-center justify-center`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">

                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="text-white font-medium text-sm">{notif.title}</h4>
                                                    {!notif.is_read && (
                                                        <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1"></div>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-sm mb-2">{notif.message}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-500">
                                                        {notif.created_at ? new Date(notif.created_at).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : 'No date'}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        {!notif.is_read && (
                                                            <button
                                                                onClick={() => markAsRead(notif.id)}
                                                                className="text-xs text-brand-400 hover:text-brand-300"
                                                            >
                                                                Mark Read
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => snoozeNotification(notif.id, 1)}
                                                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                                                        >
                                                            <Clock size={12} />
                                                            Snooze
                                                        </button>
                                                        <button
                                                            onClick={() => deleteNotification(notif.id)}
                                                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                                        >
                                                            <Trash2 size={12} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (

                            <div className="p-8 text-center">
                                <Bell className="mx-auto text-slate-600 mb-4" size={48} />
                                <p className="text-slate-400">No notifications</p>
                                <p className="text-sm text-slate-500 mt-1">You're all caught up!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
