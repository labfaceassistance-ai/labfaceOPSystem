/**
 * Bulk Actions Component for Admin
 * Multi-select and bulk operations on users
 */

import { useState } from 'react';
import { Check, Download, CheckCircle, XCircle, Eye, Users } from 'lucide-react';
import axios from 'axios';
import { getToken } from '../utils/auth';
import ConfirmModal from './ConfirmModal';

interface User {
    id: string;
    student_id?: string;
    professor_id?: string;
    name: string;
    email: string;
    role: string;
    approval_status: string;
}

interface BulkActionsProps {
    users: User[];
    onRefresh: () => void;
    onView: (userId: string) => void;
}

export default function BulkActions({ users, onRefresh, onView }: BulkActionsProps) {
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    const toggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const selectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const executeBulkApprove = async () => {
        setIsProcessing(true);
        setProgress({ current: 0, total: selectedUsers.size });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        for (const userId of Array.from(selectedUsers)) {
            try {
                await axios.post(
                    `${API_URL}/api/admin/users/${userId}/approve`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${getToken()}`
                        }
                    }
                );
            } catch (error) {
                console.error(`Failed to approve user ${userId}:`, error);
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsProcessing(false);
        setSelectedUsers(new Set());
        onRefresh();
    };

    const bulkApprove = () => {
        if (selectedUsers.size === 0) return;
        setConfirmModal({
            isOpen: true,
            title: 'Authorize Collective',
            message: `Verify and approve ${selectedUsers.size} nodes within the system?`,
            type: 'success',
            onConfirm: executeBulkApprove
        });
    };

    const executeBulkReject = async (reason: string) => {
        setIsProcessing(true);
        setProgress({ current: 0, total: selectedUsers.size });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        for (const userId of Array.from(selectedUsers)) {
            try {
                await axios.post(
                    `${API_URL}/api/admin/users/${userId}/reject`,
                    { reason },
                    {
                        headers: {
                            Authorization: `Bearer ${getToken()}`
                        }
                    }
                );
            } catch (error) {
                console.error(`Failed to reject user ${userId}:`, error);
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsProcessing(false);
        setSelectedUsers(new Set());
        onRefresh();
    };

    const bulkReject = () => {
        if (selectedUsers.size === 0) return;
        const reason = prompt('State rejection rationale (applies to all selected nodes):');
        if (!reason) return;

        setConfirmModal({
            isOpen: true,
            title: 'Revoke Permissions',
            message: `Permanently reject ${selectedUsers.size} nodes from system access?`,
            type: 'danger',
            onConfirm: () => executeBulkReject(reason)
        });
    };

    const bulkExport = () => {
        const selectedData = users.filter(u => selectedUsers.has(u.id));
        const csv = [
            ['ID', 'Name', 'Email', 'Role', 'Status'].join(','),
            ...selectedData.map(u => [
                u.student_id || u.professor_id || '',
                u.name,
                u.email,
                u.role,
                u.approval_status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registry_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="font-outfit">
            {/* Selection Bar */}
            <div className="identity-glass p-6 rounded-2xl md:rounded-3xl border border-identity-sky/10 mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={selectAll}
                            className="bg-identity-navy hover:bg-identity-sky text-white px-6 py-3 rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 shadow-lg shadow-identity-navy/10 active:scale-95 italic"
                        >
                            <Check size={16} />
                            {selectedUsers.size === users.length ? 'Deselect Collective' : 'Select Collective'}
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-identity-sky animate-pulse shadow-[0_0_8px_rgba(92,180,228,0.5)]" />
                            <span className="text-identity-navy font-black text-xs uppercase tracking-[0.15em] italic">
                                {selectedUsers.size} Nodes Targeted
                            </span>
                        </div>
                    </div>

                    {selectedUsers.size > 0 && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={bulkApprove}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-identity-sky hover:bg-identity-navy text-white rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-identity-sky/10 active:scale-95 italic"
                            >
                                <CheckCircle size={16} />
                                Authorize
                            </button>
                            <button
                                onClick={bulkReject}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-rose-900/10 active:scale-95 italic"
                            >
                                <XCircle size={16} />
                                Revoke
                            </button>
                            <button
                                onClick={bulkExport}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-white border border-identity-sky/20 text-identity-navy hover:bg-identity-sky hover:text-white rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 italic"
                            >
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="identity-glass border border-identity-sky/10 rounded-2xl p-8 mb-8 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-identity-navy font-black uppercase tracking-[0.2em] text-[10px] italic">Operation Sequencing...</span>
                        <span className="text-identity-sky font-black uppercase tracking-[0.2em] text-[10px]">
                            {progress.current} / {progress.total} NODES
                        </span>
                    </div>
                    <div className="w-full bg-identity-sky/5 rounded-full h-3 border border-identity-sky/10">
                        <div
                            className="bg-identity-sky h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(92,180,228,0.4)]"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* User List with Checkboxes */}
            <div className="space-y-4">
                {users.map(user => (
                    <div
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`identity-glass border rounded-[2rem] p-6 transition-all cursor-pointer group hover:scale-[1.01] active:scale-100 ${selectedUsers.has(user.id)
                            ? 'border-identity-sky bg-identity-sky/5 shadow-identity-sky/5'
                            : 'border-identity-sky/5 hover:border-identity-sky/20'
                            }`}
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.has(user.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        toggleUser(user.id);
                                    }}
                                    className="w-6 h-6 text-identity-sky bg-white border-identity-sky/20 rounded-lg focus:ring-identity-sky cursor-pointer appearance-none checked:bg-identity-sky checked:border-transparent transition-all border-2"
                                />
                                {selectedUsers.has(user.id) && <Check size={14} className="absolute text-white pointer-events-none" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-identity-navy font-black uppercase tracking-tight italic">{user.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">
                                    {user.student_id || user.professor_id} • {user.email}
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${user.approval_status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : user.approval_status === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    }`}>
                                    {user.approval_status}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onView(user.id);
                                    }}
                                    className="p-3 bg-white border border-identity-sky/10 rounded-2xl text-identity-sky hover:bg-identity-navy hover:text-white transition-all shadow-sm active:scale-90"
                                    title="View Details"
                                >
                                    <Eye size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
}

