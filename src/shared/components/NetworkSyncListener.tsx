import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';

/**
 * Tras recuperar conectividad, invalida caches de datos financieros para evitar
 * UI coherente con servidor tras fallos de red o datos obsoletos en memoria.
 */
export function NetworkSyncListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onOnline = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.savings.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [queryClient]);

  return null;
}
