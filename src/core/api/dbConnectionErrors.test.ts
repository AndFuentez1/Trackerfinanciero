import { describe, it, expect, vi } from 'vitest';
import {
  createFetchWithTimeout,
  FETCH_TIMEOUT_ERROR_NAME,
  isDatabaseUnreachableError,
  isTransientQueryFailure,
} from './dbConnectionErrors';

const ONLINE = { online: true, visible: true };

describe('isDatabaseUnreachableError', () => {
  it('detecta 503 y códigos PostgREST de conexión', () => {
    expect(isDatabaseUnreachableError({ status: 503, message: 'Service Unavailable' }, ONLINE)).toBe(true);
    expect(isDatabaseUnreachableError({ code: 'PGRST002', message: 'schema cache' }, ONLINE)).toBe(true);
    expect(isDatabaseUnreachableError({ status: 544, message: 'timeout' }, ONLINE)).toBe(true);
  });

  it('detecta "Failed to fetch" y timeout solo si hay red y la pestaña está visible', () => {
    const fetchErr = new TypeError('Failed to fetch');
    expect(isDatabaseUnreachableError(fetchErr, ONLINE)).toBe(true);
    expect(isDatabaseUnreachableError(fetchErr, { online: false, visible: true })).toBe(false);
    expect(isDatabaseUnreachableError(fetchErr, { online: true, visible: false })).toBe(false);

    const timeout = Object.assign(new Error('Request timed out'), { name: FETCH_TIMEOUT_ERROR_NAME });
    expect(isDatabaseUnreachableError(timeout, ONLINE)).toBe(true);
  });

  it('ignora peticiones canceladas y errores normales de la BD', () => {
    const abort = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    expect(isDatabaseUnreachableError(abort, ONLINE)).toBe(false);
    expect(isDatabaseUnreachableError({ code: '42501', message: 'permission denied' }, ONLINE)).toBe(false);
    expect(isDatabaseUnreachableError({ code: '23505', message: 'duplicate key' }, ONLINE)).toBe(false);
    expect(isDatabaseUnreachableError(null, ONLINE)).toBe(false);
  });
});

describe('isTransientQueryFailure', () => {
  it('reintenta red, timeout y 5xx; no errores de validación', () => {
    expect(isTransientQueryFailure(new TypeError('Load failed'))).toBe(true);
    expect(isTransientQueryFailure({ status: 500, message: 'x' })).toBe(true);
    expect(isTransientQueryFailure({ code: 'PGRST001', message: 'x' })).toBe(true);
    expect(isTransientQueryFailure({ status: 400, code: '22P02', message: 'invalid input' })).toBe(false);
  });
});

describe('createFetchWithTimeout', () => {
  const hangingFetch: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      );
    });

  it('aborta con TimeoutError cuando la petición se cuelga', async () => {
    vi.useFakeTimers();
    const promise = createFetchWithTimeout(1000, hangingFetch)('https://x.test');
    const assertion = expect(promise).rejects.toMatchObject({ name: FETCH_TIMEOUT_ERROR_NAME });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    vi.useRealTimers();
  });

  it('respeta la cancelación externa como AbortError', async () => {
    const controller = new AbortController();
    const promise = createFetchWithTimeout(10_000, hangingFetch)('https://x.test', { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('devuelve la respuesta si llega a tiempo', async () => {
    const ok = new Response('ok');
    const result = await createFetchWithTimeout(1000, () => Promise.resolve(ok))('https://x.test');
    expect(result).toBe(ok);
  });
});
