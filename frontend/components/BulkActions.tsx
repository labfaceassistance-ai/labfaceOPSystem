/**
 * Bulk Actions Component for Admin
 * Multi-select and bulk operations on users
 */

import { useState } from 'react';
import { Check, Download, CheckCircle, XCircle, Eye } from 'lucide-react'; // Removing unused imports if any, but keeping Lucide icons used
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
        let successful = 0;
        let failed = 0;

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
                successful++;
            } catch (error) {
                console.error(`Failed to approve user ${userId}:`, error);
                failed++;
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsProcessing(false);
        setSelectedUsers(new Set());
        // Alert can be replaced with a toast if available, but staying minimal for now as per instructions
        // alert(`Bulk approval complete!\nSuccessful: ${successful}\nFailed: ${failed}`);
        onRefresh();
    };

    const bulkApprove = () => {
        if (selectedUsers.size === 0) return;
        setConfirmModal({
            isOpen: true,
            title: 'Approve Users',
            message: `Are you sure you want to approve ${selectedUsers.size} users?`,
            type: 'success',
            onConfirm: executeBulkApprove
        });
    };

    const executeBulkReject = async (reason: string) => {
        setIsProcessing(true);
        setProgress({ current: 0, total: selectedUsers.size });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        let successful = 0;
        let failed = 0;

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
                successful++;
            } catch (error) {
                console.error(`Failed to reject user ${userId}:`, error);
                failed++;
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsProcessing(false);
        setSelectedUsers(new Set());
        // alert(`Bulk rejection complete!\nSuccessful: ${successful}\nFailed: ${failed}`);
        onRefresh();
    };

    const bulkReject = () => {
        if (selectedUsers.size === 0) return;
        const reason = prompt('Enter rejection reason (will apply to all selected):');
        if (!reason) return;

        setConfirmModal({
            isOpen: true,
            title: 'Reject Users',
            message: `Are you sure you want to reject ${selectedUsers.size} users with reason: "${reason}"?`,
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
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            {/* Selection Bar */}
            <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={selectAll}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Check size={18} />
                            {selectedUsers.size === users.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-white font-medium">
                            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                        </span>
                    </div>

                    {selectedUsers.size > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={bulkApprove}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle size={18} />
                                Approve Selected
                            </button>
                            <button
                                onClick={bulkReject}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircle size={18} />
                                Reject Selected
                            </button>
                            <button
                                onClick={bulkExport}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={18} />
                                Export
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">Processing...</span>
                        <span className="text-slate-400 text-sm">
                            {progress.current} / {progress.total}
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* User List with Checkboxes */}
            <div className="space-y-2">
                {users.map(user => (
                    <div
                        key={user.id}
                        className={`bg-slate-900 border rounded-lg p-4 transition-all ${selectedUsers.has(user.id)
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                checked={selectedUsers.has(user.id)}
                                onChange={() => toggleUser(user.id)}
                                className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <h4 className="text-white font-medium">{user.name}</h4>
                                <p className="text-sm text-slate-400">
                                    {user.student_id || user.professor_id} • {user.email}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.approval_status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : user.approval_status === 'approved'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {user.approval_status}
                                </span>
                                <button
                                    onClick={() => onView(user.id)}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
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
        </>
    );
}
