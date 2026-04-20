import type { Metadata } from 'next';

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
        <div className="relative min-h-screen bg-identity-navy selection:bg-identity-sky/20 selection:text-white">
            {children}
        </div>
    );
}

