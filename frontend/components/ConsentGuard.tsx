import { useEffect, useState } from 'react';
import DataPrivacyConsent from './DataPrivacyConsent';
import { useToast } from './Toast';

interface ConsentGuardProps {
    userId: string;
    onConsentAccepted?: () => void;
}

/**
 * ConsentGuard Component
 * 
 * Checks if user needs to accept consent and shows the modal if needed.
 * Used in dashboards to ensure all users have accepted data privacy consent.
 */
export default function ConsentGuard({ userId, onConsentAccepted }: ConsentGuardProps) {
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [checking, setChecking] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        checkConsent();
    }, [userId]);

    const checkConsent = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await fetch(`${API_URL}/api/consent/check/${userId}`);

            if (!response.ok) {
                console.error('[ConsentGuard] API error:', response.status, response.statusText);
                return;
            }

            const data = await response.json();
            if (data.needsConsent) {
                setShowConsentModal(true);
            }
        } catch (error) {
            console.error('[ConsentGuard] Failed to check consent:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleAcceptConsent = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            const response = await fetch(`${API_URL}/api/consent/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    consentType: 'registration',
                    consentGiven: true,
                    consentText: 'I agree to the Data Privacy Policy and consent to biometric data collection',
                    consentVersion: '1.0'
                })
            });

            if (response.ok) {
                setShowConsentModal(false);
                showToast('Protocol Synchronized', 'Data Privacy Policy accepted successfully', 'success', 6000);
                if (onConsentAccepted) onConsentAccepted();
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[ConsentGuard] Failed to record consent:', errorData);
                showToast('Action Required', 'Failed to save consent. Please try again or contact support.', 'error', 6000);
            }
        } catch (error) {
            console.error('[ConsentGuard] Error recording consent:', error);
            showToast('System Error', 'An error occurred while saving your consent. Please try again.', 'error', 6000);
        }
    };

    // Don't render anything while checking
    if (checking) {
        return null;
    }

    return (
        <DataPrivacyConsent
            isOpen={showConsentModal}
            onClose={() => {
                // Don't allow closing without accepting
                showToast('Access Denied', 'You must accept the Data Privacy Policy to continue using the system.', 'error');
            }}
            onAccept={handleAcceptConsent}
        />
    );
}
