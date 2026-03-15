import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Profile',
    description: 'Manage admin profile settings and security.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
