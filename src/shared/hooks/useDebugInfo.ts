import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

export function useDebugInfo(componentName: string, data: Record<string, unknown>) {
    const isMounted = useRef(false);
    const { user } = useAuth();

    useEffect(() => {
        isMounted.current = true;
        // console.log(`[LifeCycle] ${componentName} MOUNTED. User: ${user?.id || 'No Auth'}`);

        return () => {
            isMounted.current = false;
            // console.log(`[LifeCycle] ${componentName} UNMOUNTED`);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.groupCollapsed(`[StateUpdate] ${componentName}`);
            console.log('Timestamp:', performance.now());
            Object.entries(data).forEach(([key, value]) => {
                console.log(`${key}:`, value);
            });
            console.groupEnd();
        }
    }, [data, componentName]);
}
