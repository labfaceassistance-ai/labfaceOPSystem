import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        template: '%s | Admin Portal',
        default: 'Admin Portal',
    },
    description: 'LabFace Administration Dashboard',
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
