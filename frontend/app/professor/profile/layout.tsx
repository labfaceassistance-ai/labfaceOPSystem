import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Profile',
    description: 'Manage professor profile and settings.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
