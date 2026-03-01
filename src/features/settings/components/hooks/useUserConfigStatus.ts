import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import { getBackendUrl } from '@/core/api/backend';

export interface ConfigStatus {
    gmailConnected: boolean;
    geminiConfigured: boolean;
    telegramConfigured: boolean;
    telegramVerified?: boolean;
    gmailConnectedAt?: string;
    geminiConfiguredAt?: string;
    telegramConfiguredAt?: string;
    telegramVerifiedAt?: string;
    notifyRulesExceptions?: boolean;
    notifyAiExceptions?: boolean;
    cashflowUseRealBalance?: boolean;
    hideIncompleteAlert?: boolean;
    keepSessionAlive?: boolean;
    hasEmail?: boolean;
    requiresReauth?: boolean;
}

const CONFIG_TIMEOUT_MS = 15_000; // 15 seconds max — UI must show a state within this time

export async function fetchUserConfigStatus(userId: string): Promise<ConfigStatus> {
    const backendUrl = getBackendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);

    try {
        const response = await fetch(
            `${backendUrl}/api/user/config/status?userId=${encodeURIComponent(userId)}`,
            { signal: controller.signal }
        );
        if (!response.ok) { throw new Error('Failed to fetch config'); }
        return await response.json() as ConfigStatus;
    } finally {
        clearTimeout(timeoutId);
    }
}

export function useUserConfigStatus(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.user.config(userId ?? 'unknown'),
        queryFn: () => fetchUserConfigStatus(userId as string),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,      // 5 min — recheck after navigation
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,                        // 1 retry only → total max = 2 × 15s = 30s before showing error/state
        retryDelay: 0,                   // retry immediately — no exponential backoff
    });
}
