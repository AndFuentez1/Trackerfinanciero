import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseIdleTimerOptions {
    /** Timeout in milliseconds (default: 3600000 = 1 hour) */
    timeout?: number;
    /** Warning time in milliseconds before timeout (default: 300000 = 5 minutes) */
    warningTime?: number;
    /** Callback when warning time is reached */
    onWarning?: () => void;
    /** Callback when timeout is reached */
    onTimeout?: () => void;
    /** Enable/disable the timer */
    enabled?: boolean;
}

const DEFAULT_TIMEOUT = 3600000; // 1 hour
const DEFAULT_WARNING_TIME = 300000; // 5 minutes

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

    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

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
        if (!enabled) return;

        clearTimers();
        lastActivityRef.current = Date.now();
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
        if (!enabled || isWarning) return; // Don't reset during warning period
        resetTimer();
    }, [enabled, isWarning, resetTimer]);

    // Set up event listeners
    useEffect(() => {
        if (!enabled) {
            clearTimers();
            return;
        }

        // Initial timer setup
        resetTimer();

        // Events to monitor
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            clearTimers();
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [enabled, handleActivity, resetTimer, clearTimers]);

    return {
        /** Remaining time in milliseconds */
        remainingTime,
        /** Whether warning period is active */
        isWarning,
        /** Manually extend the session (reset timer) */
        extendSession,
    };
}
