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

        const NORMAL_INTERVAL = 5 * 60 * 1000; // 5 min
        const BACKOFF_STEPS = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m
        let failCount = 0;
        let timeoutId: ReturnType<typeof setTimeout>;

        const schedule = (delay: number) => {
            timeoutId = setTimeout(fetchStatus, delay);
        };

        const fetchStatus = async () => {
            try {
                const response = await fetch(`/api/user/config/gmail/status?userId=${user.id}`);
                if (!response.ok) { throw new Error('Failed to fetch Gmail status'); }
                const data = await response.json();
                setStatus(data);
                failCount = 0;               // backend volvió — resetear backoff
                schedule(NORMAL_INTERVAL);
            } catch (error) {
                if (error instanceof TypeError) {
                    // Error de red: backend no disponible — backoff silencioso
                    const delay = BACKOFF_STEPS[Math.min(failCount, BACKOFF_STEPS.length - 1)];
                    failCount++;
                    schedule(delay);
                } else {
                    console.error('Error fetching Gmail token status:', error);
                    schedule(NORMAL_INTERVAL);
                }
                setStatus(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        return () => clearTimeout(timeoutId);
    }, [user?.id]);

    return { status, loading };
}
