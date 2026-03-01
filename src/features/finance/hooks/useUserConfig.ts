/**
 * useUserConfig
 *
 * Persists user-specific flags (alert dismissal, keep alive) in the existing
 * `user_configs` table (Supabase). This table has one row per user.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserConfigRow {
  hide_incomplete_alert: boolean;
  keep_session_alive: boolean;
  // Add other columns from user_configs as needed
}

export function useUserConfig(userId: string | undefined) {
  const [config, setConfig] = useState<UserConfigRow>({
    hide_incomplete_alert: false,
    keep_session_alive: true,
  });
  const [loaded, setLoaded] = useState(false);

  // Load config for this user once on mount
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    const localKey = `user_config_${userId}`;
    const localData = localStorage.getItem(localKey);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) { }
    }

    supabase
      .from('user_configs')
      .select('hide_incomplete_alert, keep_session_alive')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setConfig({
            hide_incomplete_alert: !!data.hide_incomplete_alert,
            keep_session_alive: data.keep_session_alive !== false, // default true
          });
          localStorage.setItem(localKey, JSON.stringify(data));
        }
        setLoaded(true);
      });
  }, [userId]);

  /** Updates a config column in user_configs */
  const updateConfig = useCallback(
    async (updates: Partial<UserConfigRow>) => {
      // Optimistic local update
      setConfig(prev => {
        const next = { ...prev, ...updates };
        if (userId) localStorage.setItem(`user_config_${userId}`, JSON.stringify(next));
        return next;
      });

      if (!userId) return;
      await supabase.from('user_configs').upsert(
        { id: userId, ...updates },
        { onConflict: 'id' }
      ).catch(() => { });
    },
    [userId]
  );

  return { config, updateConfig, loaded };
}
