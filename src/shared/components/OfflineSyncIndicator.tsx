import { useEffect, useSyncExternalStore } from 'react';
import { onlineManager, useMutationState } from '@tanstack/react-query';
import { CloudOff, RefreshCw } from 'lucide-react';

const subscribeOnline = (cb: () => void) => onlineManager.subscribe(cb);
const getOnline = () => onlineManager.isOnline();

/**
 * Indicador de conectividad: sin conexión, las mutaciones de TanStack Query quedan en pausa
 * y se reenvían automáticamente al reconectar. Muestra cuántos cambios esperan sincronizarse
 * y avisa antes de cerrar la pestaña si aún hay cambios sin enviar.
 */
export function OfflineSyncIndicator() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const pausedCount = useMutationState({
    filters: { status: 'pending', predicate: (m) => m.state.isPaused },
    select: (m) => m.mutationId,
  }).length;
  const pendingCount = useMutationState({
    filters: { status: 'pending' },
    select: (m) => m.mutationId,
  }).length;

  useEffect(() => {
    if (pausedCount === 0) { return; }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [pausedCount]);

  // En línea solo se muestra cuando hay una cola (p. ej. al reenviar cambios tras reconectar);
  // una única mutación en curso es el guardado normal y ya tiene su propio feedback.
  if (isOnline && pendingCount < 2) { return null; }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg"
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Sincronizando {pendingCount} cambios...
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-warning" aria-hidden="true" />
          {pausedCount > 0
            ? `Sin conexión · ${pausedCount} ${pausedCount === 1 ? 'cambio pendiente' : 'cambios pendientes'} de sincronizar`
            : 'Sin conexión · los cambios se guardarán al reconectar'}
        </>
      )}
    </div>
  );
}
