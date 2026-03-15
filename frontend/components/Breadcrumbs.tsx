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
        <nav className="flex items-center space-x-2 text-sm mb-6">
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isFirst = index === 0;

                return (
                    <div key={crumb.href} className="flex items-center">
                        {index > 0 && (
                            <ChevronRight size={16} className="text-slate-600 mx-2" />
                        )}
                        {isLast ? (
                            <span className="text-white font-medium flex items-center gap-2">
                                {isFirst && <Home size={16} />}
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                {isFirst && <Home size={16} />}
                                {crumb.label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
