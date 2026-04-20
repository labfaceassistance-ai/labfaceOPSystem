/**
 * Breadcrumb Navigation Component
 * Provides contextual navigation path
 */

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
    label: string;
    href: string;
}

export default function Breadcrumbs() {
    const pathname = usePathname();

    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const paths = pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

        let currentPath = '';
        paths.forEach((path, index) => {
            currentPath += `/${path}`;

            // Format label (capitalize and replace hyphens)
            const label = path
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            breadcrumbs.push({
                label,
                href: currentPath
            });
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className="flex items-center space-x-1 mb-6">
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isFirst = index === 0;

                return (
                    <div key={crumb.href} className="flex items-center">
                        {index > 0 && (
                            <ChevronRight size={14} className="text-secondary/20 mx-2" />
                        )}
                        {isLast ? (
                            <span className="text-white font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 shadow-inner">
                                {isFirst && <Home size={14} className="text-brand-gold" />}
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="text-secondary/40 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 hover:bg-white/2 rounded-lg"
                            >
                                {isFirst && <Home size={14} className="text-brand-gold/60" />}
                                {crumb.label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
