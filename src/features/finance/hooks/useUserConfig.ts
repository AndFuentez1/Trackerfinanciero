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
  email?: string;
  [key: string]: any; // Catch all other columns from DB
}

export function useUserConfig(userId: string | undefined, userEmail?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['user_config', userId];

  const { data: config = { hide_incomplete_alert: false, keep_session_alive: true }, isFetched: loaded } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return { hide_incomplete_alert: false, keep_session_alive: true };
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
        };
      }
      return { hide_incomplete_alert: false, keep_session_alive: true };
    },
    enabled: !!userId,
    staleTime: Infinity, // Configuration is strictly user-driven, rarely changes externally during session
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<UserConfigRow>) => {
      if (!userId) throw new Error('No user ID');

      // Get current from cache to ensure full payload
      const current = queryClient.getQueryData<UserConfigRow>(queryKey) || config;
      const nextState = { ...current, ...updates };
      const payload: any = { id: userId, ...nextState };

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
      if (previousConfig) {
        queryClient.setQueryData<UserConfigRow>(queryKey, {
          ...previousConfig,
          ...updates,
        });
      } else {
        queryClient.setQueryData<UserConfigRow>(queryKey, {
          hide_incomplete_alert: false,
          keep_session_alive: true,
          ...updates,
        });
      }

      return { previousConfig };
    },
    onError: (err, newTodo, context) => {
      // If the mutation fails, roll back
      console.error('Failed to update user config in database', err);
      if (context?.previousConfig) {
        queryClient.setQueryData(queryKey, context.previousConfig);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateConfig = useCallback(
    (updates: Partial<UserConfigRow>) => {
      return mutation.mutateAsync(updates);
    },
    [mutation]
  );

  return { config, updateConfig, loaded };
}
