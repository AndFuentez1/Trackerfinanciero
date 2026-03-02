import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseIdleTimerOptions {
    /** Timeout in milliseconds (default: 300000 = 5 minutes) */
    timeout?: number;
    /** Warning time in milliseconds before timeout (default: 60000 = 1 minute) */
    warningTime?: number;
    /** Callback when warning time is reached */
    onWarning?: () => void;
    /** Callback when timeout is reached */
    onTimeout?: () => void;
    /** Events to listen for (default: mousemove, keydown, scroll, touchstart) */
    events?: string[];
    /** Whether the timer is enabled (default: true) */
    enabled?: boolean;
}

const DEFAULT_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'];
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const DEFAULT_WARNING_TIME = 60000; // 1 minute


/**
 * Hook to detect user inactivity and trigger callbacks
 * Monitors mouse, keyboard, touch, and scroll events
 */
export function useIdleTimer(options: UseIdleTimerOptions = {}) {
    const {
        timeout = DEFAULT_TIMEOUT,
        warningTime = DEFAULT_WARNING_TIME,
        onWarning,
        onTimeout,
        enabled = true,
    } = options;

    const [remainingTime, setRemainingTime] = useState(timeout);
    const [isWarning, setIsWarning] = useState(false);

    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>((() => {
        const stored = localStorage.getItem('lastActivity');
        return stored ? parseInt(stored, 10) : Date.now();
    })());
    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clear all timers
    const clearTimers = useCallback(() => {
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
        }
        if (warningTimeoutIdRef.current) {
            clearTimeout(warningTimeoutIdRef.current);
            warningTimeoutIdRef.current = null;
        }
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }
    }, []);

    // Reset the idle timer
    const resetTimer = useCallback(() => {
        if (!enabled) { return; }

        clearTimers();
        lastActivityRef.current = Date.now();
        localStorage.setItem('lastActivity', lastActivityRef.current.toString());
        setIsWarning(false);
        setRemainingTime(timeout);

        // Set warning timer
        warningTimeoutIdRef.current = setTimeout(() => {
            setIsWarning(true);
            onWarning?.();
        }, timeout - warningTime);

        // Set timeout timer
        timeoutIdRef.current = setTimeout(() => {
            onTimeout?.();
        }, timeout);

        // Update remaining time every second
        intervalIdRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = Math.max(0, timeout - elapsed);
            setRemainingTime(remaining);

            if (remaining === 0) {
                clearInterval(intervalIdRef.current!);
            }
        }, 1000);
    }, [enabled, timeout, warningTime, onWarning, onTimeout, clearTimers]);

    // Extend session (reset timer manually)
    const extendSession = useCallback(() => {
        resetTimer();
    }, [resetTimer]);

    // Activity event handler
    const handleActivity = useCallback(() => {
        if (!enabled || isWarning) { return; } // Don't reset during warning period
        resetTimer();
    }, [enabled, isWarning, resetTimer]);

    // Set up event listeners
    useEffect(() => {
        if (!enabled) {
            clearTimers();
            return;
        }

        // Check for immediate timeout on mount (e.g. page reload after long time)
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeout) {
            onTimeout?.();
            // Don't start timer if we already timed out
            return;
        }

        // Initial timer setup
        resetTimer();

        // Events to monitor
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll', 'click'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        const handleVisibilityChange = () => {
            if (!document.hidden && enabled) {
                const elapsed = Date.now() - lastActivityRef.current;
                if (elapsed >= timeout) {
                    onTimeout?.();
                } else if (elapsed >= timeout - warningTime) {
                    setIsWarning(true);
                    onWarning?.();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            clearTimers();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [enabled, handleActivity, resetTimer, clearTimers, timeout, warningTime, onTimeout, onWarning]);

    return {
        /** Remaining time in milliseconds */
        remainingTime,
        /** Whether warning period is active */
        isWarning,
        /** Manually extend the session (reset timer) */
        extendSession,
    };
}
