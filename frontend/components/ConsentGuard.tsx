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
            console.log(`[ConsentGuard] Checking for UserID: ${userId} (${typeof userId})`);

            console.log('[ConsentGuard] API URL:', API_URL);

            const url = `${API_URL}/api/consent/check/${userId}`;
            console.log('[ConsentGuard] Fetching:', url);

            const response = await fetch(url);
            console.log('[ConsentGuard] Response status:', response.status);

            if (!response.ok) {
                console.error('[ConsentGuard] API returned error:', response.status, response.statusText);
                return;
            }

            const data = await response.json();
            console.log('[ConsentGuard] Response data:', data);

            if (data.needsConsent) {
                console.log('[ConsentGuard] User needs to accept consent:', data.reason);
                setShowConsentModal(true);
            } else {
                console.log('[ConsentGuard] User has already accepted consent');
            }
        } catch (error) {
            console.error('[ConsentGuard] Failed to check consent:', error);
            // Don't block user if check fails
        } finally {
            setChecking(false);
        }
    };

    const handleAcceptConsent = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

            // Record the consent
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
                const result = await response.json();
                console.log('[ConsentGuard] Consent recorded successfully:', result);
                setShowConsentModal(false);
                setShowConsentModal(false);
                showToast('Data Privacy Policy accepted successfully', 'success', 6000);
                if (onConsentAccepted) {
                    onConsentAccepted();
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[ConsentGuard] Failed to record consent:', errorData);
                console.error('[ConsentGuard] Failed to record consent:', errorData);
                showToast('Failed to save consent. Please try again or contact support.', 'error', 6000);
            }
        } catch (error) {
            console.error('[ConsentGuard] Error recording consent:', error);
            console.error('[ConsentGuard] Error recording consent:', error);
            showToast('An error occurred while saving your consent. Please try again.', 'error', 6000);
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
                showToast('You must accept the Data Privacy Policy to continue using the system.', 'error');
            }}
            onAccept={handleAcceptConsent}
        />
    );
}
