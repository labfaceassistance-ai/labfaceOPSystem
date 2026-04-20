"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
    const pathname = usePathname();
    
    // Don't show breadcrumbs on landing page
    if (pathname === '/') return null;

    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    
    // Generate breadcrumbs recursively
    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        return { href, label };
    });

    return (
        <nav className="flex mb-8 animate-in fade-in slide-in-from-left-4 duration-500" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
                <li>
                    <Link 
                        href="/" 
                        className="text-identity-navy/40 hover:text-identity-sky transition-colors p-1 rounded-lg"
                    >
                        <Home size={14} />
                    </Link>
                </li>
                
                {breadcrumbs.map((breadcrumb, index) => (
                    <li key={breadcrumb.href} className="flex items-center space-x-2">
                        <ChevronRight size={14} className="text-identity-navy/20" />
                        {index === breadcrumbs.length - 1 ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-identity-sky bg-identity-sky/5 px-3 py-1 rounded-full border border-identity-sky/10">
                                {breadcrumb.label}
                            </span>
                        ) : (
                            <Link 
                                href={breadcrumb.href}
                                className="text-[10px] font-black uppercase tracking-[0.15em] text-identity-navy/40 hover:text-identity-navy transition-colors px-2 py-1"
                            >
                                {breadcrumb.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
