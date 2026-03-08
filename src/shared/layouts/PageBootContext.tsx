import { createContext, useContext, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

type PageBootContextValue = {
    reportPageBootLoading: (path: string, isLoading: boolean) => void;
};

export const PageBootContext = createContext<PageBootContextValue | null>(null);

export function usePageBootLoading(isLoading: boolean) {
    const context = useContext(PageBootContext);
    const location = useLocation();

    useLayoutEffect(() => {
        context?.reportPageBootLoading(location.pathname, isLoading);
    }, [context, location.pathname, isLoading]);
}
