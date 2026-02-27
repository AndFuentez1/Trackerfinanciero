import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/context/AuthContext';

const INACTIVITY_KEY = 'lastActiveTime';
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute
const THROTTLE_MS = 30 * 1000; // Only update storage every 30 seconds

export function useInactivityLogout(timeoutMinutes: number = 5) {
    const { user, signOut } = useAuth();
    const lastActivityRef = useRef<number>(Date.now());
    const timeoutMs = timeoutMinutes * 60 * 1000;

    /**
     * Checks if the user has been inactive for too long.
     * Uses localStorage to coordinate across tabs/reloads.
     */
    const checkInactivity = useCallback(async () => {
        if (!user) { return; }

        const storedLastActive = localStorage.getItem(INACTIVITY_KEY);
        const lastActive = storedLastActive ? parseInt(storedLastActive, 10) : Date.now();
        const now = Date.now();
        const timeSinceLastActive = now - lastActive;
        const keepAlive = localStorage.getItem('keep_alive_enabled') === 'true';

        if (keepAlive) {
            // Update last active so if keep-alive is turned off, we don't immediately logout
            localStorage.setItem(INACTIVITY_KEY, Date.now().toString());
            return;
        }

        if (timeSinceLastActive > timeoutMs) {
            console.warn(`[InactivityLogout] User inactive for ${Math.round(timeSinceLastActive / 60000)} minutes. Logging out.`);
            // Clear the key immediately to prevent loops
            localStorage.removeItem(INACTIVITY_KEY);

            // Sign out locally and globally
            await signOut();

            // Force reload to ensure clean state
            window.location.reload();
        }
    }, [user, timeoutMs, signOut]);

    /**
     * Updates the last active timestamp in localStorage.
     * Throttled to avoid excessive writes.
     */
    const handleActivity = useCallback(() => {
        const now = Date.now();

        // Always update functionality ref in memory
        lastActivityRef.current = now;

        // Throttle writing to localStorage
        const storedLastActive = localStorage.getItem(INACTIVITY_KEY);
        const lastSaved = storedLastActive ? parseInt(storedLastActive, 10) : 0;

        if (now - lastSaved > THROTTLE_MS) {
            localStorage.setItem(INACTIVITY_KEY, now.toString());
        }
    }, []);

    // Initial check on mount (handle "closed tab -> reopen > 5 mins later")
    useEffect(() => {
        if (user) {
            // If no existing timestamp, set one now
            if (!localStorage.getItem(INACTIVITY_KEY)) {
                localStorage.setItem(INACTIVITY_KEY, Date.now().toString());
            } else {
                // Otherwise check immediately
                checkInactivity();
            }
        }
    }, [user, checkInactivity]);

    // Periodic check
    useEffect(() => {
        if (!user) { return; }

        const intervalId = setInterval(() => {
            checkInactivity();
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [user, checkInactivity]);

    // Event listeners for activity
    useEffect(() => {
        if (!user) { return; }

        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
            'focus'
        ];

        // Optimize: use passive listeners where possible
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, handleActivity]);

    return { checkInactivity };
}
