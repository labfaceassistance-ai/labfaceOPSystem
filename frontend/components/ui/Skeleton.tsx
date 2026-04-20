import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle' | 'card' | 'table-row' | 'chart';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect', width, height }) => {
    const baseClass = 'animate-pulse bg-slate-200 rounded';
    const style = { width, height };

    switch (variant) {
        case 'text':
            return <div className={`${baseClass} h-4 w-full mb-2 ${className}`} style={style} />;
        case 'circle':
            return <div className={`${baseClass} rounded-full ${className}`} style={style} />;
        case 'card':
            return (
                <div className={`identity-glass rounded-[2rem] border border-identity-sky/10 p-8 shadow-lg ${className}`} style={style}>
                    <div className={`${baseClass} h-8 w-1/3 mb-6 rounded-xl`} />
                    <div className={`${baseClass} h-32 w-full mb-6 rounded-2xl`} />
                    <div className="flex gap-4">
                        <div className={`${baseClass} h-10 w-24 rounded-lg`} />
                        <div className={`${baseClass} h-10 w-24 rounded-lg`} />
                    </div>
                </div>
            );
        case 'table-row':
            return (
                <div className={`p-6 flex items-center justify-between border-b border-slate-100 ${className}`} style={style}>
                    <div className="flex items-center gap-6">
                        <div className={`${baseClass} w-12 h-12 rounded-2xl`} />
                        <div className="space-y-2">
                            <div className={`${baseClass} h-4 w-32 rounded`} />
                            <div className={`${baseClass} h-3 w-24 rounded`} />
                        </div>
                    </div>
                    <div className={`${baseClass} h-8 w-20 rounded-full`} />
                </div>
            );
        case 'chart':
            return (
                <div className={`w-full bg-slate-50/50 rounded-[2rem] border border-slate-100 p-8 flex flex-col justify-end gap-4 ${className}`} style={{ ...style, height: height || '300px' }}>
                    <div className="flex items-end gap-4 h-full">
                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                            <div key={i} className={`${baseClass} flex-1 rounded-t-lg`} style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="flex justify-between mt-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className={`${baseClass} h-3 w-8 rounded`} />
                        ))}
                    </div>
                </div>
            );
        default:
            return <div className={`${baseClass} ${className}`} style={style} />;
    }
};

export default Skeleton;
