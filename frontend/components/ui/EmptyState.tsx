import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    iconName?: keyof typeof LucideIcons;
    icon?: LucideIcon;
    title?: string;
    heading?: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
    iconName, 
    icon: IconProp, 
    title, 
    heading, 
    description, 
    action, 
    className = '' 
}) => {
    // Resolve icon: Prop > iconName > Fallback
    const NamedIcon = iconName ? (LucideIcons[iconName] as LucideIcon) : null;
    const Icon = IconProp || NamedIcon;
    
    // Resolve title: title > heading > Fallback
    const displayTitle = title || heading || 'No Data Found';

    return (
        <div className={`flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 ${className}`}>
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-identity-sky/5 border border-identity-sky/10 mb-8 animate-bounce-in">
                {Icon && <Icon size={48} className="text-identity-sky" strokeWidth={1.5} />}
            </div>
            <h3 className="text-2xl font-black text-identity-navy uppercase tracking-tighter italic mb-4">
                {displayTitle}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-sm leading-relaxed mb-10">
                {description}
            </p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-10 py-5 bg-identity-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-identity-navy/20 hover:bg-identity-sky transition-all hover:scale-[1.05] active:scale-95"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
