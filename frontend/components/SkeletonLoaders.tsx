/**
 * Skeleton Loader Components
 * Provides visual feedback while content is loading
 */

import React from 'react';

// Base Skeleton Component
export const Skeleton = ({ className = '', width = 'w-full', height = 'h-4' }: {
    className?: string;
    width?: string;
    height?: string;
}) => (
    <div className={`${width} ${height} bg-slate-800 rounded animate-pulse ${className}`} />
);

// Card Skeleton
export const CardSkeleton = () => (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <div className="flex items-center gap-4 mb-4">
            <Skeleton width="w-12" height="h-12" className="rounded-full" />
            <div className="flex-1">
                <Skeleton width="w-32" height="h-4" className="mb-2" />
                <Skeleton width="w-48" height="h-3" />
            </div>
        </div>
        <Skeleton width="w-full" height="h-20" className="mb-3" />
        <div className="flex gap-2">
            <Skeleton width="w-20" height="h-8" className="rounded-md" />
            <Skeleton width="w-20" height="h-8" className="rounded-md" />
        </div>
    </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
            <div className="flex gap-4">
                <Skeleton width="w-32" height="h-4" />
                <Skeleton width="w-32" height="h-4" />
                <Skeleton width="w-32" height="h-4" />
                <Skeleton width="w-32" height="h-4" />
            </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 border-b border-slate-800 last:border-0">
                <div className="flex gap-4 items-center">
                    <Skeleton width="w-10" height="h-10" className="rounded-full" />
                    <Skeleton width="w-32" height="h-4" />
                    <Skeleton width="w-24" height="h-4" />
                    <Skeleton width="w-40" height="h-4" />
                    <Skeleton width="w-20" height="h-6" className="rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

// Dashboard Skeleton
export const DashboardSkeleton = () => (
    <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                    <Skeleton width="w-16" height="h-4" className="mb-2" />
                    <Skeleton width="w-24" height="h-8" className="mb-1" />
                    <Skeleton width="w-32" height="h-3" />
                </div>
            ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <CardSkeleton />
            </div>
            <div>
                <CardSkeleton />
            </div>
        </div>

        {/* Table */}
        <TableSkeleton rows={5} />
    </div>
);

// Profile Skeleton
export const ProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900 rounded-lg p-8 border border-slate-800">
            <div className="flex items-center gap-6 mb-6">
                <Skeleton width="w-24" height="h-24" className="rounded-full" />
                <div className="flex-1">
                    <Skeleton width="w-48" height="h-6" className="mb-2" />
                    <Skeleton width="w-64" height="h-4" className="mb-2" />
                    <Skeleton width="w-32" height="h-4" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton width="w-24" height="h-3" className="mb-2" />
                        <Skeleton width="w-full" height="h-10" className="rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
    <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center gap-4">
                    <Skeleton width="w-12" height="h-12" className="rounded-full" />
                    <div className="flex-1">
                        <Skeleton width="w-48" height="h-4" className="mb-2" />
                        <Skeleton width="w-64" height="h-3" />
                    </div>
                    <Skeleton width="w-20" height="h-8" className="rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

// Chart Skeleton
export const ChartSkeleton = () => (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <Skeleton width="w-48" height="h-6" className="mb-6" />
        <div className="flex items-end gap-2 h-64">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                    key={i}
                    width="flex-1"
                    height={`h-${Math.floor(Math.random() * 48) + 16}`}
                    className="rounded-t"
                />
            ))}
        </div>
        <div className="flex justify-between mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} width="w-12" height="h-3" />
            ))}
        </div>
    </div>
);

export default {
    Skeleton,
    CardSkeleton,
    TableSkeleton,
    DashboardSkeleton,
    ProfileSkeleton,
    ListSkeleton,
    ChartSkeleton
};
