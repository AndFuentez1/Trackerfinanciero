import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Persist scroll position across page reloads (sessionStorage).
 * 
 * @param keyPrefix Prefix for storage keys (default: 'scroll-pos-')
 * @returns Ref object to attach to the scrollable container
 */
export function useScrollRestoration<T extends HTMLElement>(keyPrefix = 'scroll-pos-') {
    const location = useLocation();
    const scrollContainerRef = useRef<T>(null);

    // 1. Restore scroll position on mount/route change
    useEffect(() => {
        const key = `${keyPrefix}${location.pathname}`;
        const savedPosition = sessionStorage.getItem(key);

        if (savedPosition && scrollContainerRef.current) {
            // restoration needs to happen slightly after render to ensure content height is ready
            // especially with dynamic content like tables/charts
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = parseInt(savedPosition, 10);
                }
            });
        }
    }, [location.pathname, keyPrefix]);

    // 2. Save scroll position on scroll (debounced for performance)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) { return; }

        let debounceTimer: ReturnType<typeof setTimeout>;

        const handleScroll = () => {
            // Clear existing timer
            clearTimeout(debounceTimer);

            // Set new timer to save position after user stops scrolling
            debounceTimer = setTimeout(() => {
                const key = `${keyPrefix}${location.pathname}`;
                sessionStorage.setItem(key, container.scrollTop.toString());
            }, 100); // 100ms debounce
        };

        container.addEventListener('scroll', handleScroll);

        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(debounceTimer);
        };
    }, [location.pathname, keyPrefix]); // Re-bind if path changes (new key)

    return scrollContainerRef;
}
