import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ConsentRecord {
    id: number;
    consent_type: 'registration' | 'cctv' | 'data_processing';
    consent_given: boolean;
    consent_version: string;
    timestamp: string;
    withdrawn_at: string | null;
}

export interface ConsentStatus {
    consents: ConsentRecord[];
    userStatus: {
        consent_status: 'pending' | 'given' | 'withdrawn';
        privacy_policy_accepted: boolean;
        privacy_policy_version: string | null;
        privacy_policy_accepted_at: string | null;
    };
}

export function useConsent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getConsentStatus = async (userId: string): Promise<ConsentStatus | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/consent/status/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch consent status');
            const data = await response.json();
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const recordConsent = async (
        userId: string,
        consentType: 'registration' | 'cctv' | 'data_processing',
        consentGiven: boolean,
        consentText: string,
        consentVersion: string = '1.0'
    ): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/consent/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    consentType,
                    consentGiven,
                    consentText,
                    consentVersion
                })
            });

            if (!response.ok) throw new Error('Failed to record consent');
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const withdrawConsent = async (
        userId: string,
        consentType: 'registration' | 'cctv' | 'data_processing',
        reason: string
    ): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/consent/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    consentType,
                    reason
                })
            });

            if (!response.ok) throw new Error('Failed to withdraw consent');
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getConsentHistory = async (userId: string): Promise<ConsentRecord[] | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/consent/history/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch consent history');
            const data = await response.json();
            return data.history;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        getConsentStatus,
        recordConsent,
        withdrawConsent,
        getConsentHistory
    };
}
