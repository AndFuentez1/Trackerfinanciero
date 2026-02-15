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
    hasEmail?: boolean;
}

export async function fetchUserConfigStatus(userId: string): Promise<ConfigStatus> {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/user/config/status?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {throw new Error('Failed to fetch config');}
    return await response.json() as ConfigStatus;
}

export function useUserConfigStatus(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.user.config(userId ?? 'unknown'),
        queryFn: () => fetchUserConfigStatus(userId as string),
        enabled: !!userId,
        staleTime: Infinity,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
    });
}
