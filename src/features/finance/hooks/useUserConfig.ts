/**
 * useUserConfig
 *
 * Persists user-specific flags (alert dismissal, keep alive) in the existing
 * `user_configs` table (Supabase). This table has one row per user.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UserConfigRow {
  hide_incomplete_alert: boolean;
  keep_session_alive: boolean;
  /** Map of currency code → usage count. Used to sort the currency selector by frequency. */
  currency_usage: Record<string, number>;
  /** Whether the "Add a password?" dialog has been shown to this user (cross-device). */
  password_dialog_shown: boolean;
  email?: string;
  [key: string]: unknown; // Catch all other columns from DB
}

export function useUserConfig(userId: string | undefined, userEmail?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['user_config', userId];

  const DEFAULT_CONFIG: UserConfigRow = {
    hide_incomplete_alert: false,
    keep_session_alive: true,
    currency_usage: {},
    password_dialog_shown: false,
  };

  const { data: config = DEFAULT_CONFIG, isFetched: loaded } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) {
        return DEFAULT_CONFIG;
      }
      const { data, error } = await supabase
        .from('user_configs')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          ...data,
          hide_incomplete_alert: !!data.hide_incomplete_alert,
          keep_session_alive: data.keep_session_alive !== false,
          currency_usage: (data.currency_usage as Record<string, number>) ?? {},
          password_dialog_shown: data.password_dialog_shown === true,
        } satisfies UserConfigRow;
      }
      return DEFAULT_CONFIG;
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity, // Never evict from cache while user is in session
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<UserConfigRow>) => {
      if (!userId) {
        throw new Error('No user ID');
      }

      // Get current from cache to ensure full payload
      const current = queryClient.getQueryData<UserConfigRow>(queryKey) || config;
      const nextState = { ...current, ...updates };
      const payload: Record<string, unknown> = { id: userId, ...nextState };

      if (userEmail) {
        payload.email = userEmail;
      }

      const { error } = await supabase.from('user_configs').upsert(
        payload,
        { onConflict: 'id' }
      );

      if (error) throw error;
      return nextState;
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<UserConfigRow>(queryKey);

      // Optimistically update to the new value
      const base = previousConfig ?? DEFAULT_CONFIG;
      queryClient.setQueryData<UserConfigRow>(queryKey, {
        ...base,
        ...updates,
      });

      return { previousConfig };
    },
    onError: (err, _updates, context) => {
      // If the mutation fails, roll back the optimistic update
      console.error('Failed to update user config in database', err);
      if (context?.previousConfig) {
        queryClient.setQueryData(queryKey, context.previousConfig);
      }
    },
    // NOTE: No onSettled invalidation — the optimistic update in onMutate is the source
    // of truth. Invalidating would race with the upsert and could reset state to the old value.
  });

  const updateConfig = useCallback(
    (updates: Partial<UserConfigRow>) => {
      return mutation.mutateAsync(updates);
    },
    [mutation]
  );

  return { config, updateConfig, loaded };
}
