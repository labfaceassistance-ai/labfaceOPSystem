"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
    href?: string;
    onClick?: () => void;
    label?: string;
    className?: string;
    showChevron?: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({
    href,
    onClick,
    label = "BACK",
    className = "",
    showChevron = true
}) => {
    const router = useRouter();

    const baseStyles = "text-[10px] font-black uppercase tracking-[0.4em] font-outfit flex items-center justify-center min-h-[44px] min-w-[44px] gap-4 transition-all group select-none";
    const colorStyles = "text-slate-400 hover:text-[#041C3C]";
    
    const content = (
        <>
            {showChevron && (
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform text-[#5CB4E4]" />
            )}
            <span>{label}</span>
        </>
    );

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.preventDefault();
            onClick();
        } else if (!href) {
            e.preventDefault();
            router.back();
        }
    };

    if (href && !onClick) {
        return (
            <Link href={href} className={`${baseStyles} ${colorStyles} ${className}`}>
                {content}
            </Link>
        );
    }

    return (
        <button 
            type="button" 
            onClick={handleClick} 
            className={`${baseStyles} ${colorStyles} ${className}`}
        >
            {content}
        </button>
    );
};

export default BackButton;
