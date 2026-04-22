import type { Metadata } from 'next';
import IdentityBackground from '@/components/IdentityBackground';

export const metadata: Metadata = {
    title: {
        template: '%s | Professor Portal',
        default: 'Professor Portal',
    },
    description: 'LabFace Professor Dashboard',
};

export default function ProfessorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen selection:bg-[#5CB4E4]/30 selection:text-[#041C3C]">
            <IdentityBackground />
            <div className="relative z-10 w-full min-h-screen">
                {children}
            </div>
        </div>
    );
}

