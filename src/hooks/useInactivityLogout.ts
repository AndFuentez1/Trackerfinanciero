import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useInactivityLogout(timeoutMinutes: number = 30) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(async () => {
            console.log('Inactivity timeout reached, signing out...');
            await supabase.auth.signOut();
            window.location.reload(); // Ensure everything is cleared
        }, timeoutMinutes * 60 * 1000);
    };

    useEffect(() => {
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        const handleActivity = () => {
            resetTimer();
        };

        // Initial timer
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [timeoutMinutes]);

    return { resetTimer };
}
