import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Database, AlertCircle, RefreshCw, ServerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isTransientQueryFailure } from '@/core/api/dbConnectionErrors';

/** Espera entre reintentos automáticos (ms). Su largo define el número de intentos. */
const RETRY_DELAYS_MS = [3_000, 5_000, 8_000, 13_000, 20_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;
const PING_TIMEOUT_MS = 8_000;

type OverlayStatus = 'hidden' | 'retrying' | 'paused';

/**
 * ¿Responde la base de datos? Un error de RLS/auth también cuenta como "responde";
 * solo red caída, timeout o 5xx cuentan como caída.
 */
async function pingDatabase(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id', { head: true })
      .limit(1)
      .abortSignal(controller.signal);
    if (controller.signal.aborted) {return false;}
    return !error || !isTransientQueryFailure(error);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const DatabaseErrorOverlay: React.FC = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OverlayStatus>('hidden');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Evita pings simultáneos y eventos repetidos mientras se confirma la caída.
  const checkingRef = useRef(false);
  const statusRef = useRef<OverlayStatus>('hidden');
  statusRef.current = status;

  const recover = useCallback(() => {
    setStatus('hidden');
    setAttemptCount(0);
    void queryClient.invalidateQueries();
  }, [queryClient]);

  /** Hace un ping; si responde, cierra el aviso y refresca los datos. */
  const check = useCallback(async (): Promise<boolean> => {
    if (checkingRef.current) {return false;}
    checkingRef.current = true;
    setIsChecking(true);
    try {
      const up = await pingDatabase();
      if (up) {recover();}
      return up;
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [recover]);

  // Error reportado por TanStack Query: confirmar en silencio antes de bloquear la pantalla.
  useEffect(() => {
    const handleDbError = async () => {
      if (statusRef.current !== 'hidden' || checkingRef.current) {return;}
      checkingRef.current = true;
      const up = await pingDatabase();
      checkingRef.current = false;
      if (up || statusRef.current !== 'hidden') {return;}
      setAttemptCount(0);
      setStatus('retrying');
    };

    window.addEventListener('db-connection-error', handleDbError);
    return () => window.removeEventListener('db-connection-error', handleDbError);
  }, []);

  // Reintentos automáticos con espera creciente.
  useEffect(() => {
    if (status !== 'retrying') {return;}
    if (attemptCount >= MAX_RETRIES) {
      setStatus('paused');
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      const up = await check();
      if (!cancelled && !up) {setAttemptCount((prev) => prev + 1);}
    }, RETRY_DELAYS_MS[attemptCount]);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [status, attemptCount, check]);

  // Volver la red o la pestaña: probar al instante, también tras agotar reintentos.
  useEffect(() => {
    if (status === 'hidden') {return;}
    const tryNow = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {void check();}
    };
    window.addEventListener('online', tryNow);
    document.addEventListener('visibilitychange', tryNow);
    return () => {
      window.removeEventListener('online', tryNow);
      document.removeEventListener('visibilitychange', tryNow);
    };
  }, [status, check]);

  if (status === 'hidden') {return null;}

  const isPaused = status === 'paused';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="db-error-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 p-6 backdrop-blur-md transition-all duration-300"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">

          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-inner">
            {isPaused ? (
              <ServerOff className="h-10 w-10 text-destructive animate-pulse" />
            ) : (
              <div className="relative">
                <Database className="h-10 w-10 text-warning" />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  <RefreshCw className="h-3 w-3 text-warning animate-spin" />
                </div>
              </div>
            )}
          </div>

          <h1 id="db-error-title" className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            Problemas para conectar con el servidor
          </h1>

          <div className="mb-8 min-h-[4rem]">
            {isPaused ? (
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                <AlertCircle className="mr-2 inline-block h-4 w-4 text-destructive" />
                El servidor no está respondiendo. Volveremos a intentar cuando recuperes la conexión,
                o puedes intentarlo tú en unos minutos.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  El servidor está tardando en responder. Estamos reintentando automáticamente…
                </p>

                <div className="flex w-full items-center justify-center gap-2">
                  <div className="h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-warning transition-all duration-1000 ease-linear"
                      style={{ width: `${(attemptCount / MAX_RETRIES) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Intento {attemptCount}/{MAX_RETRIES}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { void check(); }}
            disabled={isChecking}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              isPaused
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            } ${isChecking ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Intentar de nuevo'
            )}
          </button>

          {/* Salida: nunca dejar al usuario atrapado */}
          <button
            type="button"
            onClick={() => setStatus('hidden')}
            className="mt-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Cerrar aviso
          </button>
        </div>
      </div>
    </div>
  );
};
