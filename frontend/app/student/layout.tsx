import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        template: '%s | Student Portal',
        default: 'Student Portal',
    },
    description: 'LabFace Student Dashboard',
};

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
