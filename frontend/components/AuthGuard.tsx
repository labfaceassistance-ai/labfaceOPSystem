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

        setAuthorized(true);
    }, [router, allowedRoles]);

    if (!authorized) {
        return (
            <div className="min-h-screen bg-maroon-950 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-white/5 border-t-brand-gold rounded-full animate-spin"></div>
                <div className="text-center space-y-2">
                    <h2 className="text-white font-black uppercase text-xs tracking-[0.4em]">Checking Session...</h2>
                    <p className="text-secondary/20 font-bold uppercase text-[9px] tracking-[0.3em] animate-pulse">Verifying Credentials...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
