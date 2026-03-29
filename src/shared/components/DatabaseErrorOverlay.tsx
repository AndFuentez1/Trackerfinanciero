import React, { useState, useEffect, useCallback } from 'react';
import { Database, AlertCircle, RefreshCw, ServerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const DatabaseErrorOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Maximum automatic retries before declaring it paused (e.g. 5 attempts = ~25s total)
  const MAX_RETRIES = 5;

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      // Un simple ping a una tabla pública o a profiles para ver si responde
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      // Si el error no es de red/503 (ej. es un error de RLS de que no hay sesion), significa que la DB responde
      if (!error || (error.code !== '503' && !error.message.includes('Failed to fetch'))) {
        // Conexión restablecida - Recargar la app
        window.location.reload();
        return true;
      }
      return false; // Sigue caída
    } catch {
      return false; // Sigue caída
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleDbError = () => {
      setIsVisible(true);
      setAttemptCount(0);
      setIsPaused(false);
    };

    window.addEventListener('db-connection-error', handleDbError);
    return () => window.removeEventListener('db-connection-error', handleDbError);
  }, []);

  // Bucle de reintentos automáticos
  useEffect(() => {
    if (!isVisible || isPaused) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const retryCycle = async () => {
      if (attemptCount >= MAX_RETRIES) {
        setIsPaused(true);
        return;
      }

      const isConnected = await checkConnection();
      if (!isConnected) {
        setAttemptCount((prev) => prev + 1);
        timeoutId = setTimeout(retryCycle, 5000); // Reintentar cada 5 segundos
      }
    };

    // Comenzar el ciclo después de un breve delay inicial
    timeoutId = setTimeout(retryCycle, 2000);

    return () => clearTimeout(timeoutId);
  }, [isVisible, isPaused, attemptCount, checkConnection]);

  // Si no está visible, no renderizamos nada
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700/50 shadow-inner">
            {isPaused ? (
              <ServerOff className="h-10 w-10 text-rose-500 animate-pulse" />
            ) : (
              <div className="relative">
                <Database className="h-10 w-10 text-amber-500" />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
                  <RefreshCw className="h-3 w-3 text-amber-400 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
            Estamos trabajando en mejorar la app
          </h1>

          <div className="mb-8 min-h-[4rem]">
            {isPaused ? (
              <p className="text-sm font-medium leading-relaxed text-slate-300">
                <AlertCircle className="mr-2 inline-block h-4 w-4 text-rose-400" />
                Lo sentimos, el servicio de base de datos estará inactivo por algunas horas.{' '}
                Puedes intentar acceder más tarde.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-300">
                  La base de datos puede estar inactiva en este momento. Por favor espera mientras intentamos reconectarla automáticamente...
                </p>
                
                {/* Indicador de progreso */}
                <div className="flex w-full items-center justify-center gap-2">
                  <div className="h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-slate-700">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(attemptCount / MAX_RETRIES) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    Intento {attemptCount}/{MAX_RETRIES}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <button
            onClick={() => window.location.reload()}
            disabled={isChecking && !isPaused}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isPaused 
                ? 'bg-primary hover:bg-primary/90 focus-visible:outline-primary' 
                : 'bg-slate-700 hover:bg-slate-600 focus-visible:outline-slate-700'
            } ${isChecking && !isPaused ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isChecking && !isPaused ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Intentar de nuevo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
