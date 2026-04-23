/**
 * Enhanced Notification Center - Identity Blue Migration
 * Categorized, snooze-able notifications with quick actions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle, AlertCircle, Info, Clock, X, Trash2, Check, ShieldAlert, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { getToken, getUser } from '../utils/auth';

interface Notification {
    id: number;
    type: 'success' | 'error' | 'info' | 'warning';
    category: 'attendance' | 'class' | 'system' | 'security';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    snoozedUntil?: string;
    actionUrl?: string;
}

export default function NotificationCenter() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); 
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

    const markAsRead = async (id: number) => {
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

    const deleteNotification = async (id: number) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.delete(`${API_URL}/api/notifications/${id}/delete`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const snoozeNotification = (id: number, hours: number) => {
        const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, snoozedUntil } : n)
        );
    };

    const filteredNotifications = notifications.filter((n: Notification) => {
        // Robust filtering to handle unread/all states
        if (filter === 'unread' && n.is_read) return false;
        
        // Category filtering: Handle null/missing categories by treating them as 'system' if they don't match 'attendance'/'class'
        const effectiveCategory = n.category || 'system';
        if (categoryFilter !== 'all' && effectiveCategory !== categoryFilter) return false;
        
        // Snooze logic
        if (n.snoozedUntil && new Date(n.snoozedUntil) > new Date()) return false;
        
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'error': return AlertCircle;
            case 'warning': return ShieldAlert;
            default: return Info;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
            case 'error': return 'text-rose-500 bg-rose-50 border-rose-100';
            case 'warning': return 'text-amber-500 bg-amber-50 border-amber-100';
            default: return 'text-identity-sky bg-identity-sky/5 border-identity-sky/10';
        }
    };

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-3 rounded-xl transition-all duration-300 ${isOpen ? 'bg-identity-navy text-white shadow-xl' : 'text-slate-400 hover:text-identity-navy hover:bg-slate-100'}`}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-status-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute -right-20 md:right-0 top-16 w-[calc(100vw-2rem)] md:w-[26rem] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(4,28,60,0.15)] border border-slate-200/50 overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] md:max-h-[32rem] z-[60] animate-in slide-in-from-top-4 duration-300">
                        {/* Header */}
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter font-outfit leading-none">Notifications</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Active Updates</p>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-identity-navy transition-colors hover:bg-white rounded-2xl shadow-sm border border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-sm border ${filter === 'all'
                                        ? 'bg-identity-navy text-white border-identity-navy'
                                        : 'bg-white text-slate-400 border-slate-200 hover:text-identity-navy'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`flex-1 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-sm border ${filter === 'unread'
                                        ? 'bg-identity-navy text-white border-identity-navy'
                                        : 'bg-white text-slate-400 border-slate-200 hover:text-identity-navy'
                                        }`}
                                >
                                    Unread ({unreadCount})
                                </button>
                            </div>

                            {/* Category Filter */}
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-identity-sky font-black text-[10px] uppercase tracking-[0.15em] focus:outline-none focus:border-identity-sky/50 shadow-inner appearance-none cursor-pointer"
                            >
                                <option value="all">All Categories</option>
                                <option value="attendance">Attendance Nodes</option>
                                <option value="class">Academic Classes</option>
                                <option value="system">Core System</option>
                                <option value="security">Identity Security</option>
                            </select>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="w-full mt-4 px-4 py-3 bg-white hover:bg-slate-50 text-identity-navy rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm"
                                >
                                    <Check size={16} className="text-emerald-500" />
                                    Synchronize All
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {filteredNotifications.length > 0 ? (
                                filteredNotifications.map((notif: any) => {
                                    const Icon = getIcon(notif.type);
                                    const colorClass = getTypeColor(notif.type);

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`p-6 rounded-[2rem] border transition-all group ${!notif.is_read 
                                                ? 'bg-slate-50/50 border-slate-100' 
                                                : 'bg-white border-transparent'
                                            }`}
                                        >
                                            <div className="flex gap-5 items-start">
                                                <div className={`w-14 h-14 rounded-2xl ${colorClass} flex-shrink-0 flex items-center justify-center shadow-inner border`}>
                                                    <Icon size={28} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <h4 className="text-identity-navy font-black text-[11px] uppercase tracking-[0.15em] group-hover:text-identity-sky transition-colors line-clamp-1">{notif.title}</h4>
                                                        {!notif.is_read && (
                                                            <div className="w-2.5 h-2.5 bg-identity-sky rounded-full flex-shrink-0 mt-1 shadow-lg shadow-identity-sky/20 animate-pulse"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed mb-5 line-clamp-3">{notif.message}</p>
                                                    
                                                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em]">
                                                            {notif.created_at ? new Date(notif.created_at).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : 'Timestamp Null'}
                                                        </span>
                                                        <div className="flex gap-4">
                                                            {!notif.is_read && (
                                                                <button
                                                                    onClick={() => markAsRead(notif.id)}
                                                                    className="text-[9px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-[0.15em] transition-colors flex items-center gap-1"
                                                                >
                                                                    <Check size={12} /> Info
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => snoozeNotification(notif.id, 1)}
                                                                className="text-[9px] font-black text-slate-300 hover:text-identity-navy flex items-center gap-1.5 uppercase tracking-[0.15em] transition-colors"
                                                            >
                                                                <Clock size={12} />
                                                                Delay
                                                            </button>
                                                            <button
                                                                onClick={() => deleteNotification(notif.id)}
                                                                className="text-[9px] font-black text-rose-500 hover:text-rose-600 flex items-center gap-1.5 uppercase tracking-[0.15em] transition-colors"
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
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                        <Bell size={40} />
                                    </div>
                                    <p className="text-[11px] font-black text-identity-navy uppercase tracking-[0.4em]">No Activity Logs</p>
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mt-3">All settings saved successfully.</p>
                                </div>
                            )}
                        </div>
                        
                        {/* View All Link */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    router.push('/notifications');
                                }}
                                className="inline-flex items-center gap-3 text-[10px] font-black text-identity-navy hover:text-identity-sky uppercase tracking-[0.3em] transition-all group italic"
                            >
                                View All Activity Logs
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
