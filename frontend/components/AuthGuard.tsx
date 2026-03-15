"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '../utils/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            router.push('/login');
            return;
        }

        if (allowedRoles) {
            if (!allowedRoles.includes(user.role)) {
                router.push('/'); // Or unauthorized page
                return;
            }
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAuthorized(true);
    }, [router, allowedRoles]);

    if (!authorized) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return <>{children}</>;
}
