/**
 * Clasificación de errores de conexión con Supabase.
 *
 * Distingue "la BD/servidor no responde" (muestra DatabaseErrorOverlay) de fallos
 * del lado del usuario (sin red, pestaña oculta, petición cancelada al navegar),
 * que no deben bloquear la app.
 */

/** Tiempo máximo de una petición a Supabase antes de abortarla y reintentar. */
export const SUPABASE_FETCH_TIMEOUT_MS = 20_000;

/** Nombre del error que lanza fetchWithTimeout cuando vence el tiempo. */
export const FETCH_TIMEOUT_ERROR_NAME = 'TimeoutError';

type ErrorLike = { message?: unknown; status?: unknown; code?: unknown; name?: unknown } | null | undefined;

const SERVER_DOWN_STATUSES = new Set([502, 503, 504, 520, 522, 524, 544]);
// PGRST000/001/002: PostgREST no puede conectar con Postgres o leer su esquema.
const SERVER_DOWN_CODES = new Set(['503', '502', '504', '544', 'PGRST000', 'PGRST001', 'PGRST002']);

const messageOf = (err: ErrorLike) => (typeof err?.message === 'string' ? err.message.toLowerCase() : '');
const nameOf = (err: ErrorLike) => (typeof err?.name === 'string' ? err.name : '');
const statusOf = (err: ErrorLike) => (typeof err?.status === 'number' ? err.status : undefined);
const codeOf = (err: ErrorLike) => (err?.code === undefined || err?.code === null ? '' : String(err.code));

const isTimeout = (err: ErrorLike) =>
  nameOf(err) === FETCH_TIMEOUT_ERROR_NAME || messageOf(err).includes('timed out') || messageOf(err).includes('timeout');

const isNetworkFailure = (err: ErrorLike) => {
  const msg = messageOf(err);
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
};

/** Petición cancelada a propósito (navegación, desmontaje), no por timeout. */
const isUserAbort = (err: ErrorLike) => nameOf(err) === 'AbortError' && !isTimeout(err);

const isServerDownSignal = (err: ErrorLike) => {
  const status = statusOf(err);
  if (status !== undefined && SERVER_DOWN_STATUSES.has(status)) {return true;}
  if (SERVER_DOWN_CODES.has(codeOf(err))) {return true;}
  return messageOf(err).includes('503');
};

export interface ConnectionEnvironment {
  online: boolean;
  visible: boolean;
}

export const currentConnectionEnvironment = (): ConnectionEnvironment => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  visible: typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
});

/**
 * ¿Este error indica que la base de datos/servidor no responde?
 * Sin red o con la pestaña oculta devuelve false: eso lo maneja el indicador offline.
 */
export const isDatabaseUnreachableError = (
  error: unknown,
  env: ConnectionEnvironment = currentConnectionEnvironment(),
): boolean => {
  const err = error as ErrorLike;
  if (!err) {return false;}
  if (!env.online || !env.visible) {return false;}
  if (isUserAbort(err)) {return false;}
  return isServerDownSignal(err) || isTimeout(err) || isNetworkFailure(err);
};

/** Errores de red o servidor a los que conviene reintentar la query antes de mostrar fallo. */
export const isTransientQueryFailure = (error: unknown): boolean => {
  const err = error as ErrorLike;
  if (!err) {return false;}
  const status = statusOf(err);
  return (
    isNetworkFailure(err) ||
    isTimeout(err) ||
    isServerDownSignal(err) ||
    (status !== undefined && status >= 500)
  );
};

/**
 * fetch con tiempo límite, respetando la señal de cancelación de la petición original.
 * Una petición colgada (BD en swap, gateway lento) falla y se reintenta en vez de quedarse esperando.
 */
export const createFetchWithTimeout = (
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
  baseFetch: typeof fetch = (...args) => fetch(...args),
): typeof fetch => {
  return (input, init) => {
    const controller = new AbortController();
    const external = init?.signal;
    let timedOut = false;

    const onExternalAbort = () => controller.abort(external?.reason);
    if (external) {
      if (external.aborted) {controller.abort(external.reason);}
      else {external.addEventListener('abort', onExternalAbort, { once: true });}
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    return baseFetch(input, { ...init, signal: controller.signal })
      .catch((error: unknown) => {
        if (timedOut) {
          const timeoutError = new Error(`Request timed out after ${timeoutMs} ms`);
          timeoutError.name = FETCH_TIMEOUT_ERROR_NAME;
          throw timeoutError;
        }
        throw error;
      })
      .finally(() => {
        clearTimeout(timer);
        external?.removeEventListener('abort', onExternalAbort);
      });
  };
};
