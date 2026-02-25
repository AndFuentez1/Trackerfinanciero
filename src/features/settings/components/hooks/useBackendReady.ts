import { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendUrl } from '@/core/api/backend';

export type BackendStatus = 'unknown' | 'checking' | 'ready' | 'error';

/**
 * Polls the backend health endpoint using logarithmic backoff.
 * On mount, checks immediately. If it fails, retries at increasing intervals
 * (2s → 4s → 7s → 12s → 20s → 30s max) until `ready` or `maxMs` exceeded.
 *
 * Returns:
 * - `status`: current state
 * - `isReady`: true when backend responded 200
 * - `retry`: force an immediate re-check
 */
export function useBackendReady(enabled = true, maxMs = 60_000) {
    const [status, setStatus] = useState<BackendStatus>('unknown');
    const attempt = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedAt = useRef<number>(0);

    const check = useCallback(async () => {
        if (!enabled) { return; }
        setStatus('checking');
        try {
            const res = await fetch(`${getBackendUrl()}/health`, {
                signal: AbortSignal.timeout(8_000),
                cache: 'no-store'
            });
            if (res.ok) {
                setStatus('ready');
                return;
            }
            throw new Error(`status ${res.status}`);
        } catch {
            const elapsed = Date.now() - startedAt.current;
            if (elapsed >= maxMs) {
                setStatus('error');
                return;
            }
            // Logarithmic backoff (capped at 30s): 2, 4, 7, 12, 20, 30, 30, ...
            const delay = Math.min(30_000, Math.round(2000 * Math.log2(attempt.current + 2)));
            attempt.current += 1;
            setStatus('error'); // show error momentarily, will retry
            timerRef.current = setTimeout(check, delay);
        }
    }, [enabled, maxMs]);

    const retry = useCallback(() => {
        attempt.current = 0;
        startedAt.current = Date.now();
        if (timerRef.current) { clearTimeout(timerRef.current); }
        check();
    }, [check]);

    useEffect(() => {
        if (!enabled) { return; }
        startedAt.current = Date.now();
        check();
        return () => {
            if (timerRef.current) { clearTimeout(timerRef.current); }
        };
    }, [enabled, check]);

    return { status, isReady: status === 'ready', retry };
}
