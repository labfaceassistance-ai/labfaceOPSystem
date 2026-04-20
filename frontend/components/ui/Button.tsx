import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Button: React.FC<ButtonProps> = ({
    children,
    isLoading,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'relative flex items-center justify-center font-black uppercase tracking-[0.15em] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';
    
    const variants = {
        primary: 'bg-identity-navy text-white hover:bg-identity-navy/90 shadow-lg shadow-identity-navy/10',
        secondary: 'bg-identity-sky text-white hover:bg-identity-sky/90 shadow-lg shadow-identity-sky/10',
        danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/10',
        ghost: 'bg-transparent text-identity-navy hover:bg-identity-navy/5',
        outline: 'bg-transparent text-identity-navy border-2 border-identity-navy/20 hover:border-identity-navy/50'
    };

    const sizes = {
        sm: 'px-4 py-2 text-[8px] rounded-xl',
        md: 'px-6 py-3 text-[10px] rounded-xl',
        lg: 'px-8 py-4 text-[11px] rounded-2xl',
        xl: 'px-10 py-5 text-[12px] rounded-3xl'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>LOADING...</span>
                </span>
            ) : (
                children
            )}
            
            {/* Smooth hover overlay */}
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
    );
};

export default Button;
