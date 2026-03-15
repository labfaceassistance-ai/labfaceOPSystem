"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Activity {
    className: string;
    status: string;
    date: string;
    timeIn: string;
    timeOut: string | null;
    timestamp: string;
}

interface ActivityTimelineProps {
    studentId: number;
    limit?: number;
}

export default function ActivityTimeline({ studentId, limit = 10 }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, [studentId]);

    const fetchActivities = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await axios.get(
                `${API_URL}/api/student/recent-activity/${studentId}?limit=${limit}`
            );
            setActivities(response.data);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center p-8 text-slate-400">
                <Clock size={48} className="mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                        <StatusIcon status={activity.status} />
                        {idx < activities.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-700 mt-2" />
                        )}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 pb-6">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-white">{activity.className}</h4>
                                <StatusBadge status={activity.status} />
                            </div>
                            <div className="text-sm text-slate-400 space-y-1">
                                <p className="flex items-center gap-2">
                                    <Clock size={14} />
                                    {formatDate(activity.timestamp)}
                                </p>
                                {activity.timeOut && (
                                    <p className="text-xs">
                                        Duration: {calculateDuration(activity.timeIn, activity.timeOut)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    const icons = {
        'Present': <CheckCircle size={20} className="text-green-400" />,
        'Late': <AlertCircle size={20} className="text-yellow-400" />,
        'Absent': <XCircle size={20} className="text-red-400" />
    };

    return (
        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
            {icons[status as keyof typeof icons] || icons['Absent']}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        'Present': 'bg-green-500/20 text-green-400 border-green-500/30',
        'Late': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'Absent': 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
            {status}
        </span>
    );
}

function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function calculateDuration(timeIn: string, timeOut: string): string {
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}
