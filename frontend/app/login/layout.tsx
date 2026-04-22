import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to LabFace',
};

import IdentityBackground from '@/components/IdentityBackground';

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen">
            <IdentityBackground />
            {children}
        </div>
    );
}
