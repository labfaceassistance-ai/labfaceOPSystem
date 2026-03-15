import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to LabFace',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
