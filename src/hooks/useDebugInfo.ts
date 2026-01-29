import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useDebugInfo(componentName: string, data: Record<string, any>) {
    const isMounted = useRef(false);
    const { user } = useAuth();

    useEffect(() => {
        isMounted.current = true;
        console.log(`[LifeCycle] ${componentName} MOUNTED. User: ${user?.id || 'No Auth'}`);

        return () => {
            isMounted.current = false;
            console.log(`[LifeCycle] ${componentName} UNMOUNTED`);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.groupCollapsed(`[StateUpdate] ${componentName}`);
            console.log('Timestamp:', performance.now());
            Object.entries(data).forEach(([key, value]) => {
                console.log(`${key}:`, value);
            });
            console.groupEnd();
        }
    }, [data, componentName]);
}
