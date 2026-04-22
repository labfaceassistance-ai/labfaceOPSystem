"use client";

import { usePathname } from 'next/navigation';
import IdentityFooter from './IdentityFooter';

export default function ConditionalFooter() {
    const pathname = usePathname();
    
    // Only show footer on the landing page
    if (pathname !== '/') return null;
    
    return <IdentityFooter />;
}
