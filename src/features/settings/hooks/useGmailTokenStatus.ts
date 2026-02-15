import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface GmailTokenStatus {
    connected: boolean;
    hasRefreshToken: boolean;
    expiryDate: string | null;
    expiresIn: number | null;
    isExpired: boolean;
    requiresReauth: boolean;
}

export function useGmailTokenStatus() {
    const { user } = useAuth();
    const [status, setStatus] = useState<GmailTokenStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setStatus(null);
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const response = await fetch(`/api/user/config/gmail/status?userId=${user.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch Gmail status');
                }
                const data = await response.json();
                setStatus(data);
            } catch (error) {
                console.error('Error fetching Gmail token status:', error);
                setStatus(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        // Poll every 5 minutes
        const interval = setInterval(fetchStatus, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user?.id]);

    return { status, loading };
}
